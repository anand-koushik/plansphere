const express = require('express');
const router = express.Router();
const { searchAll } = require('../controllers/searchController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', searchAll);

module.exports = router;
