const Team = require('../models/Team');
const OrgMember = require('../models/OrgMember');

const createTeam = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { name, lead, members, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Team name is required.' });
    }

    const memberList = Array.isArray(members) && members.length > 0 ? members : [];
    if (lead && !memberList.includes(lead)) {
      memberList.push(lead);
    }
    if (memberList.length === 0) {
      memberList.push(req.user._id);
    }

    const team = await Team.create({
      name: name.trim(),
      organization: orgId,
      lead: lead || req.user._id,
      members: memberList,
      description: description || ''
    });

    const populated = await Team.findById(team._id)
      .populate('lead', 'name email avatar jobTitle')
      .populate('members', 'name email avatar jobTitle department');

    res.status(201).json({ success: true, team: populated });
  } catch (error) {
    next(error);
  }
};

const getOrgTeams = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const teams = await Team.find({ organization: orgId })
      .populate('lead', 'name email avatar jobTitle department')
      .populate('members', 'name email avatar jobTitle department');

    res.json({ success: true, count: teams.length, data: teams });
  } catch (error) {
    next(error);
  }
};

const getTeamById = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId)
      .populate('lead', 'name email avatar jobTitle department')
      .populate('members', 'name email avatar jobTitle department');

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    res.json({ success: true, team });
  } catch (error) {
    next(error);
  }
};

const updateTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { name, lead, members, description } = req.body;

    const team = await Team.findByIdAndUpdate(
      teamId,
      { name, lead, members, description },
      { new: true, runValidators: true }
    )
      .populate('lead', 'name email avatar jobTitle department')
      .populate('members', 'name email avatar jobTitle department');

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    res.json({ success: true, team });
  } catch (error) {
    next(error);
  }
};

const addTeamMember = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const team = await Team.findByIdAndUpdate(
      teamId,
      { $addToSet: { members: userId } },
      { new: true }
    )
      .populate('lead', 'name email avatar jobTitle department')
      .populate('members', 'name email avatar jobTitle department');

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    res.json({ success: true, team });
  } catch (error) {
    next(error);
  }
};

const removeTeamMember = async (req, res, next) => {
  try {
    const { teamId, userId } = req.params;

    const team = await Team.findByIdAndUpdate(
      teamId,
      { $pull: { members: userId } },
      { new: true }
    )
      .populate('lead', 'name email avatar jobTitle department')
      .populate('members', 'name email avatar jobTitle department');

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    res.json({ success: true, team });
  } catch (error) {
    next(error);
  }
};

const deleteTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findByIdAndDelete(teamId);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    res.json({ success: true, message: 'Team deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTeam,
  getOrgTeams,
  getTeamById,
  updateTeam,
  addTeamMember,
  removeTeamMember,
  deleteTeam
};
