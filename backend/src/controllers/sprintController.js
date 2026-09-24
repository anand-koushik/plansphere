const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { logActivity } = require('../utils/activityLogger');

// Create a new sprint
const createSprint = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, goal, startDate, endDate } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Sprint name is required.' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const sprint = await Sprint.create({
      project: projectId,
      name: name.trim(),
      goal: goal || '',
      startDate,
      endDate,
      status: 'planned'
    });

    await logActivity({
      project: projectId,
      organization: project.organization,
      user: req.user._id,
      action: 'created_sprint',
      entityType: 'sprint',
      entityId: sprint._id,
      entityTitle: sprint.name
    });

    res.status(201).json({ success: true, sprint });
  } catch (error) {
    next(error);
  }
};

// Get all sprints for a project with metrics
const getProjectSprints = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const sprints = await Sprint.find({ project: projectId }).sort({ createdAt: -1 });

    const sprintIds = sprints.map((s) => s._id);

    // Aggregate tasks per sprint
    const tasks = await Task.find({ sprint: { $in: sprintIds } }).select('sprint status storyPoints');

    const enriched = sprints.map((s) => {
      const sTasks = tasks.filter((t) => t.sprint && t.sprint.toString() === s._id.toString());
      const totalPoints = sTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const completedPoints = sTasks
        .filter((t) => t.status === 'done')
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const totalTasks = sTasks.length;
      const completedTasks = sTasks.filter((t) => t.status === 'done').length;

      return {
        ...s.toObject(),
        metrics: {
          totalPoints,
          completedPoints,
          totalTasks,
          completedTasks,
          completionPercent: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0
        }
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    next(error);
  }
};

// Start a sprint
const startSprint = async (req, res, next) => {
  try {
    const { sprintId } = req.params;
    const sprint = await Sprint.findById(sprintId);

    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found.' });
    }

    // Check if another sprint is active
    const activeSprint = await Sprint.findOne({
      project: sprint.project,
      status: 'active',
      _id: { $ne: sprintId }
    });

    if (activeSprint) {
      return res.status(400).json({
        success: false,
        message: `Sprint "${activeSprint.name}" is currently active. Please complete it before starting a new sprint.`
      });
    }

    sprint.status = 'active';
    if (!sprint.startDate) sprint.startDate = new Date();
    await sprint.save();

    const project = await Project.findById(sprint.project);
    await logActivity({
      project: sprint.project,
      organization: project ? project.organization : null,
      user: req.user._id,
      action: 'started_sprint',
      entityType: 'sprint',
      entityId: sprint._id,
      entityTitle: sprint.name
    });

    res.json({ success: true, message: `Sprint "${sprint.name}" is now active!`, sprint });
  } catch (error) {
    next(error);
  }
};

// Complete a sprint
const completeSprint = async (req, res, next) => {
  try {
    const { sprintId } = req.params;
    const { retrospective, moveIncompleteToNextSprintId } = req.body;

    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found.' });
    }

    // Calculate velocity from completed tasks
    const completedTasks = await Task.find({ sprint: sprintId, status: 'done' });
    const velocity = completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    sprint.status = 'completed';
    sprint.velocity = velocity;
    if (retrospective) sprint.retrospective = retrospective;
    if (!sprint.endDate) sprint.endDate = new Date();
    await sprint.save();

    // Handle incomplete tasks: move to designated next sprint or return to backlog (null)
    const incompleteTasks = await Task.find({
      sprint: sprintId,
      status: { $ne: 'done' }
    });

    if (incompleteTasks.length > 0) {
      const destinationSprint = moveIncompleteToNextSprintId || null;
      await Task.updateMany(
        { sprint: sprintId, status: { $ne: 'done' } },
        { sprint: destinationSprint }
      );
    }

    const project = await Project.findById(sprint.project);
    await logActivity({
      project: sprint.project,
      organization: project ? project.organization : null,
      user: req.user._id,
      action: 'completed_sprint',
      entityType: 'sprint',
      entityId: sprint._id,
      entityTitle: sprint.name,
      details: { velocity, completedTasksCount: completedTasks.length, rolledOverCount: incompleteTasks.length }
    });

    res.json({
      success: true,
      message: `Sprint completed with velocity of ${velocity} points!`,
      sprint,
      velocity,
      rolledOverCount: incompleteTasks.length
    });
  } catch (error) {
    next(error);
  }
};

// Update sprint
const updateSprint = async (req, res, next) => {
  try {
    const { sprintId } = req.params;
    const { name, goal, startDate, endDate, retrospective } = req.body;

    const sprint = await Sprint.findByIdAndUpdate(
      sprintId,
      { name, goal, startDate, endDate, retrospective },
      { new: true, runValidators: true }
    );

    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found.' });
    }

    res.json({ success: true, sprint });
  } catch (error) {
    next(error);
  }
};

// Delete sprint
const deleteSprint = async (req, res, next) => {
  try {
    const { sprintId } = req.params;

    // Reset tasks assigned to this sprint to backlog
    await Task.updateMany({ sprint: sprintId }, { sprint: null });

    const sprint = await Sprint.findByIdAndDelete(sprintId);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found.' });
    }

    res.json({ success: true, message: 'Sprint deleted and tasks moved to backlog.' });
  } catch (error) {
    next(error);
  }
};

// Move tasks (from backlog or another sprint) to target sprint (e.g. active sprint)
const moveTasksToSprint = async (req, res, next) => {
  try {
    const { projectId, sprintId } = req.params;
    const { taskIds, fromBacklog, fromSprintId } = req.body;

    let targetSprint = null;
    if (sprintId === 'active') {
      targetSprint = await Sprint.findOne({ project: projectId, status: 'active' });
      if (!targetSprint) {
        return res.status(400).json({ success: false, message: 'No sprint is currently active for this project.' });
      }
    } else {
      targetSprint = await Sprint.findById(sprintId);
      if (!targetSprint) {
        return res.status(404).json({ success: false, message: 'Target sprint not found.' });
      }
    }

    let filter = { project: projectId };

    if (Array.isArray(taskIds) && taskIds.length > 0) {
      filter._id = { $in: taskIds };
    } else if (fromBacklog) {
      filter.sprint = null;
    } else if (fromSprintId) {
      filter.sprint = fromSprintId;
    } else {
      filter.sprint = null;
    }

    const updateResult = await Task.updateMany(filter, { sprint: targetSprint._id });

    const project = await Project.findById(projectId);
    await logActivity({
      project: projectId,
      organization: project ? project.organization : null,
      user: req.user._id,
      action: 'moved_tasks_to_sprint',
      entityType: 'sprint',
      entityId: targetSprint._id,
      entityTitle: targetSprint.name,
      details: { modifiedCount: updateResult.modifiedCount }
    });

    res.json({
      success: true,
      message: `Successfully moved ${updateResult.modifiedCount} task(s) to "${targetSprint.name}".`,
      count: updateResult.modifiedCount,
      targetSprint
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSprint,
  getProjectSprints,
  startSprint,
  completeSprint,
  updateSprint,
  deleteSprint,
  moveTasksToSprint
};
