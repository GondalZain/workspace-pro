const { GoogleGenAI, Type } = require('@google/genai');

const srsTaskSchema = {
  type: Type.OBJECT,
  properties: {
    projectTitle: {
      type: Type.STRING,
      description: 'Clean, descriptive name for the project (e.g. "Smart Parking Management System").'
    },
    projectDescription: {
      type: Type.STRING,
      description: 'Concise 1-2 sentence overview of the project purpose, architecture, and scope.'
    },
    summary: {
      type: Type.STRING,
      description: 'Executive summary of the SRS project scope, architecture, and objectives.'
    },
    totalEstimatedMinutes: {
      type: Type.INTEGER,
      description: 'Sum of all task estimated minutes across all modules.'
    },
    modules: {
      type: Type.ARRAY,
      description: 'List of project modules, subsystems, or functional epics.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: 'Name of the module, e.g. "Authentication & RBAC", "Vehicle Parking Gate Controller", "Payment Gateway Integration".'
          },
          description: {
            type: Type.STRING,
            description: 'Brief overview of what this module encapsulates.'
          },
          tasks: {
            type: Type.ARRAY,
            description: 'List of granular developer tasks required to deliver this module.',
            items: {
              type: Type.OBJECT,
              properties: {
                tempId: {
                  type: Type.STRING,
                  description: 'Unique temporary identifier for dependency linking, e.g. "TASK-01", "TASK-02".'
                },
                title: {
                  type: Type.STRING,
                  description: 'Action-oriented task title (e.g. "Design MySQL schema for parking slots and reservations").'
                },
                description: {
                  type: Type.STRING,
                  description: 'Detailed technical scope, functional requirements, and acceptance criteria.'
                },
                category: {
                  type: Type.STRING,
                  description: 'Work category: "Backend", "Frontend", "Database", "DevOps", "QA", "Design", or "Hardware".'
                },
                priority: {
                  type: Type.STRING,
                  enum: ['low', 'medium', 'high'],
                  description: 'Task priority level.'
                },
                estimatedMinutes: {
                  type: Type.INTEGER,
                  description: 'Realistic engineering effort estimate in minutes (e.g. 120, 180, 240, 360, 480).'
                },
                dependsOnTempIds: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Array of tempIds representing prerequisite tasks that must be completed before this task can start.'
                }
              },
              required: ['tempId', 'title', 'description', 'category', 'priority', 'estimatedMinutes', 'dependsOnTempIds']
            }
          }
        },
        required: ['name', 'tasks']
      }
    }
  },
  required: ['projectTitle', 'projectDescription', 'summary', 'totalEstimatedMinutes', 'modules']
};

const SYSTEM_INSTRUCTION = `You are a Senior Technical Project Manager, Solutions Architect, and Agile Scrum Master.
Your goal is to thoroughly analyze the provided Software Requirements Specification (SRS) or project requirements document, decompose it into an actionable Work Breakdown Structure (WBS), and generate engineering tasks with clear, realistic dependency relationships.

Follow these strict rules:
0. PROJECT METADATA (TITLE & DESCRIPTION):
   - Extract or formulate a clean, professional, descriptive project title (projectTitle), e.g. "Smart Parking Guidance & Revenue System", "Warehouse & Inventory ERP Portal".
   - Formulate a comprehensive project description (projectDescription) of 1 to 3 sentences summarizing the system's core purpose, business value, key capabilities, and architecture.

1. DECOMPOSE INTO GRANULAR TASKS:
   - Each task should represent a concrete engineering unit of work (typically 2 to 8 hours / 120 to 480 minutes).
   - Group tasks logically into distinct modules/subsystems (e.g., Database, Authentication, Core Services, Frontend UI, External APIs, Deployment/DevOps).

2. ESTABLISH ACCURATE PREREQUISITE DEPENDENCIES (Finish-to-Start):
   - Foundation tasks (e.g., Database Architecture, Schema Migrations, Core Setup) have NO dependencies (dependsOnTempIds: []).
   - Backend APIs depend on the corresponding Database schema and model tasks.
   - Frontend UI views depend on the corresponding Backend API endpoints.
   - Integration tests, E2E tests, and deployment tasks depend on the implementation tasks.
   - NEVER create circular dependencies (e.g., A cannot depend on B if B depends on A).

3. RICH DESCRIPTIONS & ACCEPTANCE CRITERIA:
   - In each task description, clearly summarize the technical requirement and at least 2 clear acceptance criteria.

4. REALISTIC ESTIMATES & PRIORITIES:
   - Assign priorities based on the project critical path (core architecture is 'high', secondary polish is 'low').
   - Assign estimatedMinutes as integers (e.g., 60 = 1 hr, 120 = 2 hrs, 240 = 4 hrs, 480 = 8 hrs).`;

