const Activity = require('../models/Activity');

// Get project activity feed
const getProjectActivities = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { entityType, limit = 50, page = 1 } = req.query;

    const query = { project: projectId };
    if (entityType) query.entityType = entityType;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const activities = await Activity.find(query)
      .populate('user', 'name email avatar jobTitle')
      .populate('project', 'name key')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Activity.countDocuments(query);

    res.json({
      success: true,
      count: activities.length,
      total,
      data: activities
    });
  } catch (error) {
    next(error);
  }
};

// Get organization activity feed
const getOrgActivities = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    const query = { organization: orgId };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const activities = await Activity.find(query)
      .populate('user', 'name email avatar jobTitle')
      .populate('project', 'name key')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Activity.countDocuments(query);

    res.json({
      success: true,
      count: activities.length,
      total,
      data: activities
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjectActivities,
  getOrgActivities
};
