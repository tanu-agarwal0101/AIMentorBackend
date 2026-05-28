import prisma from "../utils/prisma.js";

/**
 * GET /api/stats/analytics
 * Returns user analytics like total solved, streak, and accuracy.
 */
export const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    const solvedSessions = await prisma.codingSession.findMany({
      where: { userId, progress: 100 },
      select: { problemId: true },
      distinct: ['problemId']
    });
    const totalSolved = solvedSessions.length;

    const allSubmissions = await prisma.submission.findMany({
      where: { session: { userId } },
      select: { status: true }
    });
    const totalSubmissionsCount = allSubmissions.length;
    const acceptedSubmissionsCount = allSubmissions.filter(s => s.status === "ACCEPTED").length;
    const accuracy = totalSubmissionsCount > 0 
      ? Math.round((acceptedSubmissionsCount / totalSubmissionsCount) * 100) 
      : 0;

    const acceptedDates = await prisma.submission.findMany({
      where: { session: { userId }, status: "ACCEPTED" },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" }
    });

    let activeStreak = 0;
    if (acceptedDates.length > 0) {
      const uniqueDays = [...new Set(acceptedDates.map(d => d.createdAt.toISOString().split('T')[0]))];
      
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      let currentDateStr = uniqueDays[0];
      
      if (currentDateStr === today || currentDateStr === yesterday) {
        activeStreak = 1;
        let checkDate = new Date(currentDateStr);
        
        for (let i = 1; i < uniqueDays.length; i++) {
          checkDate.setDate(checkDate.getDate() - 1);
          const expectedDateStr = checkDate.toISOString().split('T')[0];
          
          if (uniqueDays[i] === expectedDateStr) {
            activeStreak++;
          } else {
            break;
          }
        }
      }
    }

    return res.status(200).json({
      totalSolved,
      accuracy,
      activeStreak,
      totalSubmissions: totalSubmissionsCount
    });

  } catch (error) {
    console.error("Error in getAnalytics:", error);
    return res.status(500).json({ error: "Failed to load analytics." });
  }
};

/**
 * GET /api/stats/active-session
 * Returns the most recent incomplete coding session.
 */
export const getActiveSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const session = await prisma.codingSession.findFirst({
      where: { userId, progress: { lt: 100 } },
      orderBy: { updatedAt: "desc" },
      include: { problem: true }
    });

    if (!session) {
      return res.status(200).json(null);
    }

    return res.status(200).json({
      id: session.id,
      problemTitle: session.problem.title,
      difficulty: session.problem.difficulty,
      mode: session.mode,
      language: session.language,
      progress: session.progress,
      lastActive: session.updatedAt
    });
  } catch (error) {
    console.error("Error in getActiveSession:", error);
    return res.status(500).json({ error: "Failed to load active session." });
  }
};

/**
 * GET /api/stats/activity-feed
 * Returns recent AI interactions and system events.
 */
export const getActivityFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const events = await prisma.systemEvent.findMany({
      where: { 
        userId, 
        eventType: { 
          in: ["hint_requested", "optimization_improved", "problem_completed", "review_generated"] 
        } 
      },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    const formattedEvents = events.map(e => {
      let message = "System interaction recorded.";
      let type = "info";
      
      switch(e.eventType) {
        case "hint_requested":
          const hintTitle = e.metadata?.problemTitle || "recent problem";
          message = `Hint utilization tracked for ${hintTitle}.`;
          type = "hint";
          break;
        case "optimization_improved":
          message = "Optimization speed improved on recently solved problems.";
          type = "success";
          break;
        case "problem_completed":
          const completeTitle = e.metadata?.problemTitle || "a problem";
          message = `Problem ${completeTitle} completed and verified.`;
          type = "success";
          break;
        case "review_generated":
          message = "Interview review generated and archived.";
          type = "info";
          break;
      }

      return {
        id: e.id,
        message,
        type,
        timestamp: e.createdAt
      };
    });

    return res.status(200).json(formattedEvents);
  } catch (error) {
    console.error("Error in getActivityFeed:", error);
    return res.status(500).json({ error: "Failed to load activity feed." });
  }
};
