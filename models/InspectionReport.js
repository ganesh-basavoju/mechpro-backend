const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  estimatedCost: { type: Number, required: true },
  severity: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Critical'], 
    default: 'Medium' 
  },
  recommendedAction: String
});

const inspectionReportSchema = new mongoose.Schema({
  bookingId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Booking', 
    required: true,
    unique: true 
  },
  mechanicId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Mechanic', 
    required: true 
  },
  customerId: { // Assuming User model is what we link to, though Booking usually has customer details embedded
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  }, 
  vehicleDetails: {
    make: String,
    model: String,
    plateNumber: String
  },
  issues: [issueSchema],
  totalEstimatedCost: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  mechanicNotes: String,
  userNotes: String
}, { timestamps: true });

module.exports = mongoose.model('InspectionReport', inspectionReportSchema);
