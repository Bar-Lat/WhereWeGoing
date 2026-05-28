const express = require('express');
const {
  getMyFriends,
  searchFriendCandidates,
  addFriend,
  removeFriend,
} = require('../controllers/friends.controller');

const router = express.Router();

router.get('/', getMyFriends);
router.get('/search', searchFriendCandidates);
router.post('/', addFriend);
router.delete('/:friendProfileId', removeFriend);

module.exports = router;
