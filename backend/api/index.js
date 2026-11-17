const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

const app = require('../src/app');
const { initializeDatabase } = require('../src/config/database');

let initializedPromise = null;

function getDbInit() {
  if (!initializedPromise) {
    initializedPromise = initializeDatabase().catch((err) => {
      console.error('[DB] Serverless initial database connection error:', err);
      initializedPromise = null;
      throw err;
    });
  }
  return initializedPromise;
}

module.exports = async (req, res) => {
  try {
    await getDbInit();
  } catch (error) {
    console.error('[Vercel Serverless] DB initialization warning:', error.message);
  }
  return app(req, res);
};
