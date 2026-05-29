import prisma from "../utils/prisma.js";
import { getAiClient, generateContentWithRetry } from "./geminiService.js";
import { ACHIEVEMENTS_SEED, BADGE_STAGES_SEED } from "../utils/constants.js";


/**
 * Automatically seeds achievements and badge stages in the database if empty or missing.
 */
export async function seedAchievementsAndBadges() {
  try {
    console.log("[SEEDING] Seeding/Syncing achievements...");
    for (const ach of ACHIEVEMENTS_SEED) {
      await prisma.achievement.upsert({
        where: { title: ach.title },
        update: {
          description: ach.description,
          category: ach.category,
          rarity: ach.rarity,
          visibility: ach.visibility,
          icon: ach.icon,
          xpReward: ach.xpReward,
          maxProgress: ach.maxProgress,
          hiddenCriteria: ach.hiddenCriteria || null
        },
        create: {
          title: ach.title,
          description: ach.description,
          category: ach.category,
          rarity: ach.rarity,
          visibility: ach.visibility,
          icon: ach.icon,
          xpReward: ach.xpReward,
          maxProgress: ach.maxProgress,
          hiddenCriteria: ach.hiddenCriteria || null
        }
      });
    }

    const existingBadgeStagesCount = await prisma.badgeStage.count();
    if (existingBadgeStagesCount === 0) {
      console.log("[SEEDING] Seeding static badge stages...");
      await prisma.badgeStage.createMany({
        data: BADGE_STAGES_SEED
      });
      console.log(`[SEEDING] Successfully seeded ${BADGE_STAGES_SEED.length} badge stages.`);
    }
  } catch (err) {
    console.error("Failed to seed achievements or badges:", err);
  }
}

/**
 * Calculates level details from cumulative XP.
 * Level formula: Required XP to level up from L-1 to L is 500 + (L-1) * 250.
 *
 * @param {number} totalXP - User's current total XP.
 * @returns {object} Calculated level metrics.
 */
export function getLevelInfo(totalXP) {
  let level = 1;
  let xpForCurrentLevel = 0;
  let xpForNextLevel = 500;

  while (totalXP >= xpForNextLevel) {
    level++;
    xpForCurrentLevel = xpForNextLevel;
    xpForNextLevel = xpForCurrentLevel + 500 + (level - 1) * 250;
  }

  const xpInCurrentLevel = totalXP - xpForCurrentLevel;
  const xpRequiredForNextLevel = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = Math.min(Math.round((xpInCurrentLevel / xpRequiredForNextLevel) * 100), 100);
  const xpUntilNextLevel = xpForNextLevel - totalXP;

  return {
    level,
    xpInCurrentLevel,
    xpRequiredForNextLevel,
    progressPercent,
    xpUntilNextLevel,
    totalXP
  };
}

/**
 * Award XP to a user, logging it in XPTransaction and checking for Level Up.
 */
export async function awardXP(userId, amount, source, metadata = {}) {
  if (amount <= 0) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, name: true }
    });

    if (!user) return null;

    const oldXP = user.xp;
    const newXP = oldXP + amount;
    const oldLevelInfo = getLevelInfo(oldXP);
    const newLevelInfo = getLevelInfo(newXP);

    const transaction = await prisma.xPTransaction.create({
      data: {
        userId,
        amount,
        source,
        metadata
      }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { xp: newXP }
    });

    console.log(`[XP AWARDED] +${amount} XP to User ${userId}. Source: ${source}. (Total: ${newXP})`);

    if (newLevelInfo.level > oldLevelInfo.level) {
      console.log(`[LEVEL UP] User ${userId} evolved from Level ${oldLevelInfo.level} to ${newLevelInfo.level}!`);
      
      const stats = await getUserStatsSnapshot(userId);
      const congratulations = `Level ${newLevelInfo.level} unlocked! You have accumulated ${newLevelInfo.totalXP} XP, completing ${stats.tasksCompleted} tasks and solving ${stats.problemsSolved} coding problems along the way. That is a solid milestone on your developer path!`;

      await prisma.timelineEvent.create({
        data: {
          userId,
          title: `Reached Level ${newLevelInfo.level}`,
          description: `Successfully reached level ${newLevelInfo.level} with ${newXP} total XP!`,
          icon: "⭐",
          category: "LEVEL_UP",
          type: "LEVEL_UP",
          metadata: { level: newLevelInfo.level, totalXP: newXP, timestamp: new Date() }
        }
      });

      await prisma.milestoneCelebration.create({
        data: {
          userId,
          achievementName: `Level ${newLevelInfo.level} Unlocked`,
          achievementIcon: "✨",
          xpEarned: 0, 
          statsSnapshot: stats,
          mentorMessage: congratulations,
          isCelebrated: false
        }
      });

      queueMentorRecognitionMessage(userId, `Level ${newLevelInfo.level} Unlocked`, stats);
    }

    return transaction;
  } catch (err) {
    console.error("Failed to award XP:", err);
    return null;
  }
}

