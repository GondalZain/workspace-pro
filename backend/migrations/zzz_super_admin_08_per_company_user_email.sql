-- Allow same email across different companies (multi-tenant per-company email uniqueness)
SET @dbname = DATABASE();
SET @tablename = "users";

-- 1. Drop old single email unique index if present
SET @dropIndex = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = 'unique_users_email'
  ) > 0,
  "ALTER TABLE users DROP INDEX unique_users_email;",
  "SELECT 1;"
));
PREPARE stmtDrop FROM @dropIndex;
EXECUTE stmtDrop;
DEALLOCATE PREPARE stmtDrop;

-- 2. Add composite unique index (company_id, email) if not present
SET @addIndex = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = 'unique_users_company_email'
  ) = 0,
  "ALTER TABLE users ADD UNIQUE KEY unique_users_company_email (company_id, email);",
  "SELECT 1;"
));
PREPARE stmtAdd FROM @addIndex;
EXECUTE stmtAdd;
DEALLOCATE PREPARE stmtAdd;
