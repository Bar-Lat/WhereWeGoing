const express = require('express');
const { generateTripPlan, getTripHistory } = require('../controllers/trip.controller');

const router = express.Router();

router.post('/generate', generateTripPlan);
router.get('/history', getTripHistory);

module.exports = router;