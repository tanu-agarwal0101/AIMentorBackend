import prisma from "../utils/prisma.js";
import { getLevelInfo, getUserStatsSnapshot, processEvent, getUserShowcase, updateUserShowcase } from "../services/achievementService.js";

/**
 * GET /api/achievements
 * Fetches all achievements, active badge stages, up next, timeline events, mentor recognition cards, and celebrations.
 */
export const getAchievementsDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        badges: true,
        achievements: {
          include: {
            achievement: true
          }
        },
        timelineEvents: {
          orderBy: { eventDate: "desc" }
        },
        mentorRecognitions: {
          orderBy: { generatedAt: "desc" },
          take: 3
        },
        milestoneCelebrations: {
          where: { isCelebrated: false },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const levelInfo = getLevelInfo(user.xp);

    const acceptedDates = await prisma.submission.findMany({
      where: { session: { userId }, status: "ACCEPTED" },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" }
    });

    let currentStreak = 0;
    if (acceptedDates.length > 0) {
      const uniqueDays = [...new Set(acceptedDates.map(d => d.createdAt.toISOString().split('T')[0]))];
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const currentDateStr = uniqueDays[0];

      if (currentDateStr === today || currentDateStr === yesterday) {
        currentStreak = 1;
        let checkDate = new Date(currentDateStr);
        for (let i = 1; i < uniqueDays.length; i++) {
          checkDate.setDate(checkDate.getDate() - 1);
          const expectedDateStr = checkDate.toISOString().split('T')[0];
          if (uniqueDays[i] === expectedDateStr) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    const stats = {
      tasksCompleted: user.lifetimeTasksCompleted,
      problemsSolved: user.lifetimeProblemsSolved,
      projectsBuilt: user.lifetimeProjectsBuilt,
      hoursLearned: Math.round((user.lifetimeLearningMinutes || 0) / 60 * 10) / 10,
      currentStreak
    };

    const badgeStages = await prisma.badgeStage.findMany({
      orderBy: { stageOrder: "asc" }
    });

    const badgeTypes = ["STREAK", "CODING", "BUILDER"];
    for (const type of badgeTypes) {
      const userBadge = user.badges.find(b => b.badgeType === type);
      if (!userBadge) {
        const newBadge = await prisma.badge.upsert({
          where: { userId_badgeType: { userId, badgeType: type } },
          create: {
            userId,
            badgeType: type,
            currentStage: 1
          },
          update: {}
        });
        user.badges.push(newBadge);
      }
    }

    const badgesData = badgeTypes.map(type => {
      const userBadge = user.badges.find(b => b.badgeType === type);
      const activeStageOrder = userBadge ? userBadge.currentStage : 1;
      
      const typeStages = badgeStages.filter(s => s.badgeType === type);
      const stage1 = typeStages.find(s => s.stageOrder === 1);
      const stage1Requirement = stage1 ? stage1.requirement : 0;

      let currentMetricVal = 0;
      if (type === "STREAK") currentMetricVal = stats.currentStreak;
      else if (type === "CODING") currentMetricVal = stats.problemsSolved;
      else if (type === "BUILDER") currentMetricVal = stats.tasksCompleted;

      const isUnlocked = currentMetricVal >= stage1Requirement;

      let currentStage, nextStage, requirement;
      if (!isUnlocked) {
        currentStage = stage1 || typeStages[0];
        nextStage = null;
        requirement = stage1Requirement;
      } else {
        currentStage = typeStages.find(s => s.stageOrder === activeStageOrder) || typeStages[0];
        nextStage = typeStages.find(s => s.stageOrder === activeStageOrder + 1);
        requirement = nextStage ? nextStage.requirement : currentStage.requirement;
      }

      const progressPercent = requirement > 0 ? Math.min(Math.round((currentMetricVal / requirement) * 100), 100) : 100;

      return {
        id: userBadge?.id,
        badgeType: type,
        currentStage: activeStageOrder,
        stageName: currentStage ? currentStage.name : "Apprentice",
        icon: currentStage ? currentStage.icon : "🎖️",
        description: currentStage ? currentStage.description : "",
        progress: currentMetricVal,
        nextStageRequirement: requirement,
        nextStageName: nextStage ? nextStage.name : null,
        progressPercent,
        isMaxed: isUnlocked && !nextStage,
        isUnlocked
      };
    });

    const achievements = await prisma.achievement.findMany({
      where: {
        OR: [
          { visibility: "PUBLIC" },
          { visibility: "HIDDEN", progressions: { some: { userId, isUnlocked: true } } }
        ]
      }
    });

    const progressMap = new Map(user.achievements.map(p => [p.achievementId, p]));

    const achievementsList = achievements.map(ach => {
      const prog = progressMap.get(ach.id);
      const currentProgress = prog ? prog.currentProgress : 0;
      const isUnlocked = prog ? prog.isUnlocked : false;
      const unlockedAt = prog ? prog.unlockedAt : null;
      const progressPercent = ach.maxProgress > 0 ? Math.min(Math.round((currentProgress / ach.maxProgress) * 100), 100) : 0;

      return {
        id: ach.id,
        title: ach.title,
        description: ach.description,
        category: ach.category,
        visibility: ach.visibility,
        icon: ach.icon,
        xpReward: ach.xpReward,
        currentProgress,
        maxProgress: ach.maxProgress,
        progressPercent,
        isUnlocked,
        unlockedAt
      };
    });

    const upNext = achievementsList
      .filter(item => !item.isUnlocked && item.visibility === "PUBLIC")
      .sort((a, b) => b.progressPercent - a.progressPercent) 
      .slice(0, 4);

    const timelineEvents = [...user.timelineEvents];
    const joinedExists = timelineEvents.some(e => e.category === "SYSTEM" && e.title.includes("Joined"));
    if (!joinedExists) {
      timelineEvents.push({
        id: "joined-milestone",
        userId,
        title: "Joined AI Mentor",
        description: "Began your journey toward master-level software engineering.",
        icon: "📍",
        category: "SYSTEM",
        type: "ROADMAP",
        metadata: null,
        eventDate: user.createdAt,
        createdAt: user.createdAt
      });
    }

    timelineEvents.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

    let mentorCards = [...user.mentorRecognitions];
    if (mentorCards.length === 0) {
      const messages = [];
      if (stats.currentStreak > 0) {
        messages.push({
          id: "def-streak",
          message: `You've maintained a daily coding streak of ${stats.currentStreak} day${stats.currentStreak > 1 ? "s" : ""}. That's ${stats.currentStreak} consecutive days of taking action and reinforcing your coding habits.`,
          relatedAchievement: "Consistency"
        });
      }

      if (stats.problemsSolved > 0) {
        messages.push({
          id: "def-solved",
          message: `You've conquered ${stats.problemsSolved} coding problems in the Arena. Each solved challenge is a solid step toward algorithmic fluency.`,
          relatedAchievement: "Algorithm Mastery"
        });
      }

      if (messages.length === 0) {
        messages.push({
          id: "def-generic",
          message: `Your coding journey started today. You are currently at Level 1 with 0 tasks and 0 challenges solved. Complete your first roadmap task to kick off your story!`,
          relatedAchievement: "First Steps"
        });
      }

      mentorCards = messages.map((m, idx) => ({
        id: m.id,
        userId,
        message: m.message,
        relatedAchievement: m.relatedAchievement,
        generatedAt: new Date(Date.now() - idx * 1000),
        createdAt: new Date()
      }));
    }

    const totalAchievementsCount = user.achievements.filter(p => p.isUnlocked).length;
    const daysSinceJoined = Math.max(1, Math.ceil((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

    const showcaseData = await getUserShowcase(userId);
    const sanitizedShowcase = showcaseData.map(item => {
      const sanitized = {
        id: item.id,
        userId: item.userId,
        type: item.type,
        displayOrder: item.displayOrder,
        createdAt: item.createdAt,
      };
      if (item.achievement) {
        sanitized.achievement = {
          id: item.achievement.id,
          title: item.achievement.title,
          description: item.achievement.description,
          category: item.achievement.category,
          visibility: item.achievement.visibility,
          icon: item.achievement.icon,
          xpReward: item.achievement.xpReward,
        };
      }
      if (item.badge) {
        const typeStages = badgeStages.filter(s => s.badgeType === item.badge.badgeType);
        const currentStage = typeStages.find(s => s.stageOrder === item.badge.currentStage) || typeStages[0];

        sanitized.badge = {
          id: item.badge.id,
          userId: item.badge.userId,
          badgeType: item.badge.badgeType,
          currentStage: item.badge.currentStage,
          unlockedAt: item.badge.unlockedAt,
          stageName: currentStage ? currentStage.name : "Apprentice",
          icon: currentStage ? currentStage.icon : "🎖️",
          description: currentStage ? currentStage.description : "",
        };
      }
      return sanitized;
    });

    const allHiddenCount = await prisma.achievement.count({
      where: { visibility: "HIDDEN" }
    });
    const unlockedHiddenCount = achievementsList.filter(a => a.visibility === "HIDDEN" && a.isUnlocked).length;

    return res.status(200).json({
      levelInfo,
      stats: {
        ...stats,
        totalAchievementsEarned: totalAchievementsCount
      },
      badges: badgesData,
      upNext,
      timelineEvents,
      mentorRecognitions: mentorCards,
      pendingCelebrations: user.milestoneCelebrations,
      userJoinedDate: user.createdAt,
      daysSinceJoined,
      achievements: achievementsList,
      showcase: sanitizedShowcase,
      secretStats: {
        discovered: unlockedHiddenCount,
        total: allHiddenCount
      }
    });

  } catch (error) {
    console.error("Error in getAchievementsDashboard:", error);
    return res.status(500).json({ error: "Failed to retrieve achievements data." });
  }
};

/**
 * POST /api/achievements/celebrate/:celebrationId
 * Marks a celebration as completed (isCelebrated = true).
 */
export const markCelebrated = async (req, res) => {
  try {
    const userId = req.user.id;
    const { celebrationId } = req.params;

    const celebration = await prisma.milestoneCelebration.findFirst({
      where: { id: celebrationId, userId }
    });

    if (!celebration) {
      return res.status(404).json({ error: "Celebration record not found." });
    }

    await prisma.milestoneCelebration.update({
      where: { id: celebrationId },
      data: { isCelebrated: true }
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Error in markCelebrated:", error);
    return res.status(500).json({ error: "Failed to mark celebration completed." });
  }
};

/**
 * POST /api/achievements/test-trigger
 * Sandbox helper to trigger dummy events for debugging purposes.
 */
export const testTriggerEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventType, metadata } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: "Missing required parameter: eventType" });
    }

    console.log(`[TEST TRIGGER] Running test trigger for event: ${eventType} and user: ${userId}`);
    await processEvent(userId, eventType, metadata || {});

    return res.status(200).json({ success: true, message: `Event '${eventType}' processed successfully.` });

  } catch (error) {
    console.error("Error in testTriggerEvent:", error);
    return res.status(500).json({ error: "Failed to run test event trigger." });
  }
};

export const getShowcase = async (req, res) => {
  try {
    const userId = req.user.id;
    const showcaseData = await getUserShowcase(userId);
    const badgeStages = await prisma.badgeStage.findMany({
      orderBy: { stageOrder: "asc" }
    });

    const sanitized = showcaseData.map(item => {
      const sanitizedItem = {
        id: item.id,
        userId: item.userId,
        type: item.type,
        displayOrder: item.displayOrder,
        createdAt: item.createdAt,
      };
      if (item.achievement) {
        sanitizedItem.achievement = {
          id: item.achievement.id,
          title: item.achievement.title,
          description: item.achievement.description,
          category: item.achievement.category,
          visibility: item.achievement.visibility,
          icon: item.achievement.icon,
          xpReward: item.achievement.xpReward,
        };
      }
      if (item.badge) {
        const typeStages = badgeStages.filter(s => s.badgeType === item.badge.badgeType);
        const currentStage = typeStages.find(s => s.stageOrder === item.badge.currentStage) || typeStages[0];

        sanitizedItem.badge = {
          id: item.badge.id,
          userId: item.badge.userId,
          badgeType: item.badge.badgeType,
          currentStage: item.badge.currentStage,
          unlockedAt: item.badge.unlockedAt,
          stageName: currentStage ? currentStage.name : "Apprentice",
          icon: currentStage ? currentStage.icon : "🎖️",
          description: currentStage ? currentStage.description : "",
        };
      }
      return sanitizedItem;
    });

    return res.status(200).json(sanitized);
  } catch (error) {
    console.error("Error in getShowcase controller:", error);
    return res.status(500).json({ error: "Failed to retrieve showcase." });
  }
};

export const updateShowcase = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pins } = req.body; 

    if (!Array.isArray(pins)) {
      return res.status(400).json({ error: "Invalid request payload. Expected 'pins' array." });
    }

    await updateUserShowcase(userId, pins);
    return res.status(200).json({ success: true, message: "Showcase shelf updated successfully." });
  } catch (error) {
    console.error("Error in updateShowcase controller:", error);
    return res.status(400).json({ error: error.message || "Failed to update showcase." });
  }
};
