const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  createTeam,
  getOrgTeams,
  getTeamById,
  updateTeam,
  addTeamMember,
  removeTeamMember,
  deleteTeam
} = require('../controllers/teamController');
const { authenticate } = require('../middleware/auth');
const { requireOrgRole } = require('../middleware/rbac');

router.use(authenticate);

router.route('/')
  .post(requireOrgRole(['Org Admin']), createTeam)
  .get(getOrgTeams);

router.route('/:teamId')
  .get(getTeamById)
  .put(requireOrgRole(['Org Admin']), updateTeam)
  .delete(requireOrgRole(['Org Admin']), deleteTeam);

router.post('/:teamId/members', requireOrgRole(['Org Admin', 'Member']), addTeamMember);
router.delete('/:teamId/members/:userId', requireOrgRole(['Org Admin', 'Member']), removeTeamMember);

module.exports = router;
