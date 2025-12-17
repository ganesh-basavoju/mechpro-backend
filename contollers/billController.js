const Bill = require('../models/Bill');
const Booking = require('../models/Bookings');
const User = require('../models/User');
const PDFDocument = require('pdfkit');

// Generate Bill
exports.generateBill = async (req, res) => {
    try {
        const { bookingId, items, totalAmount, advanceReceived, generatedAt } = req.body;
        const mechanicId = req.mechanic.id;

        // Validate input
        if (!bookingId || !items || items.length === 0 || !totalAmount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Find the booking
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Check if mechanic owns this booking
        if (booking.mechanic.toString() !== mechanicId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to generate bill for this booking'
            });
        }

        // Check if bill already exists for this booking
        const existingBill = await Bill.findOne({ bookingId });
        if (existingBill) {
            return res.status(400).json({
                success: false,
                message: 'Bill already exists for this booking',
                bill: existingBill
            });
        }

        // Find customer by phone number from booking
        const customer = await User.findOne({ phone: booking.customer.phone });

        // Create new bill
        const bill = new Bill({
            bookingId,
            mechanicId,
            customerId: customer ? customer._id : null,
            customerName: booking.customer.name,
            customerPhone: booking.customer.phone,
            vehicleDetails: {
                make: booking.vehicle.make || '',
                model: booking.vehicle.model || '',
                plateNumber: booking.vehicle.plateNumber || ''
            },
            items: items.map(item => ({
                name: item.name,
                price: parseFloat(item.price)
            })),
            totalAmount: parseFloat(totalAmount),
            advanceReceived: parseFloat(advanceReceived) || 0,
            generatedAt: generatedAt || new Date(),
            status: 'pending'
        });

        await bill.save();

        res.status(200).json({
            success: true,
            message: 'Bill generated successfully',
            bill
        });

    } catch (error) {
        console.error('Error generating bill:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate bill',
            error: error.message
        });
    }
};

// Get Bill by ID
exports.getBillById = async (req, res) => {
    try {
        const { billId } = req.params;

        const bill = await Bill.findById(billId)
            .populate('bookingId')
            .populate('mechanicId', 'name shopName phone')
            .populate('customerId', 'name phone email');

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: 'Bill not found'
            });
        }

        res.status(200).json({
            success: true,
            bill
        });

    } catch (error) {
        console.error('Error fetching bill:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bill',
            error: error.message
        });
    }
};

// Get Bill by Booking ID
exports.getBillByBookingId = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const bill = await Bill.findOne({ bookingId })
            .populate('mechanicId', 'name shopName phone')
            .populate('customerId', 'name phone email');

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: 'Bill not found for this booking'
            });
        }

        res.status(200).json({
            success: true,
            bill
        });

    } catch (error) {
        console.error('Error fetching bill:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bill',
            error: error.message
        });
    }
};

// Get All Bills for Mechanic
exports.getAllBills = async (req, res) => {
    try {
        const mechanicId = req.mechanic.id;
        const { page = 1, limit = 10, status } = req.query;

        const query = { mechanicId };
        if (status) {
            query.status = status;
        }

        const bills = await Bill.find(query)
            .populate('customerId', 'name phone')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Bill.countDocuments(query);

        res.status(200).json({
            success: true,
            bills,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });

    } catch (error) {
        console.error('Error fetching bills:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bills',
            error: error.message
        });
    }
};

