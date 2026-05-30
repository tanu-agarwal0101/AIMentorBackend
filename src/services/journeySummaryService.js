import prisma from "../utils/prisma.js";
import { generateContentWithRetry } from "./geminiService.js";
import { getUserStatsSnapshot } from "./achievementService.js";

/**
 * Helper to keep only the latest 3 journey summaries for a user and delete the rest.
 */
async function pruneExtraStories(userId) {
  try {
    const stories = await prisma.journeySummary.findMany({
      where: { userId },
      orderBy: { generatedAt: "desc" }
    });
    if (stories.length > 3) {
      const idsToDelete = stories.slice(3).map(s => s.id);
      await prisma.journeySummary.deleteMany({
        where: {
          id: { in: idsToDelete }
        }
      });
      console.log(`[JOURNEY] Pruned ${idsToDelete.length} old journey summaries for user ${userId}`);
    }
  } catch (error) {
    console.error("[JOURNEY] Failed to prune extra stories:", error);
  }
}

/**
 * Retrieves the latest Journey Summary.
 */
export async function getJourneySummary(userId) {
  try {
    await pruneExtraStories(userId);
    
    const latest = await prisma.journeySummary.findFirst({
      where: { userId },
      orderBy: { generatedAt: "desc" }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true }
    });

    const joinDate = user ? user.createdAt : new Date();

    if (!latest) {
      console.log(`[JOURNEY] First journey summary generated for User ${userId}`);
      return await generateJourneySummarySync(userId, "MONTHLY", joinDate);
    }


    return latest;
  } catch (error) {
    console.error("Error in getJourneySummary service:", error);
    return null;
  }
}

/**
 * Returns all journey summaries for the user's history browser.
 */
export async function getJourneyHistory(userId) {
  try {
    await pruneExtraStories(userId);
    return await prisma.journeySummary.findMany({
      where: { userId },
      orderBy: { generatedAt: "desc" }
    });
  } catch (error) {
    console.error("Error in getJourneyHistory service:", error);
    return [];
  }
}

/**
 * Force-regenerate a new JourneySummary record, bypassing rate limits.
 */
export async function regenerateJourneySummary(userId, type = "MONTHLY") {
  try {
    const latest = await prisma.journeySummary.findFirst({
      where: { userId },
      orderBy: { generatedAt: "desc" }
    });

    if (latest) {
      const hoursDiff = (Date.now() - new Date(latest.generatedAt).getTime()) / (1000 * 60 * 60);
      if (hoursDiff < 24) {
        throw new Error("Your story is already up to date. You can manually regenerate it once every 24 hours.");
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true }
    });
    const joinDate = user ? user.createdAt : new Date();

    console.log(`[JOURNEY] Regenerating journey summary for User ${userId} (type: ${type})`);

    if (process.env.GEMINI_API_KEY) {
      queueJourneySummaryGeneration(userId, type, joinDate);
    } else {
      await generateJourneySummarySync(userId, type, joinDate);
    }
  } catch (err) {
    if (err.message && err.message.includes("up to date")) throw err;
    console.error("[JOURNEY] regenerateJourneySummary failed:", err);
    throw err;
  }
}

/**
 * Computes programmatic metrics and classifications.
 */
