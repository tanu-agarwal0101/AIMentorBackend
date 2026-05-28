/**
 * roadmapAnalyzerService.js
 * Analyzes interview reviews to build lightweight adaptive roadmap recommendations.
 */

import { generateContentWithRetry } from "./geminiService.js";
import { buildRoadmapPrompt } from "./roadmapPromptBuilder.js";

/**
 * Generates personalized roadmap recommendations based on interview performance.
 * Fully defensive. Will return a default fallback if any step fails.
 */
export const generateRoadmapInsights = async (reviewResult, payload) => {
  try {
    const prompt = buildRoadmapPrompt(reviewResult, payload);
    const response = await generateContentWithRetry({
      contents: prompt,
      systemInstruction: "You are an adaptive AI career coach compiling data-driven candidate roadmaps.",
      responseMimeType: "application/json",
      temperature: 0.2
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error("Empty response received from Gemini for roadmap analyzer");
    }

    const parsed = JSON.parse(rawText.trim());

    return {
      weakTopics: Array.isArray(parsed.weakTopics) ? parsed.weakTopics : [],
      strongTopics: Array.isArray(parsed.strongTopics) ? parsed.strongTopics : [],
      recommendedProblems: Array.isArray(parsed.recommendedProblems)
        ? parsed.recommendedProblems.map((prob) => ({
            title: String(prob.title || ""),
            topic: String(prob.topic || ""),
            difficulty: String(prob.difficulty || "Medium")
          }))
        : [],
      estimatedReadiness: {
        easy: Math.min(100, Math.max(0, parseInt(parsed.estimatedReadiness?.easy) || 50)),
        medium: Math.min(100, Math.max(0, parseInt(parsed.estimatedReadiness?.medium) || 30)),
        hard: Math.min(100, Math.max(0, parseInt(parsed.estimatedReadiness?.hard) || 10))
      },
      focusAreas: Array.isArray(parsed.focusAreas) ? parsed.focusAreas : []
    };

  } catch (error) {
    console.error("Warning: generateRoadmapInsights failed:", error);
    return {
      weakTopics: [],
      strongTopics: [],
      recommendedProblems: [],
      estimatedReadiness: {
        easy: 50,
        medium: 30,
        hard: 10
      },
      focusAreas: ["Continue practicing core DSA paradigms"]
    };
  }
};
