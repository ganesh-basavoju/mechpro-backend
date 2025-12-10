const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    mechanicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Mechanic',
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerPhone: String,
    vehicleDetails: {
        make: String,
        model: String,
        plateNumber: String
    },
    items: [{
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    advanceReceived: {
        type: Number,
        default: 0
    },
    generatedAt: {
        type: Date,
        default: Date.now
    },
    billNumber: {
        type: String,
        unique: true
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'cancelled'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// Generate bill number before saving
billSchema.pre('save', async function(next) {
    if (!this.billNumber) {
        const count = await mongoose.model('Bill').countDocuments();
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        this.billNumber = `BILL-${year}${month}-${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Bill', billSchema);
