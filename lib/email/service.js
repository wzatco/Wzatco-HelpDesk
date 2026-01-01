/**
 * Email service using nodemailer with Amazon SES SMTP
 */

import nodemailer from 'nodemailer';
import { getEmailConfig, clearEmailConfigCache } from './config';

// Create transporter dynamically (will be recreated when config changes)
let transporter = null;
let currentConfig = null;

async function getTransporter() {
  const emailConfig = await getEmailConfig();
  
  // Only recreate transporter if config changed
  if (!transporter || JSON.stringify(emailConfig) !== JSON.stringify(currentConfig)) {
    transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth,
      debug: emailConfig.debug
    });
    currentConfig = emailConfig;
  }
  
  return transporter;
}

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.text] - Plain text content (optional)
 * @param {string|string[]} [options.cc] - CC email(s) (optional)
 * @param {string|string[]} [options.bcc] - BCC email(s) (optional)
 * @returns {Promise<Object>} - Result object with success status and message
 */
export async function sendEmail({ to, subject, html, text, cc, bcc }) {
  try {
    // Validate required fields
    if (!to || !subject || !html) {
      throw new Error('Missing required email fields: to, subject, or html');
    }

    // Get current config and transporter
    const emailConfig = await getEmailConfig();
    const currentTransporter = await getTransporter();

    // Prepare mail options
    const mailOptions = {
      from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
      replyTo: emailConfig.replyTo,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for plain text fallback
      ...(cc && { cc: Array.isArray(cc) ? cc.join(', ') : cc }),
      ...(bcc && { bcc: Array.isArray(bcc) ? bcc.join(', ') : bcc })
    };

    // Send email
    const info = await currentTransporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully'
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to send email'
    };
  }
}

/**
 * Verify email transporter connection
 * @returns {Promise<boolean>} - True if connection is successful
 */
export async function verifyEmailConnection() {
  try {
    const currentTransporter = await getTransporter();
    await currentTransporter.verify();
    return true;
  } catch (error) {
    console.error('Email connection verification failed:', error);
    return false;
  }
}

// Export cache clear function
export { clearEmailConfigCache };

