const express = require('express');
const router = express.Router();
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember
} = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');
const { requireProjectRole, requireOrgRole } = require('../middleware/rbac');

router.use(authenticate);

router.route('/')
  .post(createProject)
  .get(getProjects);

router.route('/:projectId')
  .get(getProjectById)
  .put(requireProjectRole(['Project Manager']), updateProject)
  .delete(requireProjectRole(['Project Manager']), deleteProject);

router.route('/:projectId/members')
  .get(getProjectMembers)
  .post(requireProjectRole(['Project Manager']), addProjectMember);

router.route('/:projectId/members/:memberId')
  .delete(requireProjectRole(['Project Manager']), removeProjectMember);

module.exports = router;
