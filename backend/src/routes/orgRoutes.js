const express = require('express');
const router = express.Router();
const {
  createOrg,
  getMyOrgs,
  getOrgById,
  updateOrg,
  getOrgMembers,
  inviteMember,
  updateMemberRole,
  removeMember
} = require('../controllers/orgController');
const { authenticate } = require('../middleware/auth');
const { requireOrgRole } = require('../middleware/rbac');

router.use(authenticate);

router.route('/')
  .post(createOrg)
  .get(getMyOrgs);

router.route('/:orgId')
  .get(getOrgById)
  .put(requireOrgRole(['Org Admin']), updateOrg);

router.route('/:orgId/members')
  .get(getOrgMembers);

router.route('/:orgId/invite')
  .post(requireOrgRole(['Org Admin']), inviteMember);

router.route('/:orgId/members/:memberId/role')
  .put(requireOrgRole(['Org Admin']), updateMemberRole);

router.route('/:orgId/members/:memberId')
  .delete(requireOrgRole(['Org Admin']), removeMember);

module.exports = router;
