const { pool } = require('../src/config/database');

function formatMinutesToTimeString(mins) {
  const m = Number(mins) || 0;
  const hours = Math.floor(m / 60);
  const minutes = m % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes < 10 ? '0' : ''}${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h 00m`;
  }
  return `${minutes}m`;
}

async function syncTaskTimesheets() {
  console.log('Fetching tasks with spent time > 0...');
  
  // Clear any existing timesheets to perform clean sync
  await pool.query('DELETE FROM timesheets');
  console.log('Cleared old timesheets.');

  const [tasks] = await pool.query(
    `SELECT t.*, p.title as project_title, u.username as creator_name 
     FROM tasks t 
     LEFT JOIN projects p ON p.id = t.project_id
     LEFT JOIN users u ON u.id = t.user_id
     WHERE t.spent_minutes > 0`
  );

  console.log(`Found ${tasks.length} tasks with logged time.`);

  let insertedCount = 0;

  for (const task of tasks) {
    const timeStr = formatMinutesToTimeString(task.spent_minutes);
    const projName = task.project_title || 'General Workspace';
    const taskCat = task.category || 'General';

    // Parse assignee IDs
    let userIds = [];
    if (task.assignee_ids) {
      try {
        const parsed = JSON.parse(task.assignee_ids);
        if (Array.isArray(parsed) && parsed.length > 0) {
          userIds = parsed.map(id => Number(id)).filter(id => !isNaN(id));
        }
      } catch (e) {}
    }

    if (userIds.length === 0 && task.user_id) {
      userIds = [Number(task.user_id)];
    }

    for (const uid of userIds) {
      await pool.execute(
        `INSERT INTO timesheets (user_id, title, description, task, project, time, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uid,
          task.title,
          task.description || '',
          taskCat,
          projName,
          timeStr,
          task.created_at || new Date()
        ]
      );
      insertedCount++;
    }
  }

  console.log(`Successfully created ${insertedCount} timesheet entries based on real task time logs!`);
  process.exit(0);
}

syncTaskTimesheets().catch(err => {
  console.error('Error syncing task timesheets:', err);
  process.exit(1);
});
