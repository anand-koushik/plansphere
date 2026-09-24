const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  createIssue,
  getProjectIssues,
  getIssueById,
  updateIssue,
  resolveIssue,
  addIssueAttachment,
  deleteIssue
} = require('../controllers/issueController');
const { authenticate } = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/rbac');
const upload = require('../middleware/upload');

router.use(authenticate);

router.route('/')
  .post(requireProjectRole(['Project Manager', 'Team Lead', 'Developer/Member']), createIssue)
  .get(getProjectIssues);

router.route('/:issueId')
  .get(getIssueById)
  .put(requireProjectRole(['Project Manager', 'Team Lead', 'Developer/Member']), updateIssue)
  .delete(requireProjectRole(['Project Manager', 'Team Lead']), deleteIssue);

router.post('/:issueId/resolve', requireProjectRole(['Project Manager', 'Team Lead', 'Developer/Member']), resolveIssue);

router.post('/:issueId/attachments', requireProjectRole(['Project Manager', 'Team Lead', 'Developer/Member']), upload.single('file'), addIssueAttachment);

module.exports = router;
