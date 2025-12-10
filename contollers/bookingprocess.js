const Booking = require('../models/Bookings');
const Mechanic = require('../models/Mechanic');
const Services = require('../models/Services');
const User = require('../models/User');

const { ObjectId } = require('mongodb'); // or your MongoDB driver
const { sendNotificationToMechanic } = require('../socket/socket');
const fcmService = require('../services/fcmService');


const getCategoryIcon = (categoryName) => {
    const iconMap = {
        'Brake Service': 'brake',
        'Oil Service': 'oil',
        'Engine Service': 'engine',
        'Tire Service': 'tire',
        'Electrical Service': 'electrical',
        'AC Service': 'ac',
        'Transmission Service': 'transmission',
        'Suspension Service': 'suspension',
        'Battery Service': 'battery',
        'Filter Service': 'filter'
        // Add more mappings as needed
    };

    return iconMap[categoryName] || 'wrench';
};

const transformServicesByCategory = (services) => {
    const groupedByCategory = {};
    const categoryIdMap = new Map(); // To maintain consistent IDs for same categories

    services.forEach(service => {
        const categoryName = service.category;

        if (!groupedByCategory[categoryName]) {
            // Generate a unique ID for the category
            const categoryId = categoryIdMap.get(categoryName) || new ObjectId().toString();
            categoryIdMap.set(categoryName, categoryId);

            groupedByCategory[categoryName] = {
                id: categoryId,
                name: categoryName,
                icon: getCategoryIcon(categoryName),
                services: []
            };
        }

        groupedByCategory[categoryName].services.push({
            id: service._id.toString(),
            name: service.serviceName,
            description: service.description,
            price: parseInt(service.Baseprice) || 0,
            duration: service.duration,
            category: service.category
        });
    });

    return Object.values(groupedByCategory);
};

// Get mechanic services for booking
exports.getMechanicServices = async (req, res) => {
    try {
        const { mechanicId } = req.params;

        // Get mechanic details
        const mechanic = await Mechanic.findById(mechanicId).select('-password -email');
        if (!mechanic) {
            return res.status(404).json({ message: 'Mechanic not found' });
        }


        // Get all services from Services model
        const allServices = await Services.find({ status: true });
        console.log(allServices, "allServices");


        // Transform services to frontend format
        const transformedCategories = transformServicesByCategory(allServices);
        // Get user cars
        const user = await User.findById(req.user.id).select('carbook');
        const userCars = user.carbook.map(car => ({
            id: car._id.toString(),
            name: car.carname,
            model: car.carmodel,
            year: car.caryear,
            licensePlate: car.carlicenseplate
        }));

        res.json({
            mechanic: {
                id: mechanic._id,
                name: mechanic.name,
                address: `${mechanic.streetaddress}, ${mechanic.city}, ${mechanic.state} ${mechanic.zip}`,
                phone: `+91 ${mechanic.phone}`,
                rating: mechanic.rating,
                totalBookings: mechanic.totalbookings
            },
            serviceCategories: transformedCategories,
            userCars
        });

    } catch (error) {
        console.error('Error fetching mechanic services:', error);
        res.status(500).json({ message: 'Server error while fetching services' });
    }
};

// Create booking
exports.createBooking = async (req, res) => {
    try {
        const {
            mechanicId,
            carId,
            services,
            instructions,
            odometerReading,
            dateTime,
            totalPrice
        } = req.body;
        console.log(req.body, "req.body");

        // Validate odometer reading
        if (!odometerReading || odometerReading <= 0) {
            return res.status(400).json({ message: 'Valid odometer reading is required' });
        }

        // Get user and mechanic details
        const user = await User.findById(req.user.id);
        const mechanic = await Mechanic.findById(mechanicId);

        if (!user || !mechanic) {
            return res.status(404).json({ message: 'User or mechanic not found' });
        }

        // Get car details
        const car = user.carbook.id(carId);
        if (!car) {
            return res.status(404).json({ message: 'Car not found' });
        }

        // Get service details
        const serviceDetails = await Services.find({
            _id: { $in: services.map(s => s.id) }
        });

        // Create booking
        const booking = new Booking({
            customer: {
                name: user.fullname,
                phone: user.phone,
                email: user.email
            },
            vehicle: {
                make: car.carname,
                model: car.carmodel,
                year: car.caryear,
                plateNumber: car.carlicenseplate
            },
            serviceType: services.map(s => s.name).join(', '),
            mechanic: mechanicId,
            odometerReading: parseInt(odometerReading),
            dateTime: new Date(dateTime),
            amount: totalPrice,
            status: 'pending',
            spareParts: [],
            notes: instructions,
            selectedServices: services
        });

        await booking.save();

        // Update mechanic's total bookings
        await Mechanic.findByIdAndUpdate(mechanicId, {
            $inc: { totalbookings: 1 }
        });

        // Add booking to user's bookings
        await User.findByIdAndUpdate(req.user.id, {
            $push: { bookings: booking._id },
            lastService: new Date()
        });
        await Mechanic.findByIdAndUpdate(mechanicId, {
            $push: { notifications: { message: 'New booking received', type: 'booking', read: false } },
        });

        sendNotificationToMechanic(mechanicId, {
            id: booking._id,
            customerName: user.fullname,
            mechanicName: mechanic.name,
            services: services.map(s => s.name),
            dateTime: booking.dateTime,
            totalPrice: booking.amount,
            status: booking.status
        });
        
        if (mechanic.fcmToken !== "") {
            fcmService.sendToUser(mechanic.fcmToken, {
                title: 'New booking received',
                body: 'You have a new booking',
                type: 'notification',
                bookingId: booking._id
            }, "mechanic", mechanic._id);
        }

        res.status(201).json({
            message: 'Booking created successfully',
            booking: {
                id: booking._id,
                customerName: user.fullname,
                mechanicName: mechanic.name,
                services: services.map(s => s.name),
                dateTime: booking.dateTime,
                totalPrice: booking.amount,
                odometerReading: booking.odometerReading,
                status: booking.status
            }
        });


    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ message: 'Server error while creating booking' });
    }
};

// Get user bookings
exports.getUserBookings = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate({
            path: 'bookings',
            populate: {
                path: 'mechanic',
                select: 'name phone streetaddress city state rating'
            }
        });

        const bookings = user.bookings.map(booking => ({
            id: booking._id,
            carName: booking.vehicle.model,
            serviceType: booking.serviceType,
            status: booking.status,
            bookedDate: booking.createdAt,
            scheduledDate: booking.dateTime,
            amount: booking.amount,
            mechanicName: booking.mechanic.name,
            mechanicPhone: booking.mechanic.phone,
            location: `${booking.mechanic.streetaddress}, ${booking.mechanic.city}`,
            notes: booking.notes
        }));

        res.status(200).json(bookings);
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).json({ message: 'Server error while fetching bookings' });
    }
};