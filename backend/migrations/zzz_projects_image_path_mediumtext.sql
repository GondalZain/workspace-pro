-- Ensure projects.image_path can store data URLs on serverless / read-only platforms
ALTER TABLE projects MODIFY COLUMN image_path MEDIUMTEXT NULL;
