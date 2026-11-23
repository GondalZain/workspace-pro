-- Migration: Add project status, project_members, and developer_assessments
ALTER TABLE projects ADD COLUMN status VARCHAR(50) DEFAULT 'planning' AFTER deadline;

CREATE TABLE IF NOT EXISTS project_members (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  company_id INT DEFAULT NULL,
  role_in_project VARCHAR(50) DEFAULT 'Developer',
  readiness_status ENUM('pending_test', 'testing', 'evaluated', 'approved') DEFAULT 'pending_test',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_proj_user (project_id, user_id),
  KEY idx_pm_project (project_id),
  KEY idx_pm_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS developer_assessments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  company_id INT DEFAULT NULL,
  status ENUM('pending', 'in_progress', 'completed', 'evaluated') DEFAULT 'pending',
  score INT DEFAULT NULL,
  evaluated_level ENUM('Junior', 'Mid-Level', 'Senior', 'Lead/Architect') DEFAULT NULL,
  max_complexity ENUM('low', 'medium', 'high') DEFAULT 'medium',
  questions_payload JSON NOT NULL,
  answers_payload JSON DEFAULT NULL,
  ai_feedback_payload JSON DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_da_proj (project_id),
  KEY idx_da_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
