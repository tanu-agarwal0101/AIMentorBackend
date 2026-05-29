import prisma from "../utils/prisma.js";
import { generateContentWithRetry } from "./geminiService.js";
import { getUserStatsSnapshot } from "./achievementService.js";

/**
 * Lazily fetches monthly recaps, initializing the current month shell if missing,
 * and finalizing past months when they close.
 */
export async function getMonthlyRecaps(userId) {
  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    let recaps = await prisma.monthlyRecap.findMany({
      where: { userId },
      orderBy: [
        { year: "desc" },
        { month: "desc" }
      ]
    });
    let currentRecap = recaps.find(r => r.month === currentMonth && r.year === currentYear);

    if (!currentRecap) {
      console.log(`[RECAP] Initializing current month shell for User ${userId} (${currentMonth}/${currentYear})`);
      const todayStats = await getUserStatsSnapshot(userId);
      currentRecap = await prisma.monthlyRecap.create({
        data: {
          userId,
          month: currentMonth,
          year: currentYear,
          startSnapshot: todayStats,
          tasksCompleted: 0,
          problemsSolved: 0,
          hoursLearned: 0,
          achievementsUnlocked: 0,
          milestonesCompleted: 0,
          mentorSummary: null
        }
      });
      recaps.unshift(currentRecap);
    }
    for (const recap of recaps) {
      const isPastMonth = recap.year < currentYear || (recap.year === currentYear && recap.month < currentMonth);
      if (isPastMonth && !recap.endSnapshot) {
        console.log(`[RECAP] Finalizing past month recap for User ${userId} (${recap.month}/${recap.year})...`);
        await finalizePastMonthRecap(userId, recap);
      }
    }

    recaps = await prisma.monthlyRecap.findMany({
      where: { userId },
      orderBy: [
        { year: "desc" },
        { month: "desc" }
      ]
    });

    const resolvedRecaps = [];
    const currentStats = await getUserStatsSnapshot(userId);

    for (const recap of recaps) {
      if (recap.month === currentMonth && recap.year === currentYear) {
        const start = recap.startSnapshot || { tasksCompleted: 0, problemsSolved: 0, hoursLearned: 0, currentStreak: 0 };
        const tasksDelta = Math.max(0, currentStats.tasksCompleted - start.tasksCompleted);
        const problemsDelta = Math.max(0, currentStats.problemsSolved - start.problemsSolved);
        const hoursDelta = Math.max(0, Math.round((currentStats.hoursLearned - start.hoursLearned) * 10) / 10);
        const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
        const achievementsUnlocked = await prisma.achievementProgress.count({
          where: {
            userId,
            isUnlocked: true,
            unlockedAt: { gte: startOfMonth }
          }
        });

        const milestonesCompleted = await prisma.timelineEvent.count({
          where: {
            userId,
            type: "ROADMAP",
            eventDate: { gte: startOfMonth }
          }
        });

        resolvedRecaps.push({
          ...recap,
          tasksCompleted: tasksDelta,
          problemsSolved: problemsDelta,
          hoursLearned: hoursDelta,
          achievementsUnlocked,
          milestonesCompleted,
          endSnapshot: currentStats,
          mentorSummary: recap.mentorSummary || "Active month — your growth narrative is updating in real time."
        });
      } else {
        resolvedRecaps.push(recap);
      }
    }

    return resolvedRecaps;
  } catch (error) {
    console.error("Error in getMonthlyRecaps service:", error);
    return [];
  }
}

/**
 * Freezes a past month's stats snapshot and queues AI reflection.
 */
