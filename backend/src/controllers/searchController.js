const Task = require('../models/Task');
const Issue = require('../models/Issue');
const Project = require('../models/Project');
const User = require('../models/User');

const searchAll = async (req, res, next) => {
  try {
    const { q, projectId, orgId } = req.query;

    if (!q || !q.trim()) {
      return res.json({ success: true, results: { tasks: [], issues: [], projects: [], users: [] } });
    }

    const regex = new RegExp(q.trim(), 'i');

    const projectQuery = {};
    if (orgId) projectQuery.organization = orgId;
    projectQuery.$or = [{ name: regex }, { key: regex }, { description: regex }];

    const taskQuery = {};
    if (projectId) taskQuery.project = projectId;
    taskQuery.$or = [{ title: regex }, { taskNumber: regex }, { description: regex }, { labels: regex }];

    const issueQuery = {};
    if (projectId) issueQuery.project = projectId;
    issueQuery.$or = [{ title: regex }, { issueNumber: regex }, { description: regex }, { reproductionSteps: regex }];

    const userQuery = {
      $or: [{ name: regex }, { email: regex }, { jobTitle: regex }]
    };

    const [tasks, issues, projects, users] = await Promise.all([
      Task.find(taskQuery)
        .populate('project', 'name key')
        .populate('assignee', 'name email avatar')
        .limit(10),
      Issue.find(issueQuery)
        .populate('project', 'name key')
        .populate('assignee', 'name email avatar')
        .limit(10),
      Project.find(projectQuery).limit(5),
      User.find(userQuery).select('name email avatar jobTitle department').limit(5)
    ]);

    res.json({
      success: true,
      query: q,
      results: {
        tasks,
        issues,
        projects,
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchAll
};
