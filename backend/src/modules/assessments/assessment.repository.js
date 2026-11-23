// @ts-nocheck
const { pool } = require('../../config/database');

async function getProjectMembers(projectId) {
  const query = `
    SELECT 
      pm.id AS member_id,
      pm.project_id,
      pm.user_id,
      pm.role_in_project,
      pm.readiness_status,
      pm.created_at AS member_joined_at,
      u.username,
      u.email,
      u.profile_image_path,
      da.id AS assessment_id,
      da.status AS assessment_status,
      da.score,
      da.evaluated_level,
      da.max_complexity,
      da.ai_feedback_payload,
      da.completed_at AS assessment_completed_at
    FROM project_members pm
    INNER JOIN users u ON u.id = pm.user_id
    LEFT JOIN developer_assessments da ON da.project_id = pm.project_id AND da.user_id = pm.user_id
    WHERE pm.project_id = ?
    ORDER BY pm.id ASC
  `;

  const [rows] = await pool.execute(query, [projectId]);
  return rows.map((r) => ({
    memberId: Number(r.member_id),
    projectId: Number(r.project_id),
    userId: Number(r.user_id),
    username: r.username,
    email: r.email,
    profileImagePath: r.profile_image_path || null,
    roleInProject: r.role_in_project || 'Developer',
    readinessStatus: r.readiness_status || 'pending_test',
    assessmentId: r.assessment_id ? Number(r.assessment_id) : null,
    assessmentStatus: r.assessment_status || null,
    score: r.score !== null ? Number(r.score) : null,
    evaluatedLevel: r.evaluated_level || null,
    maxComplexity: r.max_complexity || null,
    feedback: r.ai_feedback_payload ? (typeof r.ai_feedback_payload === 'string' ? JSON.parse(r.ai_feedback_payload) : r.ai_feedback_payload) : null,
    assessmentCompletedAt: r.assessment_completed_at ? new Date(r.assessment_completed_at).toISOString() : null
  }));
}

async function setProjectMembers(projectId, userIds = [], companyId = null) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const cleanUserIds = Array.from(new Set(userIds.map(Number).filter((id) => id > 0)));

    if (cleanUserIds.length > 0) {
      // Remove members not in the new list
      const placeholders = cleanUserIds.map(() => '?').join(',');
      await conn.execute(
        `DELETE FROM project_members WHERE project_id = ? AND user_id NOT IN (${placeholders})`,
        [projectId, ...cleanUserIds]
      );

      // Insert new members with IGNORE
      for (const uId of cleanUserIds) {
        await conn.execute(
          `INSERT INTO project_members (project_id, user_id, company_id, role_in_project, readiness_status)
           VALUES (?, ?, ?, 'Developer', 'pending_test')
           ON DUPLICATE KEY UPDATE company_id = VALUES(company_id)`,
          [projectId, uId, companyId]
        );
      }
    } else {
      await conn.execute('DELETE FROM project_members WHERE project_id = ?', [projectId]);
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return getProjectMembers(projectId);
}

async function createOrUpdateAssessment(projectId, userId, companyId, questionsPayload) {
  const payloadStr = JSON.stringify(questionsPayload);

  const [existing] = await pool.execute(
    'SELECT id FROM developer_assessments WHERE project_id = ? AND user_id = ?',
    [projectId, userId]
  );

  let assessmentId;
  if (existing.length > 0) {
    assessmentId = existing[0].id;
    await pool.execute(
      `UPDATE developer_assessments 
       SET questions_payload = ?, status = 'pending', score = NULL, evaluated_level = NULL, max_complexity = 'medium', answers_payload = NULL, ai_feedback_payload = NULL, completed_at = NULL
       WHERE id = ?`,
      [payloadStr, assessmentId]
    );
  } else {
    const [res] = await pool.execute(
      `INSERT INTO developer_assessments (project_id, user_id, company_id, status, max_complexity, questions_payload)
       VALUES (?, ?, ?, 'pending', 'medium', ?)`,
      [projectId, userId, companyId, payloadStr]
    );
    assessmentId = res.insertId;
  }

  await pool.execute(
    `UPDATE project_members SET readiness_status = 'pending_test' WHERE project_id = ? AND user_id = ?`,
    [projectId, userId]
  );

  return findAssessmentById(assessmentId);
}

