const express = require('express');
const {
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
} = require('../controllers/profile.controller');
const {
  validateProfileUpdate,
  validateAvatarUpload,
} = require('../middleware/validateProfile');

const router = express.Router();

// Endpointy profilu zalogowanego uzytkownika.
router.get('/me', getMyProfile);
router.patch('/me', validateProfileUpdate, updateMyProfile);
router.post('/avatar', validateAvatarUpload, uploadMyAvatar);

module.exports = router;

