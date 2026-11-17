-- Add primary_color and secondary_color to companies table
SET @dbname = DATABASE();

SET @tablename = "companies";
SET @columnname = "primary_color";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE companies ADD COLUMN primary_color VARCHAR(30) DEFAULT '#0f766e';"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = "secondary_color";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE companies ADD COLUMN secondary_color VARCHAR(30) DEFAULT '#ffffff';"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Ensure default company has default colors set
UPDATE companies SET primary_color = '#0f766e', secondary_color = '#ffffff' WHERE primary_color IS NULL OR secondary_color IS NULL;
