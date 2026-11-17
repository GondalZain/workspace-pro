-- Multi-tenant Company Isolated Roles Migration
ALTER TABLE roles ADD COLUMN IF NOT EXISTS company_id INT(11) NULL DEFAULT NULL;

-- Remove global unique constraint on name if exists
SET @constraint_name = (SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND CONSTRAINT_TYPE = 'UNIQUE' AND CONSTRAINT_NAME != 'unique_company_role_name' LIMIT 1);
SET @query = IF(@constraint_name IS NOT NULL, CONCAT('ALTER TABLE roles DROP INDEX ', @constraint_name), 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add composite unique index for company roles if not exists
SET @has_unique = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND INDEX_NAME = 'unique_company_role_name');
SET @query2 = IF(@has_unique = 0, 'ALTER TABLE roles ADD CONSTRAINT unique_company_role_name UNIQUE (company_id, name)', 'SELECT 1');
PREPARE stmt2 FROM @query2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
