const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
  feedbackType: {
  type: String,
  enum: ['rating', 'cancellation'],
  default: 'rating'
}
});

module.exports = mongoose.model('Feedback', feedbackSchema);
