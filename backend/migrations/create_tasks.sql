CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('pending', 'in-progress', 'completed') NOT NULL DEFAULT 'pending',
  priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  due_date DATE NULL,
  due_time TIME NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'Personal',
  tags JSON NOT NULL,
  attachments JSON NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  INDEX index_tasks_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;