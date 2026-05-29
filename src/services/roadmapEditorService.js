import { generateContentWithRetry, cleanGeminiError } from "./geminiService.js";

/**
 * Conversationally refactors an existing roadmap using Gemini, keeping progress strictly preserved.
 *
 * @param {object} existingRoadmap - Roadmap instance from DB (nested phases, milestones, tasks).
 * @param {string} instruction - Conversational instruction (e.g. "Focus more on graph tasks").
 * @returns {Promise<object>} Combined and merged new roadmap JSON schema.
 */
export async function editRoadmap(existingRoadmap, instruction) {

  const currentStructure = {
    title: existingRoadmap.title,
    description: existingRoadmap.description,
    phases: existingRoadmap.phases.map(p => ({
      title: p.title,
      duration: p.duration,
      order: p.order,
      milestones: p.milestones.map(m => ({
        title: m.title,
        order: m.order,
        isCompleted: m.isCompleted,
        tasks: m.tasks.map(t => ({
          title: t.title,
          description: t.description,
          isCompleted: t.isCompleted,
          durationMins: t.durationMins,
          arenaTopic: t.arenaTopic,
          sourceType: t.sourceType,
          notes: t.notes
        }))
      }))
    }))
  };

  const prompt = `You are a Senior Technical Mock Interviewer and engineering mentor.
Your task is to conversationally modify and restructure an existing learning roadmap according to a user's instruction.

Existing Roadmap Structure:
${JSON.stringify(currentStructure, null, 2)}

User Instruction:
"${instruction}"

Rules:
1. You MUST preserve all completed tasks (where "isCompleted": true). They must remain in the output roadmap. Do not delete them.
2. You can rename phases, add new tasks, edit uncompleted tasks, or change focus areas based on the instruction.
3. Keep the JSON schema identical.

Format the response STRICTLY as a JSON object matching this structure:
{
  "title": "Roadmap title",
  "description": "Updated supportive mentor explanation",
  "currentFocus": "Updated topic of focus",
  "phases": [
    {
      "title": "Phase title",
      "duration": "Duration (e.g. Week 1-2)",
      "order": 1,
      "milestones": [
        {
          "title": "Milestone title",
          "order": 1,
          "tasks": [
            {
              "title": "Task title",
              "description": "Short explanation",
              "durationMins": 45,
              "arenaTopic": "Optional: related Coding Arena topic name",
              "sourceType": "roadmap"
            }
          ]
        }
      ]
    }
  ]
}

Respond with ONLY the raw JSON. Do NOT wrap it in markdown codeblocks.`;

  let restructuredMap;
  let isFallback = false;
  let errorMsg = null;

  try {
    const response = await generateContentWithRetry({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      responseMimeType: "application/json",
      temperature: 0.3
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty text returned from Gemini.");

    restructuredMap = JSON.parse(text);
  } catch (err) {
    const cleaned = cleanGeminiError(err);
    console.error("Gemini roadmap edit failed, using mock instruction fallback:", cleaned);
    restructuredMap = getFallbackRestructure(currentStructure, instruction);
    isFallback = true;
    errorMsg = cleaned.message || "Quota limit or capacity error";
  }

  const completedTaskPool = [];
  existingRoadmap.phases.forEach(p => {
    p.milestones.forEach(m => {
      m.tasks.forEach(t => {
        if (t.isCompleted) {
          completedTaskPool.push(t);
        }
      });
    });
  });

  const matchedCompletedTitles = new Set();

  restructuredMap.phases.forEach(phase => {
    phase.milestones.forEach(milestone => {
      milestone.tasks.forEach(task => {
        const match = completedTaskPool.find(
          t => t.title.toLowerCase().trim() === task.title.toLowerCase().trim()
        );
        if (match) {
          task.isCompleted = true;
          task.notes = match.notes;
          matchedCompletedTitles.add(match.title.toLowerCase().trim());
        } else {
          task.isCompleted = !!task.isCompleted;
        }
      });

      const allTasksCompleted = milestone.tasks.length > 0 && milestone.tasks.every(t => t.isCompleted);
      milestone.isCompleted = allTasksCompleted;
    });
  });
  const omittedTasks = completedTaskPool.filter(
    t => !matchedCompletedTitles.has(t.title.toLowerCase().trim())
  );

  if (omittedTasks.length > 0) {
    restructuredMap.phases.push({
      title: "Completed Milestone Archives (Preserved)",
      duration: "Completed",
      order: restructuredMap.phases.length + 1,
      milestones: [
        {
          title: "AI Restructure Preserved Progress",
          order: 1,
          isCompleted: true,
          tasks: omittedTasks.map((t, idx) => ({
            title: t.title,
            description: t.description || "Completed in previous roadmap configuration.",
            isCompleted: true,
            durationMins: t.durationMins,
            arenaTopic: t.arenaTopic,
            sourceType: t.sourceType,
            notes: t.notes,
            order: idx + 1
          }))
        }
      ]
    });
  }

  restructuredMap._isFallback = isFallback;
  restructuredMap._error = errorMsg;

  return restructuredMap;
}

/**
 * Fallback roadmap restructure when API limits are hit.
 */
function getFallbackRestructure(current, instruction) {
  const cloned = JSON.parse(JSON.stringify(current));
  cloned.description = `Roadmap modified conversationally: "${instruction}". ` + cloned.description;
  
  if (cloned.phases.length > 0 && cloned.phases[0].milestones.length > 0) {
    cloned.phases[0].milestones[0].tasks.push({
      title: `Custom Goal focus: ${instruction.slice(0, 45)}`,
      description: "Added to alignment from conversational review.",
      durationMins: 45,
      sourceType: "manual",
      isCompleted: false
    });
  }
  return cloned;
}
