const express = require('express');
const {
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
} = require('../controllers/profile.controller');
const {
  getMyProfileStats,
  getMyProfileAchievements,
} = require('../controllers/profileInsights.controller');
const {
  validateProfileUpdate,
  validateAvatarUpload,
} = require('../middleware/validateProfile');

const router = express.Router();

router.get('/me', getMyProfile);
router.patch('/me', validateProfileUpdate, updateMyProfile);
router.post('/avatar', validateAvatarUpload, uploadMyAvatar);
router.get('/stats', getMyProfileStats);
router.get('/achievements', getMyProfileAchievements);

module.exports = router;
