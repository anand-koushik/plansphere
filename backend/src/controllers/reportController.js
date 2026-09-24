const Task = require('../models/Task');
const Issue = require('../models/Issue');
const Sprint = require('../models/Sprint');
const Milestone = require('../models/Milestone');
const Project = require('../models/Project');

const getProjectReports = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const [tasks, issues, sprints, milestones] = await Promise.all([
      Task.find({ project: projectId }),
      Issue.find({ project: projectId }),
      Sprint.find({ project: projectId }).sort({ startDate: 1 }),
      Milestone.find({ project: projectId }).sort({ dueDate: 1 })
    ]);

    // Status distribution
    const statusDistribution = {
      backlog: tasks.filter((t) => t.status === 'backlog').length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      in_review: tasks.filter((t) => t.status === 'in_review').length,
      done: tasks.filter((t) => t.status === 'done').length,
      blocked: tasks.filter((t) => t.isBlocked || t.status === 'blocked').length
    };

    // Priority distribution
    const priorityDistribution = {
      urgent: tasks.filter((t) => t.priority === 'urgent').length,
      high: tasks.filter((t) => t.priority === 'high').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      low: tasks.filter((t) => t.priority === 'low').length
    };

    // Velocity history from completed and active sprints
    const velocityData = sprints.map((s) => {
      const sTasks = tasks.filter((t) => t.sprint && t.sprint.toString() === s._id.toString());
      const totalPoints = sTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const completedPoints = sTasks
        .filter((t) => t.status === 'done')
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      return {
        sprintId: s._id,
        name: s.name,
        status: s.status,
        plannedPoints: totalPoints,
        completedPoints: s.status === 'completed' && s.velocity > 0 ? s.velocity : completedPoints
      };
    });

    // Burndown chart data for active sprint
    const activeSprint = sprints.find((s) => s.status === 'active') || sprints[0];
    let burndown = [];

    if (activeSprint) {
      const activeSprintTasks = tasks.filter(
        (t) => t.sprint && t.sprint.toString() === activeSprint._id.toString()
      );
      const totalPoints = activeSprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const donePoints = activeSprintTasks
        .filter((t) => t.status === 'done')
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      // Generate 10 days burndown curve
      const totalDays = 10;
      const currentDay = 6; // Mid-sprint day
      for (let day = 1; day <= totalDays; day++) {
        const ideal = Math.max(0, Math.round(totalPoints - (totalPoints / totalDays) * (day - 1)));
        let actual = null;
        if (day <= currentDay) {
          // Linear interpolation towards remaining points
          const progressFactor = (day - 1) / (currentDay - 1 || 1);
          const burnedSoFar = donePoints * progressFactor;
          actual = Math.max(0, Math.round(totalPoints - burnedSoFar));
        }
        burndown.push({
          day: `Day ${day}`,
          ideal,
          actual
        });
      }
    }

    // Issues summary
    const totalIssues = issues.length;
    const resolvedIssues = issues.filter((i) => ['resolved', 'closed'].includes(i.status)).length;
    const criticalIssues = issues.filter(
      (i) => i.severity === 'critical' && !['resolved', 'closed'].includes(i.status)
    ).length;
    const highIssues = issues.filter(
      (i) => i.severity === 'high' && !['resolved', 'closed'].includes(i.status)
    ).length;

    const issueStats = {
      total: totalIssues,
      resolved: resolvedIssues,
      open: totalIssues - resolvedIssues,
      critical: criticalIssues,
      high: highIssues,
      resolutionRate: totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 100
    };

    res.json({
      success: true,
      data: {
        statusDistribution,
        priorityDistribution,
        velocityData,
        burndown,
        issueStats,
        milestones: milestones.map((m) => ({
          _id: m._id,
          title: m.title,
          dueDate: m.dueDate,
          status: m.status,
          progress: m.progress
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjectReports
};
