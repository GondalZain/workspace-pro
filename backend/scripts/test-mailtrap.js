const { smtp } = require('../src/config/env');
const { verifyTransporter, closeTransporter } = require('../src/services/mail/mail.transporter');
const { sendMail } = require('../src/services/mail.service');

(async () => {
  console.log('Testing Mailtrap configuration:', {
    host: smtp.host,
    port: smtp.port,
    user: smtp.user ? `${smtp.user.slice(0, 4)}***` : '(not set)',
    fromEmail: smtp.fromEmail,
    adminNotificationEmail: smtp.adminNotificationEmail
  });

  try {
    if (smtp.user && smtp.pass) {
      await verifyTransporter();
      console.log('SMTP connection verified successfully with', smtp.host);
    }

    const recipient = process.argv[2] || smtp.adminNotificationEmail || 'test@example.com';
    const res = await sendMail({
      to: recipient,
      subject: 'Workspace Pro — Mailtrap Integration Verified',
      html: '<h2>Mailtrap Integration Active</h2><p>Your Workspace Pro backend is now connected to Mailtrap for sending and receiving test/transactional emails.</p>'
    });
    console.log('Send test result:', res);
  } catch (err) {
    console.error('Mailtrap verification error:', err.message);
    process.exitCode = 1;
  } finally {
    closeTransporter();
  }
})();