/**
 * Returns a quick snapshot of user growth metrics.
 */
export async function getUserStatsSnapshot(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        lifetimeTasksCompleted: true,
        lifetimeProblemsSolved: true,
        lifetimeProjectsBuilt: true,
        lifetimeLearningMinutes: true
      }
    });

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

    return {
      tasksCompleted: user?.lifetimeTasksCompleted || 0,
      problemsSolved: user?.lifetimeProblemsSolved || 0,
      projectsBuilt: user?.lifetimeProjectsBuilt || 0,
      hoursLearned: Math.round((user?.lifetimeLearningMinutes || 0) / 60 * 10) / 10,
      currentStreak
    };
  } catch (error) {
    console.error("Error creating user stats snapshot:", error);
    return { tasksCompleted: 0, problemsSolved: 0, projectsBuilt: 0, hoursLearned: 0, currentStreak: 0 };
  }
}

/**
 * Queue out-of-band asynchronous AI recognition card generation using Gemini.
 * Never awaits this inside request threads to maintain fast responsiveness.
 */
function queueMentorRecognitionMessage(userId, contextTitle, statsSnapshot) {
  if (!process.env.GEMINI_API_KEY) {
    console.log("[AI MENTOR] No Gemini API key found, skipping background generation.");
    return;
  }

  (async () => {
    try {
      console.log(`[AI MENTOR] Background queue starting AI message for user ${userId} context: ${contextTitle}...`);
      
      const systemInstruction = `You are Cody, a supportive AI personal coding mentor. Write a highly personalized, short (1-2 sentences) growth message praising the user's progress.
CRITICAL MENTOR RULE: Never write generic praise (e.g., "Amazing work!", "Great job!", "Keep going!", "You're doing amazing!"). These feel fake.
Instead, you MUST include at least one specific piece of stats-based evidence from the user's context in your message. Specifically:
- Use an exact count (e.g., "You've solved 50 coding problems..."),
- A percentage progress,
- An active streak,
- A progress comparison, or
- A performance multiplier (e.g., "That's 5x more than your first week!").
Focus on how far they have come, using the numbers in their stats to show concrete, mathematical growth. Speak directly as their teacher.`;
      
      const userPrompt = `
      User Context:
      - Latest Achievement: ${contextTitle}
      - Solved Coding Challenges: ${statsSnapshot.problemsSolved}
      - Completed Roadmap Tasks: ${statsSnapshot.tasksCompleted}
      - Active Daily Streak: ${statsSnapshot.currentStreak} days
      - Total Hours Invested: ${statsSnapshot.hoursLearned} hours
      
      Compose a warm, inspiring 1-2 sentence mentor feedback statement conforming strictly to the CRITICAL MENTOR RULE. Keep it concise.`;

      const aiResponse = await generateContentWithRetry({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        systemInstruction,
        temperature: 0.8
      });

      const messageText = aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (messageText) {
        await prisma.mentorRecognition.create({
          data: {
            userId,
            message: messageText,
            relatedAchievement: contextTitle
          }
        });
        console.log(`[AI MENTOR] Generated & cached custom mentor message for User ${userId}`);
      }
    } catch (err) {
      console.error("[AI MENTOR] Background AI message generation failed:", err);
    }
  })();
}

/**
 * Decoupled event processor. Triggered by system event loggers.
 */
