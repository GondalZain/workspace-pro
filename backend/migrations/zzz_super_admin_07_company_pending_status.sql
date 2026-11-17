-- Add 'pending' and 'rejected' to companies status enum
ALTER TABLE companies MODIFY COLUMN status ENUM('active', 'suspended', 'pending', 'rejected') DEFAULT 'active';
