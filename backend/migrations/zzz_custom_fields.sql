-- Migration: Add custom fields support for multi-tenant projects and tasks

-- 1. Create table for custom field definitions per company
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  entity_type ENUM('project', 'task') NOT NULL,
  field_key VARCHAR(64) NOT NULL,
  field_name VARCHAR(128) NOT NULL,
  field_type ENUM('text', 'number', 'date', 'dropdown', 'checkbox', 'textarea') NOT NULL DEFAULT 'text',
  options JSON NULL,
  placeholder VARCHAR(255) NULL,
  description VARCHAR(255) NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  order_index INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_company_entity_key (company_id, entity_type, field_key),
  INDEX idx_company_entity (company_id, entity_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Add custom_fields JSON column to projects table
SET @dbname = DATABASE();
SET @tablename = "projects";
SET @columnname = "custom_fields";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE projects ADD COLUMN custom_fields JSON NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 3. Add custom_fields JSON column to tasks table
SET @tablename = "tasks";
SET @columnname = "custom_fields";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE tasks ADD COLUMN custom_fields JSON NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

