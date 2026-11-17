const { pool } = require('../src/config/database');

async function migratePaymentCards() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS company_payment_cards (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      cardholder_name VARCHAR(120) NOT NULL,
      brand VARCHAR(40) NOT NULL DEFAULT 'Visa',
      last4 VARCHAR(4) NOT NULL DEFAULT '4242',
      exp_month INT NOT NULL DEFAULT 12,
      exp_year INT NOT NULL DEFAULT 28,
      is_default BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_company (company_id)
    )
  `);

  const [cols] = await pool.query("SHOW COLUMNS FROM companies LIKE 'auto_debit_enabled'");
  if (cols.length === 0) {
    await pool.query("ALTER TABLE companies ADD COLUMN auto_debit_enabled BOOLEAN NOT NULL DEFAULT TRUE");
  }

  console.log('Payment cards migration completed successfully.');
  process.exit(0);
}

migratePaymentCards().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
