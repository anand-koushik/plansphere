const Milestone = require('../models/Milestone');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { logActivity } = require('../utils/activityLogger');

const createMilestone = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, description, dueDate, status, progress } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ success: false, message: 'Title and due date are required.' });
    }

    const milestone = await Milestone.create({
      project: projectId,
      title: title.trim(),
      description: description || '',
      dueDate,
      status: status || 'planned',
      progress: progress || 0
    });

    const project = await Project.findById(projectId);
    await logActivity({
      project: projectId,
      organization: project ? project.organization : null,
      user: req.user._id,
      action: 'created_milestone',
      entityType: 'milestone',
      entityId: milestone._id,
      entityTitle: milestone.title
    });

    res.status(201).json({ success: true, milestone });
  } catch (error) {
    next(error);
  }
};

const getProjectMilestones = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const milestones = await Milestone.find({ project: projectId }).sort({ dueDate: 1 });

    // Also get linked tasks count for each milestone
    const milestoneIds = milestones.map((m) => m._id);
    const tasks = await Task.find({ milestone: { $in: milestoneIds } }).select('milestone status');

    const enriched = milestones.map((m) => {
      const mTasks = tasks.filter((t) => t.milestone && t.milestone.toString() === m._id.toString());
      const total = mTasks.length;
      const completed = mTasks.filter((t) => t.status === 'done').length;
      const calculatedProgress = total > 0 ? Math.round((completed / total) * 100) : m.progress;

      return {
        ...m.toObject(),
        taskStats: {
          total,
          completed,
          calculatedProgress
        }
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    next(error);
  }
};

const updateMilestone = async (req, res, next) => {
  try {
    const { milestoneId } = req.params;
    const { title, description, dueDate, status, progress } = req.body;

    const milestone = await Milestone.findByIdAndUpdate(
      milestoneId,
      { title, description, dueDate, status, progress },
      { new: true, runValidators: true }
    );

    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found.' });
    }

    res.json({ success: true, milestone });
  } catch (error) {
    next(error);
  }
};

const deleteMilestone = async (req, res, next) => {
  try {
    const { milestoneId } = req.params;

    await Task.updateMany({ milestone: milestoneId }, { milestone: null });
    const milestone = await Milestone.findByIdAndDelete(milestoneId);

    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found.' });
    }

    res.json({ success: true, message: 'Milestone deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMilestone,
  getProjectMilestones,
  updateMilestone,
  deleteMilestone
};