export async function processEvent(userId, eventType, metadata = {}) {
  try {
    let incrementField = {};
    let isMetricUpdate = false;
    let baseXP = 0;
    let xpDetails = {};

    if (eventType === "task_completed") {
      incrementField = { lifetimeTasksCompleted: { increment: 1 } };
      isMetricUpdate = true;
      baseXP = 15;
      xpDetails = { taskTitle: metadata?.taskTitle || "Task Completion" };
    } else if (eventType === "problem_completed") {
      incrementField = { lifetimeProblemsSolved: { increment: 1 } };
      isMetricUpdate = true;
      baseXP = 40;
      xpDetails = { problemTitle: metadata?.problemTitle || "Coding Problem", sessionId: metadata?.sessionId };
    } else if (eventType === "milestone_completed") {
      baseXP = 50;
      xpDetails = { milestoneTitle: metadata?.milestoneTitle || "Milestone Completion", milestoneId: metadata?.milestoneId };

      const completedMilestonesCount = await prisma.milestone.count({
        where: {
          phase: { roadmap: { userId } },
          isCompleted: true
        }
      });
      await prisma.timelineEvent.create({
        data: {
          userId,
          title: `Completed ${metadata?.milestoneTitle || "Milestone"}`,
          description: `Finished all tasks in this learning block and earned 50 XP!`,
          icon: "⛳",
          category: "ROADMAP",
          type: "ROADMAP",
          metadata: {
            milestoneId: metadata?.milestoneId,
            milestoneTitle: metadata?.milestoneTitle,
            xpReward: 50
          }
        }
      });

      if (completedMilestonesCount === 1) {
        const statsSnapshot = await getUserStatsSnapshot(userId);
        const mentorMessageText = `Milestone "${metadata?.milestoneTitle || "Phase"}" completed! You've successfully finished your very first learning milestone. With ${statsSnapshot.tasksCompleted} tasks done and ${statsSnapshot.problemsSolved} coding problems solved, you've officially built a solid foundation.`;

        await prisma.milestoneCelebration.create({
          data: {
            userId,
            achievementName: `First Milestone Completed!`,
            achievementIcon: "⛳",
            xpEarned: 50,
            statsSnapshot,
            mentorMessage: mentorMessageText,
            isCelebrated: false
          }
        });
      }
    } else if (eventType === "roadmap_completed") {
      baseXP = 500;
      xpDetails = { roadmapTitle: metadata?.roadmapTitle || "Roadmap Completed", roadmapId: metadata?.roadmapId };

      await prisma.timelineEvent.create({
        data: {
          userId,
          title: `Completed ${metadata?.roadmapTitle || "Path"}`,
          description: `Successfully finished all milestones and tasks in this custom path!`,
          icon: "🎓",
          category: "ROADMAP",
          type: "ROADMAP",
          metadata: {
            roadmapId: metadata?.roadmapId,
            roadmapTitle: metadata?.roadmapTitle,
            xpReward: 500
          }
        }
      });

      const statsSnapshot = await getUserStatsSnapshot(userId);
      const mentorMessageText = `Roadmap "${metadata?.roadmapTitle || "Path"}" completed! You checked off all milestones on this path, contributing to a career total of ${statsSnapshot.tasksCompleted} tasks completed and ${statsSnapshot.hoursLearned} hours learned. That is 100% of this curriculum successfully mastered!`;

      await prisma.milestoneCelebration.create({
        data: {
          userId,
          achievementName: `Roadmap Completed!`,
          achievementIcon: "🎓",
          xpEarned: 500,
          statsSnapshot,
          mentorMessage: mentorMessageText,
          isCelebrated: false
        }
      });
    } else if (eventType === "optimization_improved") {
      baseXP = 25;
      xpDetails = { note: "Optimization Improved" };
    } else if (eventType === "review_generated") {
      baseXP = 20;
      xpDetails = { note: "Interview Review Completed" };
    } else if (eventType === "session_completed") {
      const minutes = parseInt(metadata?.durationMinutes) || 10;
      incrementField = { lifetimeLearningMinutes: { increment: minutes } };
      isMetricUpdate = true;
      baseXP = Math.round(minutes * 1.5);
      xpDetails = { durationMinutes: minutes };
    }

    if (isMetricUpdate) {
      await prisma.user.update({
        where: { id: userId },
        data: incrementField
      });
    }

    if (baseXP > 0) {
      await awardXP(userId, baseXP, "TASK_COMPLETED", xpDetails);
    }
    const stats = await getUserStatsSnapshot(userId);

    await checkAndProgressAchievements(userId, stats);
    await checkAndEvolveBadges(userId, stats);
    await evaluateHiddenAchievements(userId, stats);

  } catch (err) {
    console.error("Error in processEvent achievement controller:", err);
  }
}

/**
 * Checks all active achievements for progression updates or unlocks.
 */
