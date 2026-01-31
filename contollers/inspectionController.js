const InspectionReport = require('../models/InspectionReport');
const Booking = require('../models/Bookings');
const User = require('../models/User');
const { sendNotificationToUser, sendNotificationToMechanic } = require('../socket/socket');
// Assuming fcmService is available for push notifications
const fcmService = require('../services/fcmService'); 

// Create Inspection Report (Mechanic)
exports.createReport = async (req, res) => {
  try {
    const { bookingId, issues, mechanicNotes } = req.body;
    const mechanicId = req.mechanic.id;

    // 1. Verify Booking
    const booking = await Booking.findOne({ _id: bookingId, mechanic: mechanicId });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // 2. Validate Status Check (Must be 'vehicle_received' usually, but let's allow flexibility if they missed a click)
    // Strict flow: confirmed -> vehicle_received -> inspection
    if (!['confirmed', 'vehicle_received'].includes(booking.status)) {
       // Optional: Enforce strict flow
       // return res.status(400).json({ message: 'Vehicle must be received before inspection' });
    }

    // 3. Calculate Total Cost
    const totalEstimatedCost = issues.reduce((sum, issue) => sum + Number(issue.estimatedCost), 0);

    // 4. Find Customer ID (needed for referencing User model if not in booking)
    // Booking has customer.phone, find User by phone
    const user = await User.findOne({ phone: booking.customer.phone });

    // 5. Create Report
    const report = new InspectionReport({
      bookingId,
      mechanicId,
      customerId: user ? user._id : null,
      vehicleDetails: {
        make: booking.vehicle.make,
        model: booking.vehicle.model,
        plateNumber: booking.vehicle.plateNumber
      },
      issues,
      totalEstimatedCost,
      mechanicNotes,
      status: 'pending'
    });

    await report.save();

    // 6. Update Booking Status
    booking.status = 'inspection_completed';
    await booking.save();

    // 7. Notify User
    if (user) {
        // Socket
        // Assuming socket.js exports a function or we emit via global io if attached to req or imported
        // Using the pattern from MechanicControllers.js (sendNotificationToUser)
        // Ensure this function exists or is imported
        if (typeof sendNotificationToUser === 'function') {
            sendNotificationToUser(user._id.toString(), {
                type: 'inspection_received',
                status: 'inspection_completed', // Explicitly send status update
                message: `Inspection report ready for ${booking.vehicle.model}`,
                bookingId: booking._id,
                reportId: report._id
            });
        }
        
        // FCM
        if (user.fcmToken) {
            fcmService.sendToUser(user.fcmToken, {
                title: 'Inspection Completed',
                body: `Mechanic has submitted the inspection report for ${booking.vehicle.model}. Please review and approve.`,
                type: 'inspection_received',
                bookingId: booking._id
            }, "user", user._id);
        }
    }

    res.status(201).json(report);

  } catch (error) {
    console.error('Error creating inspection report:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Report by Booking ID (User & Mechanic)
exports.getReport = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const report = await InspectionReport.findOne({ bookingId });
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// User Decision (Approve/Reject)
exports.submitDecision = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { decision, userNotes } = req.body; // decision: 'approved' | 'rejected'
    const userId = req.user.id;

    console.log(`Submit Decision Request: Report ${reportId}, Decision ${decision}, User ${userId}`);

    const report = await InspectionReport.findById(reportId);
    if (!report) {
      console.log('Report not found');
      return res.status(404).json({ message: 'Report not found' });
    }

    // Verify ownership (optional but recommended)
    if (report.customerId && report.customerId.toString() !== userId.toString()) {
        console.log(`Auth failed: Report Customer ${report.customerId} vs Request User ${userId}`);
        return res.status(403).json({ message: 'Not authorized' });
    }

    if (report.status !== 'pending') {
        console.log(`Report status is not pending: ${report.status}`);
        return res.status(400).json({ message: 'Decision already made' });
    }

    report.status = decision;
    report.userNotes = userNotes;
    await report.save();
    console.log('Report updated');

    // Update Booking Status
    const booking = await Booking.findById(report.bookingId);
    if (booking) {
        booking.status = decision === 'approved' ? 'user_approved' : 'user_rejected';
        await booking.save();
        console.log(`Booking ${booking._id} status updated to ${booking.status}`);

        // Notify Mechanic
        if (typeof sendNotificationToMechanic === 'function') {
            const mechanicId = booking.mechanic ? booking.mechanic.toString() : null;
            if (mechanicId) {
                 sendNotificationToMechanic(mechanicId, {
                    type: 'inspection_decision',
                    status: booking.status,
                    message: `Customer has ${decision} the inspection.`,
                    bookingId: booking._id,
                    updatedData: { status: booking.status }
                });
            }
        }
    }

    res.json({ message: `Report ${decision}`, report });

  } catch (error) {
    console.error('Error submitting decision:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
