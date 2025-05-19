const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  rating: {
  type: Number,
  min: 1,
  max: 5,
  required: function () {
    return this.feedbackType === 'rating';
  }
},
  comment: { type: String, maxlength: 1000 },
  flagged: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  feedbackType: {
  type: String,
  enum: ['rating', 'cancellation'],
  default: 'rating'
}
});

module.exports = mongoose.model('Feedback', feedbackSchema);
