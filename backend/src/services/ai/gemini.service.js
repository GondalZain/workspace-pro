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
  required: ['summary', 'totalEstimatedMinutes', 'modules']
};

const SYSTEM_INSTRUCTION = `You are a Senior Technical Project Manager, Solutions Architect, and Agile Scrum Master.
Your goal is to thoroughly analyze the provided Software Requirements Specification (SRS) or project requirements document, decompose it into an actionable Work Breakdown Structure (WBS), and generate engineering tasks with clear, realistic dependency relationships.

Follow these strict rules:
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
  srsTaskSchema
};
