UPDATE tasks
SET attachments = '[]'
WHERE attachments IS NULL;
