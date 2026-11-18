-- Multi-tenant notification email enhancement:
-- Allows company users and admins to have a real personal/original notification email (e.g. Gmail)
-- distinct from their company workspace domain login (e.g. admin@company.com),
-- ensuring task assignment alerts reach their real inbox.

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS original_email VARCHAR(255) NULL DEFAULT NULL AFTER email;
