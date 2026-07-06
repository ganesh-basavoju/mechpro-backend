const Testimonial = require('../models/Testimonial');

// Add a new testimonial (image upload handled by the frontend via imgBB)
exports.addTestimonial = async (req, res) => {
  try {
    const { name, role, text, image, order } = req.body;

    if (!name || !text) {
      return res.status(400).json({ message: 'Name and review text are required' });
    }

    const newTestimonial = new Testimonial({
      name,
      role: role || '',
      text,
      image: image || undefined, // fall back to schema default when empty
      order: order || 0
    });

    await newTestimonial.save();
    res.status(201).json(newTestimonial);
  } catch (error) {
    console.error('Error adding testimonial:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get active testimonials for the public home page
exports.getPublicTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    res.status(200).json(testimonials);
  } catch (error) {
    console.error('Error fetching public testimonials:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all testimonials for the admin dashboard
exports.getAllTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ order: 1, createdAt: 1 });
    res.status(200).json(testimonials);
  } catch (error) {
    console.error('Error fetching all testimonials:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update testimonial (any editable field)
exports.updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, text, image, order, isActive } = req.body;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }

    if (name !== undefined) testimonial.name = name;
    if (role !== undefined) testimonial.role = role;
    if (text !== undefined) testimonial.text = text;
    if (image !== undefined && image !== '') testimonial.image = image;
    if (order !== undefined) testimonial.order = order;
    if (isActive !== undefined) testimonial.isActive = isActive;

    await testimonial.save();
    res.status(200).json(testimonial);
  } catch (error) {
    console.error('Error updating testimonial:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete testimonial
exports.deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await Testimonial.findByIdAndDelete(id);

    if (!testimonial) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }

    res.status(200).json({ message: 'Testimonial deleted successfully' });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
