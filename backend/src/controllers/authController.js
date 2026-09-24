const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organization');
const OrgMember = require('../models/OrgMember');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const Sprint = require('../models/Sprint');
const Milestone = require('../models/Milestone');
const Task = require('../models/Task');
const { logActivity } = require('../utils/activityLogger');

const signToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'super_secret_plansphere_jwt_token_key_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc Register new user
// @route POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, jobTitle, department, orgName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists. Please sign in.'
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      jobTitle: jobTitle ? jobTitle.trim() : 'Engineering Lead',
      department: department ? department.trim() : 'Product Development',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`
    });

    // Determine organization name
    const effectiveOrgName = orgName && orgName.trim() ? orgName.trim() : `${user.name.split(' ')[0]}'s Workspace`;
    const slug = effectiveOrgName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);

    const organization = await Organization.create({
      name: effectiveOrgName,
      slug,
      description: `Primary organization workspace for ${user.name}`,
      logo: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(slug)}`,
      owner: user._id
    });

    await OrgMember.create({
      organization: organization._id,
      user: user._id,
      role: 'Org Admin',
      status: 'active'
    });

    // Auto-create a Starter Project so the new user immediately has rich kanban boards & sprints!
    const starterProject = await Project.create({
      name: 'Product Roadmap & Core Platform',
      key: 'ROAD',
      description: 'Primary product initiatives, agile iterations, and team deliverables',
      organization: organization._id,
      lead: user._id,
      status: 'active',
      category: 'software',
      startDate: new Date(),
      targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      budget: 150000,
      riskLevel: 'Low'
    });

    await ProjectMember.create({
      project: starterProject._id,
      user: user._id,
      role: 'Project Manager'
    });

    // Starter Sprint
    const activeSprint = await Sprint.create({
      project: starterProject._id,
      name: 'Sprint 1 - Workspace Setup & MVP',
      goal: 'Configure workspace, define milestones, and begin core development',
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'active'
    });

    // Starter Milestone
    const milestone = await Milestone.create({
      project: starterProject._id,
      title: 'Milestone 1: Workspace MVP Kickoff',
      description: 'Initial workspace architecture and team onboarding',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'in_progress',
      progress: 50
    });

    // Starter Tasks
    await Task.insertMany([
      {
        project: starterProject._id,
        sprint: activeSprint._id,
        milestone: milestone._id,
        taskNumber: 'ROAD-101',
        title: 'Welcome to PlanSphere! Explore your interactive Kanban board',
        description: 'Drag and drop this card between swimlanes to test optimistic state transitions.',
        type: 'story',
        status: 'done',
        priority: 'high',
        storyPoints: 3,
        assignee: user._id,
        reporter: user._id,
        order: 0
      },
      {
        project: starterProject._id,
        sprint: activeSprint._id,
        milestone: milestone._id,
        taskNumber: 'ROAD-102',
        title: 'Review team workload capacity and assign story points',
        description: 'Navigate to the Team Workload tab to inspect developer capacity bars and overload warnings.',
        type: 'task',
        status: 'in_progress',
        priority: 'medium',
        storyPoints: 5,
        assignee: user._id,
        reporter: user._id,
        order: 0
      },
      {
        project: starterProject._id,
        sprint: activeSprint._id,
        milestone: milestone._id,
        taskNumber: 'ROAD-103',
        title: 'Invite team members and configure project roles',
        description: 'Use the Organization settings tab to invite colleagues and assign project-scoped RBAC permissions.',
        type: 'task',
        status: 'todo',
        priority: 'high',
        storyPoints: 3,
        assignee: user._id,
        reporter: user._id,
        order: 0
      },
      {
        project: starterProject._id,
        sprint: null,
        milestone: null,
        taskNumber: 'ROAD-104',
        title: 'Backlog Item: Plan upcoming quarterly sprint backlog',
        description: 'Move this task into future sprints from the Sprint Planning module.',
        type: 'story',
        status: 'backlog',
        priority: 'low',
        storyPoints: 5,
        assignee: null,
        reporter: user._id,
        order: 0
      }
    ]);

    await logActivity({
      project: starterProject._id,
      organization: organization._id,
      user: user._id,
      action: 'created_project',
      entityType: 'project',
      entityId: starterProject._id,
      entityTitle: starterProject.name
    });

    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        jobTitle: user.jobTitle,
        department: user.department,
        avatar: user.avatar,
        systemRole: user.systemRole
      },
      organization: {
        _id: organization._id,
        name: organization.name,
        slug: organization.slug,
        role: 'Org Admin'
      },
      project: {
        _id: starterProject._id,
        name: starterProject.name,
        key: starterProject.key,
        role: 'Project Manager'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc Login user
// @route POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify credentials.'
      });
    }

    const token = signToken(user._id);

    // Fetch user's organizations
    const memberships = await OrgMember.find({ user: user._id, status: 'active' })
      .populate('organization', 'name slug logo description');

    const organizations = memberships
      .filter((m) => m.organization)
      .map((m) => ({
        _id: m.organization._id,
        name: m.organization.name,
        slug: m.organization.slug,
        logo: m.organization.logo,
        role: m.role
      }));

    // Fetch user's projects across all organizations they belong to
    const orgIds = organizations.map((o) => o._id);
    const [allOrgProjects, projectMemberships] = await Promise.all([
      Project.find({ organization: { $in: orgIds } }).populate('organization', 'name slug'),
      ProjectMember.find({ user: user._id })
    ]);

    const roleMap = {};
    projectMemberships.forEach((pm) => {
      roleMap[pm.project.toString()] = pm.role;
    });

    const projects = allOrgProjects.map((p) => {
      const orgObj = organizations.find((o) => o._id.toString() === (p.organization?._id || p.organization).toString());
      const defaultRole = (orgObj && orgObj.role === 'Org Admin') ? 'Project Manager' : 'Developer/Member';
      return {
        _id: p._id,
        name: p.name,
        key: p.key,
        status: p.status,
        role: roleMap[p._id.toString()] || defaultRole,
        organization: p.organization
      };
    });

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        jobTitle: user.jobTitle,
        department: user.department,
        avatar: user.avatar,
        systemRole: user.systemRole
      },
      organizations,
      projects
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get current user profile
// @route GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const memberships = await OrgMember.find({ user: req.user._id, status: 'active' })
      .populate('organization', 'name slug logo description');

    const organizations = memberships
      .filter((m) => m.organization)
      .map((m) => ({
        _id: m.organization._id,
        name: m.organization.name,
        slug: m.organization.slug,
        logo: m.organization.logo,
        role: m.role
      }));

    const orgIds = organizations.map((o) => o._id);
    const [allOrgProjects, projectMemberships] = await Promise.all([
      Project.find({ organization: { $in: orgIds } }).populate('organization', 'name slug'),
      ProjectMember.find({ user: req.user._id })
    ]);

    const roleMap = {};
    projectMemberships.forEach((pm) => {
      roleMap[pm.project.toString()] = pm.role;
    });

    const projects = allOrgProjects.map((p) => {
      const orgObj = organizations.find((o) => o._id.toString() === (p.organization?._id || p.organization).toString());
      const defaultRole = (orgObj && orgObj.role === 'Org Admin') ? 'Project Manager' : 'Developer/Member';
      return {
        _id: p._id,
        name: p.name,
        key: p.key,
        status: p.status,
        role: roleMap[p._id.toString()] || defaultRole,
        organization: p.organization
      };
    });

    res.json({
      success: true,
      user,
      organizations,
      projects
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update user profile
// @route PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, jobTitle, department, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, jobTitle, department, avatar },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};
