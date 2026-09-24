const OrgMember = require('../models/OrgMember');
const ProjectMember = require('../models/ProjectMember');
const Project = require('../models/Project');
const Team = require('../models/Team');
const Task = require('../models/Task');

/**
 * Middleware to check organization-level roles.
 * Allowed roles e.g.: ['Org Admin'], ['Org Admin', 'Member']
 */
const requireOrgRole = (allowedRoles = ['Org Admin', 'Member']) => {
  return async (req, res, next) => {
    try {
      let orgId = req.params.orgId || req.body.organization || req.headers['x-org-id'];

      if (!orgId && req.params.teamId) {
        const team = await Team.findById(req.params.teamId);
        if (team) orgId = team.organization;
      }

      if (!orgId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID is required for role validation.'
        });
      }

      // Superadmin bypass
      if (req.user.systemRole === 'superadmin') {
        req.orgRole = 'Org Admin';
        return next();
      }

      const membership = await OrgMember.findOne({
        organization: orgId,
        user: req.user._id,
        status: 'active'
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not an active member of this organization.'
        });
      }

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied: Requires one of [${allowedRoles.join(', ')}] role.`
        });
      }

      req.orgRole = membership.role;
      req.orgMembership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check project-level roles.
 * Allowed roles e.g.: ['Project Manager', 'Team Lead', 'Developer/Member']
 * Stakeholders are strictly read-only.
 * Org Admins automatically have Project Manager equivalent permissions.
 * Active organization members automatically get Developer/Member project access.
 */
const requireProjectRole = (allowedRoles = ['Project Manager', 'Team Lead', 'Developer/Member']) => {
  return async (req, res, next) => {
    try {
      let projectId = req.params.projectId || req.params.id || req.body.project || req.headers['x-project-id'];

      if (!projectId && req.params.taskId) {
        const task = await Task.findById(req.params.taskId);
        if (task) projectId = task.project;
      }

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'Project ID is required for project access check.'
        });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found.'
        });
      }

      req.project = project;

      // Check if user is superadmin
      if (req.user.systemRole === 'superadmin') {
        req.projectRole = 'Project Manager';
        return next();
      }

      // Check if user is active member of this project's organization
      const orgMembership = await OrgMember.findOne({
        organization: project.organization,
        user: req.user._id,
        status: 'active'
      });

      if (!orgMembership) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not a member of this organization.'
        });
      }

      // Org Admins have full Project Manager privileges
      if (orgMembership.role === 'Org Admin') {
        req.projectRole = 'Project Manager';
        return next();
      }

      // Check project-specific role
      let projectMember = await ProjectMember.findOne({
        project: projectId,
        user: req.user._id
      });

      // If user is in the organization but no explicit ProjectMember record exists yet,
      // auto-enroll them as Developer/Member so they can seamlessly collaborate!
      if (!projectMember) {
        projectMember = await ProjectMember.create({
          project: projectId,
          user: req.user._id,
          role: 'Developer/Member'
        });
      }

      // If user is a Stakeholder, block any modifying HTTP methods (POST, PUT, PATCH, DELETE)
      if (
        projectMember.role === 'Stakeholder' &&
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
      ) {
        return res.status(403).json({
          success: false,
          message: 'Stakeholder role is read-only. Modifying project resources is restricted.'
        });
      }

      if (!allowedRoles.includes(projectMember.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied: Requires one of [${allowedRoles.join(', ')}] permissions for this project.`
        });
      }

      req.projectRole = projectMember.role;
      req.projectMember = projectMember;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  requireOrgRole,
  requireProjectRole
};
