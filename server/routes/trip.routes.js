const express = require('express');
// Importujemy wszystko, co potrzebne, z odpowiednich kontrolerów
const { 
  generateTripPlan, 
  updateTripHandler 
} = require('../controllers/trip.controller');

const { 
  getTrips, 
  getTripByIdHandler, 
  deleteTripHandler,
  getTripParticipantsHandler,
  addTripParticipantHandler,
  removeTripParticipantHandler 
} = require('../controllers/trips.controller');

const router = express.Router();

// Trasy generowania i zarządzania wycieczkami
router.post('/generate', generateTripPlan);
router.get('/', getTrips);
router.get('/:id', getTripByIdHandler);
router.delete('/:id', deleteTripHandler);
router.put('/:id', updateTripHandler); // Aktualizacja planu i budżetu

// Trasy zarządzania uczestnikami (Te funkcje muszą istnieć w trips.controller.js!)
router.get('/:id/participants', getTripParticipantsHandler);
router.post('/:id/participants', addTripParticipantHandler);
router.delete('/:id/participants/:profileId', removeTripParticipantHandler);

module.exports = router;