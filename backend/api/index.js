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
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin,X-CSRF-Token,Accept-Version,Content-Length,Content-MD5,Date,X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    await getDbInit();
  } catch (error) {
    console.error('[Vercel Serverless] DB initialization warning:', error.message);
  }
  return app(req, res);
};