async function findAssessmentById(id) {
  const query = `
    SELECT 
      da.*,
      p.title AS project_title,
      p.description AS project_description,
      p.deadline AS project_deadline,
      u.username,
      u.email
    FROM developer_assessments da
    INNER JOIN projects p ON p.id = da.project_id
    INNER JOIN users u ON u.id = da.user_id
    WHERE da.id = ?
  `;

  const [rows] = await pool.execute(query, [id]);
  if (!rows[0]) return null;

  const r = rows[0];
  return {
    id: Number(r.id),
    projectId: Number(r.project_id),
    projectTitle: r.project_title,
    projectDescription: r.project_description || '',
    projectDeadline: r.project_deadline ? (r.project_deadline instanceof Date ? r.project_deadline.toISOString().slice(0, 10) : String(r.project_deadline).slice(0, 10)) : null,
    userId: Number(r.user_id),
    username: r.username,
    email: r.email,
    status: r.status,
    score: r.score !== null ? Number(r.score) : null,
    evaluatedLevel: r.evaluated_level,
    maxComplexity: r.max_complexity,
    questions: r.questions_payload ? (typeof r.questions_payload === 'string' ? JSON.parse(r.questions_payload) : r.questions_payload) : null,
    answers: r.answers_payload ? (typeof r.answers_payload === 'string' ? JSON.parse(r.answers_payload) : r.answers_payload) : null,
    feedback: r.ai_feedback_payload ? (typeof r.ai_feedback_payload === 'string' ? JSON.parse(r.ai_feedback_payload) : r.ai_feedback_payload) : null,
    completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : null,
    createdAt: new Date(r.created_at).toISOString()
  };
}

async function findMyPendingAssessments(userId) {
  const query = `
    SELECT 
      da.id,
      da.project_id,
      da.status,
      da.created_at,
      p.title AS project_title,
      p.description AS project_description,
      p.deadline AS project_deadline
    FROM developer_assessments da
    INNER JOIN projects p ON p.id = da.project_id
    WHERE da.user_id = ? AND da.status IN ('pending', 'in_progress')
    ORDER BY da.id DESC
  `;

  const [rows] = await pool.execute(query, [userId]);
  return rows.map((r) => ({
    id: Number(r.id),
    projectId: Number(r.project_id),
    projectTitle: r.project_title,
    projectDescription: r.project_description || '',
    projectDeadline: r.project_deadline ? String(r.project_deadline).slice(0, 10) : null,
    status: r.status,
    createdAt: new Date(r.created_at).toISOString()
  }));
}

async function saveAssessmentEvaluation(assessmentId, userId, answersPayload, evaluation) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE developer_assessments 
       SET 
         status = 'evaluated',
         score = ?,
         evaluated_level = ?,
         max_complexity = ?,
         answers_payload = ?,
         ai_feedback_payload = ?,
         completed_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [
        evaluation.score,
        evaluation.evaluatedLevel,
        evaluation.maxComplexity,
        JSON.stringify(answersPayload),
        JSON.stringify(evaluation),
        assessmentId,
        userId
      ]
    );

    // Update readiness status on project_members
    const [row] = await conn.execute('SELECT project_id FROM developer_assessments WHERE id = ?', [assessmentId]);
    if (row.length > 0) {
      await conn.execute(
        `UPDATE project_members SET readiness_status = 'evaluated' WHERE project_id = ? AND user_id = ?`,
        [row[0].project_id, userId]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return findAssessmentById(assessmentId);
}

async function applyTaskAssignments(projectId, assignments = []) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const item of assignments) {
      if (item.taskId && item.assignedUserId) {
        const assigneeArray = [Number(item.assignedUserId)];
        await conn.execute(
          `UPDATE tasks SET assignee_ids = ? WHERE id = ? AND project_id = ?`,
          [JSON.stringify(assigneeArray), Number(item.taskId), Number(projectId)]
        );
      }
    }

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateProjectStatus(projectId, status) {
  await pool.execute(
    'UPDATE projects SET status = ? WHERE id = ?',
    [status, projectId]
  );
  return true;
}

module.exports = {
  getProjectMembers,
  setProjectMembers,
  createOrUpdateAssessment,
  findAssessmentById,
  findMyPendingAssessments,
  saveAssessmentEvaluation,
  applyTaskAssignments,
  updateProjectStatus
};
