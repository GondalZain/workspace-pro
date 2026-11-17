// @ts-nocheck
const nodemailer = require('nodemailer');
const { smtp } = require('../../config/env');

let transporter = null;

/**
 * Creates or returns the cached singleton Nodemailer transporter for Resend SMTP (`smtp.resend.com`).
 */
function getTransporter() {
  if (!transporter) {
    const host = (smtp.host || 'smtp.resend.com').trim();
    const port = Number(smtp.port) || 465;
    const isSecure = String(smtp.secure) === 'true' || port === 465;

    const config = {
      host,
      port,
      secure: isSecure,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      tls: {
        rejectUnauthorized: false
      }
    };

    if (smtp.user && smtp.pass) {
      config.auth = {
        user: smtp.user.trim(),
        pass: smtp.pass.trim()
      };
    }

    transporter = nodemailer.createTransport(config);
  }
  return transporter;
}

/**
 * Verifies SMTP connection with Resend
 */
async function verifyTransporter() {
  const client = getTransporter();
  return client.verify();
}

/**
 * Close pool during app shutdown if needed
 */
function closeTransporter() {
  if (transporter) {
    transporter.close();
    transporter = null;
  }
}

module.exports = {
  getTransporter,
  verifyTransporter,
  closeTransporter
};
