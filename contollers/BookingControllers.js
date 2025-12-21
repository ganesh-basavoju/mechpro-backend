const Booking = require('../models/Bookings');
const Mechanic = require('../models/Mechanic');
const User = require('../models/User');
const { sendNotificationToUser } = require('../socket/socket');
const fcmService = require('../services/fcmService');

// Get all bookings
exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('mechanic', 'name phone rating')
            .sort({ createdAt: -1 });

        // Transform data to match frontend structure
        const transformedBookings = bookings.map(booking => ({
            _id: booking._id,
            customer: booking.customer,
            vehicle: booking.vehicle,
            serviceType: booking.serviceType,
            mechanic: booking.mechanic ? {
                _id: booking.mechanic._id,
                name: booking.mechanic.name,
                phone: booking.mechanic.phone,
                rating: booking.mechanic.rating || 0
            } : {
                _id: null,
                name: 'Not Assigned',
                phone: 'N/A',
                rating: 0
            },
            dateTime: booking.dateTime,
            formattedDateTime: booking.dateTime.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            amount: booking.amount,
            status: booking.status,
            spareParts: booking.spareParts || [],
            notes: booking.notes || ''
        }));

        res.status(200).json({
            success: true,
            data: transformedBookings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching bookings',
            error: error.message
        });
    }
};

// Get booking by ID
exports.getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('mechanic', 'name phone rating');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Transform the booking data
        const transformedBooking = {
            _id: booking._id,
            customer: booking.customer,
            vehicle: booking.vehicle,
            serviceType: booking.serviceType,
            mechanic: booking.mechanic ? {
                _id: booking.mechanic._id,
                name: booking.mechanic.name,
                phone: booking.mechanic.phone,
                rating: booking.mechanic.rating || 0
            } : {
                _id: null,
                name: 'Not Assigned',
                phone: 'N/A',
                rating: 0
            },
            dateTime: booking.dateTime,
            formattedDateTime: booking.dateTime.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            amount: booking.amount,
            status: booking.status,
            spareParts: booking.spareParts || [],
            notes: booking.notes || ''
        };

        res.status(200).json({
            success: true,
            data: transformedBooking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching booking',
            error: error.message
        });
    }
};

// Handle booking actions
exports.handleBookingAction = async (req, res) => {
    try {
        const { bookingId, action } = req.body;
        console.log("Booking ID:", bookingId);
        console.log("Action:", action);

        let updateData = {};
        let message = '';

        switch (action) {
            case 'accept':
                updateData = { status: 'confirmed' };
                message = 'Booking accepted';
                break;
            case 'decline':
                updateData = { status: 'cancelled' };
                message = 'Booking declined';
                break;
            case 'start':
                updateData = { status: 'in-progress' };
                message = 'Service started';
                break;
            case 'complete':
                updateData = { status: 'completed' };
                message = 'Service completed';
                break;
            case 'cancel':
                updateData = { status: 'cancelled' };
                message = 'Booking cancelled';
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action'
                });
        }

        const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            updateData,
            { new: true }
        ).populate('mechanic', 'name phone rating');

        if (!updatedBooking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Transform the updated booking
        const transformedBooking = {
            _id: updatedBooking._id,
            customer: updatedBooking.customer,
            vehicle: updatedBooking.vehicle,
            serviceType: updatedBooking.serviceType,
            mechanic: updatedBooking.mechanic ? {
                _id: updatedBooking.mechanic._id,
                name: updatedBooking.mechanic.name,
                phone: updatedBooking.mechanic.phone,
                rating: updatedBooking.mechanic.rating || 0
            } : {
                _id: null,
                name: 'Not Assigned',
                phone: 'N/A',
                rating: 0
            },
            dateTime: updatedBooking.dateTime,
            formattedDateTime: updatedBooking.dateTime.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            amount: updatedBooking.amount,
            status: updatedBooking.status,
            spareParts: updatedBooking.spareParts || [],
            notes: updatedBooking.notes || ''
        };

        res.status(200).json({
            success: true,
            message,
            data: transformedBooking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error performing booking action',
            error: error.message
        });
    }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
    try {
        const { bookingId, status } = req.body;
        console.log("Booking ID:", bookingId);
        console.log("Status:", status);

        const validStatuses = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            { status },
            { new: true }
        ).populate('mechanic', 'name phone rating');

        if (!updatedBooking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Get user details for notification
        const customer = await User.findOne({ phone: updatedBooking.customer.phone });
        
        // Send Socket.IO real-time update to user
        if (customer && customer._id) {
            sendNotificationToUser(customer._id.toString(), {
                type: 'booking_update',
                bookingId: bookingId,
                status: status,
                message: `Your booking status has been updated to ${status}`,
                updatedData: {
                    status: status,
                    serviceType: updatedBooking.serviceType,
                    vehicle: updatedBooking.vehicle,
                    dateTime: updatedBooking.dateTime,
                    amount: updatedBooking.amount
                }
            });
            console.log(`✅ Socket notification sent to user ${customer._id}`);
        }

        // Send FCM notification
        const fcmToken = customer?.fcmToken;
        if (fcmToken && fcmToken !== "") {
            fcmService.sendToUser(fcmToken, {
                title: "Booking Status Updated",
                body: `Your booking status has been updated to ${status} for ${updatedBooking?.vehicle?.make || "your vehicle"}`,
                type: "booking_update",
                bookingId: bookingId
            }, "user", customer._id);
            console.log(`✅ FCM notification sent to user ${customer._id}`);
        }

        // Transform the updated booking
        const transformedBooking = {
            _id: updatedBooking._id,
            customer: updatedBooking.customer,
            vehicle: updatedBooking.vehicle,
            serviceType: updatedBooking.serviceType,
            mechanic: updatedBooking.mechanic ? {
                _id: updatedBooking.mechanic._id,
                name: updatedBooking.mechanic.name,
                phone: updatedBooking.mechanic.phone,
                rating: updatedBooking.mechanic.rating || 0
            } : {
                _id: null,
                name: 'Not Assigned',
                phone: 'N/A',
                rating: 0
            },
            dateTime: updatedBooking.dateTime,
            formattedDateTime: updatedBooking.dateTime.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            amount: updatedBooking.amount,
            status: updatedBooking.status,
            spareParts: updatedBooking.spareParts || [],
            notes: updatedBooking.notes || ''
        };

        res.status(200).json({
            success: true,
            message: 'Booking status updated successfully',
            data: transformedBooking
        });
    } catch (error) {
        console.error('Error updating booking status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating booking status',
            error: error.message
        });
    }
};