// Generate PDF for Bill
exports.generateBillPDF = async (req, res) => {
    try {
        const { billId } = req.params;

        const bill = await Bill.findById(billId)
            .populate('mechanicId', 'name shopName phone address')
            .populate('customerId', 'name phone email');

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: 'Bill not found'
            });
        }

        // Format bill number as VehicleNo + Date
        const vehicleNo = bill.vehicleDetails?.plateNumber?.replace(/\s+/g, '').toUpperCase() || 'UNKNOWN';
        const billDate = new Date(bill.generatedAt);
        const day = billDate.getDate().toString().padStart(2, '0');
        const month = (billDate.getMonth() + 1).toString().padStart(2, '0');
        const year = billDate.getFullYear();
        const formattedBillNumber = `${vehicleNo}${day}${month}${year}`;

        // Path to logo and PhonePe QR
        const path = require('path');
        const fs = require('fs');
        const logoPath = path.resolve(__dirname, '..', '..', 'mechanicpro', 'public', 'logo.png');
        const phonepePath = path.resolve(__dirname, '..', '..', 'mechanicpro', 'public', 'phonepe.png');
        
        // Verify files exist
        const logoExists = fs.existsSync(logoPath);
        const phonepeExists = fs.existsSync(phonepePath);
        
        if (!logoExists) console.warn('Logo file not found at:', logoPath);
        if (!phonepeExists) console.warn('PhonePe QR file not found at:', phonepePath);

        // Create PDF document
        const doc = new PDFDocument({ 
            margin: 50,
            size: 'A4'
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${formattedBillNumber}.pdf`);

        // Pipe PDF to response
        doc.pipe(res);

        // Helper function to add header on each page
        const addHeader = () => {
            // Save graphics state
            doc.save();
            
            // Orange header background
            doc.rect(0, 0, doc.page.width, 80)
                .fill('#FF6B35');

            // Restore graphics state before drawing white elements
            doc.restore();
            doc.save();
            
            // White background for logo with rounded corners
            doc.roundedRect(45, 15, 50, 50, 8)
                .fillAndStroke('#FFFFFF', '#DDDDDD');

            // Logo image (left side) - on top of white background
            if (logoExists) {
                try {
                    doc.image(logoPath, 50, 20, { 
                        width: 40,
                        height: 40
                    });
                } catch (error) {
                    console.warn('Logo not found, skipping image:', error.message);
                }
            }

            // Restore and prepare for text
            doc.restore();
            
            // Company name (next to logo)
            doc.fillColor('#FFFFFF')
                .fontSize(24)
                .font('Helvetica-Bold')
                .text('Mechanic Pro', 100, 25);
            
            doc.fontSize(10)
                .font('Helvetica')
                .fillColor('#FFFFFF')
                .text('Your Vehicle In Safer Hands', 100, 52);

            // INVOICE text (right side)
            doc.fontSize(36)
                .font('Helvetica-Bold')
                .fillColor('#FFFFFF')
                .text('INVOICE', doc.page.width - 200, 25, {
                    align: 'right',
                    width: 150
                });

            // Reset fill color for content
            doc.fillColor('#000000')
                .fontSize(12)
                .font('Helvetica');
        };

        // Helper function to add footer on each page
        const addFooter = (pageNumber, totalPages) => {
            const footerY = doc.page.height - 100;

            // Thank you message
            doc.fontSize(10)
                .fillColor('#666666')
                .text('Thank you ......', 50, footerY);
            
            doc.fontSize(10)
                .fillColor('#000000')
                .font('Helvetica-Bold')
                .text('Have A Safe Ride - Visit Again', 50, footerY + 15);

            // Authorized signature (right side)
            doc.fontSize(10)
                .font('Helvetica-Bold')
                .text('Team MechanicPro', doc.page.width - 200, footerY, {
                    align: 'right',
                    width: 150
                });
            
            doc.fontSize(10)
                .font('Helvetica')
                .fillColor('#666666')
                .text('Authorized Signed', doc.page.width - 200, footerY + 15, {
                    align: 'right',
                    width: 150
                });

            // Orange footer bar with contact info
            // --- FOOTER SECTION START ---
            const orangeBarY = doc.page.height - 60;
            
            // 1. Draw orange rectangle background
            doc.rect(0, orangeBarY, doc.page.width, 60)
                .fill('#FF6B35');

            // 2. Set white text style
            doc.fillColor('#FFFFFF')
                .fontSize(13)      // Slightly larger for readability
                .font('Helvetica');

            // 3. Left side - Contact Info (Replaced Emojis with Text)
            doc.text('Ph: 9281487865, 9704787511', 50, orangeBarY + 15, {
                lineBreak: false
            });
            
            doc.text('Web: www.mechanicpro.in', 50, orangeBarY + 30, {
                lineBreak: false
            });

            // 4. Right side - Address
            // We use specific X coordinates to ensure it stays on the page
            
            // Line 1: Address Name
            doc.text('Addr: A1 Car Service, Beside Power One Mall', 
                doc.page.width - 290, // Start 350px from right edge
                orangeBarY + 15,
                {lineBreak: false}
            );

            // Line 2: City/Pin
            doc.text('Bundar Road, Vijayawada 520007', 
                doc.page.width - 290, 
                orangeBarY + 30, 
                { 
                lineBreak: false
                }
            );

            // Reset fill color for any future text
            doc.fillColor('#000000');
            // --- FOOTER SECTION END ---
        };

        // Add header
        addHeader();

        // Start content below header with more spacing
        let yPosition = 110;

        // Vehicle and Invoice details - Increased font size
        doc.fontSize(12)
            .font('Helvetica')
            .fillColor('#666666')
            .text('Vehicle NO :-', 50, yPosition);
        
        doc.font('Helvetica-Bold')
            .fillColor('#000000')
            .fontSize(12)
            .text(bill.vehicleDetails?.plateNumber || 'N/A', 135, yPosition);

        // Invoice number (right aligned)
        doc.font('Helvetica')
            .fillColor('#666666')
            .fontSize(12)
            .text('Invoice NO:-', doc.page.width - 250, yPosition);
        
        doc.font('Helvetica-Bold')
            .fillColor('#000000')
            .fontSize(12)
            .text(formattedBillNumber, doc.page.width - 177, yPosition);

        yPosition += 30;

        // Brand/Model - Increased font size
        doc.font('Helvetica')
            .fillColor('#666666')
            .fontSize(12)
            .text('Brand / Model :-', 50, yPosition);
        
        doc.font('Helvetica-Bold')
            .fillColor('#000000')
            .fontSize(12)
            .text(`${bill.vehicleDetails?.make || 'N/A'}/${bill.vehicleDetails?.model || 'N/A'}`, 135, yPosition);

        // Date (right aligned)
        doc.font('Helvetica')
            .fillColor('#666666')
            .fontSize(12)
            .text('Date :-', doc.page.width - 250, yPosition);
        
        doc.font('Helvetica-Bold')
            .fillColor('#000000')
            .fontSize(12)
            .text(billDate.toLocaleDateString('en-GB'), doc.page.width - 177, yPosition);

        yPosition += 50;

        // Items table header - Increased font size
        const tableTop = yPosition;
        
        // Draw table header background
        

        doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text('Item', 60, tableTop + 2);
        
        doc.text('Price', doc.page.width - 150, tableTop + 2, {
            width: 100,
            align: 'right'
        });

        yPosition = tableTop + 30;

        // Draw top border of table
        doc.moveTo(50, yPosition)
            .lineTo(doc.page.width - 50, yPosition)
            .stroke();

        yPosition += 15;

        // Add items dynamically with increased spacing
        bill.items.forEach((item, index) => {
            // Check if we need a new page
            if (yPosition > doc.page.height - 220) {
                addFooter();
                doc.addPage();
                addHeader();
                yPosition = 110;
            }

            doc.fontSize(12)
                .font('Helvetica')
                .fillColor('#000000')
                .text(item.name, 60, yPosition, {
                    width: doc.page.width - 250
                });
            
            doc.fontSize(12)
                .text(`${item.price}/-`, doc.page.width - 150, yPosition, {
                    width: 100,
                    align: 'right'
                });

            yPosition += 35;

            // Draw row separator
            doc.moveTo(50, yPosition - 10)
                .lineTo(doc.page.width - 50, yPosition - 10)
                .stroke('#CCCCCC');
        });

        yPosition += 15;

        // Total section - Increased font size
        doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text('Total', 60, yPosition);
        
        doc.fontSize(14)
            .text(`${bill.totalAmount}/-`, doc.page.width - 150, yPosition, {
                width: 100,
                align: 'right'
            });

        yPosition += 35;

        // Advance Received (if any) - Increased font size
        if (bill.advanceReceived) {
            doc.fontSize(14)
                .font('Helvetica-Bold')
                .text('Advance Recieved', 60, yPosition);
            
            doc.fontSize(14)
                .text(`-${bill.advanceReceived}/-`, doc.page.width - 150, yPosition, {
                    width: 100,
                    align: 'right'
                });

            yPosition += 35;
        }

        // Draw thick line before balance
        doc.moveTo(50, yPosition)
            .lineWidth(2)
            .lineTo(doc.page.width - 50, yPosition)
            .stroke();

        yPosition += 20;

        // Balance to be paid - Increased font size
        const balanceToPay = bill.advanceReceived 
            ? bill.totalAmount - bill.advanceReceived 
            : bill.totalAmount;

        doc.fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text('Balance To Be Paid', 60, yPosition);
        
        doc.fontSize(16)
            .text(`${balanceToPay}/-`, doc.page.width - 150, yPosition, {
                width: 100,
                align: 'right'
            });

        // Add PhonePe QR Code - Bottom Right (Before Footer)
        yPosition += 40;
        
        // Check if we have enough space, otherwise add new page
        if (yPosition > doc.page.height - 280) {
            addFooter();
            doc.addPage();
            addHeader();
            yPosition = 110;
        }

        if (phonepeExists) {
            try {
                // Position PhonePe QR code at bottom right
                const qrSize = 100; // 100x100 pixels
                const qrX = doc.page.width - qrSize - 45; // 70px from right edge
                const qrY = doc.page.height - 240; // 180px from bottom (above footer)

                doc.image(phonepePath, qrX, qrY, {
                    width: qrSize,
                    height: qrSize
                });

                // Add text below QR code
                doc.fontSize(9)
                    .font('Helvetica')
                    .fillColor('#000000')
                    .text('Scan to Pay via PhonePe', qrX - 10, qrY + qrSize + 5, {
                        width: qrSize + 20,
                        align: 'center'
                    });
            } catch (error) {
                console.warn('PhonePe QR code not found, skipping image:', error.message);
            }
        }

        // Add footer
        addFooter(1, 1);

        // Finalize PDF
        doc.end();

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate PDF',
            error: error.message
        });
    }
};

// Update Bill Status
exports.updateBillStatus = async (req, res) => {
    try {
        const { billId } = req.params;
        const { status } = req.body;

        if (!['pending', 'paid', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const bill = await Bill.findById(billId);
        if (!bill) {
            return res.status(404).json({
                success: false,
                message: 'Bill not found'
            });
        }

        // Check if mechanic owns this bill
        if (bill.mechanicId.toString() !== req.mechanic.id) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        bill.status = status;
        await bill.save();

        res.status(200).json({
            success: true,
            message: 'Bill status updated',
            bill
        });

    } catch (error) {
        console.error('Error updating bill status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update bill status',
            error: error.message
        });
    }
};
