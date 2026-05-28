const express = require('express');
const { generateTripPlan, updateTripHandler } = require('../controllers/trip.controller');
const { getTrips, getTripByIdHandler, deleteTripHandler } = require('../controllers/trips.controller');

const router = express.Router();

// Generowanie planu wycieczki przez AI + zapis do bazy
router.post('/generate', generateTripPlan);

// Pobranie wszystkich wycieczek zalogowanego użytkownika
router.get('/', getTrips);

// Pobranie szczegółów jednej wycieczki
router.get('/:id', getTripByIdHandler);

// Usunięcie wycieczki
router.delete('/:id', deleteTripHandler);

// Aktualizacja wycieczki
router.put('/:id', updateTripHandler);

module.exports = router;
