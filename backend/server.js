const { port } = require('./src/config/env');
const app = require('./src/app');
const { initializeDatabase } = require('./src/config/database');

initializeDatabase()
  .then(() => app.listen(port, () => console.log(`TODO backend running at http://localhost:${port}`)))
  .catch((error) => {
    console.error('Could not initialize MySQL. Check XAMPP and DATABASE_URL in .env.', error.message);
    process.exit(1);
  });
