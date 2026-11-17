const { pool } = require('../src/config/database');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_form_templates (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      name VARCHAR(128) NOT NULL,
      description VARCHAR(255) NULL,
      is_default TINYINT(1) NOT NULL DEFAULT 0,
      fields_config JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL DEFAULT NULL,
      INDEX idx_company (company_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [cols] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'form_template_id';
  `);

  if (cols.length === 0) {
    await pool.query(`
      ALTER TABLE tasks ADD COLUMN form_template_id INT UNSIGNED NULL AFTER project_id;
    `);
    console.log('Added form_template_id column to tasks table.');
  }

  const [companies] = await pool.query('SELECT id, name FROM companies');
  const defaultFieldsConfig = {
    standardFields: {
      description: { enabled: true, required: false },
      project: { enabled: true, required: true },
      status: { enabled: true, required: false },
      priority: { enabled: true, required: false },
      assignees: { enabled: true, required: false },
      dueDate: { enabled: true, required: false },
      dueTime: { enabled: true, required: false },
      estimatedTime: { enabled: true, required: false },
      category: { enabled: true, required: false },
      tags: { enabled: true, required: false },
      attachments: { enabled: true, required: false }
    },
    customFields: []
  };

  for (const comp of companies) {
    const [existing] = await pool.query(
      'SELECT id FROM task_form_templates WHERE company_id = ? AND deleted_at IS NULL',
      [comp.id]
    );
    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO task_form_templates (company_id, name, description, is_default, fields_config)
         VALUES (?, 'Standard Task Form', 'Built-in default task creation form with full standard fields.', 1, ?)`,
        [comp.id, JSON.stringify(defaultFieldsConfig)]
      );
      console.log(`Seeded Default Task Form for company: ${comp.name} (ID: ${comp.id})`);
    }
  }

  console.log('Migration completed successfully.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});

