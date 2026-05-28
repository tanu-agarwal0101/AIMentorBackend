import { buildSystemPrompt, buildUserPrompt } from "../services/codyPromptBuilder.js";
import { streamCodyResponse } from "../services/geminiService.js";
import { initChunkedStream } from "../utils/streamResponse.js";
import { logSystemEvent } from "../utils/eventLogger.js";

/**
 * Cody chat controller.
 * Handles validation, prompt construction, streaming, and error boundaries.
 */
export const handleCodyChat = async (req, res) => {
  try {
    const {
      action,
      sessionId,
      mode,
      hintLevel,
      language,
      problem,
      code,
      runtimeStats,
      failedTests,
      chatHistory = [],
      memory = {}
    } = req.body;

    if (!action) {
      return res.status(400).json({ error: "Missing required field: action" });
    }
    
    const sanitizedCode = code ? String(code).substring(0, 5000) : ""; 
    const sanitizedProblem = problem ? String(problem).substring(0, 3000) : ""; 
    
    const limitedHistory = Array.isArray(chatHistory) 
      ? chatHistory.slice(-6) 
      : [];

    const limitedFailedTests = Array.isArray(failedTests)
      ? failedTests.slice(0, 3)
      : [];
    const systemInstruction = buildSystemPrompt(mode, action, hintLevel);
    const userPrompt = buildUserPrompt(
      sanitizedProblem,
      sanitizedCode,
      language,
      runtimeStats,
      limitedFailedTests,
      memory
    );

    if (req.user && req.user.id && (action === "hint" || action === "complexity" || action === "next_step")) {
      await logSystemEvent(req.user.id, "hint_requested", sessionId, {
        actionType: action,
        hintLevel: hintLevel || 0,
        language
      });
    }

    initChunkedStream(res);
    const stream = streamCodyResponse(systemInstruction, limitedHistory, userPrompt);
    
    for await (const chunk of stream) {
      res.write(chunk);
    }

    res.end();
  } catch (error) {
    console.error("Error in codyController handleCodyChat:", error);
    
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: "Cody was unable to connect. Please check your network or try again." 
      });
    }
    
    res.write("\n\n[System Error: Connection disrupted mid-stream. Please try again.]");
    res.end();
  }
};
