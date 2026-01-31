const CarouselSlide = require('../models/CarouselSlide');

// Add a new slide (only stores URL, upload handled by frontend)
exports.addSlide = async (req, res) => {
  try {
    const { imageUrl, order } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }

    const newSlide = new CarouselSlide({
      imageUrl,
      order: order || 0
    });

    await newSlide.save();
    res.status(201).json(newSlide);
  } catch (error) {
    console.error('Error adding slide:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get active slides for public home page
exports.getPublicSlides = async (req, res) => {
  try {
    const slides = await CarouselSlide.find({ isActive: true }).sort({ order: 1 });
    res.status(200).json(slides);
  } catch (error) {
    console.error('Error fetching public slides:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all slides for admin dashboard
exports.getAllSlides = async (req, res) => {
  try {
    const slides = await CarouselSlide.find().sort({ order: 1 });
    res.status(200).json(slides);
  } catch (error) {
    console.error('Error fetching all slides:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update slide (order or isActive status)
exports.updateSlide = async (req, res) => {
  try {
    const { id } = req.params;
    const { order, isActive } = req.body;

    const slide = await CarouselSlide.findById(id);
    if (!slide) {
      return res.status(404).json({ message: 'Slide not found' });
    }

    if (order !== undefined) slide.order = order;
    if (isActive !== undefined) slide.isActive = isActive;

    await slide.save();
    res.status(200).json(slide);
  } catch (error) {
    console.error('Error updating slide:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete slide
exports.deleteSlide = async (req, res) => {
  try {
    const { id } = req.params;
    const slide = await CarouselSlide.findByIdAndDelete(id);

    if (!slide) {
      return res.status(404).json({ message: 'Slide not found' });
    }

    res.status(200).json({ message: 'Slide deleted successfully' });
  } catch (error) {
    console.error('Error deleting slide:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
