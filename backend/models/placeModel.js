const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    district: { type: String, required: true },
    type: { type: String, required: true },
    imageUrl: { type: String, required: true },
    description: { type: String, required: true },
    related_places: [String]
});

module.exports = mongoose.model('Place', placeSchema);