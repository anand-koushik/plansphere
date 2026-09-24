const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  addTaskAttachment,
  getMyAssignedTasks,
  deleteTask
} = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/rbac');
const upload = require('../middleware/upload');

router.use(authenticate);

// Current user assigned tasks across all projects
router.get('/assigned/me', getMyAssignedTasks);

router.route('/')
  .post(requireProjectRole(['Project Manager', 'Team Lead', 'Developer/Member']), createTask)
  .get(getProjectTasks);

router.route('/:taskId')
  .get(getTaskById)
  .put(requireProjectRole(['Project Manager', 'Team Lead', 'Developer/Member']), updateTask)
  .delete(requireProjectRole(['Project Manager', 'Team Lead']), deleteTask);

router.patch('/:taskId/status', requireProjectRole(['Project Manager', 'Team Lead', 'Developer/Member']), updateTaskStatus);

router.post('/:taskId/attachments', requireProjectRole(['Project Manager', 'Team Lead', 'Developer/Member']), upload.single('file'), addTaskAttachment);

module.exports = router;