async function finalizePastMonthRecap(userId, recap) {
  try {
    const endStats = await getUserStatsSnapshot(userId);
    const start = recap.startSnapshot || { tasksCompleted: 0, problemsSolved: 0, hoursLearned: 0 };
    
    const tasksDelta = Math.max(0, endStats.tasksCompleted - start.tasksCompleted);
    const problemsDelta = Math.max(0, endStats.problemsSolved - start.problemsSolved);
    const hoursDelta = Math.max(0, Math.round((endStats.hoursLearned - start.hoursLearned) * 10) / 10);

    const startOfMonth = new Date(recap.year, recap.month - 1, 1);
    const endOfMonth = new Date(recap.year, recap.month, 0, 23, 59, 59, 999);

    const achievementsUnlocked = await prisma.achievementProgress.count({
      where: {
        userId,
        isUnlocked: true,
        unlockedAt: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    const milestonesCompleted = await prisma.timelineEvent.count({
      where: {
        userId,
        type: "ROADMAP",
        eventDate: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    const updatedRecap = await prisma.monthlyRecap.update({
      where: { id: recap.id },
      data: {
        endSnapshot: endStats,
        tasksCompleted: tasksDelta,
        problemsSolved: problemsDelta,
        hoursLearned: hoursDelta,
        achievementsUnlocked,
        milestonesCompleted,
        mentorSummary: "Generating mentor reflection..."
      }
    });

    queueMonthlyRecapReflection(userId, updatedRecap);

  } catch (error) {
    console.error(`Failed to finalize past month recap ${recap.id}:`, error);
  }
}

/**
 * Asynchronously generates the AI mentor monthly review.
 */
function queueMonthlyRecapReflection(userId, recap) {
  if (!process.env.GEMINI_API_KEY) {
    console.log("[AI MENTOR] Skipping recap reflection generation: No API Key.");
    return;
  }

  (async () => {
    try {
      console.log(`[AI MENTOR] Generating monthly recap review for User ${userId} for ${recap.month}/${recap.year}...`);

      const previousRecaps = await prisma.monthlyRecap.findMany({
        where: {
          userId,
          NOT: { id: recap.id },
          createdAt: { lt: recap.createdAt }
        },
        orderBy: [
          { year: "desc" },
          { month: "desc" }
        ],
        take: 2
      });

      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const currentMonthName = monthNames[recap.month - 1];

      let comparisonStats = "";
      if (previousRecaps.length > 0) {
        comparisonStats = previousRecaps.map(r => 
          `- ${monthNames[r.month - 1]} ${r.year}: ${r.problemsSolved} problems solved, ${r.tasksCompleted} tasks completed.`
        ).join("\n");
      }

      const systemInstruction = `You are Cody, a supportive AI personal coding mentor. Write a highly personalized, 1-2 sentence growth recap reflection praising the user's progress this month.
CRITICAL MENTOR RULE: Never write generic praise (e.g., "Amazing work!", "Great job!", "Keep going!", "You're doing amazing!"). These feel fake.
Instead, you MUST reference exact numbers from the current month's performance and, if possible, compare them to the previous months' history to show concrete mathematical growth.
Speak directly as their teacher. Keep it extremely concise and impactful.`;

      const userPrompt = `
      User Stats for ${currentMonthName} ${recap.year}:
      - Tasks Completed: ${recap.tasksCompleted}
      - Coding Problems Solved: ${recap.problemsSolved}
      - Learning Hours: ${recap.hoursLearned} hrs
      - Achievements Unlocked: ${recap.achievementsUnlocked}
      - Roadmap Milestones Completed: ${recap.milestonesCompleted}
      
      Historical context (previous months):
      ${comparisonStats || "No previous history available."}
      
      Compose a warm, inspiring 1-2 sentence mentor feedback statement reviewing this month.`;

      const aiResponse = await generateContentWithRetry({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        systemInstruction,
        temperature: 0.75
      });

      const reflectionText = aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (reflectionText) {
        await prisma.monthlyRecap.update({
          where: { id: recap.id },
          data: { mentorSummary: reflectionText }
        });
        console.log(`[AI MENTOR] Successfully saved monthly recap review for User ${userId} (${recap.month}/${recap.year})`);
      }
    } catch (err) {
      console.error("[AI MENTOR] Failed to generate monthly recap reflection:", err);
    }
  })();
}
