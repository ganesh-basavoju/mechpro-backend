const moongoose = require("mongoose");

const mechanicSchema = new moongoose.Schema({
    profile: { type: String, default: "" },
    name: { type: String, required: true },
    email: { type: String, default: "" },
    password: { type: String, required: true },
    phone: { type: Number, required: true },
    streetaddress: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    services: [{ type: String, required: true }],
    latitude: { type: String, required: true },
    longitude: { type: String, required: true },
    rating: { type: String, required: true },
    reviews: [{
        name: { type: String },
        rating: { type: String },
        comment: { type: String }
    }],
    totalbookings: { type: Number, default: 0 },
    mapsLink: { type: String, required: true },
    notifications: {
        type: [{
            message: { type: String },
            type: { type: String },
            read: { type: Boolean, default: false }
        }],
        default: []
    },
    fcmToken: { type: String, default: "" },
    resetOTP: { type: String },
    resetOTPExpiry: { type: Date }
}, { timestamps: true })

module.exports = moongoose.model("Mechanic", mechanicSchema);
