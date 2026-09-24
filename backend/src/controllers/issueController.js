const Issue = require('../models/Issue');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const { logActivity, parseMentionsAndNotify, createNotification } = require('../utils/activityLogger');

// Create a new issue
const createIssue = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const {
      title,
      description,
      severity = 'medium',
      priority = 'medium',
      status = 'open',
      reproductionSteps,
      expectedBehavior,
      actualBehavior,
      task,
      assignee
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Issue title is required.' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Auto-generate issue number: e.g. CLOUD-BUG-1
    const issueCount = await Issue.countDocuments({ project: projectId });
    const issueNumber = `${project.key}-BUG-${issueCount + 1}`;

    const issue = await Issue.create({
      project: projectId,
      task: task || null,
      issueNumber,
      title: title.trim(),
      description: description || '',
      severity,
      priority,
      status,
      reproductionSteps: reproductionSteps || '',
      expectedBehavior: expectedBehavior || '',
      actualBehavior: actualBehavior || '',
      assignee: assignee || null,
      reporter: req.user._id,
      statusHistory: [
        {
          status: status || 'open',
          changedBy: req.user._id,
          changedAt: new Date(),
          note: 'Issue reported'
        }
      ]
    });

    if (assignee) {
      await ProjectMember.findOneAndUpdate(
        { project: projectId, user: assignee },
        { $setOnInsert: { role: 'Developer/Member' } },
        { upsert: true }
      );
    }

    const populated = await Issue.findById(issue._id)
      .populate('assignee', 'name email avatar jobTitle')
      .populate('reporter', 'name email avatar')
      .populate('task', 'taskNumber title');

    // Mentions & notification
    if (description) {
      await parseMentionsAndNotify({
        text: description,
        senderId: req.user._id,
        projectId,
        organizationId: project.organization,
        entityType: 'issue',
        entityTitle: `${issue.issueNumber}: ${issue.title}`,
        link: `/projects/${projectId}?tab=issues&issueId=${issue._id}`
      });
    }

    if (assignee && assignee.toString() !== req.user._id.toString()) {
      await createNotification({
        recipient: assignee,
        sender: req.user._id,
        project: projectId,
        organization: project.organization,
        type: 'assignment',
        title: 'Issue Assigned',
        message: `You were assigned to bug "${issue.issueNumber}: ${issue.title}" (${severity})`,
        link: `/projects/${projectId}?tab=issues&issueId=${issue._id}`
      });
    }

    await logActivity({
      project: projectId,
      organization: project.organization,
      user: req.user._id,
      action: 'reported_issue',
      entityType: 'issue',
      entityId: issue._id,
      entityTitle: `${issue.issueNumber}: ${issue.title}`,
      details: { severity, priority, status }
    });

    res.status(201).json({ success: true, issue: populated });
  } catch (error) {
    next(error);
  }
};

// Get issues with filters
const getProjectIssues = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, severity, priority, assignee, search } = req.query;

    const query = { project: projectId };

    if (status) {
      query.status = status;
    }

    if (severity) {
      query.severity = severity;
    }

    if (priority) {
      query.priority = priority;
    }

    if (assignee) {
      if (assignee === 'unassigned') {
        query.assignee = null;
      } else {
        query.assignee = assignee;
      }
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { issueNumber: { $regex: search, $options: 'i' } },
        { reproductionSteps: { $regex: search, $options: 'i' } }
      ];
    }

    const issues = await Issue.find(query)
      .populate('assignee', 'name email avatar jobTitle')
      .populate('reporter', 'name email avatar')
      .populate('resolvedBy', 'name email avatar')
      .populate('task', 'taskNumber title')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: issues.length, data: issues });
  } catch (error) {
    next(error);
  }
};

// Get single issue by ID
const getIssueById = async (req, res, next) => {
  try {
    const { issueId } = req.params;
    const issue = await Issue.findById(issueId)
      .populate('assignee', 'name email avatar jobTitle department')
      .populate('reporter', 'name email avatar')
      .populate('resolvedBy', 'name email avatar')
      .populate('task', 'taskNumber title status')
      .populate('statusHistory.changedBy', 'name email avatar');

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    res.json({ success: true, issue });
  } catch (error) {
    next(error);
  }
};

