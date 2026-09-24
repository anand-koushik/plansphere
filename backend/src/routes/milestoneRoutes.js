const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  createMilestone,
  getProjectMilestones,
  updateMilestone,
  deleteMilestone
} = require('../controllers/milestoneController');
const { authenticate } = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/rbac');

router.use(authenticate);

router.route('/')
  .post(requireProjectRole(['Project Manager', 'Team Lead']), createMilestone)
  .get(getProjectMilestones);

router.route('/:milestoneId')
  .put(requireProjectRole(['Project Manager', 'Team Lead']), updateMilestone)
  .delete(requireProjectRole(['Project Manager']), deleteMilestone);

module.exports = router;
