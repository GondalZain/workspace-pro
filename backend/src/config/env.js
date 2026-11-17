// @ts-nocheck
require('dotenv').config();
const { decryptProcessEnv } = require('../../scripts/env-crypto');

// Transparently decrypt any ENC(v1:...) values in process.env in memory
decryptProcessEnv();

const databaseUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/todo_db';

let databaseName = 'todo_db';
try {
  const parsedDatabaseUrl = new URL(databaseUrl);
  databaseName = decodeURIComponent(parsedDatabaseUrl.pathname.slice(1)) || 'todo_db';
} catch (e) {
  console.warn('[Env] Could not parse DATABASE_URL as URL, using default db name.');
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl,
  databaseName,
  jwtSecret: process.env.JWT_SECRET || 'change-this-development-secret',
  appClientUrl: process.env.APP_CLIENT_URL || 'http://localhost:4200',
  appClientPort: process.env.APP_CLIENT_PORT || '4200',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.resend.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    user: process.env.SMTP_USER || 'resend',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'Workspace Pro',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'onboarding@resend.dev',
    inboundEmail: process.env.RESEND_INBOUND_EMAIL || 'reply@entuepu.resend.app',
    adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || 'gondalzain717@gmail.com',
    resendApiKey: process.env.RESEND_API_KEY || process.env.SMTP_PASS || '',
    resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET || ''
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
  }
};