// Reassign mechanic
exports.reassignMechanic = async (req, res) => {
    try {
        const { bookingId, mechanicId } = req.body;

        // Update the booking with the new mechanic ID
        const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            { mechanic: mechanicId },
            { new: true }
        ).populate('mechanic', 'name phone rating');

        if (!updatedBooking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Transform the updated booking
        const transformedBooking = {
            _id: updatedBooking._id,
            customer: updatedBooking.customer,
            vehicle: updatedBooking.vehicle,
            serviceType: updatedBooking.serviceType,
            mechanic: updatedBooking.mechanic ? {
                _id: updatedBooking.mechanic._id,
                name: updatedBooking.mechanic.name,
                phone: updatedBooking.mechanic.phone,
                rating: updatedBooking.mechanic.rating || 0
            } : {
                _id: null,
                name: 'Not Assigned',
                phone: 'N/A',
                rating: 0
            },
            dateTime: updatedBooking.dateTime,
            formattedDateTime: updatedBooking.dateTime.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            amount: updatedBooking.amount,
            status: updatedBooking.status,
            spareParts: updatedBooking.spareParts || [],
            notes: updatedBooking.notes || ''
        };

        res.status(200).json({
            success: true,
            message: 'Mechanic reassigned successfully',
            data: transformedBooking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error reassigning mechanic',
            error: error.message
        });
    }
};

// Create new booking
exports.createBooking = async (req, res) => {
    try {
        const { customer, vehicle, serviceType, dateTime, amount, spareParts, notes } = req.body;

        const newBooking = new Booking({
            customer,
            vehicle,
            serviceType,
            dateTime: new Date(dateTime),
            amount,
            spareParts: spareParts || [],
            notes: notes || '',
            status: 'pending'
        });

        const savedBooking = await newBooking.save();
        const populatedBooking = await Booking.findById(savedBooking._id)
            .populate('mechanic', 'name phone rating');

        // Transform the saved booking
        const transformedBooking = {
            _id: populatedBooking._id,
            customer: populatedBooking.customer,
            vehicle: populatedBooking.vehicle,
            serviceType: populatedBooking.serviceType,
            mechanic: populatedBooking.mechanic ? {
                _id: populatedBooking.mechanic._id,
                name: populatedBooking.mechanic.name,
                phone: populatedBooking.mechanic.phone,
                rating: populatedBooking.mechanic.rating || 0
            } : {
                _id: null,
                name: 'Not Assigned',
                phone: 'N/A',
                rating: 0
            },
            dateTime: populatedBooking.dateTime,
            formattedDateTime: populatedBooking.dateTime.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            amount: populatedBooking.amount,
            status: populatedBooking.status,
            spareParts: populatedBooking.spareParts || [],
            notes: populatedBooking.notes || ''
        };

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            data: transformedBooking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating booking',
            error: error.message
        });
    }
};

// Delete booking
exports.deleteBooking = async (req, res) => {
    try {
        const deletedBooking = await Booking.findByIdAndDelete(req.params.id);

        if (!deletedBooking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Booking deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting booking',
            error: error.message
        });
    }
};