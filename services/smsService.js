// Twilio SMS Service
const twilio = require('twilio');

// Get Twilio credentials - will be loaded at runtime
const getTwilioConfig = () => ({
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
});

// Initialize Twilio client (lazy initialization)
let twilioClient = null;
let twilioEnabled = false;
let initialized = false;

const initializeTwilio = () => {
    if (initialized) return;
    initialized = true;
    
    const config = getTwilioConfig();
    
    console.log('🔍 Twilio Configuration Check:');
    console.log('   Account SID:', config.accountSid ? `${config.accountSid.substring(0, 10)}...` : 'NOT SET');
    console.log('   Auth Token:', config.authToken ? 'SET' : 'NOT SET');
    console.log('   Phone Number:', config.phoneNumber || 'NOT SET');
    
    if (config.accountSid && config.authToken && config.phoneNumber) {
        try {
            twilioClient = twilio(config.accountSid, config.authToken);
            twilioEnabled = true;
            console.log('✅ Twilio SMS Service initialized successfully');
            console.log(`📱 SMS will be sent from: ${config.phoneNumber}`);
        } catch (error) {
            console.error('❌ Twilio initialization failed:', error.message);
            console.error('   Error Code:', error.code);
            twilioEnabled = false;
        }
    } else {
        console.error('⚠️ Twilio credentials missing in .env file');
        console.log('   Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
    }
};

/**
 * Send OTP SMS using Twilio
 * @param {string} phone - Phone number with country code (e.g., +919876543210)
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<Object>} - Response object
 */
const sendOTPSMS = async (phone, otp) => {
    // Initialize Twilio on first use
    if (!initialized) {
        initializeTwilio();
    }
    
    try {
        // Format phone number - ensure it has country code
        let formattedPhone = phone.trim();
        if (!formattedPhone.startsWith('+')) {
            // If no country code, assume India (+91)
            formattedPhone = formattedPhone.startsWith('91') 
                ? `+${formattedPhone}` 
                : `+91${formattedPhone.replace(/^0+/, '')}`;
        }
        
        // Remove any spaces
        formattedPhone = formattedPhone.replace(/\s+/g, '');

        // Require Twilio to be configured
        if (!twilioEnabled || !twilioClient) {
            console.error(`❌ Twilio not configured - cannot send SMS to ${formattedPhone}`);
            return {
                success: false,
                error: 'Twilio not configured'
            };
        }

        // Get config for phone number
        const config = getTwilioConfig();

        // Send SMS via Twilio
        const message = await twilioClient.messages.create({
            body: `Your MechanicPro verification code is: ${otp}. This code will expire in 10 minutes. Do not share this code with anyone.`,
            from: config.phoneNumber,
            to: formattedPhone
        });

        console.log('SMS sent successfully via Twilio:', {
            sid: message.sid,
            status: message.status,
            to: formattedPhone
        });

        return {
            success: true,
            messageSid: message.sid,
            status: message.status
        };

    } catch (error) {
        console.error('Error sending SMS via Twilio:', error.message);
        console.error('Twilio error details:', {
            code: error.code,
            moreInfo: error.moreInfo
        });
        
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Send custom message SMS using Twilio
 * @param {string} phone - Phone number with country code
 * @param {string} message - Message to send
 * @returns {Promise<Object>} - Response object
 */
const sendCustomSMS = async (phone, message) => {
    try {
        // Format phone number
        let formattedPhone = phone.trim();
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = formattedPhone.startsWith('91') 
                ? `+${formattedPhone}` 
                : `+91${formattedPhone.replace(/^0+/, '')}`;
        }
        formattedPhone = formattedPhone.replace(/\s+/g, '');

        // Initialize Twilio on first use
        if (!initialized) {
            initializeTwilio();
        }

        if (!twilioEnabled || !twilioClient) {
            console.error(`❌ Twilio not configured - cannot send SMS to ${formattedPhone}`);
            return {
                success: false,
                error: 'Twilio not configured'
            };
        }

        // Get config for phone number
        const config = getTwilioConfig();

        const twilioMessage = await twilioClient.messages.create({
            body: message,
            from: config.phoneNumber,
            to: formattedPhone
        });

        console.log('SMS sent successfully:', twilioMessage.sid);
        return {
            success: true,
            messageSid: twilioMessage.sid,
            status: twilioMessage.status
        };

    } catch (error) {
        console.error('Error sending SMS:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    sendOTPSMS,
    sendCustomSMS
};
