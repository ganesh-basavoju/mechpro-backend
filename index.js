const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const userRoutes = require('./routes/userRoutes');
const mechanicRoutes = require("./routes/mechanicRoutes");
const adminRoutes = require("./routes/superAdmin");
const bookingRoutes = require("./routes/bookings");
const sparePartsRoutes = require("./routes/sparePartsRoutes");
const servicesRoutes = require("./routes/services");
const analyticsRoutes = require("./routes/analytics");
const authRoutes = require("./routes/authRoutes");
const userprofile = require("./routes/userprofile");
const billRoutes = require("./routes/billRoutes");
const { adminAuthmiddleware } = require("./middleware/authadmin")
const amdinAuth = require("./routes/adminAuth");
const publicRoutes = require("./routes/public");
const { initSocket, sendNotificationToAllMechanics } = require('./socket/socket');
const User = require('./models/User');
const Mechanic = require('./models/Mechanic');
const SuperAdmin = require('./models/SuperAdmin');  
const fcmService = require('./services/fcmService');

dotenv.config();
mongoose.connect(
    'mongodb+srv://admin:mechpro123@cluster0.wbp76kx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);


initSocket(server);


app.get('/', (req, res) => {
    res.send('MechanicPro API is running...');
});


// setTimeout(() => {
//     try {
//     fcmService.sendToUser('fiB8Yur0D73Bp3KrJHcSzy:APA91bGGFGH_kJg3rvrfQ-1er7Hod-L9HjseYnAdjEnpwhS34lMPJlw-PP4al1dhjPlkiWr2iwfNAOqJzDOi9BZ1D_Ai2eNTSrpNVIQMtgJ6jdRIelYtsRY', {
//         title: 'Hello from the server!',
//         body: 'Hello from the server!',
//         type: 'notification',
//         bookingId: '123'
//     },"user","123");
//     } catch (error) {
//         console.error('Error sending FCM:', error);
//     }
// }, 3000);


app.post("/api/fcm-token",async (req, res) => {
    try {
        console.log(req.body,"fcm token")
        const { fcmToken, userId, userType } = req.body;
        console.log('FCM Token:', fcmToken);
        console.log('User ID:', userId);
        console.log('User Type:', userType);
        if(userType==="user"){
            await User.findByIdAndUpdate(userId, { $set: { fcmToken: fcmToken } });
        }
        if(userType==="mechanic"){
            await Mechanic.findByIdAndUpdate(userId, { $set: { fcmToken: fcmToken } });
        }
        if(userType==="admin"){
            await SuperAdmin.findByIdAndUpdate(userId, { $set: { fcmToken: fcmToken } });
        }
        res.status(200).json({ message: 'FCM token received' });
    } catch (error) {
        console.error('Error receiving FCM token:', error);
        res.status(500).json({ message: 'Failed to receive FCM token' });
    }
});


app.use("/api/adminauth", amdinAuth);
app.use("/api/mechanic", mechanicRoutes);
app.use("/api/mechanic", billRoutes); // Add bill routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userprofile);
app.use("/api/public", publicRoutes);



app.use(adminAuthmiddleware);
app.use("/api/admin/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/booking", bookingRoutes);
app.use("/api/admin/spareParts", sparePartsRoutes);
app.use("/api/admin/services", servicesRoutes);
app.use("/api/admin/analytics", analyticsRoutes);



const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

