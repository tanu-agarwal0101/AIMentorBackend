import prisma from "../utils/prisma.js";
import { generateContentWithRetry } from "./geminiService.js";
import { getUserStatsSnapshot } from "./achievementService.js";

/**
 * Gets all written time capsules and lists available capsule contexts user qualifies for.
 */
export async function getTimeCapsules(userId) {
  try {
    const capsules = await prisma.timeCapsule.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true }
    });

    const stats = await getUserStatsSnapshot(userId);

    let level = 1;
    let xpForNextLevel = 500;
    while ((user?.xp || 0) >= xpForNextLevel) {
      level++;
      xpForNextLevel = xpForNextLevel + 500 + (level - 1) * 250;
    }

    const completedRoadmaps = await prisma.roadmap.count({
      where: { userId, status: "completed" }
    });

    const qualifications = [
      {
        milestoneContext: "First Roadmap Completed",
        label: "🎓 First Roadmap Completion",
        description: "Write a message when you successfully master your very first custom learning track.",
        isQualified: completedRoadmaps >= 1
      },
      {
        milestoneContext: "Level 10 reached",
        label: "⚡ Reached Level 10",
        description: "Capture your thoughts as you evolve into a Level 10 developer.",
        isQualified: level >= 10
      },
      {
        milestoneContext: "Level 25 reached",
        label: "⭐ Reached Level 25",
        description: "Document your mindset upon achieving the status of a Level 25 master.",
        isQualified: level >= 25
      },
      {
        milestoneContext: "100 Day Streak",
        label: "🔥 100 Day Coding Streak",
        description: "Commit a reflection on building a massive 100-day consistency habit.",
        isQualified: stats.currentStreak >= 100
      },
      {
        milestoneContext: "Roadmap Conqueror",
        label: "🏆 Roadmap Conqueror",
        description: "Write a note after conquering 3 or more customized paths in AI Mentor.",
        isQualified: completedRoadmaps >= 3
      }
    ];

    const writtenContexts = new Set(capsules.map(c => c.milestoneContext));
    const availableToWrite = qualifications.filter(q => q.isQualified && !writtenContexts.has(q.milestoneContext));

    return {
      capsules,
      availableToWrite
    };
  } catch (error) {
    console.error("Error in getTimeCapsules service:", error);
    return { capsules: [], availableToWrite: [] };
  }
}

/**
 * Creates a new time capsule locking note.
 */
export async function createTimeCapsule(userId, message, milestoneContext, durationDays, durationSeconds = null) {
  try {
    const stats = await getUserStatsSnapshot(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true }
    });
    let level = 1;
    let xpForNextLevel = 500;
    while ((user?.xp || 0) >= xpForNextLevel) {
      level++;
      xpForNextLevel = xpForNextLevel + 500 + (level - 1) * 250;
    }

    const statsSnapshot = {
      level,
      streak: stats.currentStreak,
      tasksCompleted: stats.tasksCompleted,
      problemsSolved: stats.problemsSolved
    };

    let revealAt = null;
    if (typeof durationSeconds === "number") {
      revealAt = new Date(Date.now() + durationSeconds * 1000);
    } else {
      revealAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    }

    const capsule = await prisma.timeCapsule.create({
      data: {
        userId,
        message,
        milestoneContext,
        revealAt,
        statsSnapshot
      }
    });

    console.log(`[CAPSULE] Created time capsule for User ${userId} on milestone: ${milestoneContext}. Reveal at: ${revealAt.toISOString()}`);
    return capsule;
  } catch (error) {
    console.error("Error creating time capsule:", error);
    throw error;
  }
}

/**
 * Unlocks a time capsule and triggers the background mentor reflection.
 */
export async function revealTimeCapsule(userId, capsuleId) {
  try {
    const capsule = await prisma.timeCapsule.findFirst({
      where: { id: capsuleId, userId }
    });

    if (!capsule) {
      throw new Error("Time capsule not found or access denied.");
    }

    if (capsule.revealedAt) {
      return capsule; 
    }

    if (new Date() < new Date(capsule.revealAt)) {
      throw new Error("This time capsule is still locked.");
    }

    const updatedCapsule = await prisma.timeCapsule.update({
      where: { id: capsuleId },
      data: {
        revealedAt: new Date(),
        mentorReflection: "Generating AI Mentor reflection..."
      }
    });

    queueTimeCapsuleReflection(userId, updatedCapsule);

    return updatedCapsule;
  } catch (error) {
    console.error("Error in revealTimeCapsule service:", error);
    throw error;
  }
}

