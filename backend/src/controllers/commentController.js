const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Issue = require('../models/Issue');
const Project = require('../models/Project');
const { parseMentionsAndNotify, logActivity } = require('../utils/activityLogger');

// Create comment
const createComment = async (req, res, next) => {
  try {
    const { projectId, taskId, issueId, content, attachments = [] } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content cannot be empty.' });
    }

    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Project ID is required.' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    let entityTitle = 'Discussion';
    let entityType = 'project';
    let link = `/projects/${projectId}`;

    if (taskId) {
      const task = await Task.findById(taskId);
      if (task) {
        entityTitle = `${task.taskNumber}: ${task.title}`;
        entityType = 'task';
        link = `/projects/${projectId}?tab=board&taskId=${task._id}`;
      }
    } else if (issueId) {
      const issue = await Issue.findById(issueId);
      if (issue) {
        entityTitle = `${issue.issueNumber}: ${issue.title}`;
        entityType = 'issue';
        link = `/projects/${projectId}?tab=issues&issueId=${issue._id}`;
      }
    }

    // Parse mentions and create notifications
    const mentionedIds = await parseMentionsAndNotify({
      text: content,
      senderId: req.user._id,
      projectId,
      organizationId: project.organization,
      entityType,
      entityTitle,
      link
    });

    const comment = await Comment.create({
      project: projectId,
      task: taskId || null,
      issue: issueId || null,
      author: req.user._id,
      content: content.trim(),
      mentions: mentionedIds,
      attachments
    });

    const populated = await Comment.findById(comment._id)
      .populate('author', 'name email avatar jobTitle')
      .populate('mentions', 'name email avatar');

    await logActivity({
      project: projectId,
      organization: project.organization,
      user: req.user._id,
      action: 'added_comment',
      entityType: 'comment',
      entityId: comment._id,
      entityTitle,
      details: { snippet: content.length > 50 ? content.substring(0, 50) + '...' : content }
    });

    res.status(201).json({ success: true, comment: populated });
  } catch (error) {
    next(error);
  }
};

// Get comments for task or issue
const getComments = async (req, res, next) => {
  try {
    const { taskId, issueId, projectId } = req.query;
    const query = {};

    if (taskId) query.task = taskId;
    if (issueId) query.issue = issueId;
    if (projectId && !taskId && !issueId) query.project = projectId;

    const comments = await Comment.find(query)
      .populate('author', 'name email avatar jobTitle department')
      .populate('mentions', 'name email avatar')
      .sort({ createdAt: 1 });

    res.json({ success: true, count: comments.length, data: comments });
  } catch (error) {
    next(error);
  }
};

// Delete comment (author or PM/Admin)
const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found.' });
    }

    // Only allow author or superuser
    if (comment.author.toString() !== req.user._id.toString() && req.user.systemRole !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'You can only delete your own comments.' });
    }

    await Comment.findByIdAndDelete(commentId);
    res.json({ success: true, message: 'Comment deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComment,
  getComments,
  deleteComment
};
