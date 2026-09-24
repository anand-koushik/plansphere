const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const OrgMember = require('../models/OrgMember');
const Task = require('../models/Task');
const Issue = require('../models/Issue');
const Sprint = require('../models/Sprint');
const Milestone = require('../models/Milestone');
const User = require('../models/User');
const { logActivity, createNotification } = require('../utils/activityLogger');

// Create a new project
const createProject = async (req, res, next) => {
  try {
    const {
      name,
      key,
      description,
      organization,
      lead,
      category = 'software',
      startDate,
      targetDate,
      budget = 0,
      riskLevel = 'Low'
    } = req.body;

    if (!name || !key || !organization) {
      return res.status(400).json({
        success: false,
        message: 'Name, key, and organization are required.'
      });
    }

    // Verify user is at least a member of this organization
    const orgMembership = await OrgMember.findOne({
      organization,
      user: req.user._id,
      status: 'active'
    });

    if (!orgMembership) {
      return res.status(403).json({
        success: false,
        message: 'You must belong to this organization to create a project.'
      });
    }

    // Check project key uniqueness within org
    const existing = await Project.findOne({ organization, key: key.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Project key '${key.toUpperCase()}' is already taken in this organization.`
      });
    }

    const project = await Project.create({
      name: name.trim(),
      key: key.toUpperCase().trim(),
      description: description || '',
      organization,
      lead: lead || req.user._id,
      category,
      startDate: startDate || new Date(),
      targetDate,
      budget,
      riskLevel
    });

    // Automatically add creator as Project Manager
    await ProjectMember.create({
      project: project._id,
      user: req.user._id,
      role: 'Project Manager'
    });

    // If lead is specified and different from creator, add lead as Project Manager or Team Lead
    if (lead && lead.toString() !== req.user._id.toString()) {
      await ProjectMember.findOneAndUpdate(
        { project: project._id, user: lead },
        { role: 'Project Manager' },
        { upsert: true }
      );
    }

    await logActivity({
      project: project._id,
      organization,
      user: req.user._id,
      action: 'created_project',
      entityType: 'project',
      entityId: project._id,
      entityTitle: project.name,
      details: { key: project.key, category }
    });

    res.status(201).json({ success: true, project });
  } catch (error) {
    next(error);
  }
};

// Get projects (filterable by organization, search, status)
const getProjects = async (req, res, next) => {
  try {
    const { organization, search, status, category } = req.query;
    const query = {};

    if (organization) {
      query.organization = organization;
    }

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { key: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const projects = await Project.find(query)
      .populate('lead', 'name email avatar')
      .populate('organization', 'name slug')
      .sort({ updatedAt: -1 });

    // Attach user's project role & key counts
    const projectIds = projects.map((p) => p._id);
    const [memberships, taskCounts, activeSprints] = await Promise.all([
      ProjectMember.find({ project: { $in: projectIds }, user: req.user._id }),
      Task.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: { project: '$project', status: '$status' }, count: { $sum: 1 } } }
      ]),
      Sprint.find({ project: { $in: projectIds }, status: 'active' }).select('project name')
    ]);

    const roleMap = {};
    memberships.forEach((m) => {
      roleMap[m.project.toString()] = m.role;
    });

    const activeSprintMap = {};
    activeSprints.forEach((s) => {
      activeSprintMap[s.project.toString()] = s.name;
    });

    // Also fetch user's org membership for this org
    const orgMembership = organization ? await OrgMember.findOne({
      organization,
      user: req.user._id,
      status: 'active'
    }) : null;

    const enriched = projects.map((proj) => {
      const pId = proj._id.toString();
      const projTasks = taskCounts.filter((tc) => tc._id.project.toString() === pId);
      const totalTasks = projTasks.reduce((sum, curr) => sum + curr.count, 0);
      const completedTasks = projTasks
        .filter((tc) => tc._id.status === 'done')
        .reduce((sum, curr) => sum + curr.count, 0);

      const defaultRole = (orgMembership && orgMembership.role === 'Org Admin') ? 'Project Manager' : 'Developer/Member';

      return {
        ...proj.toObject(),
        myRole: roleMap[pId] || defaultRole,
        activeSprint: activeSprintMap[pId] || null,
        stats: {
          totalTasks,
          completedTasks,
          progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        }
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    next(error);
  }
};

// Get single project by ID with rich dashboard summary stats
const getProjectById = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId)
      .populate('lead', 'name email avatar jobTitle')
      .populate('organization', 'name slug owner');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Determine user's role on this project
    let userRole = null;
    const orgMembership = await OrgMember.findOne({
      organization: project.organization._id,
      user: req.user._id,
      status: 'active'
    });

    if (orgMembership && orgMembership.role === 'Org Admin') {
      userRole = 'Org Admin';
    } else {
      const pMember = await ProjectMember.findOne({
        project: projectId,
        user: req.user._id
      });
      userRole = pMember ? pMember.role : null;
    }

    // Aggregate summary stats
    const [tasks, issues, sprints, milestones, membersCount] = await Promise.all([
      Task.find({ project: projectId }).select('status priority storyPoints isBlocked'),
      Issue.find({ project: projectId }).select('status severity'),
      Sprint.find({ project: projectId }).sort({ startDate: -1 }),
      Milestone.find({ project: projectId }).sort({ dueDate: 1 }),
      ProjectMember.countDocuments({ project: projectId })
    ]);

    const activeSprint = sprints.find((s) => s.status === 'active') || null;
    const totalStoryPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedStoryPoints = tasks
      .filter((t) => t.status === 'done')
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const blockedCount = tasks.filter((t) => t.isBlocked || t.status === 'blocked').length;

    const criticalIssues = issues.filter(
      (i) => i.severity === 'critical' && !['resolved', 'closed', 'wont_fix'].includes(i.status)
    ).length;

    res.json({
      success: true,
      project,
      myRole: userRole,
      summary: {
        totalTasks: tasks.length,
        doneTasks: tasks.filter((t) => t.status === 'done').length,
        inProgressTasks: tasks.filter((t) => t.status === 'in_progress').length,
        inReviewTasks: tasks.filter((t) => t.status === 'in_review').length,
        todoTasks: tasks.filter((t) => t.status === 'todo').length,
        backlogTasks: tasks.filter((t) => t.status === 'backlog').length,
        blockedTasks: blockedCount,
        totalStoryPoints,
        completedStoryPoints,
        openIssues: issues.filter((i) => !['resolved', 'closed', 'wont_fix'].includes(i.status)).length,
        criticalIssues,
        activeSprint,
        sprintsCount: sprints.length,
        milestonesCount: milestones.length,
        membersCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update project (PM or Org Admin)
const updateProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, description, lead, status, category, startDate, targetDate, budget, riskLevel } = req.body;

    const project = await Project.findByIdAndUpdate(
      projectId,
      { name, description, lead, status, category, startDate, targetDate, budget, riskLevel },
      { new: true, runValidators: true }
    )
      .populate('lead', 'name email avatar')
      .populate('organization', 'name slug');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    await logActivity({
      project: project._id,
      organization: project.organization._id,
      user: req.user._id,
      action: 'updated_project',
      entityType: 'project',
      entityId: project._id,
      entityTitle: project.name,
      details: { status, riskLevel }
    });

    res.json({ success: true, project });
  } catch (error) {
    next(error);
  }
};

// Delete project (Org Admin or PM)
const deleteProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    await Promise.all([
      Project.findByIdAndDelete(projectId),
      ProjectMember.deleteMany({ project: projectId }),
      Task.deleteMany({ project: projectId }),
      Issue.deleteMany({ project: projectId }),
      Sprint.deleteMany({ project: projectId }),
      Milestone.deleteMany({ project: projectId })
    ]);

    res.json({ success: true, message: 'Project and all related data deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Get project members (includes all org members with automatic enrollment)
const getProjectMembers = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const existingProjectMembers = await ProjectMember.find({ project: projectId })
      .populate('user', 'name email avatar jobTitle department')
      .sort({ createdAt: 1 });

    const existingUserIds = new Set(
      existingProjectMembers.filter((m) => m.user).map((m) => m.user._id.toString())
    );

    // Also get all active organization members
    const orgMembers = await OrgMember.find({
      organization: project.organization,
      status: 'active'
    }).populate('user', 'name email avatar jobTitle department');

    const addedList = [];
    for (const om of orgMembers) {
      if (om.user && !existingUserIds.has(om.user._id.toString())) {
        const assignedRole = om.role === 'Org Admin' ? 'Project Manager' : 'Developer/Member';
        const newPM = await ProjectMember.create({
          project: projectId,
          user: om.user._id,
          role: assignedRole
        });
        addedList.push({
          ...newPM.toObject(),
          user: om.user
        });
      }
    }

    const allMembers = [...existingProjectMembers, ...addedList];
    res.json({ success: true, count: allMembers.length, data: allMembers });
  } catch (error) {
    next(error);
  }
};

// Add or update member in project
const addProjectMember = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { userId, role = 'Developer/Member' } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Verify user is in the organization
    const orgMembership = await OrgMember.findOne({
      organization: project.organization,
      user: userId,
      status: 'active'
    });

    if (!orgMembership) {
      // Automatically add user to organization as Member if not already
      await OrgMember.create({
        organization: project.organization,
        user: userId,
        role: 'Member',
        status: 'active',
        invitedBy: req.user._id
      });
    }

    const member = await ProjectMember.findOneAndUpdate(
      { project: projectId, user: userId },
      { role },
      { upsert: true, new: true }
    ).populate('user', 'name email avatar jobTitle department');

    await createNotification({
      recipient: userId,
      sender: req.user._id,
      project: projectId,
      organization: project.organization,
      type: 'assignment',
      title: 'Added to Project',
      message: `You were assigned as ${role} in project ${project.name}.`,
      link: `/projects/${projectId}`
    });

    res.status(200).json({ success: true, member });
  } catch (error) {
    next(error);
  }
};

// Remove member from project
const removeProjectMember = async (req, res, next) => {
  try {
    const { projectId, memberId } = req.params;

    const member = await ProjectMember.findOneAndDelete({
      project: projectId,
      _id: memberId
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Project member not found.' });
    }

    res.json({ success: true, message: 'Member removed from project.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember
};
