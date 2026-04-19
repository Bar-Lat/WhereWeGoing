const express = require('express');
const {
  register,
} = require('../controllers/auth.controller');
const {
  validateRegister,
} = require('../middleware/validateAuth');

const router = express.Router();

// Endpointy autoryzacji konta.
router.post('/register', validateRegister, register);

module.exports = router;

