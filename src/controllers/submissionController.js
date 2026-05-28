import prisma from "../utils/prisma.js";
import { normalizeExecutionResult, cleanOutput } from "../utils/normalizeExecutionResult.js";
import { systemMonitor } from "../utils/systemMonitor.js";
import { logSystemEvent } from "../utils/eventLogger.js";
import { executeCode } from "../utils/jdoodleProvider.js";


const LANGUAGE_MAP = {
  javascript: true,
  python: true,
  java: true,
  cpp: true
};


const userExecutionLimits = new Map();  
const MAX_EXECUTIONS_PER_USER = 100;

function checkExecutionLimit(userId) {
  const currentCount = userExecutionLimits.get(userId) || 0;
  if (currentCount >= MAX_EXECUTIONS_PER_USER) {
    throw new Error("Daily execution limit reached. Please try again later.");
  }
  userExecutionLimits.set(userId, currentCount + 1);
}

/**
 * Helper to call the code execution provider.
 */
async function executeOnProvider(userId, language, code, stdin) {
  if (!LANGUAGE_MAP[language]) {
    throw new Error(`Language ${language} is not supported in the current MVP.`);
  }

  checkExecutionLimit(userId);
  const startTime = Date.now();

  try {
    const data = await executeCode(language, code, stdin);
    systemMonitor.recordProviderRun(true, Date.now() - startTime);
    return data;
  } catch (err) {
    systemMonitor.recordProviderRun(false, Date.now() - startTime);
    console.warn("Execution provider network request failed:", err);
    
    return {
      output: `Execution Service Error: ${err.message}`,
      statusCode: 500,
      error: "Execution Provider Unavailable"
    };
  }
}

/**
 * Handles running code against VISIBLE test cases only.
 * POST /api/submissions/run
 */
export const handleRunCode = async (req, res) => {
  try {
    const { sessionId, code, language } = req.body;
    const userId = req.user.id;

    if (!sessionId || !code || !language) {
      return res.status(400).json({ error: "Missing required fields: sessionId, code, language." });
    }

    const session = await prisma.codingSession.findFirst({
      where: { id: sessionId, userId },
      include: { problem: true }
    });

    if (!session) {
      return res.status(404).json({ error: "Coding session not found." });
    }

    const testCases = await prisma.testCase.findMany({
      where: { problemId: session.problemId, isHidden: false }
    });

    if (testCases.length === 0) {
      return res.status(400).json({ error: "No visible test cases configured for this problem." });
    }

    console.log(`[Provider Run] Executing ${testCases.length} visible test cases for session ${sessionId}...`);
    const startExecutionTime = Date.now();
    
    const results = await Promise.all(
      testCases.map(async (tc) => {
        const rawResult = await executeOnProvider(userId, language, code, tc.input);
        const normalized = normalizeExecutionResult(rawResult, tc.expectedOutput);
        return {
          testCaseId: tc.id,
          input: tc.input,
          expected: tc.expectedOutput,
          actual: normalized.stdout,
          status: normalized.status,
          stderr: normalized.stderr,
          compileError: normalized.compileError,
          reliable: normalized.executionReliable
        };
      })
    );

    const runtimeMs = Date.now() - startExecutionTime;

    let overallStatus = "ACCEPTED";
    let passedCount = 0;
    const failedCases = [];
    let compileErrorMsg = "";
    let executionReliable = true;

    const statusPriority = {
      COMPILE_ERROR: 5,
      TIME_LIMIT_EXCEEDED: 4,
      RUNTIME_ERROR: 3,
      WRONG_ANSWER: 2,
      ACCEPTED: 1
    };

    results.forEach((r) => {
      if (r.status === "ACCEPTED") {
        passedCount++;
      } else {
        failedCases.push({
          input: r.input,
          expected: r.expected,
          actual: r.actual || r.stderr,
          status: r.status
        });
      }

      if (r.reliable === false) {
        executionReliable = false;
      }

      const currPri = statusPriority[r.status] || 1;
      const overPri = statusPriority[overallStatus] || 1;
      if (currPri > overPri) {
        overallStatus = r.status;
      }

      if (r.status === "COMPILE_ERROR" && r.compileError) {
        compileErrorMsg = r.compileError;
      }
    });

    const responsePayload = {
      status: overallStatus,
      runtime: Math.round(runtimeMs / testCases.length),
      output: results[0] ? results[0].actual || results[0].stderr : "",
      passedCount,
      totalCount: testCases.length,
      failedCases,
      compileError: compileErrorMsg,
      executionReliable
    };

    return res.status(200).json(responsePayload);

  } catch (error) {
    console.error("Error in handleRunCode execution:", error);
    return res.status(500).json({ error: "An unexpected error occurred during execution." });
  }
};

/**
 * Handles running code against ALL test cases (visible + hidden) and persisting submission.
 * POST /api/submissions/submit
 */
