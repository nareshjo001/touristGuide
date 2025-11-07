// routes/placeRoutes.js
const express = require('express');
const router = express.Router();
const { getAllPlaces, getPlaceImage } = require('../controllers/placesControllers');

// GET all places
router.get('/', getAllPlaces);

// GET image for a place (binary or redirect)
router.get('/:id/image', getPlaceImage);

module.exports = router;
