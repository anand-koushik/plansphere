const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  createSprint,
  getProjectSprints,
  startSprint,
  completeSprint,
  updateSprint,
  deleteSprint,
  moveTasksToSprint
} = require('../controllers/sprintController');
const { authenticate } = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/rbac');

router.use(authenticate);

router.post('/active/move-tasks', requireProjectRole(['Project Manager', 'Team Lead', 'Developer/Member']), (req, res, next) => {
  req.params.sprintId = 'active';
  moveTasksToSprint(req, res, next);
});

router.route('/')
  .post(requireProjectRole(['Project Manager', 'Team Lead']), createSprint)
  .get(getProjectSprints);

router.route('/:sprintId')
  .put(requireProjectRole(['Project Manager', 'Team Lead']), updateSprint)
  .delete(requireProjectRole(['Project Manager']), deleteSprint);

router.post('/:sprintId/start', requireProjectRole(['Project Manager', 'Team Lead']), startSprint);
router.post('/:sprintId/complete', requireProjectRole(['Project Manager', 'Team Lead']), completeSprint);
router.post('/:sprintId/move-tasks', requireProjectRole(['Project Manager', 'Team Lead', 'Developer/Member']), moveTasksToSprint);

module.exports = router;
