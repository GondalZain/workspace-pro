const { pool } = require('../src/config/database');

const REALISTIC_PROJECT_TASKS = {
  school: [
    {
      title: "Student Attendance & Gradebook Module",
      description: "Implement student attendance logging with daily status reports and gradebook calculation views.",
      priority: "high",
      status: "in_progress",
      category: "Feature Dev",
      tags: ["Backend", "Database", "Gradebook"],
      estimatedMinutes: 240,
      spentMinutes: 90
    },
    {
      title: "Teacher & Student Portal Authentication",
      description: "Setup OAuth2 & JWT login controls with custom role-based permissions for faculty members and students.",
      priority: "medium",
      status: "completed",
      category: "Security",
      tags: ["Auth", "RBAC"],
      estimatedMinutes: 180,
      spentMinutes: 180
    },
    {
      title: "Fee Management & Invoice Generation",
      description: "Design automated fee statement calculator with downloadable PDF invoice export for parents.",
      priority: "high",
      status: "pending",
      category: "Finance",
      tags: ["PDF", "Invoicing"],
      estimatedMinutes: 300,
      spentMinutes: 0
    }
  ],
  job: [
    {
      title: "Candidate Resume Parser & Profile Builder",
      description: "Build interactive multi-step form for candidates to build profile, upload CV, and manage job alerts.",
      priority: "high",
      status: "in_progress",
      category: "Frontend",
      tags: ["UI", "Parser", "CV"],
      estimatedMinutes: 320,
      spentMinutes: 140
    },
    {
      title: "Employer Job Posting & Applicant Pipeline Dashboard",
      description: "Develop employer workspace for posting job listings, reviewing candidate applications, and updating pipeline status.",
      priority: "medium",
      status: "pending",
      category: "Feature Dev",
      tags: ["Employer Portal", "Dashboard"],
      estimatedMinutes: 240,
      spentMinutes: 0
    },
    {
      title: "Fuzzy Search Engine & Location Filters",
      description: "Implement fast search for job titles, skill keywords, salary ranges, and remote location filters.",
      priority: "low",
      status: "completed",
      category: "Search Engine",
      tags: ["Search", "API"],
      estimatedMinutes: 150,
      spentMinutes: 150
    }
  ],
  food: [
    {
      title: "Live Order Tracking & Driver Dispatch Map",
      description: "Integrate WebSocket live driver coordinates on interactive map view for active food delivery orders.",
      priority: "high",
      status: "in_progress",
      category: "Realtime API",
      tags: ["WebSockets", "Maps", "Geo"],
      estimatedMinutes: 360,
      spentMinutes: 210
    },
    {
      title: "Restaurant Menu Customizer & Option Addons",
      description: "Allow restaurant owners to set item variants, toppings, combo meals, and inventory availability.",
      priority: "medium",
      status: "pending",
      category: "Merchant Portal",
      tags: ["Menu", "Variants"],
      estimatedMinutes: 200,
      spentMinutes: 0
    },
    {
      title: "Payment Gateway Checkout & Promo Coupons",
      description: "Implement online payment checkout flow with instant promo coupon validation and order summary.",
      priority: "high",
      status: "completed",
      category: "Payments",
      tags: ["Checkout", "Stripe"],
      estimatedMinutes: 180,
      spentMinutes: 180
    }
  ],
  generic: [
    {
      title: "System Architecture & API Specs",
      description: "Define core endpoints, database indexing strategy, and microservice communication rules.",
      priority: "high",
      status: "completed",
      category: "Architecture",
      tags: ["Specs", "Database"],
      estimatedMinutes: 180,
      spentMinutes: 180
    },
    {
      title: "User Interface & Component Polish",
      description: "Enhance layout responsiveness, brand theme variables, and keyboard accessibility across pages.",
      priority: "medium",
      status: "in_progress",
      category: "UI Polish",
      tags: ["Frontend", "Design"],
      estimatedMinutes: 240,
      spentMinutes: 120
    },
    {
      title: "QA End-to-End Integration Testing",
      description: "Execute regression testing suite and log bug fixes prior to production release.",
      priority: "medium",
      status: "pending",
      category: "QA",
      tags: ["Testing", "Release"],
      estimatedMinutes: 150,
      spentMinutes: 0
    }
  ]
};

async function seedTasksForProjects() {
  console.log('Fetching projects and users...');
  const [projects] = await pool.query('SELECT * FROM projects');
  const [users] = await pool.query('SELECT id, username, company_id FROM users');

  if (projects.length === 0) {
    console.log('No projects found to seed tasks.');
    process.exit(0);
  }

  for (const project of projects) {
    // Find company users for this project's company
    const projectCompanyId = project.company_id;
    const companyUsers = users.filter(u => u.company_id === projectCompanyId);
    const availableUserIds = companyUsers.length > 0 ? companyUsers.map(u => u.id) : users.map(u => u.id);

    // Check if tasks already exist for this project
    const [existingTasks] = await pool.execute('SELECT COUNT(*) as count FROM tasks WHERE project_id = ?', [project.id]);
    if (existingTasks[0].count > 0) {
      console.log(`Project #${project.id} (${project.title}) already has ${existingTasks[0].count} tasks. Skipping...`);
      continue;
    }

    // Pick task templates based on project title
    const pTitle = project.title.toLowerCase();
    let templates = REALISTIC_PROJECT_TASKS.generic;
    if (pTitle.includes('school')) templates = REALISTIC_PROJECT_TASKS.school;
    else if (pTitle.includes('job')) templates = REALISTIC_PROJECT_TASKS.job;
    else if (pTitle.includes('food')) templates = REALISTIC_PROJECT_TASKS.food;

    console.log(`Seeding ${templates.length} tasks for Project #${project.id}: "${project.title}"...`);

    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      // Randomly pick creator and assignees
      const creatorId = availableUserIds[i % availableUserIds.length] || project.user_id;
      
      // Randomly assign to self (creatorId), or another user, or both
      let assignees = [];
      if (availableUserIds.length === 1) {
        assignees = [availableUserIds[0]];
      } else if (i === 0) {
        assignees = [availableUserIds[0]]; // first user
      } else if (i === 1) {
        assignees = [availableUserIds[1 % availableUserIds.length]]; // second user (assigning other)
      } else {
        assignees = availableUserIds.slice(0, 2); // both users
      }

      // Calculate due date (e.g. 3 to 10 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (i + 1) * 3);
      const dueDateStr = dueDate.toISOString().slice(0, 10);

      const completed = template.status === 'completed';

      await pool.execute(
        `INSERT INTO tasks (
          user_id, company_id, project_id, title, description, completed, status, priority, 
          due_date, due_time, estimated_minutes, spent_minutes, category, tags, attachments, 
          assignee_ids, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          creatorId,
          projectCompanyId,
          project.id,
          template.title,
          template.description,
          completed,
          template.status,
          template.priority,
          dueDateStr,
          '17:00',
          template.estimatedMinutes,
          template.spentMinutes,
          template.category,
          JSON.stringify(template.tags),
          JSON.stringify([]),
          JSON.stringify(assignees),
          new Date()
        ]
      );
    }
  }

  console.log('Task seeding completed successfully!');
  process.exit(0);
}

seedTasksForProjects().catch(err => {
  console.error(err);
  process.exit(1);
});