const assessmentQuestionsSchema = {
  type: Type.OBJECT,
  properties: {
    assessmentTitle: { type: Type.STRING },
    assessmentOverview: { type: Type.STRING },
    targetTechStack: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          qId: { type: Type.STRING },
          title: { type: Type.STRING },
          category: { type: Type.STRING },
          difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] },
          scenario: { type: Type.STRING },
          question: { type: Type.STRING },
          maxPoints: { type: Type.INTEGER }
        },
        required: ['qId', 'title', 'category', 'difficulty', 'scenario', 'question', 'maxPoints']
      }
    }
  },
  required: ['assessmentTitle', 'assessmentOverview', 'targetTechStack', 'questions']
};

const assessmentEvaluationSchema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER, description: 'Overall score from 0 to 100' },
    evaluatedLevel: {
      type: Type.STRING,
      enum: ['Junior', 'Mid-Level', 'Senior', 'Lead/Architect']
    },
    maxComplexity: {
      type: Type.STRING,
      enum: ['low', 'medium', 'high']
    },
    staminaProfile: {
      type: Type.OBJECT,
      properties: {
        sustainableDailyHours: { type: Type.NUMBER, description: 'Sustainable productive hours/day deep work capacity (e.g. 6.0 hrs/day velocity)' },
        staminaRating: { type: Type.STRING, description: 'Workload endurance rating: e.g. High Endurance, Solid Velocity, Focused Specialist' },
        complexityTolerance: { type: Type.STRING, description: 'Specific explanation of complexity endurance: what level of architectural ambiguity and multi-system edge cases the developer can independently sustain' },
        supervisionLevel: { type: Type.STRING, enum: ['Autonomous', 'Peer Review Needed', 'Requires Senior Mentorship'] },
        recommendedTaskTypes: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Task types this developer excels at and can handle efficiently'
        },
        avoidTaskTypes: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Task types requiring peer supervision or should be escalated to higher seniority tiers'
        }
      },
      required: ['sustainableDailyHours', 'staminaRating', 'complexityTolerance', 'supervisionLevel', 'recommendedTaskTypes', 'avoidTaskTypes']
    },
    expertiseList: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          domain: { type: Type.STRING, description: 'E.g. Backend Architecture, Database Optimization, Frontend State, API Security, Performance Tuning' },
          score: { type: Type.INTEGER, description: '0 to 100 domain proficiency score' },
          proficiencyLevel: { type: Type.STRING, enum: ['Novice', 'Competent', 'Advanced', 'Expert'] },
          summary: { type: Type.STRING, description: 'Detailed breakdown of demonstrated capability and limits in this domain' }
        },
        required: ['domain', 'score', 'proficiencyLevel', 'summary']
      }
    },
    domainScores: {
      type: Type.OBJECT,
      properties: {
        backend: { type: Type.INTEGER },
        database: { type: Type.INTEGER },
        frontend: { type: Type.INTEGER },
        security: { type: Type.INTEGER },
        architecture: { type: Type.INTEGER }
      },
      required: ['backend', 'database', 'frontend', 'security', 'architecture']
    },
    summaryFeedback: { type: Type.STRING },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    gaps: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    questionResults: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          qId: { type: Type.STRING },
          pointsEarned: { type: Type.INTEGER },
          maxPoints: { type: Type.INTEGER },
          critique: { type: Type.STRING }
        },
        required: ['qId', 'pointsEarned', 'maxPoints', 'critique']
      }
    }
  },
  required: ['score', 'evaluatedLevel', 'maxComplexity', 'staminaProfile', 'expertiseList', 'domainScores', 'summaryFeedback', 'strengths', 'gaps', 'questionResults']
};

