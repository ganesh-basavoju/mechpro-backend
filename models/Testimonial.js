const mongoose = require('mongoose');

// Homepage customer review / testimonial, editable from the Super Admin CMS.
const testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    default: '',
    trim: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    default: 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Testimonial', testimonialSchema);
