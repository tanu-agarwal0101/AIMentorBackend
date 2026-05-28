import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { generateContentWithRetry } from "./geminiService.js";
import { buildReviewPrompt } from "./reviewPromptBuilder.js";
import { normalizeScores, calculateConfidence } from "../utils/scoreNormalizer.js";
import { generateRoadmapInsights } from "./roadmapAnalyzerService.js";

const reviewCache = new Map();

/**
 * Generates a hash key to cache duplicate requests.
 */
const generateCacheKey = (payload) => {
  const codeSegment = payload.code || "";
  const runtime = payload.runtimeStats?.runtimeVal || "";
  const problemTitle = payload.problem || "";
  const lang = payload.language || "";
  
  const rawString = `${problemTitle}_${lang}_${runtime}_${codeSegment}`;
  return crypto.createHash("md5").update(rawString).digest("hex");
};

/**
 * Review Analyzer Service
 * Orchestrates prompt compilation, model generation, schema validation, normalization, and caching.
 */
export const generateInterviewReview = async (payload) => {
  const cacheKey = generateCacheKey(payload);
  

  if (reviewCache.has(cacheKey)) {
    console.log("[Cache Hit] Returning cached interview review.");
    return reviewCache.get(cacheKey);
  }

  const systemInstruction = "You are a senior FAANG technical interviewer conducting a structured code and behavioral performance review.";
  const prompt = buildReviewPrompt(payload);

  try {
    const response = await generateContentWithRetry({
      contents: prompt,
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.2 
    });

    const rawResponseText = response.text;
    if (!rawResponseText) {
      throw new Error("Empty response received from Gemini API");
    }

    let parsedReview;
    try {
      parsedReview = JSON.parse(rawResponseText.trim());
    } catch (parseErr) {
      console.error("Gemini failed to return valid JSON. Raw response:", rawResponseText);
      throw new Error("Review output did not conform to JSON structure.");
    }

    const normalizedScores = normalizeScores(parsedReview.scores);
    const confidenceScore = calculateConfidence(payload);

    const scoreValues = Object.values(normalizedScores);
    const overallScore = Math.round((scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) * 10) / 10;

    const reviewResult = {
      reviewVersion: "qynx7t", 
      overallScore,
      scores: normalizedScores,
      summary: parsedReview.summary || "No summary provided.",
      strengths: Array.isArray(parsedReview.strengths) ? parsedReview.strengths : [],
      weaknesses: Array.isArray(parsedReview.weaknesses) ? parsedReview.weaknesses : [],
      recommendedTopics: Array.isArray(parsedReview.recommendedTopics) ? parsedReview.recommendedTopics : [],
      detectedPatterns: Array.isArray(parsedReview.detectedPatterns) ? parsedReview.detectedPatterns : [],
      interviewSignals: Array.isArray(parsedReview.interviewSignals) ? parsedReview.interviewSignals : [],
      optimizationJourney: {
        initialComplexity: parsedReview.optimizationJourney?.initialComplexity || "N/A",
        finalComplexity: parsedReview.optimizationJourney?.finalComplexity || "N/A",
        hintUsage: payload.hintUsage || 0,
        retryCount: payload.executionHistory?.length || 0,
        debuggingProgression: payload.executionHistory || []
      },
      telemetry: {
        confidenceScore,
        rawGeminiResponse: rawResponseText,
        timeAnalyzed: new Date().toISOString(),
        hintUsage: payload.hintUsage || 0,
        timeSpent: payload.timeSpent || 0
      }
    };

    try {
      reviewResult.roadmapInsights = await generateRoadmapInsights(reviewResult, payload);
    } catch (roadmapErr) {
      console.error("Non-fatal error: Failed to append roadmapInsights:", roadmapErr);
      reviewResult.roadmapInsights = {
        weakTopics: [],
        strongTopics: [],
        recommendedProblems: [],
        estimatedReadiness: { easy: 50, medium: 30, hard: 10 },
        focusAreas: ["Keep practicing structural coding patterns"]
      };
    }

    try {
      const logsDir = path.join(process.cwd(), "logs", "reviews");
      await fs.mkdir(logsDir, { recursive: true });
      const filename = `${payload.sessionId || "unknown"}_${Date.now()}.json`;
      await fs.writeFile(
        path.join(logsDir, filename),
        JSON.stringify({
          sessionId: payload.sessionId,
          timestamp: new Date().toISOString(),
          payload,
          rawResponse: rawResponseText,
          parsedReview: reviewResult
        }, null, 2),
        "utf8"
      );
      console.log(`[Disk Persist] Saved raw and parsed reviews to ${filename}`);
    } catch (fsErr) {
      console.error("Failed to write review files to logs directory:", fsErr);
    }


    reviewCache.set(cacheKey, reviewResult);

    return reviewResult;
  } catch (error) {
    console.error("Error in reviewAnalyzerService generateInterviewReview:", error);
    throw error;
  }
};
