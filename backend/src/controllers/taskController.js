const Task = require('../models/Task');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const { logActivity, parseMentionsAndNotify, createNotification } = require('../utils/activityLogger');

// Create a new task
const createTask = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const {
      title,
      description,
      type = 'task',
      status = 'todo',
      priority = 'medium',
      storyPoints = 1,
      sprint,
      milestone,
      assignee,
      startDate,
      dueDate,
      estimatedHours = 0,
      labels = [],
      dependencies = []
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required.' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Auto-generate task number: e.g. CLOUD-101
    const taskCount = await Task.countDocuments({ project: projectId });
    const taskNumber = `${project.key}-${101 + taskCount}`;

    // Get max order in that column
    const highestOrderTask = await Task.findOne({ project: projectId, status }).sort({ order: -1 });
    const order = highestOrderTask ? highestOrderTask.order + 1 : 0;

    const task = await Task.create({
      project: projectId,
      taskNumber,
      title: title.trim(),
      description: description || '',
      type,
      status,
      priority,
      storyPoints: Number(storyPoints) || 0,
      sprint: sprint || null,
      milestone: milestone || null,
      assignee: assignee || null,
      reporter: req.user._id,
      startDate,
      dueDate,
      estimatedHours: Number(estimatedHours) || 0,
      labels,
      dependencies,
      order
    });

    // Ensure assignee is enrolled as ProjectMember
    if (assignee) {
      await ProjectMember.findOneAndUpdate(
        { project: projectId, user: assignee },
        { $setOnInsert: { role: 'Developer/Member' } },
        { upsert: true }
      );
    }

    const populatedTask = await Task.findById(task._id)
      .populate('assignee', 'name email avatar jobTitle')
      .populate('reporter', 'name email avatar')
      .populate('sprint', 'name status')
      .populate('milestone', 'title status dueDate')
      .populate('dependencies', 'taskNumber title status');

    // Mentions & notification
    if (description) {
      await parseMentionsAndNotify({
        text: description,
        senderId: req.user._id,
        projectId,
        organizationId: project.organization,
        entityType: 'task',
        entityTitle: `${task.taskNumber}: ${task.title}`,
        link: `/projects/${projectId}?tab=board&taskId=${task._id}`
      });
    }

    if (assignee && assignee.toString() !== req.user._id.toString()) {
      await createNotification({
        recipient: assignee,
        sender: req.user._id,
        project: projectId,
        organization: project.organization,
        type: 'assignment',
        title: 'Task Assigned',
        message: `You were assigned to "${task.taskNumber}: ${task.title}"`,
        link: `/projects/${projectId}?tab=board&taskId=${task._id}`
      });
    }

    await logActivity({
      project: projectId,
      organization: project.organization,
      user: req.user._id,
      action: 'created_task',
      entityType: 'task',
      entityId: task._id,
      entityTitle: `${task.taskNumber}: ${task.title}`,
      details: { status: task.status, priority: task.priority, storyPoints: task.storyPoints }
    });

    res.status(201).json({ success: true, task: populatedTask });
  } catch (error) {
    next(error);
  }
};

// Get tasks with comprehensive filtering and search
const getProjectTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { sprint, status, priority, assignee, search, milestone, isBlocked, type } = req.query;

    const query = { project: projectId };

    if (sprint !== undefined) {
      if (sprint === 'null' || sprint === 'backlog') {
        query.sprint = null;
      } else if (sprint) {
        query.sprint = sprint;
      }
    }

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (type) {
      query.type = type;
    }

    if (assignee) {
      if (assignee === 'unassigned') {
        query.assignee = null;
      } else {
        query.assignee = assignee;
      }
    }

    if (milestone) {
      query.milestone = milestone;
    }

    if (isBlocked !== undefined) {
      query.isBlocked = isBlocked === 'true';
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { taskNumber: { $regex: search, $options: 'i' } },
        { labels: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const tasks = await Task.find(query)
      .populate('assignee', 'name email avatar jobTitle')
      .populate('reporter', 'name email avatar')
      .populate('sprint', 'name status')
      .populate('milestone', 'title status dueDate')
      .populate('dependencies', 'taskNumber title status')
      .sort({ order: 1, createdAt: -1 });

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    next(error);
  }
};

// Get single task by ID
const getTaskById = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId)
      .populate('assignee', 'name email avatar jobTitle department')
      .populate('reporter', 'name email avatar')
      .populate('sprint', 'name status startDate endDate')
      .populate('milestone', 'title status dueDate')
      .populate('dependencies', 'taskNumber title status priority assignee');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

