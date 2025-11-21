// backend/services/emailService.js
const nodemailer = require('nodemailer');

// Create email transporter with production-ready configuration
const createTransporter = () => {
  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email credentials not configured - email notifications disabled');
    return null;
  }

  try {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      // Production optimizations
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5
    });
  } catch (error) {
    console.error('❌ Failed to create email transporter:', error);
    return null;
  }
};

// Send emergency email to contacts
const sendEmergencyEmail = async (user, emergencyAlert, location = null) => {
  try {
    const { emergencyContacts } = user;
    
    if (!emergencyContacts || emergencyContacts.length === 0) {
      console.log('📭 No emergency contacts found for email notifications');
      return { sent: 0, total: 0, failed: 0 };
    }

    const transporter = createTransporter();
    if (!transporter) {
      console.log('📧 Email service not configured - skipping email notifications');
      return { sent: 0, total: emergencyContacts.length, failed: 0 };
    }

    // Verify connection
    await transporter.verify();
    console.log('📧 Email server connection verified');

    const locationLink = location?.latitude && location?.longitude 
      ? `https://maps.google.com/?q=${location.latitude},${location.longitude}`
      : 'Location not available';

    const safetyInfo = emergencyAlert.safetyAssessment?.safety_score 
      ? `\n🛡️ Safety Score: ${emergencyAlert.safetyAssessment.safety_score}/100 (${emergencyAlert.safetyAssessment.risk_level} risk)`
      : '';

    const emailPromises = emergencyContacts.map(contact => {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'emergency@rescuerush.com',
        to: contact.email,
        subject: `🚨 EMERGENCY: ${user.name || 'User'} Needs Immediate Help!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #ff4444; border-radius: 10px;">
            <div style="background-color: #ff4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🚨 EMERGENCY SOS ALERT</h1>
            </div>
            <div style="padding: 25px; background-color: #fff;">
              <h2 style="color: #333; margin-bottom: 20px;">Urgent: ${user.name || 'User'} Needs Your Help!</h2>
              
              <!-- Personal Emergency Message -->
              <div style="background-color: #fff3f5; padding: 20px; border-radius: 8px; border-left: 4px solid #ff4444; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #d32f2f;">
                  <strong>Hi, I'm ${user.name || 'a RescueRush user'}.</strong>
                </p>
                <p style="margin: 10px 0 0 0; font-size: 16px; line-height: 1.6; color: #d32f2f;">
                  <strong>I need help immediately! Please check my current location and contact emergency services if you can't reach me.</strong>
                </p>
              </div>

              <!-- User Information -->
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #333; margin-bottom: 15px;">👤 My Information</h3>
                <p style="margin: 8px 0;"><strong>Name:</strong> ${user.name || 'Not provided'}</p>
                <p style="margin: 8px 0;"><strong>Phone:</strong> ${user.phone}</p>
                ${user.email ? `<p style="margin: 8px 0;"><strong>Email:</strong> ${user.email}</p>` : ''}
                <p style="margin: 8px 0;"><strong>Emergency triggered:</strong> ${emergencyAlert.triggerType === 'shake' ? 'Phone Shake Detection' : 'SOS Button'}</p>
                <p style="margin: 8px 0;"><strong>Time:</strong> ${new Date(emergencyAlert.timestamp).toLocaleString()}</p>
              </div>

              <!-- Location Information -->
              <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #1565c0; margin-bottom: 15px;">📍 My Current Location</h3>
                <p style="margin: 8px 0;"><strong>Map Link:</strong> 
                  <a href="${locationLink}" style="color: #1976d2; text-decoration: none;">
                    📍 View My Location on Google Maps
                  </a>
                </p>
                ${location?.address ? `
                  <p style="margin: 8px 0;"><strong>Approximate Address:</strong> ${location.address}</p>
                ` : ''}
                ${location?.latitude && location?.longitude ? `
                  <p style="margin: 8px 0;"><strong>Coordinates:</strong> ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}</p>
                ` : ''}
                <p style="margin: 8px 0; font-size: 12px; color: #666;">
                  📱 Location captured by RescueRush app at time of emergency
                </p>
              </div>

              <!-- Safety Assessment -->
              ${safetyInfo ? `
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #856404; margin-bottom: 10px;">🛡️ Safety Assessment</h3>
                  <p style="margin: 5px 0;">${safetyInfo}</p>
                </div>
              ` : ''}

              <!-- Immediate Actions -->
              <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
                <h3 style="color: #155724; margin-bottom: 15px;">🚨 Immediate Action Required</h3>
                <ol style="margin: 0; padding-left: 20px; color: #155724;">
                  <li style="margin-bottom: 8px;"><strong>Call me first</strong> at ${user.phone} to check if I'm safe</li>
                  <li style="margin-bottom: 8px;"><strong>If I don't answer</strong>, call emergency services (112/911) immediately</li>
                  <li style="margin-bottom: 8px;"><strong>Share this alert</strong> with other trusted contacts who can help</li>
                  <li style="margin-bottom: 8px;"><strong>Use the map link</strong> above to see my exact location</li>
                  <li><strong>Keep trying to reach me</strong> until you confirm I'm safe</li>
                </ol>
              </div>

              <!-- Footer -->
              <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee; text-align: center;">
                <p style="color: #666; font-size: 12px; margin: 5px 0;">
                  This is an automated emergency alert sent from the RescueRush safety application.
                </p>
                <p style="color: #666; font-size: 12px; margin: 5px 0;">
                  If you believe this was sent in error, please contact ${user.name || 'the user'} immediately to confirm their safety.
                </p>
                <p style="color: #999; font-size: 11px; margin: 10px 0 0 0;">
                  Sent via RescueRush • Emergency Response System
                </p>
              </div>
            </div>
          </div>
        `
      };

      return transporter.sendMail(mailOptions);
    });

    const results = await Promise.allSettled(emailPromises);
    
    // Log results
    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`📧 Email notifications: ${sent} sent, ${failed} failed out of ${emergencyContacts.length} contacts`);
    
    results.forEach((result, index) => {
      const contact = emergencyContacts[index];
      if (result.status === 'fulfilled') {
        console.log(`✅ Email sent to: ${contact.email} (${contact.name})`);
      } else {
        console.error(`❌ Failed to send email to: ${contact.email} (${contact.name})`, result.reason);
      }
    });

    return { sent, total: emergencyContacts.length, failed };

  } catch (error) {
    console.error('❌ Error in sendEmergencyEmail:', error);
    return { sent: 0, total: 0, failed: 0 };
  }
};

module.exports = { sendEmergencyEmail };