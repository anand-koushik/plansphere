const express = require('express');
const router = express.Router({ mergeParams: true });
const { getWorkload } = require('../controllers/workloadController');
const { authenticate } = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', requireProjectRole(['Project Manager', 'Team Lead', 'Developer/Member', 'Stakeholder']), getWorkload);

module.exports = router;
