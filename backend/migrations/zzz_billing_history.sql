-- Migration: Create company_billing_history table
CREATE TABLE IF NOT EXISTS company_billing_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  invoice_number VARCHAR(100) NOT NULL,
  plan_id VARCHAR(50) NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  status VARCHAR(50) NOT NULL DEFAULT 'paid',
  billing_date DATETIME NOT NULL,
  period_start DATETIME NULL,
  period_end DATETIME NULL,
  payment_method VARCHAR(100) DEFAULT 'Card ending in 4242',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_billing_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
