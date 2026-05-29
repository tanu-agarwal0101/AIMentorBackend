import { generateContentWithRetry, cleanGeminiError } from "./geminiService.js";

/**
 * Generates an adaptive, personalized learning roadmap using Gemini API, with strict fallback recovery.
 *
 * @param {object} params - Goal, level, focusArea, commitment, learningStyle parameters.
 * @returns {Promise<object>} Parsed roadmap JSON tree.
 */
export async function generateRoadmap({ goal, currentLevel, focusArea, weeklyHours, learningStyle, notes }) {
  const prompt = `You are a Senior Technical Mock Interviewer and engineering mentor.
Your task is to generate a highly detailed, personalized, adaptive learning roadmap for a student.

Parameters:
- Goal: "${goal}"
- Current level: "${currentLevel}"
- Focus Area: "${focusArea}"
- Weekly Time Commitment: "${weeklyHours} hours/week"
- Preferred Learning Style: "${learningStyle || "Project-based"}"
${notes ? `- Additional Notes / User Constraints: "${notes}"` : ""}

Format the response STRICTLY as a JSON object matching this structure:
{
  "title": "A short, motivating title",
  "description": "A supportive, grounding introduction from their AI mentor (2-3 sentences max)",
  "currentFocus": "The first specific topic they should focus on",
  "aiInsights": [
    "A personalized engineering observation based on their parameters"
  ],
  "recommendedArenaTopics": [
    "A list of 2-3 topics they should practice in the Coding Arena aligned with their level and focus"
  ],
  "phases": [
    {
      "title": "Phase title (e.g. Foundations & Basics)",
      "duration": "Duration (e.g. Week 1-2)",
      "order": 1,
      "milestones": [
        {
          "title": "Milestone title (e.g. Master Loops & Conditions)",
          "order": 1,
          "tasks": [
            {
              "title": "Task title (e.g. Solve 2-Sum problem)",
              "description": "Short explanation of the task or resources to use (1-2 sentences)",
              "durationMins": 45,
              "arenaTopic": "Optional: Coding Arena topic related to this task (e.g. 'Arrays' or 'Strings')",
              "sourceType": "roadmap"
            }
          ]
        }
      ]
    }
  ]
}

Ensure the roadmap is highly realistic and tailored:
- If the Focus Area is Frontend, DO NOT recommend advanced Back-end or advanced Graph/DP topics immediately. Keep recommended Coding Arena topics to relevant ones (e.g. Arrays, Strings, Hashmaps).
- Ensure tasks have clear estimated durations (e.g. 30, 45, 60, 90 mins).
- The tone must be encouraging, grounded, and observant, acting like a true personal mentor.
- If "Additional Notes / User Constraints" are provided, incorporate them into the roadmap structure, phases, or description accordingly.
- Respond with ONLY the raw JSON block. Do NOT surround it with markdown codeblocks or quotes.`;

  try {
    const response = await generateContentWithRetry({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      responseMimeType: "application/json",
      temperature: 0.3
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Empty content returned from Gemini client.");
    }

    try {
      const data = JSON.parse(text);
      if (data.title && Array.isArray(data.phases)) {
        return data;
      }
      throw new Error("Invalid roadmap JSON schema structure.");
    } catch (parseErr) {
      console.warn("Gemini roadmap JSON parsing failed, attempting fallback:", parseErr);
      return getFallbackRoadmap(goal, currentLevel, focusArea, weeklyHours, learningStyle, notes);
    }

  } catch (err) {
    console.error("Gemini roadmap generation failed completely, returning fallback:", cleanGeminiError(err));
    return getFallbackRoadmap(goal, currentLevel, focusArea, weeklyHours, learningStyle, notes);
  }
}

/**
 * Robust fallback roadmap generator.
 */
function getFallbackRoadmap(goal, currentLevel, focusArea, weeklyHours, learningStyle, notes) {
  const arenaTopics = focusArea === "DSA" ? ["Arrays", "Strings", "Recursion"] : ["Arrays", "Strings", "Hashmaps"];
  return {
    title: `${focusArea || "Software"} Engineering Core Path`,
    description: `A standard structured learning path focused on achieving: "${goal || "General Placements"}". Crafted dynamically as a fallback.`,
    currentFocus: "Foundational Syntax and Core Setup",
    aiInsights: [
      "Consistent practice on basic algorithms forms the basis for interview success.",
      "Track your retry count during coding sessions to improve speed."
    ],
    recommendedArenaTopics: arenaTopics,
    phases: [
      {
        title: "Foundations & Syntax Fundamentals",
        duration: "Week 1-2",
        order: 1,
        milestones: [
          {
            title: "Syntax Proficiency",
            order: 1,
            tasks: [
              {
                title: "Setup Local Environment",
                description: "Install development tools, configure variables, run standard template scripts.",
                durationMins: 30,
                arenaTopic: arenaTopics[0],
                sourceType: "roadmap"
              },
              {
                title: "Basic Operations & Structures",
                description: "Familiarize yourself with loops, conditional clauses, scope, and function signatures.",
                durationMins: 60,
                arenaTopic: arenaTopics[1],
                sourceType: "roadmap"
              }
            ]
          }
        ]
      },
      {
        title: "Intermediate Practice & Implementations",
        duration: "Week 3-4",
        order: 2,
        milestones: [
          {
            title: "Core Operations",
            order: 1,
            tasks: [
              {
                title: "Linear Data Traversals",
                description: "Practice modular search, array sweeps, and string reversal logic.",
                durationMins: 90,
                arenaTopic: arenaTopics[0],
                sourceType: "roadmap"
              }
            ]
          }
        ]
      }
    ]
  };
}