export const handleSubmitSolution = async (req, res) => {
  try {
    const { sessionId, code, language } = req.body;
    const userId = req.user.id;

    if (!sessionId || !code || !language) {
      return res.status(400).json({ error: "Missing required fields: sessionId, code, language." });
    }

    const session = await prisma.codingSession.findFirst({
      where: { id: sessionId, userId },
      include: { problem: true }
    });

    if (!session) {
      return res.status(404).json({ error: "Coding session not found." });
    }

    const allTestCases = await prisma.testCase.findMany({
      where: { problemId: session.problemId }
    });

    if (allTestCases.length === 0) {
      return res.status(400).json({ error: "No test cases configured for this problem." });
    }

    console.log(`[Provider Submit] Executing ${allTestCases.length} total test cases for session ${sessionId}...`);
    const startExecutionTime = Date.now();
    
    const results = await Promise.all(
      allTestCases.map(async (tc) => {
        const rawResult = await executeOnProvider(userId, language, code, tc.input);
        const normalized = normalizeExecutionResult(rawResult, tc.expectedOutput);
        return {
          testCaseId: tc.id,
          isHidden: tc.isHidden,
          input: tc.input,
          expected: tc.expectedOutput,
          actual: normalized.stdout,
          status: normalized.status,
          stderr: normalized.stderr,
          compileError: normalized.compileError,
          reliable: normalized.executionReliable
        };
      })
    );

    const runtimeMs = Date.now() - startExecutionTime;

    let overallStatus = "ACCEPTED";
    let passedCount = 0;
    const failedCases = []; 
    let compileErrorMsg = "";
    let executionReliable = true;

    const statusPriority = {
      COMPILE_ERROR: 5,
      TIME_LIMIT_EXCEEDED: 4,
      RUNTIME_ERROR: 3,
      WRONG_ANSWER: 2,
      ACCEPTED: 1
    };

    results.forEach((r) => {
      if (r.status === "ACCEPTED") {
        passedCount++;
      } else {
          failedCases.push({
          input: r.isHidden ? "[Hidden Test Case]" : r.input,
          expected: r.isHidden ? "[Hidden]" : r.expected,
          actual: r.isHidden ? `[Execution Status: ${r.status}]` : (r.actual || r.stderr),
          status: r.status
        });
      }

      if (r.reliable === false) {
        executionReliable = false;
      }

      const currPri = statusPriority[r.status] || 1;
      const overPri = statusPriority[overallStatus] || 1;
      if (currPri > overPri) {
        overallStatus = r.status;
      }

      if (r.status === "COMPILE_ERROR" && r.compileError) {
        compileErrorMsg = r.compileError;
      }
    });

    const averageRuntime = Math.round(runtimeMs / allTestCases.length);

    const finalProgress = overallStatus === "ACCEPTED" ? 100 : Math.max(session.progress, Math.round((passedCount / allTestCases.length) * 100));

    await prisma.codingSession.update({
      where: { id: sessionId },
      data: {
        codeDraft: code,
        progress: finalProgress
      }
    });

    const persistedSubmission = await prisma.submission.create({
      data: {
        sessionId,
        code,
        language,
        status: overallStatus,
        runtime: averageRuntime,
        passedCount,
        totalCount: allTestCases.length,
        executionSource: "JDOODLE",
        executionReliable: executionReliable
      }
    });

    console.log(`[Submission Persisted] Saved submission ${persistedSubmission.id} for session ${sessionId} (Status: ${overallStatus})`);

    await logSystemEvent(userId, "submission_attempted", sessionId, {
      submissionId: persistedSubmission.id,
      language,
      status: overallStatus,
      passedCount,
      totalCount: allTestCases.length
    });

    if (overallStatus === "ACCEPTED") {
      await logSystemEvent(userId, "problem_completed", sessionId, {
        problemTitle: session.problem?.title || "Unknown"
      });

      const previousFail = await prisma.submission.findFirst({
        where: {
          sessionId,
          status: { not: "ACCEPTED" }
        }
      });
      if (previousFail) {
        await logSystemEvent(userId, "optimization_improved", sessionId, {
          improvedFromFail: true
        });
      }
    }

    const responsePayload = {
      status: overallStatus,
      runtime: averageRuntime,
      output: results[0] ? results[0].actual || results[0].stderr : "",
      passedCount,
      totalCount: allTestCases.length,
      failedCases,
      compileError: compileErrorMsg,
      executionReliable
    };

    return res.status(200).json(responsePayload);

  } catch (error) {
    console.error("Error in handleSubmitSolution execution:", error);
    return res.status(500).json({ error: "An unexpected error occurred during submission." });
  }
};

/**
 * GET /api/submissions/history
 */
export const handleGetSubmissionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await prisma.submission.findMany({
      where: {
        session: {
          userId
        }
      },
      include: {
        session: {
          include: {
            problem: {
              select: {
                title: true,
                difficulty: true,
                slug: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return res.status(200).json(history);
  } catch (error) {
    console.error("Error in handleGetSubmissionHistory:", error);
    return res.status(500).json({ error: "Failed to load submission history." });
  }
};
