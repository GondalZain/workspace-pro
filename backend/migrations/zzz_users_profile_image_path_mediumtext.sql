-- Expand profile_image_path to MEDIUMTEXT to support serverless base64 data URLs
ALTER TABLE users MODIFY COLUMN profile_image_path MEDIUMTEXT NULL;