const taskMatchingSchema = {
  type: Type.OBJECT,
  properties: {
    allocationSummary: { type: Type.STRING },
    assignments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          taskId: { type: Type.INTEGER },
          assignedUserId: { type: Type.INTEGER },
          developerUsername: { type: Type.STRING },
          confidenceScore: { type: Type.INTEGER },
          matchingRationale: { type: Type.STRING }
        },
        required: ['taskId', 'assignedUserId', 'developerUsername', 'matchingRationale']
      }
    }
  },
  required: ['allocationSummary', 'assignments']
};

/**
 * Executes a Gemini request with automatic multi-model fallback.
 */
async function callGeminiWithFallback({ systemInstruction, contents, responseSchema, temperature = 0.2 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('TODO_')) {
    const error = new Error('GEMINI_API_KEY is not configured. Please add your Google Gemini API Key in backend/.env.');
    error.statusCode = 400;
    throw error;
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  const preferredModel = process.env.GEMINI_MODEL;
  const candidateModels = [
    ...(preferredModel && preferredModel !== 'gemini-2.0-flash' ? [preferredModel] : []),
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash'
  ].filter((v, i, a) => a.indexOf(v) === i);

  let lastError = null;
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
          temperature
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini API returned an empty response.');
      }

      const cleanJson = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(cleanJson);
    } catch (apiError) {
      console.warn(`[GeminiService] Model ${model} encountered error:`, apiError.message || apiError);
      lastError = apiError;

      if (apiError.status === 401 || apiError.status === 403 || apiError.message?.includes('API key') || apiError.message?.includes('UNAUTHENTICATED')) {
        const error = new Error('Invalid or unauthorized GEMINI_API_KEY. Please verify your Google Gemini API key.');
        error.statusCode = 401;
        throw error;
      }
    }
  }

  throw lastError || new Error('All candidate Gemini models failed to process request.');
}

/**
 * Generates 5 project-tailored technical assessment questions based on project tasks & architecture.
 */
async function generateAssessmentQuestions({ projectTitle, projectDescription, tasks = [] }) {
  const taskSample = tasks.slice(0, 30).map((t) => ({
    title: t.title,
    category: t.category,
    priority: t.priority,
    description: t.description?.slice(0, 150)
  }));

  const userPrompt = `Project Title: "${projectTitle || 'Software Project'}"
Project Description: "${projectDescription || 'Technical application'}"

Project Tasks Sample (${taskSample.length} tasks):
${JSON.stringify(taskSample, null, 2)}

Generate a focused, practical technical assessment with exactly 5 questions (worth 20 points each, 100 points total).
Questions must directly test the real engineering problems, database queries, API logic, frontend state, and security considerations required to build this specific project.`;

  const systemInstruction = `You are a Principal Engineering Director and Technical Hiring Architect.
Analyze the project requirements and generate 5 rigorous, practical scenario-based questions:
1. Question 1 (Database / Data Modeling): Schema design, indexing, transactions, or query optimization.
2. Question 2 (Backend Core Logic): API controller/service, algorithm, edge-case validation, concurrency.
3. Question 3 (Frontend / Client State): Reactive components, API integration, caching, UX resilience.
4. Question 4 (Security / Authentication): JWT/OAuth, role-based authorization, rate-limiting, data isolation.
5. Question 5 (Architecture / Problem Solving): Fault tolerance, asynchronous jobs, third-party webhook handling.`;

  return callGeminiWithFallback({
    systemInstruction,
    contents: [userPrompt],
    responseSchema: assessmentQuestionsSchema,
    temperature: 0.3
  });
}

