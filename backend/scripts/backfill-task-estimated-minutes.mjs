/**
 * Sets estimated_minutes on tasks that don't have one yet (sensible random by priority).
 * Usage: node scripts/backfill-task-estimated-minutes.mjs
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is missing from backend/.env');
  process.exit(1);
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(array) {
  return array[randomInt(0, array.length - 1)];
}

function randomEstimatedMinutes(priority) {
  const pools = {
    low: [20, 30, 45, 60, 75, 90],
    medium: [45, 60, 90, 120, 150, 180, 240],
    high: [90, 120, 180, 240, 300, 360, 480]
  };
  const options = pools[priority] || pools.medium;
  let minutes = pick(options);
  if (Math.random() > 0.55) {
    minutes += pick([5, 10, 15]);
  }
  return minutes;
}

async function main() {
  const pool = mysql.createPool(databaseUrl);
  try {
    const [tasks] = await pool.query(
      `SELECT id, priority FROM tasks
       WHERE estimated_minutes IS NULL OR estimated_minutes = 0`
    );

    if (!tasks.length) {
      console.log('All tasks already have estimated time.');
      return;
    }

    for (const task of tasks) {
      const minutes = randomEstimatedMinutes(task.priority || 'medium');
      await pool.execute('UPDATE tasks SET estimated_minutes = ? WHERE id = ?', [minutes, task.id]);
    }

    console.log(`Updated estimated time on ${tasks.length} task(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
