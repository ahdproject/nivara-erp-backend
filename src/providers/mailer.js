const nodemailer = require('nodemailer');
const { logger } = require('../config/logger');

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || process.env.SMTP_HOST,
  port: process.env.EMAIL_PORT || process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS,
  },
});

/**
 * Send email via Nodemailer
 */
const sendMail = async ({ to, subject, html, text, from }) => {
  try {
    const mailOptions = {
      from: from || process.env.EMAIL_FROM || process.env.SMTP_FROM_EMAIL,
      to,
      subject,
      html,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return info.messageId;
  } catch (error) {
    logger.error(`sendMail error: ${error.message}`);
    throw error;
  }
};

/**
 * Verify transporter connection
 */
const verifyConnection = async () => {
  try {
    await transporter.verify();
    logger.info('Email transporter verified successfully');
    return true;
  } catch (error) {
    logger.error(`Email transporter verification failed: ${error.message}`);
    return false;
  }
};

module.exports = {
  sendMail,
  verifyConnection,
};
