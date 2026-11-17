/**
 * Seeds 2–4 tasks per project for non-admin users (tasks match project context).
 * Usage: node scripts/seed-project-tasks.mjs
 * Skips projects that already have at least 2 tasks linked.
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

const STATUSES = ['pending', 'in-progress', 'completed'];
const PRIORITIES = ['low', 'medium', 'high'];
const STOP_WORDS = new Set([
  'about', 'after', 'also', 'and', 'are', 'been', 'being', 'both', 'but', 'can', 'could',
  'does', 'each', 'for', 'from', 'have', 'that', 'the', 'their', 'them', 'then', 'there',
  'these', 'they', 'this', 'those', 'through', 'under', 'until', 'very', 'what', 'when',
  'where', 'which', 'while', 'will', 'with', 'would', 'your', 'project', 'tasks', 'task'
]);

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(array) {
  return array[randomInt(0, array.length - 1)];
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function keywordsFrom(text) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
  return [...new Set(words)].slice(0, 6);
}

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Realistic effort (minutes) — varies slightly by priority. */
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

function buildTaskTemplates(project) {
  const brief = (project.description || '').trim();
  const title = project.title.trim();
  const keys = keywordsFrom(`${title} ${brief}`);
  const k1 = keys[0] || 'scope';
  const k2 = keys[1] || 'delivery';
  const k3 = keys[2] || 'quality';
  const snippet = brief.length > 160 ? `${brief.slice(0, 157)}…` : brief || title;

  return [
    {
      title: `Define ${k1} for ${title}`,
      description: `Clarify objectives and success criteria for this project. Context: ${snippet}`
    },
    {
      title: `Plan ${k2} milestones`,
      description: `Create a short milestone plan aligned with the project description: ${snippet}`
    },
    {
      title: `Execute: ${k1} work package`,
      description: `Complete the next actionable item for "${title}". Focus area: ${k2}.`
    },
    {
      title: `Review ${k3} checklist`,
      description: `Walk through requirements from the project brief and note gaps for "${title}".`
    },
    {
      title: `Team sync on ${title}`,
      description: `Share progress, blockers, and next steps related to: ${snippet}`
    },
    {
      title: `Finalize ${k2} deliverable`,
      description: `Wrap up the current deliverable for "${title}" and prepare handoff notes.`
    }
  ];
}

function taskRow(project, template, userId) {
  const status = pick(STATUSES);
  const completed = status === 'completed';
  const priority = pick(PRIORITIES);
  const keys = keywordsFrom(`${project.title} ${project.description} ${template.title}`);
  const tags = JSON.stringify(keys.slice(0, 4));
  const dueOffset = randomInt(3, 28);
  const dueDate = Math.random() > 0.15 ? addDays(new Date(), dueOffset) : null;

  return {
    userId,
    projectId: project.id,
    title: template.title.slice(0, 255),
    description: template.description,
    completed,
    status,
    priority,
    dueDate,
    dueTime: null,
    estimatedMinutes: randomEstimatedMinutes(priority),
    category: 'Work',
    tags,
    attachments: JSON.stringify([]),
    createdAt: new Date(Date.now() - randomInt(0, 14) * 86400000)
  };
}

async function main() {
  const pool = mysql.createPool(databaseUrl);

  try {
    const [users] = await pool.query(
      `SELECT u.id, u.username, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE r.name IS NULL OR r.name <> 'admin'
       ORDER BY u.id`
    );

    if (users.length < 1) {
      console.error('No non-admin users found. Create at least one regular user first.');
      process.exit(1);
    }

    const assigneePool = users.slice(0, 2);
    console.log(`Assigning tasks to: ${assigneePool.map((u) => u.username).join(', ')}`);

    const [projects] = await pool.query(
      'SELECT id, title, description FROM projects ORDER BY id'
    );

    if (!projects.length) {
      console.log('No projects in database. Nothing to seed.');
      process.exit(0);
    }

    let inserted = 0;

    for (const project of projects) {
      const [[{ taskCount }]] = await pool.query(
        'SELECT COUNT(*) AS taskCount FROM tasks WHERE project_id = ?',
        [project.id]
      );

      if (Number(taskCount) >= 2) {
        console.log(`Skip project #${project.id} "${project.title}" — already has ${taskCount} task(s).`);
        continue;
      }

      const targetTotal = randomInt(2, 4);
      const toCreate = targetTotal - Number(taskCount);
      const templates = shuffle(buildTaskTemplates(project)).slice(0, toCreate);

      for (const template of templates) {
        const userId = pick(assigneePool).id;
        const row = taskRow(project, template, userId);
        await pool.execute(
          `INSERT INTO tasks (
            user_id, project_id, title, description, completed, status, priority,
            due_date, due_time, estimated_minutes, category, tags, attachments, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.userId,
            row.projectId,
            row.title,
            row.description,
            row.completed,
            row.status,
            row.priority,
            row.dueDate,
            row.dueTime,
            row.estimatedMinutes,
            row.category,
            row.tags,
            row.attachments,
            row.createdAt
          ]
        );
        inserted += 1;
      }

      console.log(`Project #${project.id} "${project.title}": added ${templates.length} task(s).`);
    }

    console.log(`Done. Inserted ${inserted} task(s) across ${projects.length} project(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