async function checkAndProgressAchievements(userId, stats) {
  try {
    const achievements = await prisma.achievement.findMany();
    
    for (const ach of achievements) {
      let currentVal = 0;
      
      if (ach.category === "STREAK") {
        currentVal = stats.currentStreak;
      } else if (ach.category === "CODING") {
        currentVal = stats.problemsSolved;
      } else if (ach.category === "ROADMAP") {
        currentVal = stats.tasksCompleted;
      } else if (ach.category === "PROJECT") {
        currentVal = stats.projectsBuilt;
      } else if (ach.category === "LEARNING") {
        currentVal = Math.round(stats.hoursLearned);
      }
      let progress = await prisma.achievementProgress.findUnique({
        where: { userId_achievementId: { userId, achievementId: ach.id } }
      });

      if (!progress) {

        progress = await prisma.achievementProgress.upsert({
          where: { userId_achievementId: { userId, achievementId: ach.id } },
          create: {
            userId,
            achievementId: ach.id,
            currentProgress: 0,
            isUnlocked: false
          },
          update: {}
        });
      }

      if (progress.isUnlocked) continue; 

      const calculatedProgressVal = Math.min(currentVal, ach.maxProgress);
      const triggersUnlock = calculatedProgressVal >= ach.maxProgress;

      const updateResult = await prisma.achievementProgress.updateMany({
        where: {
          id: progress.id,
          isUnlocked: false
        },
        data: {
          currentProgress: calculatedProgressVal,
          isUnlocked: triggersUnlock,
          unlockedAt: triggersUnlock ? new Date() : null
        }
      });

      if (triggersUnlock && updateResult.count > 0) {
        console.log(`[ACHIEVEMENT UNLOCKED] '${ach.title}' for User ${userId}`);
        
        await awardXP(userId, ach.xpReward, "ACHIEVEMENT_UNLOCKED", { achievementId: ach.id, achievementTitle: ach.title });
        await prisma.timelineEvent.create({
          data: {
            userId,
            title: ach.title,
            description: ach.description,
            icon: ach.icon,
            category: ach.category,
            type: "ACHIEVEMENT",
            metadata: {
              xpReward: ach.xpReward,
              streak: stats.currentStreak,
              problemsSolved: stats.problemsSolved,
              tasksCompleted: stats.tasksCompleted
            }
          }
        });

        const mentorCongratText = `Unlocked: '${ach.title}'! You earned ${ach.xpReward} XP, pushing your total tasks to ${stats.tasksCompleted} and problems solved to ${stats.problemsSolved}. This marks a significant milestone in your skill progression.`;
        
        await prisma.milestoneCelebration.create({
          data: {
            userId,
            achievementName: ach.title,
            achievementIcon: ach.icon,
            xpEarned: ach.xpReward,
            statsSnapshot: stats,
            mentorMessage: mentorCongratText,
            isCelebrated: false
          }
        });

        queueMentorRecognitionMessage(userId, ach.title, stats);
      }
    }
  } catch (err) {
    console.error("Error in checkAndProgressAchievements:", err);
  }
}

/**
 * Checks badge progression against requirements to unlock the next stage order.
 */
