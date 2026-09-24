const crypto = require('crypto');
const Organization = require('../models/Organization');
const OrgMember = require('../models/OrgMember');
const Project = require('../models/Project');
const Team = require('../models/Team');
const User = require('../models/User');
const Invitation = require('../models/Invitation');
const ProjectMember = require('../models/ProjectMember');
const { logActivity, createNotification } = require('../utils/activityLogger');

// Create new organization
const createOrg = async (req, res, next) => {
  try {
    const { name, description, logo } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Organization name is required.' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);

    const organization = await Organization.create({
      name: name.trim(),
      slug,
      description: description || '',
      logo: logo || '',
      owner: req.user._id
    });

    const membership = await OrgMember.create({
      organization: organization._id,
      user: req.user._id,
      role: 'Org Admin',
      status: 'active'
    });

    res.status(201).json({
      success: true,
      organization,
      role: membership.role
    });
  } catch (error) {
    next(error);
  }
};

// Get all orgs for the authenticated user
const getMyOrgs = async (req, res, next) => {
  try {
    const memberships = await OrgMember.find({ user: req.user._id, status: 'active' })
      .populate('organization');

    const orgs = memberships
      .filter((m) => m.organization)
      .map((m) => ({
        ...m.organization.toObject(),
        myRole: m.role
      }));

    res.json({ success: true, count: orgs.length, data: orgs });
  } catch (error) {
    next(error);
  }
};

// Get single organization by ID with summary stats
const getOrgById = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const organization = await Organization.findById(orgId).populate('owner', 'name email avatar');

    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }

    const [membersCount, projectsCount, teamsCount] = await Promise.all([
      OrgMember.countDocuments({ organization: orgId, status: 'active' }),
      Project.countDocuments({ organization: orgId }),
      Team.countDocuments({ organization: orgId })
    ]);

    // Check caller's role
    const callerMembership = await OrgMember.findOne({
      organization: orgId,
      user: req.user._id,
      status: 'active'
    });

    res.json({
      success: true,
      organization,
      myRole: callerMembership ? callerMembership.role : null,
      stats: {
        membersCount,
        projectsCount,
        teamsCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update organization details (Org Admin only)
const updateOrg = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { name, description, logo, settings } = req.body;

    const organization = await Organization.findByIdAndUpdate(
      orgId,
      { name, description, logo, settings },
      { new: true, runValidators: true }
    );

    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }

    res.json({ success: true, organization });
  } catch (error) {
    next(error);
  }
};

// List organization members
const getOrgMembers = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const members = await OrgMember.find({ organization: orgId })
      .populate('user', 'name email avatar jobTitle department')
      .sort({ createdAt: 1 });

    res.json({ success: true, count: members.length, data: members });
  } catch (error) {
    next(error);
  }
};

// Invite or add member to organization (Org Admin only)
const inviteMember = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { email, role = 'Member', projectRoles = [] } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required to invite member.' });
    }

    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }

    // Check if user already registered
    let targetUser = await User.findOne({ email: email.toLowerCase() });

    if (!targetUser) {
      // Auto-provision user account with temporary password so invited team members can log in immediately
      targetUser = await User.create({
        name: email.split('@')[0],
        email: email.toLowerCase(),
        password: 'password123',
        jobTitle: 'Invited Member',
        department: 'Operations',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`
      });
    }

    // Check if already an org member
    let membership = await OrgMember.findOne({
      organization: orgId,
      user: targetUser._id
    });

    if (membership) {
      membership.role = role;
      membership.status = 'active';
      await membership.save();
    } else {
      membership = await OrgMember.create({
        organization: orgId,
        user: targetUser._id,
        role: role,
        status: 'active',
        invitedBy: req.user._id
      });
    }

    // Assign project roles if requested, or auto-enroll into all existing projects of the org
    if (projectRoles && projectRoles.length > 0) {
      for (const pr of projectRoles) {
        if (pr.project && pr.role) {
          await ProjectMember.findOneAndUpdate(
            { project: pr.project, user: targetUser._id },
            { role: pr.role },
            { upsert: true, new: true }
          );
        }
      }
    } else {
      const existingProjects = await Project.find({ organization: orgId });
      const defaultProjRole = role === 'Org Admin' ? 'Project Manager' : 'Developer/Member';
      for (const proj of existingProjects) {
        await ProjectMember.findOneAndUpdate(
          { project: proj._id, user: targetUser._id },
          { $setOnInsert: { role: defaultProjRole } },
          { upsert: true }
        );
      }
    }

    // Create notification
    await createNotification({
      recipient: targetUser._id,
      sender: req.user._id,
      organization: orgId,
      type: 'invite',
      title: 'Joined Organization',
      message: `You were added to ${org.name} as ${role}.`,
      link: `/orgs/${orgId}`
    });

    const populatedMember = await OrgMember.findById(membership._id).populate(
      'user',
      'name email avatar jobTitle department'
    );

    res.status(200).json({
      success: true,
      message: `User ${targetUser.email} added successfully.`,
      member: populatedMember
    });
  } catch (error) {
    next(error);
  }
};

// Update member role in organization (Org Admin only)
const updateMemberRole = async (req, res, next) => {
  try {
    const { orgId, memberId } = req.params;
    const { role } = req.body;

    if (!['Org Admin', 'Member', 'Guest'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid organization role.' });
    }

    const membership = await OrgMember.findOneAndUpdate(
      { organization: orgId, _id: memberId },
      { role },
      { new: true }
    ).populate('user', 'name email avatar');

    if (!membership) {
      return res.status(404).json({ success: false, message: 'Organization member not found.' });
    }

    res.json({ success: true, member: membership });
  } catch (error) {
    next(error);
  }
};

// Remove member from organization (Org Admin only)
const removeMember = async (req, res, next) => {
  try {
    const { orgId, memberId } = req.params;
    const member = await OrgMember.findOne({ organization: orgId, _id: memberId });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    // Prevent removing the owner
    const org = await Organization.findById(orgId);
    if (org && org.owner.toString() === member.user.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot remove the organization owner.' });
    }

    await OrgMember.findByIdAndDelete(memberId);

    // Also remove from projects under this org
    const projects = await Project.find({ organization: orgId }).select('_id');
    const projectIds = projects.map((p) => p._id);
    await ProjectMember.deleteMany({ project: { $in: projectIds }, user: member.user });

    res.json({ success: true, message: 'Member removed from organization and all associated projects.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrg,
  getMyOrgs,
  getOrgById,
  updateOrg,
  getOrgMembers,
  inviteMember,
  updateMemberRole,
  removeMember
};