async function computeJourneyDetails(userId) {
  const statsNow = await getUserStatsSnapshot(userId);

  let strongestHabit = "Curiosity";
  if (statsNow.currentStreak >= 15) {
    strongestHabit = "Consistency";
  } else if (statsNow.hoursLearned >= 20) {
    strongestHabit = "Intensity";
  } else if (statsNow.problemsSolved >= statsNow.tasksCompleted * 0.7 && statsNow.problemsSolved > 10) {
    strongestHabit = "Persistence";
  }

  let biggestGrowthArea = "System Learning";
  if (statsNow.problemsSolved >= statsNow.tasksCompleted && statsNow.problemsSolved > 5) {
    biggestGrowthArea = "Problem Solving";
  } else if (statsNow.tasksCompleted > statsNow.problemsSolved && statsNow.tasksCompleted > 10) {
    biggestGrowthArea = "Path Mastery";
  }

  const unlocks = await prisma.achievementProgress.findMany({
    where: { userId, isUnlocked: true },
    include: { achievement: true }
  });

  const badgeStats = await prisma.badge.findMany({
    where: { userId }
  });

  let highestBadgeStage = 1;
  let highestBadgeName = "Stage 1";
  for (const b of badgeStats) {
    if (b.currentStage > highestBadgeStage) {
      highestBadgeStage = b.currentStage;
      highestBadgeName = `${b.badgeType} Badge (Stage ${b.currentStage})`;
    }
  }

  const significanceOrder = [
    { rule: (title) => title === "Roadmap Conqueror", weight: 1, name: "Roadmap Conqueror" },
    { rule: (title) => title === "Phoenix Streak", weight: 2, name: "Phoenix Streak" },
    { rule: (title) => title === "100 Day Streak", weight: 3, name: "100 Day Streak" },
    { rule: (title) => title.includes("Completed") && title.toLowerCase().includes("roadmap"), weight: 4, name: "Roadmap Completion" },
    { rule: (title) => title === "Level 25 Reached" || title === "Level 25 Unlocked", weight: 5, name: "Level 25 Learner" },
    { rule: (title) => title === "Level 10 Reached" || title === "Level 10 Unlocked", weight: 6, name: "Level 10 Learner" },
    { rule: (title) => title === "Midnight Streak", weight: 7, name: "Midnight Streak Unlocked" },
    { rule: (title) => title === "Speed Runner", weight: 8, name: "Speed Runner Unlocked" },
    { rule: (title) => title === "Perfect Week", weight: 9, name: "Perfect Week Unlocked" }
  ];

  let proudestAchievement = "First Step";
  let bestWeight = 999;

  for (const item of unlocks) {
    const title = item.achievement.title;
    for (const sig of significanceOrder) {
      if (sig.rule(title) && sig.weight < bestWeight) {
        bestWeight = sig.weight;
        proudestAchievement = title;
      }
    }
  }


  if (bestWeight === 999 && highestBadgeStage >= 2) {
    proudestAchievement = highestBadgeName;
  } else if (bestWeight === 999 && unlocks.length > 0) {
    const sortedUnlocks = unlocks.sort((a, b) => new Date(b.unlockedAt || 0).getTime() - new Date(a.unlockedAt || 0).getTime());
    proudestAchievement = sortedUnlocks[0].achievement.title;
  }

  return {
    statsNow,
    strongestHabit,
    biggestGrowthArea,
    proudestAchievement
  };
}

/**
 * Synchronous generation helper for the first journey summary.
 */
async function generateJourneySummarySync(userId, type, joinDate) {
  try {
    console.log(`[JOURNEY] computeJourneyDetails start for ${userId}`);
    const { statsNow, strongestHabit, biggestGrowthArea, proudestAchievement } = await computeJourneyDetails(userId);
    console.log(`[JOURNEY] computeJourneyDetails done — xp:${statsNow.xp} tasks:${statsNow.tasksCompleted}`);

    let summaryText = `You started your journey on ${joinDate.toLocaleDateString()} at Level 1, with 0 tasks completed and 0 coding problems solved. Today, you have grown to Level ${getLevelFromXP(statsNow.xp)}, checking off a total of ${statsNow.tasksCompleted} learning tasks and solving ${statsNow.problemsSolved} complex problems. Your dedication has established a strong habit of ${strongestHabit.toLowerCase()}.`;

    if (process.env.GEMINI_API_KEY) {
      try {
        console.log(`[JOURNEY] Calling Gemini for narrative...`);
        summaryText = await generateAiJourneyNarrative(statsNow, strongestHabit, biggestGrowthArea, proudestAchievement, joinDate);
        console.log(`[JOURNEY] Gemini narrative received (${summaryText?.length} chars)`);
      } catch (err) {
        console.error("[JOURNEY] Sync AI narrative generation failed, using fallback.", err);
      }
    }

    console.log(`[JOURNEY] Saving JourneySummary to DB...`);
    const result = await prisma.journeySummary.create({
      data: {
        userId,
        summary: summaryText,
        strongestHabit,
        biggestGrowthArea,
        proudestAchievement,
        summaryType: type,
        periodStart: joinDate,
        periodEnd: new Date()
      }
    });
    await pruneExtraStories(userId);
    console.log(`[JOURNEY] JourneySummary saved — id:${result.id}`);
    return result;
  } catch (err) {
    console.error("[JOURNEY] generateJourneySummarySync failed:", err);
    throw err;
  }
}

