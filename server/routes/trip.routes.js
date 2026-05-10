const express = require('express');
const { generateTripPlan } = require('../controllers/trip.controller');

const router = express.Router();

router.post('/generate', generateTripPlan);

module.exports = router;