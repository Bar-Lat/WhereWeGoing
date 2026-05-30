const express = require('express');
const { 
  generateTripPlan, 
  acceptTripPlan,
  updateTripHandler, 
  getTripHistory,
  refineTripPlanHandler,
} = require('../controllers/trip.controller');

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
  reorderTripDayActivitiesHandler,
} = require('../controllers/trips.controller');

const router = express.Router();

router.post('/generate', generateTripPlan);
router.post('/accept', acceptTripPlan);
router.post('/refine-plan', refineTripPlanHandler);
router.get('/history', getTripHistory);
router.get('/', getTrips);

router.get('/:id/schedule', getTripScheduleHandler);
router.get('/:id/participants', getTripParticipantsHandler);
router.post('/:id/participants', addTripParticipantHandler);
router.delete('/:id/participants/:profileId', removeTripParticipantHandler);

router.post('/:id/days/:dayId/activities', createTripActivityHandler);
router.put('/:id/activities/:activityId', updateTripActivityHandler);
router.delete('/:id/activities/:activityId', deleteTripActivityHandler);

router.put('/:id/days/:dayId/activities/reorder', reorderTripDayActivitiesHandler);

router.get('/:id', getTripByIdHandler);
router.put('/:id', updateTripHandler); // Aktualizacja planu
router.delete('/:id', deleteTripHandler);

module.exports = router;