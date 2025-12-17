const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    phone: { type: String, required: true,unique:true },
    email: { type: String, default: "" },
    password: { type: String, required: true },
    pic: { type: String, default: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg" },
    carbook: [{
        carname: { type: String, required: true },
        carmodel: { type: String, required: true },
        caryear: { type: String, required: true },
        carlicenseplate: { type: String, required: true }
    }],
    lastService: { type: Date, default: null },
    isBlocked: { type: Boolean, default: false },// Add this field
    bookings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking"
    }],
    fcmToken: { type: String, default: "" },
    resetOTP: { type: String, default: null },
    resetOTPExpiry: { type: Date, default: null }
}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);
