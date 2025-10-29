// Simple Node.js backend server for sending emails
// Run this with: node backend-server.js

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Your Gmail SMTP configuration
const smtpConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'chicorlcruz@gmail.com',
    pass: 'kflf nqdl mbfq opqv' // Your Gmail app password
  }
};

// Create transporter
const transporter = nodemailer.createTransport(smtpConfig);

// Test email configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ SMTP Error:', error);
  } else {
    console.log('✅ SMTP Server is ready to take our messages');
  }
});

// Email sending endpoint
app.post('/send-email', async (req, res) => {
  try {
    const { smtp, email } = req.body;
    
    console.log('📧 Received email request:', {
      to: email.to,
      subject: email.subject
    });
    
    // Send email using Nodemailer
    const result = await transporter.sendMail({
      from: email.from,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html
    });
    
    console.log('✅ Email sent successfully:', result.messageId);
    
    res.json({
      success: true,
      messageId: result.messageId,
      message: 'Email sent successfully'
    });
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to send email'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Email server is running',
    timestamp: new Date().toISOString()
  });
});

// Cloudinary signature endpoint (for signed uploads)
// Usage: POST /cloudinary-sign { params: { timestamp: 1234567890, folder: 'faithconnect' } }
// It will return { signature: '...', timestamp: 1234567890 }
app.post('/cloudinary-sign', (req, res) => {
  try {
    const { params } = req.body || {};
    if (!params || typeof params !== 'object') {
      return res.status(400).json({ error: 'Missing params' });
    }

    // Build the string to sign by sorting keys and concatenating as key=value&...
    const keys = Object.keys(params).sort();
    const toSign = keys.map((k) => `${k}=${params[k]}`).join('&');

    // IMPORTANT: Replace with your actual secret in production via env var
    const apiSecret = 'IbtgPhwuPWO6rho9O5BCdBazwTI';
    const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');

    res.json({ signature });
  } catch (err) {
    console.error('❌ Error generating Cloudinary signature:', err);
    res.status(500).json({ error: 'Failed to generate signature' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Email server running on http://localhost:${PORT}`);
  console.log(`📧 Ready to send emails using Gmail SMTP`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
