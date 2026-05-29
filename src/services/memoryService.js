import prisma from "../utils/prisma.js";
import { getUserStatsSnapshot } from "./achievementService.js";

/**
 * Returns a list of up to 3 dynamic memory cards comparing the past to today.
 */
export async function getMemories(userId) {
  try {
    const today = new Date();
    const currentStats = await getUserStatsSnapshot(userId);

    const timelineEvents = await prisma.timelineEvent.findMany({
      where: { userId },
      orderBy: { eventDate: "asc" }
    });

    const celebrations = await prisma.milestoneCelebration.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" }
    });

    const memories = [];

    const oneDayMs = 24 * 60 * 60 * 1000;

    const findEventInDateRange = (daysAgoTarget, toleranceDays) => {
      const targetTime = today.getTime() - (daysAgoTarget * oneDayMs);
      const minTime = targetTime - (toleranceDays * oneDayMs);
      const maxTime = targetTime + (toleranceDays * oneDayMs);

      for (const ev of timelineEvents) {
        const evTime = new Date(ev.eventDate).getTime();
        if (evTime >= minTime && evTime <= maxTime) {
          return { source: "timeline", data: ev };
        }
      }

      for (const cel of celebrations) {
        const celTime = new Date(cel.createdAt).getTime();
        if (celTime >= minTime && celTime <= maxTime) {
          return { source: "celebration", data: cel };
        }
      }

      return null;
    };

    const yearAgoMatch = findEventInDateRange(365, 7);
    if (yearAgoMatch) {
      memories.push(await formatMemoryCard(userId, yearAgoMatch, "ONE_YEAR_AGO", "📸 One Year Ago Today", currentStats));
    }

    const monthAgoMatch = findEventInDateRange(30, 4);
    if (monthAgoMatch && memories.length < 3) {
      memories.push(await formatMemoryCard(userId, monthAgoMatch, "ONE_MONTH_AGO", "📸 One Month Ago", currentStats));
    }

    const weekAgoMatch = findEventInDateRange(7, 1);
    if (weekAgoMatch && memories.length < 3) {
      memories.push(await formatMemoryCard(userId, weekAgoMatch, "ONE_WEEK_AGO", "📸 One Week Ago", currentStats));
    }

    if (memories.length < 3) {
      const sortedCelebrations = [...celebrations].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      for (const cel of sortedCelebrations) {
        const celAgeDays = (today.getTime() - new Date(cel.createdAt).getTime()) / oneDayMs;
        if (celAgeDays >= 3) {
          const alreadyAdded = memories.some(m => m.id === cel.id);
          if (!alreadyAdded) {
            memories.push(await formatMemoryCard(
              userId,
              { source: "celebration", data: cel },
              "MILESTONE_MOMENT",
              "🏆 Milestone Memory",
              currentStats
            ));
            if (memories.length >= 3) break;
          }
        }
      }
    }

    return memories.slice(0, 3);

  } catch (error) {
    console.error("Error in getMemories service:", error);
    return [];
  }
}

/**
 * Formats a raw database event/celebration into a rich memory card payload.
 */
async function formatMemoryCard(userId, match, type, title, currentStats) {
  const isCel = match.source === "celebration";
  const item = match.data;

  const id = item.id;
  const eventDate = isCel ? item.createdAt : item.eventDate;
  const achievementName = isCel ? item.achievementName : item.title;
  const icon = isCel ? item.achievementIcon : item.icon;
  const description = isCel ? item.mentorMessage : item.description;

  let pastStats = null;
  if (isCel && item.statsSnapshot) {
    pastStats = item.statsSnapshot;
  } else if (!isCel && item.statsSnapshot) {
    pastStats = item.statsSnapshot;
  } else if (!isCel && item.metadata && typeof item.metadata === "object") {
    pastStats = {
      level: item.metadata.level || 1,
      currentStreak: item.metadata.streak || 0,
      tasksCompleted: item.metadata.tasksCompleted || 0,
      problemsSolved: item.metadata.problemsSolved || 0
    };
  }

  if (!pastStats || typeof pastStats !== "object") {
    pastStats = await reconstructHistoricalStats(userId, eventDate);
  }
  const past = {
    level: pastStats.level || pastStats.levelInfo?.level || 1,
    streak: pastStats.currentStreak || pastStats.streak || 0,
    tasks: pastStats.tasksCompleted || pastStats.tasks || 0,
    problems: pastStats.problemsSolved || pastStats.problems || 0
  };

  const today = {
    level: currentStats.level || currentStats.levelInfo?.level || getLevelFromXP(currentStats.xp || 0),
    streak: currentStats.currentStreak || 0,
    tasks: currentStats.tasksCompleted || 0,
    problems: currentStats.problemsSolved || 0
  };

  if (!today.level && typeof currentStats.xp === "number") {
    today.level = getLevelFromXP(currentStats.xp);
  }

  return {
    id,
    title,
    memoryType: type,
    eventDate,
    achievementName,
    icon: icon || "📸",
    description,
    pastStats: past,
    currentStats: today
  };
}

/**
 * Fallback parser to reconstruct cumulative stats at a past timestamp.
 */
async function reconstructHistoricalStats(userId, dateLimit) {
  try {
    const limit = new Date(dateLimit);

    const xpAggregate = await prisma.xPTransaction.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        createdAt: { lte: limit }
      }
    });
    const cumulativeXP = xpAggregate._sum.amount || 0;
    const level = getLevelFromXP(cumulativeXP);

    const tasksCompleted = await prisma.roadmapTask.count({
      where: {
        milestone: { phase: { roadmap: { userId } } },
        isCompleted: true,
        updatedAt: { lte: limit }
      }
    });

    const submissions = await prisma.submission.findMany({
      where: {
        session: { userId },
        status: "ACCEPTED",
        createdAt: { lte: limit }
      },
      select: { problemId: true }
    });
    const uniqueProblems = new Set(submissions.map(s => s.problemId));
    const problemsSolved = uniqueProblems.size;

    return {
      level,
      currentStreak: 0, 
      tasksCompleted,
      problemsSolved
    };
  } catch (err) {
    console.error("Failed to reconstruct historical stats:", err);
    return { level: 1, currentStreak: 0, tasksCompleted: 0, problemsSolved: 0 };
  }
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
