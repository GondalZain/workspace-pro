-- 1. Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NULL,
  description TEXT NULL,
  logo_path VARCHAR(255) NULL,
  status ENUM('active', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Add company_id to users, tasks, projects
SET @dbname = DATABASE();

SET @tablename = "users";
SET @columnname = "company_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN company_id INT NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @tablename = "tasks";
SET @columnname = "company_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE tasks ADD COLUMN company_id INT NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @tablename = "projects";
SET @columnname = "company_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE projects ADD COLUMN company_id INT NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 3. Add super_admin to roles table
INSERT IGNORE INTO roles (name, description) VALUES ('super_admin', 'Super Admin - System-wide Multi-Company Owner');

-- 4. Seed Super Admin User (email: superadmin@gmail.com / pass: superadmin1234)
INSERT INTO users (username, email, password_hash, role_id)
SELECT 'Super Admin', 'superadmin@gmail.com', '$2b$12$iu8RAQFQtVcEPUfcPlLPX.eiOXXnPBHYbMhYbi249/2xXVnd2LfGe', id
FROM roles WHERE name = 'super_admin'
ON DUPLICATE KEY UPDATE password_hash = '$2b$12$iu8RAQFQtVcEPUfcPlLPX.eiOXXnPBHYbMhYbi249/2xXVnd2LfGe';