/**
 * Evaluates developer's submitted test answers and computes an objective score, level, and domain radar.
 */
async function evaluateAssessmentAnswers({ projectTitle, questions = [], answers = {} }) {
  const qaPairs = questions.map((q) => ({
    qId: q.qId,
    title: q.title,
    category: q.category,
    maxPoints: q.maxPoints,
    scenario: q.scenario,
    question: q.question,
    developerAnswer: answers[q.qId] || 'No answer submitted.'
  }));

  const userPrompt = `Project: "${projectTitle}"

Assessment Questions & Developer Submissions:
${JSON.stringify(qaPairs, null, 2)}

Grade each answer rigorously. Calculate:
1. Points earned per question and total score (0 to 100).
2. Technical seniority tier (Junior: 0-59, Mid-Level: 60-79, Senior: 80-91, Lead/Architect: 92-100).
3. Max task complexity (low, medium, high).
4. Developer Stamina Profile: Sustainable daily deep-work hours (standard 6.0 hrs/day benchmark), complexity tolerance (what level of complex edge cases and architectural ambiguity they can sustain), supervision level needed (Autonomous, Peer Review Needed, Requires Senior Mentorship), recommended task types, and tasks to avoid.
5. Domain Expertise Breakdown: Granular score (0-100), proficiency level (Novice, Competent, Advanced, Expert), and summary for each core engineering discipline (Backend, Database, Frontend, Security, Architecture).
6. Strengths, growth gaps, and per-question critique.`;

  const systemInstruction = `You are an expert Technical Assessment Evaluator, Engineering Manager, and Code Reviewer.
Grade developer answers objectively:
- Reward deep understanding of clean code, security best practices, proper error handling, concurrency, and scalable architecture.
- Penalize superficial, vague, hallucinated, or insecure answers.
- Benchmark developer stamina and complexity endurance: analyze how complex of a system the developer can handle without burning out or introducing security vulnerabilities.
- Set maxComplexity to 'high' only if score >= 80 and technical architecture is sound; 'medium' if 60-79; 'low' if < 60.
- Provide a rigorous, constructive breakdown of expertise across all 5 engineering domains so management knows exactly which tasks to assign.`;

  return callGeminiWithFallback({
    systemInstruction,
    contents: [userPrompt],
    responseSchema: assessmentEvaluationSchema,
    temperature: 0.2
  });
}

/**
 * Smart matches project tasks to evaluated developers based on competency, domain score, and max complexity.
 */
async function smartMatchTasksToDevelopers({ projectTitle, tasks = [], developers = [] }) {
  const taskData = tasks.map((t) => ({
    taskId: t.id,
    title: t.title,
    category: t.category,
    priority: t.priority,
    estimatedMinutes: t.estimatedMinutes || 120
  }));

  const devData = developers.map((d) => ({
    userId: d.userId || d.id,
    username: d.username,
    score: d.score,
    evaluatedLevel: d.evaluatedLevel,
    maxComplexity: d.maxComplexity,
    domainScores: d.domainScores
  }));

  const userPrompt = `Project: "${projectTitle}"

Tasks to Assign (${taskData.length} tasks):
${JSON.stringify(taskData, null, 2)}

Evaluated Developer Team (${devData.length} developers):
${JSON.stringify(devData, null, 2)}

Match each task to the most suitable developer.
Rules:
1. Tasks with priority "high" or critical architecture MUST be assigned to developers with maxComplexity "high" (Senior/Lead).
2. Match task category to the developer with the highest domain score (e.g. Database tasks to highest database score).
3. Distribute workload evenly so total minutes are balanced across the developers.
4. Provide a clear matching rationale for each assignment.`;

  const systemInstruction = `You are an AI Agile Project Manager & Sprint Planner.
Your goal is to optimize team allocation by matching task demands with proven developer competencies while keeping sprint workload balanced across the roster.`;

  return callGeminiWithFallback({
    systemInstruction,
    contents: [userPrompt],
    responseSchema: taskMatchingSchema,
    temperature: 0.2
  });
}

