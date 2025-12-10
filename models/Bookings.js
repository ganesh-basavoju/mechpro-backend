const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    customer: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String }
    },
    vehicle: {
        make: { type: String, required: true },
        model: { type: String, required: true },
        year: { type: String },
        plateNumber: { type: String, required: true }
    },
    serviceType: { type: String, required: true },
    mechanic: { type: mongoose.Schema.Types.ObjectId, ref: 'Mechanic' },
    odometerReading: { type: Number, required: true },
    dateTime: { type: Date, required: true },
    amount: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    spareParts: [{ type: String }],
    notes: { type: String },
    selectedServices: [{
        id: String,
        name: String,
        price: Number,
        duration: String
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model("Booking", bookingSchema);