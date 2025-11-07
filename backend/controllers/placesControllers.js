// controllers/placesControllers.js
const Place = require('../models/placeModel');

// Fetch all places
exports.getAllPlaces = async (req, res) => {
  try {
    const places = await Place.find({}, '-image.data').lean(); // Exclude large binary data
    const host = req.get('host');
    const protocol = req.protocol;

    // Ensure each place has a valid imageUrl
    const mapped = places.map((p) => {
      if (p.image && p.image.contentType) {
        p.imageUrl = `${protocol}://${host}/api/places/${p._id}/image`;
      } else if (p.imageUrl) {
        // leave as-is (points to /images/... or external)
      } else {
        p.imageUrl = `${protocol}://${host}/images/placeholder.png`;
      }
      return p;
    });

    res.status(200).json(mapped);
  } catch (err) {
    console.error('Error fetching places:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Fetch image by place ID (stream binary or redirect to stored URL)
exports.getPlaceImage = async (req, res) => {
  try {
    const place = await Place.findById(req.params.id).lean();
    if (!place) return res.status(404).json({ message: 'Place not found' });

    if (place.image && place.image.data) {
      const contentType = place.image.contentType || 'image/jpeg';
      res.set('Content-Type', contentType);
      const imgData = place.image.data.buffer
        ? Buffer.from(place.image.data.buffer)
        : place.image.data;
      return res.send(imgData);
    }

    if (place.imageUrl) {
      return res.redirect(place.imageUrl);
    }

    return res.status(404).json({ message: 'Image not found' });
  } catch (err) {
    console.error('Error fetching image:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