async function checkAndEvolveBadges(userId, stats) {
  try {
    const badgeTypes = ["STREAK", "CODING", "BUILDER"];

    for (const type of badgeTypes) {
      let currentVal = 0;

      if (type === "STREAK") {
        currentVal = stats.currentStreak;
      } else if (type === "CODING") {
        currentVal = stats.problemsSolved;
      } else if (type === "BUILDER") {
        currentVal = stats.tasksCompleted;
      }

      let userBadge = await prisma.badge.findUnique({
        where: { userId_badgeType: { userId, badgeType: type } }
      });

      const stages = await prisma.badgeStage.findMany({
        where: { badgeType: type },
        orderBy: { stageOrder: "asc" }
      });

      if (stages.length === 0) continue;

      if (!userBadge) {
        userBadge = await prisma.badge.upsert({
          where: { userId_badgeType: { userId, badgeType: type } },
          create: {
            userId,
            badgeType: type,
            currentStage: 1
          },
          update: {}
        });
      }

      let qualifiedStageOrder = userBadge.currentStage;
      for (const stage of stages) {
        if (currentVal >= stage.requirement && stage.stageOrder > qualifiedStageOrder) {
          qualifiedStageOrder = stage.stageOrder;
        }
      }

      const didEvolve = qualifiedStageOrder > userBadge.currentStage;

      if (didEvolve) {
        const activeStage = stages.find(s => s.stageOrder === qualifiedStageOrder) || stages[0];

        const updateResult = await prisma.badge.updateMany({
          where: {
            id: userBadge.id,
            currentStage: userBadge.currentStage
          },
          data: {
            currentStage: qualifiedStageOrder,
            unlockedAt: new Date()
          }
        });

        if (updateResult.count > 0) {
          console.log(`[BADGE EVOLVED] User ${userId} evolved ${type} badge to ${activeStage.name} (Stage ${qualifiedStageOrder})!`);

          await awardXP(userId, activeStage.xpReward, "BADGE_EVOLUTION", { badgeType: type, newStage: activeStage.name });

          await prisma.timelineEvent.create({
            data: {
              userId,
              title: `Reached ${activeStage.name} ${type === "BUILDER" ? "Builder Badge" : type === "CODING" ? "Coding Badge" : "Streak"}`,
              description: `Your badge upgraded to Stage ${qualifiedStageOrder}: **${activeStage.name}**!`,
              icon: activeStage.icon,
              category: type,
              type: "STREAK",
              metadata: {
                badgeType: type,
                stageName: activeStage.name,
                stageOrder: qualifiedStageOrder,
                unlockedAt: new Date()
              }
            }
          });

          const badgeMessage = `Evolved your ${type.toLowerCase()} badge to Stage ${qualifiedStageOrder}: **${activeStage.name}**. With your current metrics showing ${currentVal} ${type === "STREAK" ? "days active" : type === "CODING" ? "problems solved" : "tasks completed"}, your skill velocity is outstanding!`;

          await prisma.milestoneCelebration.create({
            data: {
              userId,
              achievementName: `${activeStage.name} Badge Evolved`,
              achievementIcon: activeStage.icon,
              xpEarned: activeStage.xpReward,
              statsSnapshot: stats,
              mentorMessage: badgeMessage,
              isCelebrated: false
            }
          });

          queueMentorRecognitionMessage(userId, `${activeStage.name} Badge Evolved`, stats);
        }
      }
    }
  } catch (err) {
    console.error("Error in checkAndEvolveBadges:", err);
  }
}

/**
 * Evaluates hidden achievements for a user based on their stats
 */
export async function evaluateHiddenAchievements(userId, stats) {
  try {
    const hiddenAchs = await prisma.achievement.findMany({
      where: { visibility: "HIDDEN" }
    });

    const hiddenHandlers = {
      MIDNIGHT_STREAK: (stats, value) => {
        const currentHour = new Date().getHours();
        return currentHour >= 0 && currentHour < 4;
      },
      SPEED_RUNNER: (stats, value) => {
        return stats.tasksCompleted >= value;
      },
      PERFECT_WEEK: (stats, value) => {
        return stats.currentStreak >= value;
      }
    };

    for (const ach of hiddenAchs) {
      if (!ach.hiddenCriteria) continue;
      
      const prog = await prisma.achievementProgress.findUnique({
        where: { userId_achievementId: { userId, achievementId: ach.id } }
      });

      if (prog && prog.isUnlocked) continue;

      const { rule, value } = ach.hiddenCriteria;
      const handler = hiddenHandlers[rule];
      
      if (handler && handler(stats, value)) {
        await prisma.achievementProgress.upsert({
          where: { userId_achievementId: { userId, achievementId: ach.id } },
          create: {
            userId,
            achievementId: ach.id,
            currentProgress: ach.maxProgress,
            isUnlocked: true,
            unlockedAt: new Date()
          },
          update: {
            currentProgress: ach.maxProgress,
            isUnlocked: true,
            unlockedAt: new Date()
          }
        });

        console.log(`[HIDDEN ACHIEVEMENT UNLOCKED] '${ach.title}' for User ${userId}`);
        await awardXP(userId, ach.xpReward, "ACHIEVEMENT_UNLOCKED", { achievementId: ach.id, achievementTitle: ach.title });

        await prisma.timelineEvent.create({
          data: {
            userId,
            title: ach.title,
            description: ach.description,
            icon: ach.icon,
            category: ach.category,
            type: "ACHIEVEMENT",
            metadata: {
              xpReward: ach.xpReward,
              streak: stats.currentStreak,
              problemsSolved: stats.problemsSolved,
              tasksCompleted: stats.tasksCompleted
            }
          }
        });

        const congrats = `Secret Unlocked: '${ach.title}'! You earned ${ach.xpReward} XP. Your stats show ${stats.tasksCompleted} tasks done and ${stats.problemsSolved} coding problems solved. Outstanding discovery!`;

        await prisma.milestoneCelebration.create({
          data: {
            userId,
            achievementName: ach.title,
            achievementIcon: ach.icon,
            xpEarned: ach.xpReward,
            statsSnapshot: stats,
            mentorMessage: congrats,
            isCelebrated: false
          }
        });

        queueMentorRecognitionMessage(userId, ach.title, stats);
      }
    }
  } catch (err) {
    console.error("Error in evaluateHiddenAchievements:", err);
  }
}

