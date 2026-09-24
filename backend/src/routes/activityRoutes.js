const express = require('express');
const router = express.Router({ mergeParams: true });
const { getProjectActivities, getOrgActivities } = require('../controllers/activityController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/project/:projectId', getProjectActivities);
router.get('/org/:orgId', getOrgActivities);

module.exports = router;
