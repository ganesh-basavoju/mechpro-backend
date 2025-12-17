const User = require('../models/User');
const Booking = require('../models/Bookings');
const bcrypt = require('bcryptjs');

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const profileData = {
            name: user.fullname,
            email: user.email,
            phone: user.phone,
            profilePic: user.pic,
            lastService: user.lastService,
            isBlocked: user.isBlocked
        };

        res.json(profileData);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone, profilePic } = req.body;

        const updateFields = {};
        if (name) updateFields.fullname = name;
        if (email) updateFields.email = email;
        if (phone) updateFields.phone = phone;
        if (profilePic) updateFields.pic = profilePic;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateFields },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
};

// Get user cars
exports.getCars = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('carbook');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Transform data to match frontend format
        const cars = user.carbook.map(car => ({
            id: car._id,
            name: car.carname,
            model: car.carmodel,
            year: car.caryear,
            licensePlate: car.carlicenseplate
        }));

        res.json(cars);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
};

// Add car
exports.addCar = async (req, res) => {
    try {
        const { name, model, year, licensePlate } = req.body;

        const newCar = {
            carname: name,
            carmodel: model,
            caryear: year,
            carlicenseplate: licensePlate || ''
        };

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $push: { carbook: newCar } },
            { new: true }
        ).select('carbook');

        // Get the newly added car (last one in array)
        const addedCar = user.carbook[user.carbook.length - 1];

        const response = {
            id: addedCar._id,
            name: addedCar.carname,
            model: addedCar.carmodel,
            year: addedCar.caryear,
            licensePlate: addedCar.carlicenseplate
        };

        res.json(response);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
};

// Update car
exports.updateCar = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, model, year, licensePlate } = req.body;

        const user = await User.findOneAndUpdate(
            { _id: req.user.id, 'carbook._id': id },
            {
                $set: {
                    'carbook.$.carname': name,
                    'carbook.$.carmodel': model,
                    'carbook.$.caryear': year,
                    'carbook.$.carlicenseplate': licensePlate || ''
                }
            },
            { new: true }
        ).select('carbook');

        if (!user) {
            return res.status(404).json({ message: 'Car not found' });
        }

        const updatedCar = user.carbook.id(id);
        const response = {
            id: updatedCar._id,
            name: updatedCar.carname,
            model: updatedCar.carmodel,
            year: updatedCar.caryear,
            licensePlate: updatedCar.carlicenseplate
        };

        res.json(response);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
};

// Delete car
exports.deleteCar = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { carbook: { _id: id } } },
            { new: true }
        ).select('carbook');

        res.json({ message: 'Car deleted successfully' });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
};

// Get user bookings
exports.getBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ 'customer.phone': req.user.phone })
            .populate('mechanic', 'name rating streetaddress city state zip profile')
            .sort({ createdAt: -1 });

        // Transform data to match frontend format
        const transformedBookings = bookings.map(booking => ({
            id: booking._id,
            carName: booking.vehicle.model,
            serviceType: booking.serviceType,
            status: booking.status,
            bookedDate: booking.createdAt.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),
            scheduledDate: booking.dateTime.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),
            scheduledTime: booking.dateTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }),
            mechanicName: booking.mechanic?.name || 'AutoCare Pro',
            mechanicRating: booking.mechanic?.rating || '4.5',
            mechanicPhone: booking.mechanic?.phone || '+91 98765 43210',
            location: `${booking.mechanic?.streetaddress || ''}, ${booking.mechanic?.city || ''}, ${booking.mechanic?.state || ''}, ${booking.mechanic?.zip || ''}`,
            amount: booking.amount,
            notes: booking.notes,
            profilePic: booking.mechanic?.profile || ''
        }));

        res.json(transformedBookings);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
};

// Get booking details
exports.getBookingDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await Booking.findOne({
            _id: id,
            'customer.phone': req.user.phone
        }).populate('mechanic', 'name rating phone streetaddress city state');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const bookingDetails = {
            id: booking._id,
            carName: booking.vehicle.model,
            serviceType: booking.serviceType,
            status: booking.status,
            bookedDate: booking.createdAt.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),
            scheduledDate: booking.dateTime.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),
            scheduledTime: booking.dateTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }),
            mechanicName: booking.mechanic?.name || 'AutoCare Pro',
            mechanicRating: booking.mechanic?.rating || '4.5',
            mechanicPhone: booking.mechanic?.phone || '+91 98765 43210',
            location: `${booking.mechanic?.streetaddress || ''}, ${booking.mechanic?.city || ''}, ${booking.mechanic?.state || ''}, ${booking.mechanic?.zip || ''}`,
            amount: booking.amount,
            notes: booking.notes,
            vehicle: booking.vehicle,
            customer: booking.customer
        };

        res.json(bookingDetails);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await Booking.findOne({
            _id: id,
            'customer.phone': req.user.phone
        });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check if booking can be cancelled
        if (booking.status === 'completed') {
            return res.status(400).json({ message: 'Cannot cancel completed booking' });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: 'Booking is already cancelled' });
        }

        // Update booking status to cancelled
        booking.status = 'cancelled';
        await booking.save();

        res.json({ 
            message: 'Booking cancelled successfully',
            booking 
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
};