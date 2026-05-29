const express = require('express');
const { generateTripPlan, getTripHistory, acceptTripPlan } = require('../controllers/trip.controller');
const {
  getTrips,
  getTripByIdHandler,
  deleteTripHandler,
  getTripParticipantsHandler,
  addTripParticipantHandler,
  removeTripParticipantHandler,
  getTripScheduleHandler,
  createTripActivityHandler,
  updateTripActivityHandler,
  deleteTripActivityHandler,
} = require('../controllers/trips.controller');

const router = express.Router();

router.post('/generate', generateTripPlan);
router.post('/accept', acceptTripPlan);
router.get('/history', getTripHistory);
router.get('/', getTrips);
router.get('/:id/schedule', getTripScheduleHandler);
router.get('/:id/participants', getTripParticipantsHandler);
router.post('/:id/participants', addTripParticipantHandler);
router.post('/:id/days/:dayId/activities', createTripActivityHandler);
router.put('/:id/activities/:activityId', updateTripActivityHandler);
router.delete('/:id/participants/:profileId', removeTripParticipantHandler);
router.delete('/:id/activities/:activityId', deleteTripActivityHandler);
router.get('/:id', getTripByIdHandler);
router.delete('/:id', deleteTripHandler);

module.exports = router;