/**
 * Analyzes an SRS document (PDF buffer or raw text) using Google Gemini
 * and returns a structured task breakdown with dependencies.
 *
 * @param {Object} options
 * @param {Buffer|null} [options.fileBuffer] - Raw file buffer (e.g. PDF or text)
 * @param {string|null} [options.mimeType] - MIME type of the uploaded file
 * @param {string|null} [options.fileName] - Original name of the uploaded file
 * @param {string|null} [options.rawText] - Text content pasted by user
 * @param {string|null} [options.projectTitle] - Title of the target project
 * @returns {Promise<Object>} Structured WBS with tasks and dependencies
 */
async function analyzeSrsDocument({ fileBuffer, mimeType, fileName, rawText, projectTitle }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('TODO_')) {
    const error = new Error('GEMINI_API_KEY is not configured. Please add your Google Gemini API Key in backend/.env to use AI task generation.');
    error.statusCode = 400;
    throw error;
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  const preferredModel = process.env.GEMINI_MODEL;
  const candidateModels = [
    ...(preferredModel && preferredModel !== 'gemini-2.0-flash' ? [preferredModel] : []),
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash'
  ].filter((v, i, a) => a.indexOf(v) === i);

  const contents = [];
  let userPrompt = `Please analyze this Software Requirements Specification (SRS) for the project "${projectTitle || 'Software Application'}" and generate the complete structured task breakdown with dependencies.`;

  if (fileBuffer) {
    const normMime = (mimeType || '').toLowerCase();
    if (normMime === 'application/pdf') {
      contents.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: fileBuffer.toString('base64')
        }
      });
      contents.push(userPrompt);
    } else {
      // Plain text, markdown, or text-based documents
      const fileText = fileBuffer.toString('utf8');
      contents.push(`${userPrompt}\n\nDocument File: ${fileName || 'SRS.txt'}\n\n--- DOCUMENT CONTENT ---\n${fileText}\n--- END DOCUMENT ---`);
    }
  } else if (rawText && rawText.trim()) {
    contents.push(`${userPrompt}\n\n--- REQUIREMENTS CONTENT ---\n${rawText.trim()}\n--- END REQUIREMENTS ---`);
  } else {
    const error = new Error('Please upload an SRS document (.pdf, .txt, .md) or paste project requirements text.');
    error.statusCode = 400;
    throw error;
  }

  let lastError = null;
  for (const model of candidateModels) {
    try {
      console.log(`[GeminiService] Analyzing SRS using model: ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: srsTaskSchema,
          temperature: 0.2
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini API returned an empty response. Please verify the document content and try again.');
      }

      const cleanJson = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsedData = JSON.parse(cleanJson);
      console.log(`[GeminiService] Successfully generated task breakdown using ${model}.`);
      return parsedData;
    } catch (apiError) {
      console.warn(`[GeminiService] Model ${model} encountered error:`, apiError.message || apiError);
      lastError = apiError;

      // Unrecoverable authorization error: fail fast
      if (apiError.status === 401 || apiError.status === 403 || apiError.message?.includes('API key') || apiError.message?.includes('UNAUTHENTICATED')) {
        const error = new Error('Invalid or unauthorized GEMINI_API_KEY. Please verify your Google Gemini API key.');
        error.statusCode = 401;
        throw error;
      }
      // For 404 (model retired/not found) or 503 (high traffic spikes), continue to next candidate
    }
  }

  console.error('[GeminiService] All candidate Gemini models failed.');
  throw lastError || new Error('All candidate Gemini models failed to process the SRS document.');
}

module.exports = {
  analyzeSrsDocument,
  srsTaskSchema,
  generateAssessmentQuestions,
  evaluateAssessmentAnswers,
  smartMatchTasksToDevelopers,
  callGeminiWithFallback
};
