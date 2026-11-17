const { pool } = require('../src/config/database');

async function seedAlJannatTasks() {
  console.log('--- Seeding Tasks & Syncing Timesheets for Al-Jannat (Company ID: 3) ---');

  // Company ID: 3
  // Users: 8 (admin), 9 (Zain), 10 (ali)
  // Projects:
  // 8: Property Management System
  // 9: Event Management System
  // 10: Vehicle Rental System
  // 11: Banking Management System
  // 12: School Management System

  const tasksData = [
    // ----------------------------------------------------
    // Project 8: Property Management System
    // ----------------------------------------------------
    {
      company_id: 3,
      project_id: 8,
      user_id: 8, // Creator: admin
      title: 'Tenant Portal & Lease Agreement Module',
      description: 'Implement tenant registration, lease agreement view, and document upload features with secure authentication.',
      completed: 0,
      status: 'in_progress',
      priority: 'high',
      due_date: '2026-10-18',
      due_time: '18:00',
      estimated_minutes: 360,
      spent_minutes: 240, // 4h 00m
      category: 'Development',
      tags: JSON.stringify(['Frontend', 'TenantPortal', 'Angular']),
      assignee_ids: JSON.stringify([9, 10]) // Assigned to Zain and Ali
    },
    {
      company_id: 3,
      project_id: 8,
      user_id: 8,
      title: 'Property Manager Sprint Planning Meeting',
      description: 'Review Q4 deliverables, tenant onboarding workflows, and maintenance request tracking requirements with stakeholders.',
      completed: 1,
      status: 'completed',
      priority: 'urgent',
      due_date: '2026-10-04',
      due_time: '11:00',
      estimated_minutes: 120,
      spent_minutes: 120, // 2h 00m
      category: 'Meeting',
      tags: JSON.stringify(['Meeting', 'SprintPlanning', 'Stakeholders']),
      assignee_ids: JSON.stringify([8, 9, 10]) // Assigned to all 3
    },
    {
      company_id: 3,
      project_id: 8,
      user_id: 8,
      title: 'Rent Payment Gateway Integration & Audit Logging',
      description: 'Connect Stripe API for rent payments and store complete payment audit logs in MySQL database.',
      completed: 0,
      status: 'in_progress',
      priority: 'urgent',
      due_date: '2026-10-22',
      due_time: '17:00',
      estimated_minutes: 480,
      spent_minutes: 300, // 5h 00m
      category: 'Backend',
      tags: JSON.stringify(['Stripe', 'NodeJS', 'Security']),
      assignee_ids: JSON.stringify([8, 10]) // Admin and Ali
    },

    // ----------------------------------------------------
    // Project 9: Event Management System
    // ----------------------------------------------------
    {
      company_id: 3,
      project_id: 9,
      user_id: 8,
      title: 'Interactive Seat Map & Booking Interface',
      description: 'Design dynamic SVG-based venue seat selection screen with live availability color coding.',
      completed: 0,
      status: 'in_progress',
      priority: 'high',
      due_date: '2026-10-20',
      due_time: '16:00',
      estimated_minutes: 300,
      spent_minutes: 180, // 3h 00m
      category: 'Design',
      tags: JSON.stringify(['UI/UX', 'SVG', 'Frontend']),
      assignee_ids: JSON.stringify([9]) // Assigned to Zain
    },
    {
      company_id: 3,
      project_id: 9,
      user_id: 8,
      title: 'Event Organizer Sync & Feedback Session',
      description: 'Bi-weekly sync with event planners to review ticket sales reports, badge scanning mobile app UI, and promo code flow.',
      completed: 1,
      status: 'completed',
      priority: 'medium',
      due_date: '2026-10-05',
      due_time: '14:30',
      estimated_minutes: 90,
      spent_minutes: 90, // 1h 30m
      category: 'Meeting',
      tags: JSON.stringify(['Meeting', 'Feedback', 'ClientSync']),
      assignee_ids: JSON.stringify([8, 9]) // Admin and Zain
    },
    {
      company_id: 3,
      project_id: 9,
      user_id: 8,
      title: 'QR Code Ticket Generation & Email Dispatch',
      description: 'Generate high-res QR codes for confirmed bookings and dispatch custom PDF tickets automatically via SMTP.',
      completed: 0,
      status: 'pending',
      priority: 'medium',
      due_date: '2026-10-25',
      due_time: '18:00',
      estimated_minutes: 240,
      spent_minutes: 150, // 2h 30m
      category: 'Development',
      tags: JSON.stringify(['NodeJS', 'PDFGen', 'Email']),
      assignee_ids: JSON.stringify([10]) // Assigned to Ali
    },

    // ----------------------------------------------------
    // Project 10: Vehicle Rental System
    // ----------------------------------------------------
    {
      company_id: 3,
      project_id: 10,
      user_id: 8,
      title: 'Fleet Availability Calendar & Pricing Engine',
      description: 'Build real-time vehicle booking matrix with daily rate calculations, insurance add-ons, and peak season surcharges.',
      completed: 0,
      status: 'in_progress',
      priority: 'urgent',
      due_date: '2026-10-19',
      due_time: '17:00',
      estimated_minutes: 420,
      spent_minutes: 270, // 4h 30m
      category: 'Development',
      tags: JSON.stringify(['FleetManagement', 'PricingEngine', 'Angular']),
      assignee_ids: JSON.stringify([8, 9, 10]) // All 3
    },
    {
      company_id: 3,
      project_id: 10,
      user_id: 8,
      title: 'Vehicle Inspection Checklist & GPS Tracking Meeting',
      description: 'Technical discussion on telematics API integration, maintenance warning triggers, and driver license verification.',
      completed: 1,
      status: 'completed',
      priority: 'high',
      due_date: '2026-10-03',
      due_time: '15:00',
      estimated_minutes: 150,
      spent_minutes: 150, // 2h 30m
      category: 'Meeting',
      tags: JSON.stringify(['Meeting', 'GPS', 'Architecture']),
      assignee_ids: JSON.stringify([9, 10]) // Zain and Ali
    },
    {
      company_id: 3,
      project_id: 10,
      user_id: 8,
      title: 'End-to-End Rental Workflow & Checkout Testing',
      description: 'Run full regression testing suite covering reservation, security deposit authorization, drop-off inspection, and invoice issue.',
      completed: 0,
      status: 'review',
      priority: 'medium',
      due_date: '2026-10-21',
      due_time: '16:00',
      estimated_minutes: 240,
      spent_minutes: 210, // 3h 30m
      category: 'Testing',
      tags: JSON.stringify(['QA', 'IntegrationTests', 'Rental']),
      assignee_ids: JSON.stringify([10]) // Ali
    },

    // ----------------------------------------------------
    // Project 11: Banking Management System
    // ----------------------------------------------------
    {
      company_id: 3,
      project_id: 11,
      user_id: 8,
      title: 'Secure Customer Onboarding & KYC Verification API',
      description: 'Develop KYC data encryption layer, identity document upload validation, and facial match webhook pipeline.',
      completed: 0,
      status: 'in_progress',
      priority: 'urgent',
      due_date: '2026-10-28',
      due_time: '17:00',
      estimated_minutes: 600,
      spent_minutes: 360, // 6h 00m
      category: 'Security',
      tags: JSON.stringify(['KYC', 'Security', 'AES-256']),
      assignee_ids: JSON.stringify([8, 10]) // Admin and Ali
    },
    {
      company_id: 3,
      project_id: 11,
      user_id: 8,
      title: 'Compliance & Fraud Detection Strategy Sync',
      description: 'Align with compliance officers on transaction threshold alerts, suspicious activity flag criteria, and audit trail reports.',
      completed: 1,
      status: 'completed',
      priority: 'high',
      due_date: '2026-10-02',
      due_time: '10:00',
      estimated_minutes: 180,
      spent_minutes: 180, // 3h 00m
      category: 'Meeting',
      tags: JSON.stringify(['Meeting', 'Compliance', 'Banking']),
      assignee_ids: JSON.stringify([8, 9]) // Admin and Zain
    },
    {
      company_id: 3,
      project_id: 11,
      user_id: 8,
      title: 'Core Ledger & Double-Entry Transaction Engine',
      description: 'Implement debit/credit balance verification, atomic SQL database transactions, and daily account reconciliation scripts.',
      completed: 0,
      status: 'in_progress',
      priority: 'urgent',
      due_date: '2026-10-30',
      due_time: '19:00',
      estimated_minutes: 720,
      spent_minutes: 420, // 7h 00m
      category: 'Development',
      tags: JSON.stringify(['Ledger', 'MySQL', 'Transactions']),
      assignee_ids: JSON.stringify([9, 10]) // Zain and Ali
    },

    // ----------------------------------------------------
    // Project 12: School Management System
    // ----------------------------------------------------
    {
      company_id: 3,
      project_id: 12,
      user_id: 8,
      title: 'Student Attendance & Gradebook Dashboard',
      description: 'Create responsive teacher portal for daily class attendance logging, assignment scoring, and GPA transcript calculation.',
      completed: 0,
      status: 'in_progress',
      priority: 'high',
      due_date: '2026-10-17',
      due_time: '16:00',
      estimated_minutes: 360,
      spent_minutes: 240, // 4h 00m
      category: 'Development',
      tags: JSON.stringify(['Angular', 'Gradebook', 'Dashboard']),
      assignee_ids: JSON.stringify([9]) // Zain
    },
    {
      company_id: 3,
      project_id: 12,
      user_id: 8,
      title: 'Parent-Teacher Communication & Report Cards Meeting',
      description: 'Product roadmap review with school administrators regarding SMS notifications, automated progress report PDFs, and fee collection.',
      completed: 1,
      status: 'completed',
      priority: 'medium',
      due_date: '2026-10-04',
      due_time: '13:00',
      estimated_minutes: 120,
      spent_minutes: 120, // 2h 00m
      category: 'Meeting',
      tags: JSON.stringify(['Meeting', 'SchoolAdmin', 'Roadmap']),
      assignee_ids: JSON.stringify([8, 9, 10]) // All 3
    },
    {
      company_id: 3,
      project_id: 12,
      user_id: 8,
      title: 'Automated Fee Management & Receipt Generation',
      description: 'Build student tuition fee schedule module with online payment link generation, late fine calculations, and printable receipts.',
      completed: 0,
      status: 'pending',
      priority: 'medium',
      due_date: '2026-10-24',
      due_time: '17:00',
      estimated_minutes: 300,
      spent_minutes: 180, // 3h 00m
      category: 'Development',
      tags: JSON.stringify(['Fees', 'Receipts', 'Financial']),
      assignee_ids: JSON.stringify([10]) // Ali
    }
  ];

  // First clean existing tasks in Company 3 to avoid duplicates if any
  await pool.execute('DELETE FROM tasks WHERE company_id = 3');
  console.log('Cleared old tasks for Company 3.');

  for (const t of tasksData) {
    const [res] = await pool.execute(
      `INSERT INTO tasks (company_id, project_id, user_id, title, description, completed, status, priority, due_date, due_time, estimated_minutes, spent_minutes, category, tags, assignee_ids, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        t.company_id,
        t.project_id,
        t.user_id,
        t.title,
        t.description,
        t.completed,
        t.status,
        t.priority,
        t.due_date,
        t.due_time,
        t.estimated_minutes,
        t.spent_minutes,
        t.category,
        t.tags,
        t.assignee_ids
      ]
    );
    console.log(`Inserted Task #${res.insertId}: "${t.title}" (Spent: ${t.spent_minutes}m, Category: ${t.category})`);
  }

  // Now sync timesheets for all tasks in Company 3
  console.log('\n--- Syncing Timesheets for Al-Jannat ---');
  
  // Format minutes helper
  function formatMins(m) {
    const mins = Number(m) || 0;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    if (hours > 0 && rem > 0) return `${hours}h ${rem < 10 ? '0' : ''}${rem}m`;
    if (hours > 0) return `${hours}h 00m`;
    return `${rem}m`;
  }

  // Fetch all tasks for company 3 with project title
  const [companyTasks] = await pool.query(
    `SELECT t.*, p.title as project_title 
     FROM tasks t 
     LEFT JOIN projects p ON p.id = t.project_id 
     WHERE t.company_id = 3 AND t.spent_minutes > 0`
  );

  let syncedCount = 0;
  for (const task of companyTasks) {
    const timeStr = formatMins(task.spent_minutes);
    const projName = task.project_title || 'General Workspace';
    
    let assignees = [];
    try {
      assignees = JSON.parse(task.assignee_ids || '[]');
    } catch {
      assignees = [];
    }
    if (!assignees.length && task.user_id) assignees = [task.user_id];

    for (const uid of assignees) {
      if (!uid) continue;
      // Check if entry exists
      const [existing] = await pool.query(
        'SELECT id FROM timesheets WHERE user_id = ? AND title = ? LIMIT 1',
        [uid, task.title]
      );
      if (existing.length > 0) {
        await pool.execute(
          'UPDATE timesheets SET time = ?, project = ?, description = ?, task = ? WHERE id = ?',
          [timeStr, projName, task.description || '', task.category || 'General', existing[0].id]
        );
      } else {
        await pool.execute(
          'INSERT INTO timesheets (user_id, title, description, task, project, time, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [uid, task.title, task.description || '', task.category || 'General', projName, timeStr]
        );
      }
      syncedCount++;
      console.log(`  -> Synced timesheet for User ${uid}: "${task.title}" [${timeStr}]`);
    }
  }

  console.log(`\nSuccessfully created ${tasksData.length} tasks and synced ${syncedCount} timesheet entries for Al-Jannat (Company 3)!`);
  process.exit(0);
}

seedAlJannatTasks().catch((err) => {
  console.error('Error seeding tasks:', err);
  process.exit(1);
});