// Update task details
const updateTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const previous = await Task.findById(taskId);

    if (!previous) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const {
      title,
      description,
      type,
      status,
      priority,
      storyPoints,
      sprint,
      milestone,
      assignee,
      startDate,
      dueDate,
      estimatedHours,
      loggedHours,
      labels,
      dependencies,
      isBlocked,
      blockerReason,
      order
    } = req.body;

    const task = await Task.findByIdAndUpdate(
      taskId,
      {
        title,
        description,
        type,
        status,
        priority,
        storyPoints,
        sprint,
        milestone,
        assignee,
        startDate,
        dueDate,
        estimatedHours,
        loggedHours,
        labels,
        dependencies,
        isBlocked,
        blockerReason,
        order
      },
      { new: true, runValidators: true }
    )
      .populate('assignee', 'name email avatar jobTitle')
      .populate('reporter', 'name email avatar')
      .populate('sprint', 'name status')
      .populate('milestone', 'title status dueDate')
      .populate('dependencies', 'taskNumber title status');

    const project = await Project.findById(task.project);

    // If assignee changed, notify new assignee
    if (assignee && (!previous.assignee || previous.assignee.toString() !== assignee.toString())) {
      await createNotification({
        recipient: assignee,
        sender: req.user._id,
        project: task.project,
        organization: project ? project.organization : null,
        type: 'assignment',
        title: 'Task Assigned',
        message: `You were assigned to "${task.taskNumber}: ${task.title}"`,
        link: `/projects/${task.project}?tab=board&taskId=${task._id}`
      });
    }

    // Check if status changed
    if (status && status !== previous.status) {
      await logActivity({
        project: task.project,
        organization: project ? project.organization : null,
        user: req.user._id,
        action: 'changed_task_status',
        entityType: 'task',
        entityId: task._id,
        entityTitle: `${task.taskNumber}: ${task.title}`,
        details: { from: previous.status, to: status }
      });
    }

    // Check if blocker changed
    if (isBlocked !== undefined && isBlocked !== previous.isBlocked) {
      await logActivity({
        project: task.project,
        organization: project ? project.organization : null,
        user: req.user._id,
        action: isBlocked ? 'blocked_task' : 'unblocked_task',
        entityType: 'task',
        entityId: task._id,
        entityTitle: `${task.taskNumber}: ${task.title}`,
        details: { blockerReason }
      });

      if (isBlocked && task.assignee) {
        await createNotification({
          recipient: task.assignee._id,
          sender: req.user._id,
          project: task.project,
          organization: project ? project.organization : null,
          type: 'blocker',
          title: 'Task Flagged as Blocked',
          message: `"${task.taskNumber}: ${task.title}" is blocked: ${blockerReason || 'No reason provided'}`,
          link: `/projects/${task.project}?tab=board&taskId=${task._id}`
        });
      }
    }

    // Auto-enroll assignee as ProjectMember if set
    if (assignee) {
      await ProjectMember.findOneAndUpdate(
        { project: task.project, user: assignee },
        { $setOnInsert: { role: 'Developer/Member' } },
        { upsert: true }
      );
    }

    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

// Get all tasks assigned to current user across all projects
const getMyAssignedTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ assignee: req.user._id })
      .populate('project', 'name key organization status')
      .populate('sprint', 'name status')
      .populate('milestone', 'title status dueDate')
      .sort({ updatedAt: -1 });

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    next(error);
  }
};

// Update task status (for kanban drag-and-drop)
const updateTaskStatus = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { status, order } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const previous = await Task.findById(taskId);
    if (!previous) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const task = await Task.findByIdAndUpdate(
      taskId,
      { status, ...(order !== undefined ? { order } : {}) },
      { new: true }
    )
      .populate('assignee', 'name email avatar')
      .populate('sprint', 'name status');

    const project = await Project.findById(task.project);

    await logActivity({
      project: task.project,
      organization: project ? project.organization : null,
      user: req.user._id,
      action: 'moved_task',
      entityType: 'task',
      entityId: task._id,
      entityTitle: `${task.taskNumber}: ${task.title}`,
      details: { from: previous.status, to: status }
    });

    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

// Add attachment to task
const addTaskAttachment = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const attachment = {
      name: req.file.originalname,
      url: fileUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };

    const task = await Task.findByIdAndUpdate(
      taskId,
      { $push: { attachments: attachment } },
      { new: true }
    )
      .populate('assignee', 'name email avatar')
      .populate('attachments.uploadedBy', 'name email avatar');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    res.json({ success: true, attachments: task.attachments });
  } catch (error) {
    next(error);
  }
};

// Delete task
const deleteTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findByIdAndDelete(taskId);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    // Clean up references to this task in other tasks' dependencies
    await Task.updateMany({ dependencies: taskId }, { $pull: { dependencies: taskId } });

    res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  addTaskAttachment,
  getMyAssignedTasks,
  deleteTask
};
