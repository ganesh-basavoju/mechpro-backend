const Booking = require('../models/Bookings');
const User = require('../models/User');

exports.getServiceHistory = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware

    // 1. Fetch User Cars
    const user = await User.findById(userId).select('carbook');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 2. Fetch User Bookings (Completed/In-Progress)
    // We populate mechanic info for display
    const bookings = await Booking.find({
      'customer.phone': { $exists: true }, // Ensure it's a valid booking
      // We might want to filter by customer email or phone if stored in user model, 
      // but typically we link by customer ID or just query by user ID if stored in Booking.
      // Looking at Booking model, it has 'customer' object but not explicit 'customerId' ref in schema shown earlier,
      // BUT Bill model has customerId. 
      // Let's assume we can find bookings by matching vehicle plate OR if we had customer Id in booking.
      // Use case: Find bookings where vehicle plate matches user's cars.
    }).populate('mechanic', 'name profilePic phone rating');

    // HOWEVER, the `Booking` model shown previously does NOT have a direct `customerId` reference, 
    // it only has embedded customer details. 
    // A more robust way is to filter bookings where vehicle.plateNumber matches one of user's cars.
    
    // Let's gather user's plate numbers
    const userPlates = user.carbook.map(car => car.carlicenseplate.replace(/\s+/g, '').toUpperCase());

    // Filter bookings relevant to this user
    const userBookings = bookings.filter(booking => {
      const bookingPlate = booking.vehicle.plateNumber.replace(/\s+/g, '').toUpperCase();
      return userPlates.includes(bookingPlate);
    });

    // 3. Group by Car
    const historyByCar = user.carbook.map(car => {
      const normalizedPlate = car.carlicenseplate.replace(/\s+/g, '').toUpperCase();
      
      const carServices = userBookings
        .filter(b => b.vehicle.plateNumber.replace(/\s+/g, '').toUpperCase() === normalizedPlate)
        .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)) // Newest first
        .map(b => ({
          bookingId: b._id,
          serviceDate: b.dateTime,
          serviceType: b.serviceType,
          status: b.status,
          mechanicName: b.mechanic ? b.mechanic.name : 'Unknown Mechanic',
          mechanicPhone: b.mechanic ? b.mechanic.phone : 'N/A',
          cost: b.amount,
          description: b.notes || 'No additional notes',
          odometer: b.odometerReading
        }));

      return {
        carId: car._id,
        carName: car.carname,
        carModel: car.carmodel,
        licensePlate: car.carlicenseplate,
        services: carServices
      };
    });

    res.status(200).json(historyByCar);

  } catch (error) {
    console.error('Error fetching service history:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
