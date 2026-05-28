/**
 * roadmapPromptBuilder.js
 * Generates prompt instructions to analyze interview reviews and build adaptive roadmap insights.
 */

export const buildRoadmapPrompt = (reviewResult = {}, payload = {}) => {
  const {
    scores = {},
    summary = "",
    strengths = [],
    weaknesses = [],
    detectedPatterns = [],
    optimizationJourney = {}
  } = reviewResult;

  const hintUsage = payload.hintUsage || 0;
  const scoresStr = Object.entries(scores)
    .map(([cat, val]) => `- ${cat}: ${val}/10`)
    .join("\n");

  return `
You are an expert AI career coach and technical mentor. Analyze the candidate's FAANG technical interview review outputs and generate a highly personalized, adaptive roadmap index.

[CANDIDATE PERFORMANCE DOSSIER]:
- Categories Scores:
${scoresStr}
- AI Evaluation Summary: "${summary}"
- Strengths: ${JSON.stringify(strengths)}
- Weaknesses: ${JSON.stringify(weaknesses)}
- Optimization Journey: ${JSON.stringify(optimizationJourney)}
- Dialog/Behavioral Patterns: ${JSON.stringify(detectedPatterns)}
- Hints Used: ${hintUsage}

[OUTPUT FORMAT REQUIREMENT]:
You MUST respond with a single, valid JSON object only. Do NOT include markdown blocks like \`\`\`json. Ensure the output strictly conforms to this structure:

{
  "weakTopics": [
    "Name of Topic 1 (e.g. Graph Cycle Detection)",
    "Name of Topic 2"
  ],
  "strongTopics": [
    "Name of Strength 1 (e.g. Adjacency List Hashing)",
    "Name of Strength 2"
  ],
  "recommendedProblems": [
    {
      "title": "Problem Name (e.g. Number of Islands)",
      "topic": "Graph Traversal",
      "difficulty": "Easy" | "Medium" | "Hard"
    }
  ],
  "estimatedReadiness": {
    "easy": 0, // integer 0-100 representing percentage readiness
    "medium": 0, // integer 0-100 representing percentage readiness
    "hard": 0 // integer 0-100 representing percentage readiness
  },
  "focusAreas": [
    "Focus directive 1 (e.g. Improve DFS visitation confidence)",
    "Focus directive 2"
  ]
}
`.trim();
};
