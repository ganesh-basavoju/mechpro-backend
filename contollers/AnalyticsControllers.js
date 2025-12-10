// controllers/analyticsController.js
const Booking = require('../models/Bookings');
const Mechanic = require('../models/Mechanic');
const User = require('../models/User');
const Service = require('../models/Services');

// Get dashboard analytics
const getDashboardAnalytics = async (req, res) => {
    try {
        // Get current date ranges
        const today = new Date();
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfYear = new Date(today.getFullYear(), 0, 1);

        // Get all bookings
        const allBookings = await Booking.find();

        // Calculate revenue metrics (only for completed bookings)
        const completedBookings = allBookings.filter(booking => booking.status === 'completed');
        
        const totalRevenue = completedBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);

        const todayBookings = allBookings.filter(booking =>
            booking.status === 'completed' && new Date(booking.dateTime) >= startOfToday
        );
        const todayRevenue = todayBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);

        const monthBookings = allBookings.filter(booking =>
            booking.status === 'completed' && new Date(booking.dateTime) >= startOfMonth
        );
        const monthRevenue = monthBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);

        // Get counts
        const totalBookings = allBookings.length;
        const totalMechanics = await Mechanic.countDocuments({ isActive: true });
        const totalCustomers = await User.countDocuments();
        const totalServices = await Service.countDocuments({ status: true });

        // Monthly revenue data (last 6 months)
        const monthlyRevenue = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const monthBookings = allBookings.filter(booking => {
                const bookingDate = new Date(booking.dateTime);
                return booking.status === 'completed' && 
                       bookingDate >= monthStart && 
                       bookingDate <= monthEnd;
            });

            const revenue = monthBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);

            monthlyRevenue.push({
                month: date.toLocaleString('default', { month: 'short' }),
                revenue: revenue,
                bookings: monthBookings.length
            });
        }

        // Service distribution
        const serviceDistribution = await Booking.aggregate([
            {
                $group: {
                    _id: '$serviceType',
                    count: { $sum: 1 },
                    revenue: { $sum: '$amount' }
                }
            },
            {
                $project: {
                    name: '$_id',
                    count: 1,
                    percentage: { $multiply: [{ $divide: ['$count', totalBookings] }, 100] },
                    revenue: 1
                }
            }
        ]);

        // Booking status distribution
        const statusDistribution = await Booking.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Recent activities
        const recentBookings = await Booking.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('mechanic', 'name')
            .select('customer vehicle serviceType amount status createdAt');

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalRevenue,
                    todayRevenue,
                    monthRevenue,
                    totalBookings,
                    totalMechanics,
                    totalCustomers,
                    totalServices
                },
                charts: {
                    monthlyRevenue,
                    serviceDistribution,
                    statusDistribution
                },
                recentActivities: recentBookings
            }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Export analytics data
const exportAnalytics = async (req, res) => {
    try {
        const { format } = req.query; // 'excel' or 'pdf'

        // Get analytics data
        const analyticsData = await getDashboardData();

        // In a real application, you would generate Excel/PDF files here
        // For now, we'll return the data with a success message

        res.status(200).json({
            success: true,
            message: `Analytics data exported successfully in ${format} format`,
            data: analyticsData,
            downloadUrl: `/api/admin/analytics/export/download?format=${format}&token=${Date.now()}`
        });
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            message: 'Export failed',
            error: error.message
        });
    }
};

// Helper function to get dashboard data
const getDashboardData = async () => {
    const allBookings = await Booking.find();
    const totalRevenue = allBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
    const totalBookings = allBookings.length;
    const totalMechanics = await Mechanic.countDocuments({ isActive: true });
    const totalCustomers = await User.countDocuments();

    return {
        totalRevenue,
        totalBookings,
        totalMechanics,
        totalCustomers,
        generatedAt: new Date().toISOString()
    };
};

module.exports = {
    getDashboardAnalytics,
    exportAnalytics
};