/**
 * Logs when a user clicks to open/view a revealed capsule.
 */
export async function openTimeCapsule(userId, capsuleId) {
  try {
    const capsule = await prisma.timeCapsule.findFirst({
      where: { id: capsuleId, userId }
    });

    if (!capsule) {
      throw new Error("Time capsule not found or access denied.");
    }

    if (!capsule.revealedAt) {
      throw new Error("Cannot open a locked time capsule.");
    }

    if (capsule.openedAt) {
      return capsule; 
    }

    return await prisma.timeCapsule.update({
      where: { id: capsuleId },
      data: {
        openedAt: new Date()
      }
    });
  } catch (error) {
    console.error("Error in openTimeCapsule service:", error);
    throw error;
  }
}

/**
 * Background out-of-band AI reflection creator for revealed notes.
 */
function queueTimeCapsuleReflection(userId, capsule) {
  if (!process.env.GEMINI_API_KEY) return;

  (async () => {
    try {
      console.log(`[AI MENTOR] Generating Time Capsule reveal feedback for User ${userId} capsule: ${capsule.id}...`);

      const statsNow = await getUserStatsSnapshot(userId);
      const start = capsule.statsSnapshot || { level: 1, streak: 0, tasksCompleted: 0, problemsSolved: 0 };

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true }
      });
      let currentLevel = 1;
      let xpForNextLevel = 500;
      while ((user?.xp || 0) >= xpForNextLevel) {
        currentLevel++;
        xpForNextLevel = xpForNextLevel + 500 + (currentLevel - 1) * 250;
      }

      const levelDelta = Math.max(0, currentLevel - start.level);
      const streakDelta = Math.max(0, statsNow.currentStreak - start.streak);
      const tasksDelta = Math.max(0, statsNow.tasksCompleted - start.tasksCompleted);
      const problemsDelta = Math.max(0, statsNow.problemsSolved - start.problemsSolved);

      const systemInstruction = `You are Cody, a supportive AI personal coding mentor. Read a message the user wrote to their future self in the past, and write a warm 2-sentence mentor comment reviewing their growth.
CRITICAL MENTOR RULE: Never write generic praise (e.g., "Amazing work!", "Great job!", "Keep going!", "You're doing amazing!"). These feel fake.
Instead, you MUST use mathematical stats-based evidence to prove their transformation. Point out initial stats vs current stats and call out specific gains (e.g. +${tasksDelta} tasks completed since writing).
Directly react to what they wrote in their past note in a meaningful way. Speak directly as their teacher. Keep it concise.`;

      const userPrompt = `
      Milestone Context: ${capsule.milestoneContext}
      Past Note Written by User: "${capsule.message}"
      Date Written: ${new Date(capsule.createdAt).toLocaleDateString()}
      
      Stats Snapshot at Creation:
      - Level: ${start.level}
      - Daily Streak: ${start.streak} days
      - Tasks Completed: ${start.tasksCompleted}
      - Coding Problems Solved: ${start.problemsSolved}
      
      Stats Today:
      - Level: ${currentLevel} (Gain: +${levelDelta})
      - Daily Streak: ${statsNow.currentStreak} (Gain: +${statsNow.currentStreak - start.streak})
      - Tasks Completed: ${statsNow.tasksCompleted} (Gain: +${tasksDelta})
      - Coding Problems Solved: ${statsNow.problemsSolved} (Gain: +${problemsDelta})
      
      Review their note and draft a warm 2-sentence feedback statement confirming how they have progressed since they sealed the capsule.`;

      const aiResponse = await generateContentWithRetry({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        systemInstruction,
        temperature: 0.8
      });

      const reflectionText = aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (reflectionText) {
        await prisma.timeCapsule.update({
          where: { id: capsule.id },
          data: { mentorReflection: reflectionText }
        });
        console.log(`[AI MENTOR] Successfully saved time capsule mentor reflection for User ${userId}`);
      }
    } catch (err) {
      console.error("[AI MENTOR] Background time capsule reflection failed:", err);
    }
  })();
}
