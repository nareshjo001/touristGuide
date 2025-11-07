const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String },
  district: { type: String },
  type: { type: String },
  image: {
    data: Buffer,
    contentType: String
  },
  imageUrl: { type: String },
  description: { type: String },
  related_places: [String]
}, { timestamps: true });

module.exports = mongoose.model('Place', placeSchema);
