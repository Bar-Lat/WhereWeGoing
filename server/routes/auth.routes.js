const express = require('express');
const {
  register,
  login,
  refreshSession,
  logout,
} = require('../controllers/auth.controller');
const {
  validateRegister,
  validateLogin,
  validateRefresh,
  validateLogout,
} = require('../middleware/validateAuth');

const router = express.Router();

// Endpointy autoryzacji konta.
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/refresh', validateRefresh, refreshSession);
router.post('/logout', validateLogout, logout);

module.exports = router;