/**
 * Background out-of-band journey summary generator.
 */
function queueJourneySummaryGeneration(userId, type, joinDate) {
  if (!process.env.GEMINI_API_KEY) return;

  (async () => {
    try {
      const { statsNow, strongestHabit, biggestGrowthArea, proudestAchievement } = await computeJourneyDetails(userId);
      const summaryText = await generateAiJourneyNarrative(statsNow, strongestHabit, biggestGrowthArea, proudestAchievement, joinDate);

      if (summaryText) {
        await prisma.journeySummary.create({
          data: {
            userId,
            summary: summaryText,
            strongestHabit,
            biggestGrowthArea,
            proudestAchievement,
            summaryType: type,
            periodStart: joinDate,
            periodEnd: new Date()
          }
        });
        await pruneExtraStories(userId);
        console.log(`[AI MENTOR] Generated versioned Journey Summary for User ${userId} (Reason: ${type})`);
      }
    } catch (err) {
      console.error("[AI MENTOR] Background journey summary generation failed:", err);
    }
  })();
}

/**
 * Gemini Prompt invocation helper.
 */
async function generateAiJourneyNarrative(statsNow, strongestHabit, biggestGrowthArea, proudestAchievement, joinDate) {
  const systemInstruction = `You are Cody, a supportive AI personal coding mentor. Write a flagship "Your Journey So Far" growth story summarizing the user's progress.
CRITICAL MENTOR RULE: Never write generic praise (e.g., "Amazing work!", "Great job!", "Keep going!", "You're doing amazing!"). These feel fake.
Instead, you MUST include mathematical stats-based evidence from the user's journey. Describe their transformation starting from a single task/problem up to their current numbers today.
Focus on how their habits (e.g. strongest habit: ${strongestHabit}, growth area: ${biggestGrowthArea}) have evolved.
Speak directly as their teacher. Keep it to a concise paragraph (3-4 sentences).`;

  const userPrompt = `
  User Journey Stats:
  - Join Date: ${joinDate.toLocaleDateString()} (Initial Stats: Level 1, 0 Tasks, 0 Problems)
  - Current Stats Today: Level ${getLevelFromXP(statsNow.xp)}, Tasks Completed: ${statsNow.tasksCompleted}, Problems Solved: ${statsNow.problemsSolved}, Hours Learned: ${statsNow.hoursLearned} hrs
  - Strongest Habit Pattern: ${strongestHabit}
  - Major Growth Focus: ${biggestGrowthArea}
  - Proudest Achievement Landmark: ${proudestAchievement}
  
  Write a beautiful personal growth narrative summarizing this journey.`;

  const aiResponse = await generateContentWithRetry({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction,
    temperature: 0.8
  });

  return aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

function getLevelFromXP(xp) {
  let level = 1;
  let xpForNextLevel = 500;
  while (xp >= xpForNextLevel) {
    level++;
    xpForNextLevel = xpForNextLevel + 500 + (level - 1) * 250;
  }
  return level;
}
