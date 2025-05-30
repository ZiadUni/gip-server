const Venue = require('../models/Venue');

const updateVenue = async (req, res) => {
  try {
    const venue = await Venue.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!venue) {
      return res.status(404).json({ error: res.__('venues.notFound') });
    }
    res.json({ message: res.__('venues.updated'), venue });
  } catch (err) {
    res.status(500).json({ error: res.__('venues.updateFail') });
  }
};

module.exports = {
  updateVenue
};
