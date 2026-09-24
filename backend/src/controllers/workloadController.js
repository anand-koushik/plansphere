const Task = require('../models/Task');
const ProjectMember = require('../models/ProjectMember');
const Sprint = require('../models/Sprint');
const User = require('../models/User');

// Get team workload breakdown for project / sprint
const getWorkload = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { sprintId } = req.query;

    // Get project members
    const projectMembers = await ProjectMember.find({ project: projectId })
      .populate('user', 'name email avatar jobTitle department');

    // Build task query
    const taskQuery = { project: projectId };
    if (sprintId && sprintId !== 'all') {
      taskQuery.sprint = sprintId === 'backlog' ? null : sprintId;
    }

    const tasks = await Task.find(taskQuery)
      .populate('assignee', 'name email avatar')
      .populate('sprint', 'name status');

    const defaultCapacityPoints = 13; // Standard 2-week sprint capacity per developer
    const defaultCapacityHours = 40;

    const userWorkloadMap = {};

    // Initialize all project members
    projectMembers.forEach((pm) => {
      if (pm.user) {
        const uId = pm.user._id.toString();
        userWorkloadMap[uId] = {
          user: pm.user,
          role: pm.role,
          capacityPoints: defaultCapacityPoints,
          capacityHours: defaultCapacityHours,
          totalPoints: 0,
          completedPoints: 0,
          inProgressPoints: 0,
          todoPoints: 0,
          totalHours: 0,
          loggedHours: 0,
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          todoTasks: 0,
          blockedTasks: 0,
          tasks: []
        };
      }
    });

    // Unassigned container
    const unassigned = {
      user: { _id: null, name: 'Unassigned', email: '', avatar: '' },
      role: 'None',
      totalPoints: 0,
      totalHours: 0,
      totalTasks: 0,
      tasks: []
    };

    // Distribute tasks
    tasks.forEach((t) => {
      const pts = t.storyPoints || 0;
      const hrs = t.estimatedHours || 0;
      const logged = t.loggedHours || 0;

      if (!t.assignee) {
        unassigned.totalPoints += pts;
        unassigned.totalHours += hrs;
        unassigned.totalTasks += 1;
        unassigned.tasks.push({
          _id: t._id,
          taskNumber: t.taskNumber,
          title: t.title,
          status: t.status,
          priority: t.priority,
          storyPoints: pts,
          isBlocked: t.isBlocked
        });
        return;
      }

      const uId = t.assignee._id.toString();
      if (!userWorkloadMap[uId]) {
        userWorkloadMap[uId] = {
          user: t.assignee,
          role: 'Developer/Member',
          capacityPoints: defaultCapacityPoints,
          capacityHours: defaultCapacityHours,
          totalPoints: 0,
          completedPoints: 0,
          inProgressPoints: 0,
          todoPoints: 0,
          totalHours: 0,
          loggedHours: 0,
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          todoTasks: 0,
          blockedTasks: 0,
          tasks: []
        };
      }

      const u = userWorkloadMap[uId];
      u.totalPoints += pts;
      u.totalHours += hrs;
      u.loggedHours += logged;
      u.totalTasks += 1;

      if (t.status === 'done') {
        u.completedPoints += pts;
        u.completedTasks += 1;
      } else if (t.status === 'in_progress' || t.status === 'in_review') {
        u.inProgressPoints += pts;
        u.inProgressTasks += 1;
      } else {
        u.todoPoints += pts;
        u.todoTasks += 1;
      }

      if (t.isBlocked || t.status === 'blocked') {
        u.blockedTasks += 1;
      }

      u.tasks.push({
        _id: t._id,
        taskNumber: t.taskNumber,
        title: t.title,
        status: t.status,
        priority: t.priority,
        storyPoints: pts,
        isBlocked: t.isBlocked,
        dueDate: t.dueDate
      });
    });

    const membersWorkload = Object.values(userWorkloadMap).map((m) => {
      const utilization = Math.round((m.totalPoints / m.capacityPoints) * 100);
      let loadStatus = 'optimal'; // 'underloaded', 'optimal', 'overloaded'
      if (m.totalPoints > m.capacityPoints) {
        loadStatus = 'overloaded';
      } else if (m.totalPoints < 5 && m.totalTasks > 0) {
        loadStatus = 'low';
      } else if (m.totalTasks === 0) {
        loadStatus = 'idle';
      }

      return {
        ...m,
        utilization,
        loadStatus,
        isOverloaded: m.totalPoints > m.capacityPoints
      };
    });

    // Summary totals
    const totalTeamPoints = membersWorkload.reduce((sum, m) => sum + m.totalPoints, 0) + unassigned.totalPoints;
    const completedTeamPoints = membersWorkload.reduce((sum, m) => sum + m.completedPoints, 0);
    const overloadedCount = membersWorkload.filter((m) => m.isOverloaded).length;

    res.json({
      success: true,
      summary: {
        totalTeamMembers: membersWorkload.length,
        totalTeamPoints,
        completedTeamPoints,
        unassignedTasksCount: unassigned.totalTasks,
        unassignedPoints: unassigned.totalPoints,
        overloadedMembersCount: overloadedCount,
        overallCompletion: totalTeamPoints > 0 ? Math.round((completedTeamPoints / totalTeamPoints) * 100) : 0
      },
      members: membersWorkload,
      unassigned
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWorkload
};
