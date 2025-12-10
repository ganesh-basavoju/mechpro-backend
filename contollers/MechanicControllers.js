const Mechanic = require('../models/Mechanic');
const Booking = require('../models/Bookings');
const SpareParts = require('../models/SpareParts');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const fcmService = require('../services/fcmService');
const SuperAdmin = require('../models/SuperAdmin');

// Register mechanic
exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      streetaddress,
      city,
      state,
      zip,
      services,
      latitude,
      longitude,
      mapsLink
    } = req.body;

    // Check if mechanic already exists
    let mechanic = await Mechanic.findOne({ email });
    if (mechanic) {
      return res.status(400).json({ message: 'Mechanic already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new mechanic
    mechanic = new Mechanic({
      name,
      email,
      password: hashedPassword,
      phone,
      streetaddress,
      city,
      state,
      zip,
      services: services || [],
      latitude,
      longitude,
      rating: "0",
      mapsLink
    });

    await mechanic.save();

    // Create JWT token
    const payload = {
      mechanic: {
        id: mechanic.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, mechanic: { id: mechanic.id, name: mechanic.name, email: mechanic.email } });
      }
    );
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

// Login mechanic
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    console.log(phone, password);

    // Check if mechanic exists
    let mechanic = await Mechanic.findOne({ phone });
    console.log(mechanic, "mechanic");
    if (!mechanic) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, mechanic.password);
    console.log(isMatch, "isMatch");
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT token
    const payload = {
      mechanic: {
        id: mechanic.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret',
      (err, token) => {
        if (err) throw err;
        res.status(200).json({
          token,
          mechanic: {
            id: mechanic.id,
            name: mechanic.name,
            email: mechanic.email || null,
            shopName: mechanic.name,
            phone: mechanic.phone,
            address: `${mechanic.streetaddress}, ${mechanic.city}, ${mechanic.state} ${mechanic.zip}`
          }
        });
      }
    );
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

// Get mechanic profile
exports.getProfile = async (req, res) => {
  try {
    const mechanic = await Mechanic.findById(req.mechanic.id).select('-password');
    
    if (!mechanic) {
      return res.status(404).json({ message: 'Mechanic not found' });
    }

    const profileData = {
      name: mechanic.name,
      shopName: mechanic.name,
      email: mechanic.email,
      phone: mechanic.phone,
      address: `${mechanic.streetaddress}, ${mechanic.city}, ${mechanic.state} ${mechanic.zip}`,
      services: mechanic.services,
      rating: mechanic.rating,
      totalBookings: mechanic.totalbookings,
      profilePic: mechanic.profile,
      isActive: mechanic.isActive
    };

    res.json(profileData);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

// Update mechanic profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone, streetaddress, city, state, zip, services, profile } = req.body;
    console.log(req.body, "body");

    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (phone) updateFields.phone = phone;
    if (streetaddress) updateFields.streetaddress = streetaddress;
    if (city) updateFields.city = city;
    if (state) updateFields.state = state;
    if (zip) updateFields.zip = zip;
    if (services) updateFields.services = services;
    if (profile) updateFields.profile = profile

    const mechanic = await Mechanic.findByIdAndUpdate(
      req.mechanic.id,
      { $set: updateFields },
      { new: false }
    ).select('-password');

    res.status(200).json(mechanic);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

// Get bookings
exports.getBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;
    const mechanicId = req.mechanic.id;

    let query = { mechanic: mechanicId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'vehicle.model': { $regex: search, $options: 'i' } },
        { serviceType: { $regex: search, $options: 'i' } }
      ];
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Transform data to match frontend format
    const transformedBookings = bookings.map(booking => ({
      id: booking._id,
      customerName: booking.customer.name,
      customerPhone: booking.customer.phone,
      customerEmail: booking.customer.email,
      vehicle: {
        model: booking.vehicle.model,
        make: booking.vehicle.make,
        year: booking.vehicle.year,
        registration: booking.vehicle.plateNumber
      },
      serviceType: booking.serviceType,
      bookingType: 'scheduled',
      date: booking.dateTime.toISOString().split('T')[0],
      time: booking.dateTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      status: booking.status,
      amount: booking.amount,
      notes: booking.notes,
      createdAt: booking.createdAt,
      spareParts: booking.spareParts
    }));

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      bookings: transformedBookings,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const booking = await Booking.findOneAndUpdate(
      { _id: id, mechanic: req.mechanic.id },
      { status },
      { new: true }
    );
    const bookingDetails = await Booking.findById(id);
    const customer = await User.findOne({ phone: bookingDetails.customer.phone });
    const fcmToken = customer.fcmToken;

    if (fcmToken != "") {
      fcmService.sendToUser(fcmToken, {
        title: "Booking Status Updated",
        body: `Your booking status has been updated for ${bookingDetails?.vehicle?.make || " your vehicle"}`,
        type: "notification",
        bookingId: id||"vhdfjvh"
      }, "user", customer._id);
    }
    console.log(customer, "customer");


    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }


    res.status(200).json(booking);
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
      mechanic: req.mechanic.id
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Transform to match frontend format
    const bookingDetails = {
      id: booking._id,
      customerName: booking.customer.name,
      customerPhone: booking.customer.phone,
      customerEmail: booking.customer.email,
      vehicle: {
        model: booking.vehicle.model,
        make: booking.vehicle.make,
        year: booking.vehicle.year,
        registration: booking.vehicle.plateNumber
      },
      serviceType: booking.serviceType,
      bookingType: 'scheduled',
      date: booking.dateTime.toISOString().split('T')[0],
      time: booking.dateTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      status: booking.status,
      amount: booking.amount,
      notes: booking.notes,
      spareParts: booking.spareParts,
      createdAt: booking.createdAt
    };

    res.json(bookingDetails);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

// Get spare parts
exports.getSpareParts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const mechanicId = req.mechanic.id;

    let query = { mechanicId: mechanicId };

    if (search) {
      query.$or = [
        { partName: { $regex: search, $options: 'i' } },
        { carName: { $regex: search, $options: 'i' } },
        { serviceId: { $regex: search, $options: 'i' } }
      ];
    }

    const spareParts = await SpareParts.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Transform data to match frontend format
    const transformedSpareParts = spareParts.map(part => ({
      id: part._id,
      serviceId: part.serviceId,
      partName: part.partName,
      carModel: part.carName,
      quantity: part.partQuantity,
      status: part.status,
      requestedAt: part.createdAt,
      urgency: part.urgency,
      amount: part.amount
    }));

    const total = await SpareParts.countDocuments(query);

    res.json({
      spareParts: transformedSpareParts,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

// Create spare part request
exports.createSparePartRequest = async (req, res) => {
  try {
    const { partName, carModel, quantity, urgency, serviceId } = req.body;

    // Generate request ID
    const requestid = `SPR${Date.now()}`;

    const sparePart = new SpareParts({
      requestid,
      serviceId: serviceId || 'N/A',
      mechanicId: req.mechanic.id,
      partName,
      partQuantity: quantity.toString(),
      carName: carModel,
      urgency: urgency || 'Medium',
      status: 'pending',
      amount: "0"
    });

    await sparePart.save();

    // Transform response to match frontend format
    const response = {
      id: sparePart._id,
      serviceId: sparePart.serviceId,
      partName: sparePart.partName,
      carModel: sparePart.carName,
      quantity: sparePart.partQuantity,
      status: sparePart.status,
      requestedAt: sparePart.createdAt,
      urgency: sparePart.urgency
    };

    const superAdmins = await SuperAdmin.find({});
    const mechanicName=await Mechanic.findById(req.mechanic.id).name;

    superAdmins.forEach(admin => {
      if (admin.fcmToken != "") {
        fcmService.sendToUser(admin.fcmToken, {
          title: 'New sparepart request received',
          body: `You have a new spare part request from ${mechanicName||"a mechanic"}`,
          type: 'notification',
          bookingId: sparePart._id||"dkvjhf"
        }, "admin",admin._id );
      }


    });

    res.status(200).json(response);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

// Update spare part status
exports.updateSparePartStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const sparePart = await SpareParts.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!sparePart) {
      return res.status(404).json({ message: 'Spare part request not found' });
    }

    res.json(sparePart);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const mechanicId = req.mechanic.id;

    const totalServices = await Booking.countDocuments({ mechanic: mechanicId });
    const pendingRequests = await Booking.countDocuments({
      mechanic: mechanicId,
      status: 'pending'
    });
    const inProgress = await Booking.countDocuments({
      mechanic: mechanicId,
      status: 'in-progress'
    });
    const completed = await Booking.countDocuments({
      mechanic: mechanicId,
      status: 'completed'
    });
    const pendingSpareParts = await SpareParts.countDocuments({
      mechanicId: mechanicId,
      status: 'pending'
    });

    res.json({
      totalServices,
      pendingRequests,
      inProgress,
      completed,
      pendingSpareParts
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

// Update shop status
exports.updateShopStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const mechanic = await Mechanic.findByIdAndUpdate(
      req.mechanic.id,
      { isActive },
      { new: true }
    ).select('-password');

    res.json({ isActive: mechanic.isActive });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};