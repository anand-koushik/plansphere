const express = require('express');
const router = express.Router({ mergeParams: true });
const { getProjectReports } = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', requireProjectRole(['Project Manager', 'Team Lead', 'Developer/Member', 'Stakeholder']), getProjectReports);

module.exports = router;