/**
 * Gets the user's showcase shelf ordered by displayOrder
 */
export async function getUserShowcase(userId) {
  try {
    const showcases = await prisma.userAchievementShowcase.findMany({
      where: { userId },
      orderBy: { displayOrder: "asc" },
      include: {
        achievement: true,
        badge: true
      }
    });

    const stats = await getUserStatsSnapshot(userId);
    const validShowcases = [];
    const invalidIds = [];

    for (const item of showcases) {
      let isValid = true;
      if (item.achievement) {
        const prog = await prisma.achievementProgress.findFirst({
          where: { userId, achievementId: item.achievement.id }
        });
        if (!prog || !prog.isUnlocked) isValid = false;
      }
      if (item.badge) {
        const stages = await prisma.badgeStage.findMany({ where: { badgeType: item.badge.badgeType } });
        const stage1 = stages.find(s => s.stageOrder === 1);
        let currentVal = 0;
        if (item.badge.badgeType === "STREAK") currentVal = stats.currentStreak;
        else if (item.badge.badgeType === "CODING") currentVal = stats.problemsSolved;
        else if (item.badge.badgeType === "BUILDER") currentVal = stats.tasksCompleted;

        if (currentVal < (stage1 ? stage1.requirement : 0)) isValid = false;
      }

      if (isValid) {
        validShowcases.push(item);
      } else {
        invalidIds.push(item.id);
      }
    }

    if (invalidIds.length > 0) {
      await prisma.userAchievementShowcase.deleteMany({
        where: { id: { in: invalidIds } }
      });
      console.log(`[SHOWCASE CLEANUP] Silently removed ${invalidIds.length} unearned showcase items for User ${userId}`);
    }

    return validShowcases;
  } catch (err) {
    console.error("Error in getUserShowcase:", err);
    return [];
  }
}

/**
 * Updates the user's showcase shelf using delete-then-create transaction
 */
export async function updateUserShowcase(userId, pins) {
  if (pins.length > 4) {
    throw new Error("Maximum 4 showcase items allowed");
  }

  const ids = pins.map(p => `${p.type}-${p.id}`);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate showcase items detected");
  }

  for (const pin of pins) {
    if (pin.type === "ACHIEVEMENT") {
      const ach = await prisma.achievement.findUnique({ where: { id: pin.id } });
      if (!ach) throw new Error(`Achievement with id ${pin.id} not found`);
    } else if (pin.type === "BADGE") {
      const badge = await prisma.badge.findFirst({ where: { id: pin.id, userId } });
      if (!badge) throw new Error(`Badge with id ${pin.id} not found or does not belong to you`);

      const stages = await prisma.badgeStage.findMany({ where: { badgeType: badge.badgeType } });
      const stage1 = stages.find(s => s.stageOrder === 1);
      const stats = await getUserStatsSnapshot(userId);
      let currentVal = 0;
      if (badge.badgeType === "STREAK") currentVal = stats.currentStreak;
      else if (badge.badgeType === "CODING") currentVal = stats.problemsSolved;
      else if (badge.badgeType === "BUILDER") currentVal = stats.tasksCompleted;

      if (currentVal < (stage1 ? stage1.requirement : 0)) {
        throw new Error(`You have not earned the ${badge.badgeType.toLowerCase()} badge yet!`);
      }
    } else {
      throw new Error(`Invalid type ${pin.type}`);
    }
  }

  await prisma.$transaction([
    prisma.userAchievementShowcase.deleteMany({
      where: { userId }
    }),
    prisma.userAchievementShowcase.createMany({
      data: pins.map((p, idx) => ({
        userId,
        type: p.type,
        achievementId: p.type === "ACHIEVEMENT" ? p.id : null,
        badgeId: p.type === "BADGE" ? p.id : null,
        displayOrder: idx
      }))
    })
  ]);

  return true;
}