// Update issue status & details (records in statusHistory)
const updateIssue = async (req, res, next) => {
  try {
    const { issueId } = req.params;
    const previous = await Issue.findById(issueId);

    if (!previous) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    const {
      title,
      description,
      severity,
      priority,
      status,
      reproductionSteps,
      expectedBehavior,
      actualBehavior,
      resolutionNotes,
      assignee,
      statusChangeNote
    } = req.body;

    const updateData = {
      title,
      description,
      severity,
      priority,
      reproductionSteps,
      expectedBehavior,
      actualBehavior,
      resolutionNotes,
      assignee
    };

    if (status && status !== previous.status) {
      updateData.status = status;
      updateData.$push = {
        statusHistory: {
          status,
          changedBy: req.user._id,
          changedAt: new Date(),
          note: statusChangeNote || `Status changed from ${previous.status} to ${status}`
        }
      };

      if (['resolved', 'closed'].includes(status)) {
        updateData.resolvedBy = req.user._id;
        updateData.resolvedAt = new Date();
      }
    }

    const issue = await Issue.findByIdAndUpdate(issueId, updateData, { new: true, runValidators: true })
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('resolvedBy', 'name email avatar')
      .populate('statusHistory.changedBy', 'name email avatar');

    const project = await Project.findById(issue.project);

    if (status && status !== previous.status) {
      await logActivity({
        project: issue.project,
        organization: project ? project.organization : null,
        user: req.user._id,
        action: 'updated_issue_status',
        entityType: 'issue',
        entityId: issue._id,
        entityTitle: `${issue.issueNumber}: ${issue.title}`,
        details: { from: previous.status, to: status, note: statusChangeNote }
      });
    }

    if (assignee) {
      await ProjectMember.findOneAndUpdate(
        { project: issue.project, user: assignee },
        { $setOnInsert: { role: 'Developer/Member' } },
        { upsert: true }
      );
    }

    res.json({ success: true, issue });
  } catch (error) {
    next(error);
  }
};

// Resolve issue with explicit resolution notes
const resolveIssue = async (req, res, next) => {
  try {
    const { issueId } = req.params;
    const { resolutionNotes } = req.body;

    const previous = await Issue.findById(issueId);
    if (!previous) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    const issue = await Issue.findByIdAndUpdate(
      issueId,
      {
        status: 'resolved',
        resolutionNotes: resolutionNotes || 'Resolved as requested',
        resolvedBy: req.user._id,
        resolvedAt: new Date(),
        $push: {
          statusHistory: {
            status: 'resolved',
            changedBy: req.user._id,
            changedAt: new Date(),
            note: resolutionNotes ? `Resolved: ${resolutionNotes}` : 'Issue marked as resolved'
          }
        }
      },
      { new: true }
    )
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('resolvedBy', 'name email avatar')
      .populate('statusHistory.changedBy', 'name email avatar');

    const project = await Project.findById(issue.project);
    await logActivity({
      project: issue.project,
      organization: project ? project.organization : null,
      user: req.user._id,
      action: 'resolved_issue',
      entityType: 'issue',
      entityId: issue._id,
      entityTitle: `${issue.issueNumber}: ${issue.title}`,
      details: { resolutionNotes }
    });

    if (issue.reporter && issue.reporter._id.toString() !== req.user._id.toString()) {
      await createNotification({
        recipient: issue.reporter._id,
        sender: req.user._id,
        project: issue.project,
        organization: project ? project.organization : null,
        type: 'status_change',
        title: 'Issue Resolved',
        message: `Your issue "${issue.issueNumber}: ${issue.title}" was resolved.`,
        link: `/projects/${issue.project}?tab=issues&issueId=${issue._id}`
      });
    }

    res.json({ success: true, issue });
  } catch (error) {
    next(error);
  }
};

// Add attachment to issue
const addIssueAttachment = async (req, res, next) => {
  try {
    const { issueId } = req.params;
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

    const issue = await Issue.findByIdAndUpdate(
      issueId,
      { $push: { attachments: attachment } },
      { new: true }
    ).populate('attachments.uploadedBy', 'name email avatar');

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    res.json({ success: true, attachments: issue.attachments });
  } catch (error) {
    next(error);
  }
};

// Delete issue
const deleteIssue = async (req, res, next) => {
  try {
    const { issueId } = req.params;
    const issue = await Issue.findByIdAndDelete(issueId);

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    res.json({ success: true, message: 'Issue deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIssue,
  getProjectIssues,
  getIssueById,
  updateIssue,
  resolveIssue,
  addIssueAttachment,
  deleteIssue
};
