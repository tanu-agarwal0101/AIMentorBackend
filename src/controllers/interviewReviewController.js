import { generateInterviewReview } from "../services/reviewAnalyzerService.js";
import { logSystemEvent } from "../utils/eventLogger.js";

/**
 * Controller to handle AI technical interview reviews.
 */
export const handleGenerateReview = async (req, res) => {
  try {
    const {
      sessionId,
      problem,
      code,
      language,
      runtimeStats,
      complexityEstimate,
      failedTests = [],
      passedTests = [],
      codyMemory = {},
      chatHistory = [],
      mode,
      timeSpent,
      hintUsage,
      executionHistory = []
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Missing required field: sessionId" });
    }

    
    const sanitizedCode = code ? String(code).substring(0, 8000) : ""; 
    const sanitizedProblem = problem ? String(problem).substring(0, 4000) : "";

    const payload = {
      sessionId,
      problem: sanitizedProblem,
      code: sanitizedCode,
      language,
      runtimeStats,
      complexityEstimate,
      failedTests,
      passedTests,
      codyMemory,
      chatHistory: Array.isArray(chatHistory) ? chatHistory.slice(-8) : [],
      mode,
      timeSpent,
      hintUsage: parseInt(hintUsage) || 0,
      executionHistory
    };

    const reviewResult = await generateInterviewReview(payload);

    if (req.user && req.user.id) {
      await logSystemEvent(req.user.id, "review_generated", sessionId, {
        overallScore: reviewResult.overallScore,
        mode: mode || "Real Interview"
      });
    }

    return res.status(200).json(reviewResult);

  } catch (error) {
    console.error("Error in interviewReviewController handleGenerateReview:", error);
    return res.status(500).json({
      error: "Cody was unable to complete your technical interview debrief. Please verify your connection or try again."
    });
  }
};
