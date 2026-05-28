import prisma from "../utils/prisma.js";
import { parseProblemText } from "../services/problemParserService.js";
import { logSystemEvent } from "../utils/eventLogger.js";

/**
 * Controller to handle AI problem parsing and DB persistence.
 * POST /api/problems/import
 */
export const handleImportProblem = async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: "Problem statement text is required." });
    }

    const parsedProblem = await parseProblemText(rawText);

    const slug = parsedProblem.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-");

    const existing = await prisma.problem.findUnique({ where: { slug } });
    const finalizedSlug = existing ? `${slug}-${Date.now().toString().slice(-4)}` : slug;

    const createdProblem = await prisma.problem.create({
      data: {
        title: parsedProblem.title,
        slug: finalizedSlug,
        difficulty: parsedProblem.difficulty,
        description: parsedProblem.description,
        constraints: parsedProblem.constraints,
        category: parsedProblem.category,
        topicTags: parsedProblem.topicTags,
        boilerplate: parsedProblem.boilerplate,
        difficultyEstimate: parsedProblem.difficultyEstimate
      }
    });

    if (parsedProblem.visibleTestCases.length > 0) {
      await prisma.testCase.createMany({
        data: parsedProblem.visibleTestCases.map(tc => ({
          problemId: createdProblem.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: false
        }))
      });
    }

    if (parsedProblem.hiddenTestCases.length > 0) {
      await prisma.testCase.createMany({
        data: parsedProblem.hiddenTestCases.map(tc => ({
          problemId: createdProblem.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: true
        }))
      });
    }

    console.log(`[Import Success] Persisted problem "${createdProblem.title}" (ID: ${createdProblem.id})`);
    return res.status(201).json({
      message: "Problem imported and seeded successfully.",
      problemId: createdProblem.id,
      slug: createdProblem.slug,
      title: createdProblem.title
    });

  } catch (error) {
    console.error("Error in handleImportProblem controller:", error);
    const msg = error.message || "Failed to process problem statement.";
    if (msg.includes("quota exceeded") || msg.includes("rate limit exceeded")) {
      return res.status(429).json({ error: msg });
    }
    if (msg.includes("unavailable") || msg.includes("experiencing high demand")) {
      return res.status(503).json({ error: msg });
    }
    return res.status(500).json({ error: msg });
  }
};

/**
 * GET /api/problems
 */
export const handleListProblems = async (req, res) => {
  try {
    const list = await prisma.problem.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        category: true,
        topicTags: true,
        createdAt: true
      }
    });
    return res.status(200).json(list);
  } catch (error) {
    console.error("Error in handleListProblems controller:", error);
    return res.status(500).json({ error: "Failed to list problems." });
  }
};

/**
 * GET /api/problems/:id
 */
export const handleGetProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await prisma.problem.findUnique({
      where: { id },
      include: {
        testCases: {
          where: { isHidden: false }, 
          select: { id: true, input: true, expectedOutput: true }
        }
      }
    });

    if (!problem) {
      return res.status(404).json({ error: "Problem not found." });
    }

    return res.status(200).json(problem);
  } catch (error) {
    console.error("Error in handleGetProblem controller:", error);
    return res.status(500).json({ error: "Failed to retrieve problem details." });
  }
};

/**
 * POST /api/problems/session
 * Body: { problemId, mode, language }
 */
export const handleCreateSession = async (req, res) => {
  try {
    const { problemId, mode, language } = req.body;
    const userId = req.user.id; 

    if (!problemId) {
      return res.status(400).json({ error: "problemId is required." });
    }

    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) {
      return res.status(404).json({ error: "Problem not found." });
    }

    const existingSession = await prisma.codingSession.findFirst({
      where: { userId, problemId, progress: { lt: 100 } },
      include: { problem: true }
    });

    if (existingSession) {
      return res.status(200).json(existingSession);
    }

    const boilerplateCode = problem.boilerplate[language] || "";

    const newSession = await prisma.codingSession.create({
      data: {
        userId,
        problemId,
        mode: mode || "Guided Practice",
        language: language || "python",
        codeDraft: boilerplateCode,
        chatHistory: [
          {
            sender: "cody",
            text: `Welcome! Let's get started on "${problem.title}". Start by drafting your strategy or write code in the editor.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ],
        codyMemory: {
          hintsUsed: 0,
          repeatedMistakes: "",
          weakTopics: "",
          preferredLanguage: language || "python",
          optStruggles: ""
        }
      },
      include: {
        problem: true
      }
    });

    await logSystemEvent(userId, "session_started", newSession.id, {
      mode: newSession.mode,
      problemTitle: problem.title
    });

    return res.status(201).json(newSession);
  } catch (error) {
    console.error("Error in handleCreateSession controller:", error);
    return res.status(500).json({ error: "Failed to create coding session." });
  }
};

/**
 * GET /api/problems/sessions
 */
export const handleGetUserSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await prisma.codingSession.findMany({
      where: { userId },
      include: {
        problem: {
          select: {
            title: true,
            difficulty: true,
            slug: true
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });
    return res.status(200).json(sessions);
  } catch (error) {
    console.error("Error in handleGetUserSessions controller:", error);
    return res.status(500).json({ error: "Failed to load active coding sessions." });
  }
};

/**
 * GET /api/problems/sessions/:id
 */
export const handleGetSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await prisma.codingSession.findFirst({
      where: { id, userId },
      include: {
        problem: true,
        reviews: true,
        submissions: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }

    return res.status(200).json(session);
  } catch (error) {
    console.error("Error in handleGetSession controller:", error);
    return res.status(500).json({ error: "Failed to load session details." });
  }
};

/**
 * PUT /api/problems/sessions/:id
 * Body: { codeDraft, chatHistory, progress, codyMemory }
 */
  export const handleUpdateSession = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { codeDraft, chatHistory, progress, codyMemory, language } = req.body;
  
      const session = await prisma.codingSession.findFirst({
        where: { id, userId }
      });
  
      if (!session) {
        return res.status(404).json({ error: "Session not found." });
      }
  
      const updated = await prisma.codingSession.update({
        where: { id },
        data: {
          codeDraft: codeDraft !== undefined ? codeDraft : session.codeDraft,
          chatHistory: chatHistory !== undefined ? chatHistory : session.chatHistory,
          progress: progress !== undefined ? parseInt(progress) : session.progress,
          codyMemory: codyMemory !== undefined ? codyMemory : session.codyMemory,
          language: language !== undefined ? language : session.language
        },
      include: {
        problem: true
      }
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Error in handleUpdateSession controller:", error);
    return res.status(500).json({ error: "Failed to autosave session." });
  }
};

/**
 * DELETE /api/problems/sessions/:id
 */
export const handleDeleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await prisma.codingSession.findFirst({
      where: { id, userId }
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }

    await prisma.codingSession.delete({ where: { id } });
    return res.status(200).json({ message: "Session deleted successfully." });
  } catch (error) {
    console.error("Error in handleDeleteSession controller:", error);
    return res.status(500).json({ error: "Failed to delete session." });
  }
};
