const express = require('express');
const {
  listOffers,
  getOfferDetails,
  createTripFromOffer,
} = require('../controllers/inspiration.controller');

const router = express.Router();

router.get('/offers', listOffers);
router.get('/offers/:offerId', getOfferDetails);
router.post('/offers/:offerId/create-trip', createTripFromOffer);

module.exports = router;
