const express = require('express');
const router = express.Router();
const { createComment, getComments, deleteComment } = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.route('/')
  .post(createComment)
  .get(getComments);

router.route('/:commentId')
  .delete(deleteComment);

module.exports = router;
