const mongoose = require('mongoose');

const carouselSlideSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CarouselSlide', carouselSlideSchema);
