-- Migration: Add auto_debit_enabled, trial_used to companies and create company_payment_cards table

SET @dbname = DATABASE();
SET @tablename = "companies";

-- 1. auto_debit_enabled
SET @columnname = "auto_debit_enabled";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE companies ADD COLUMN auto_debit_enabled TINYINT(1) NOT NULL DEFAULT 1;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. trial_used
SET @columnname = "trial_used";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE companies ADD COLUMN trial_used TINYINT(1) NOT NULL DEFAULT 0;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 3. Create company_payment_cards table
CREATE TABLE IF NOT EXISTS company_payment_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  cardholder_name VARCHAR(255) NOT NULL,
  brand VARCHAR(50) NOT NULL DEFAULT 'Visa',
  stripe_payment_method_id VARCHAR(255) NULL,
  last4 VARCHAR(10) NOT NULL,
  exp_month INT NOT NULL,
  exp_year INT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cards_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
