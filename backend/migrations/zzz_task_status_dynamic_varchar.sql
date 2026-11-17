-- Allow arbitrary dynamic task statuses by changing ENUM to VARCHAR
ALTER TABLE tasks MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending';
