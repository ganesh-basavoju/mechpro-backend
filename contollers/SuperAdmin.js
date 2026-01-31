const Bookings = require('../models/Bookings');
const Services = require('../models/Services');
const SpareParts = require('../models/SpareParts');
const SuperAdmin = require('../models/SuperAdmin');
const User = require('../models/User');
const Mechanic = require('../models/Mechanic');
const admin = require('../models/SuperAdmin');
const booking = require('../models/Bookings');
const sparepart = require('../models/SpareParts');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils');

// ---------------- LOGIN ADMIN ----------------
const loginAdmin = async (req, res) => {
    try {
        const { phone, password } = req.body;

        const user = await admin.findOne({ phone });

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user._id,
                role: 'admin',
                token: generateToken('admin', user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid phone or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// ---------------- REGISTER ADMIN ----------------
const registerAdmin = async (req, res) => {
    try {
        const { name, phone, password } = req.body;

        if (!name || !phone || !password) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const existingAdmin = await admin.findOne({ phone });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin with this phone already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newAdmin = await admin.create({
            name,
            phone,
            password: hashedPassword,
        });

        if (newAdmin) {
            res.status(201).json({
                _id: newAdmin._id,
                name: newAdmin.name,
                phone: newAdmin.phone,
                role: 'admin',
                token: generateToken('admin', newAdmin._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid admin data' });
        }
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// ---------------- ADD MECHANIC ----------------
const addMechanic = async (req, res) => {
    console.log(req.body);
    // return;
    try {
        const { name, email, phone, password, street, city, state, pincode, services, latitude, longitude, rating = 4.5, mapLink, isActive } = req.body;
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await Mechanic.create({
            name,
            email,
            password: hashedPassword,
            phone,
            streetaddress: street,
            city,
            state,
            zip: pincode,
            services: services.split(","),
            latitude,
            longitude,
            rating,
            mapsLink: mapLink,
            isActive
        });

        const data = await Mechanic.find();
        res.status(200).json(data);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error', err: error });
    }
};


// ---------------- UPDATE MECHANIC ----------------
const updateMechanic = async (req, res) => {
    try {
        console.log("update mechanic touch")
        const { id, name, email, phone, street, city, state, pincode, services, latitude, longitude, rating = 4.5, mapLink, isActive } = req.body;

        const mech=await Mechanic.findById(id);
        await Mechanic.findByIdAndUpdate(id, {
            name,
            email,
            password:mech.password,
            phone,
            streetaddress: street,
            city,
            state,
            zip: pincode,
            services,
            latitude,
            longitude,
            rating,
            mapsLink: mapLink,
            isActive
        });

        const data = await Mechanic.find();
        res.status(200).json(data);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error', err: error });
    }
};



const DeleteMechanic = async (req, res) => {
    try {
        const { id } = req.params;
        await Mechanic.findByIdAndDelete(id);
        const mechanics = await Mechanic.find();
        res.status(200).json({ msg: "Mechanic deleted", data: mechanics });
    } catch (error) {
        res.status(500).json({ message: "Server error", err: error });
    }
}



// ---------------- UPDATE BOOKING STATUS ----------------
const BookingStatusUpdate = async (req, res) => {
    try {
        const { id, status } = req.body;
        if (!id || !status) {
            return res.status(401).json('Provide id and status');
        }

        const existingBooking = await booking.findById(id);
        if (!existingBooking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (existingBooking.status === 'completed') {
            return res.status(400).json({ message: 'Cannot change status of a completed booking' });
        }

        await booking.findByIdAndUpdate(id, { $set: { status } });
        const bookings = await booking.find();
        res.status(200).json({ msg: 'Status updated', data: bookings });
    } catch (error) {
        res.status(500).json({ message: 'Server error', err: error });
    }
};

// ---------------- UPDATE SPAREPART STATUS ----------------
const SparePartStatusUpdate = async (req, res) => {
    try {
        const { id, status } = req.body;
        if (!id || !status) {
            return res.status(401).json('Provide id and status');
        }

        await sparepart.findByIdAndUpdate(id, { $set: { status } });
        const spareparts = await sparepart.find();
        res.status(200).json({ msg: 'Status updated', data: spareparts });
    } catch (error) {
        res.status(500).json({ message: 'Server error', err: error });
    }
};

// ---------------- ADD CUSTOMER ----------------
const AddCustomer = async (req, res) => {
    try {
        const { fullname, phone, email, password } = req.body;
        await User.create({
            fullname,
            phone,
            email,
            password,
            carbook: [],
            lastService: Date.now(),
        });
        res.status(200).json('User created');
    } catch (error) {
        res.status(500).json({ message: 'Server error', err: error });
    }
};

// ---------------- ADD SERVICE ----------------
const AddService = async (req, res) => {
    try {
        const { serviceName, description, Baseprice, duration, category, Notification } = req.body;
        await Services.create({ serviceName, description, Baseprice, duration, category, Notification });

        res.status(200).json('Added service successfully');
    } catch (error) {
        res.status(500).json({ message: 'Server error', err: error });
    }
};

// ---------------- GET ALL MECHANICS ----------------
const GetAllmechanics = async (req, res) => {
    try {
        const mechanics = await Mechanic.find().select('-password');
        res.status(200).json(mechanics);
    } catch (error) {
        res.status(500).json({ message: 'Server error', err: error });
    }
};

// ---------------- GET ALL BOOKINGS ----------------
const GetAllBookings = async (req, res) => {
    try {
        const bookings = await Bookings.find();
        res.status(200).json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Server error', err: error });
    }
};

// ---------------- GET ALL SPAREPARTS ----------------
const GetAllSpareparts = async (req, res) => {
    try {
        const spareparts = await SpareParts.find();
        res.status(200).json(spareparts);
    } catch (error) {
        res.status(500).json({ message: 'Server error', err: error });
    }
};

// ---------------- GET CUSTOMERS ----------------
const GetCustomers = async (req, res) => {
    try {
        const customers = await User.find();
        res.status(200).json(customers);
    } catch (error) {
        res.status(500).json({ message: 'Server error', err: error });
    }
};

// ---------------- GET SERVICES ----------------
const GetServices = async (req, res) => {
    try {
        const services = await Services.find();
        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ message: 'Server error', err: error });
    }
};

// ---------------- GET NOTIFICATIONS ----------------
const GetNotifications = async (req, res) => {
    try {
        const adminData = await SuperAdmin.findOne({ email: 'admin@gmail.com' });
        res.status(200).json(adminData?.Notifications || []);
    } catch (error) {
        res.status(500).json({ message: 'Server error', err: error });
    }
};

// ---------------- EXPORT ALL FUNCTIONS ----------------
module.exports = {
    loginAdmin,
    registerAdmin,
    addMechanic,
    BookingStatusUpdate,
    SparePartStatusUpdate,
    AddCustomer,
    AddService,
    GetAllmechanics,
    GetAllBookings,
    GetAllSpareparts,
    GetCustomers,
    GetServices,
    GetNotifications,
    updateMechanic,
    DeleteMechanic
};

