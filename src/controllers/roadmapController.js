import prisma from "../utils/prisma.js";
import { generateRoadmap } from "../services/roadmapGeneratorService.js";
import { editRoadmap } from "../services/roadmapEditorService.js";

/**
 * Creates a new adaptive roadmap using Gemini and saves it in the database.
 */
export async function createRoadmap(req, res) {
  try {
    const userId = req.user.id;
    const { goal, currentLevel, focusArea, weeklyHours, learningStyle, targetDeadline, notes } = req.body;

    if (!goal || !currentLevel || !focusArea) {
      return res.status(400).json({ error: "Goal, current level, and focus area are required." });
    }

    const roadmapData = await generateRoadmap({
      goal,
      currentLevel,
      focusArea,
      weeklyHours: parseInt(weeklyHours) || 5,
      learningStyle,
      notes
    });
    let totalTasks = 0;
    roadmapData.phases.forEach(p => {
      p.milestones.forEach(m => {
        totalTasks += m.tasks.length;
      });
    });

    const newRoadmap = await prisma.roadmap.create({
      data: {
        userId,
        title: roadmapData.title,
        description: roadmapData.description,
        currentLevel,
        focusArea,
        weeklyHours: parseInt(weeklyHours) || 5,
        learningStyle: learningStyle || "Project-based",
        targetDeadline: targetDeadline ? new Date(targetDeadline) : null,
        totalTasks,
        completedTasks: 0,
        progressPercentage: 0.0,
        currentFocus: roadmapData.currentFocus || "",
        aiInsights: roadmapData.aiInsights || [],
        recommendedArenaTopics: roadmapData.recommendedArenaTopics || [],
        status: "active",
        phases: {
          create: roadmapData.phases.map((phase, pIdx) => ({
            title: phase.title,
            duration: phase.duration,
            order: phase.order || pIdx + 1,
            milestones: {
              create: phase.milestones.map((milestone, mIdx) => ({
                title: milestone.title,
                order: milestone.order || mIdx + 1,
                isCompleted: false,
                tasks: {
                  create: milestone.tasks.map((task, tIdx) => ({
                    title: task.title,
                    description: task.description,
                    durationMins: task.durationMins || 45,
                    arenaTopic: task.arenaTopic || null,
                    sourceType: task.sourceType || "roadmap",
                    order: task.order || tIdx + 1,
                    isCompleted: false
                  }))
                }
              }))
            }
          }))
        }
      },
      include: {
        phases: {
          include: {
            milestones: {
              include: {
                tasks: true
              }
            }
          }
        }
      }
    });

    return res.status(201).json(newRoadmap);
  } catch (err) {
    console.error("Failed to create roadmap:", err);
    return res.status(500).json({ error: "Failed to generate roadmap: " + err.message });
  }
}

/**
 * Lists all roadmaps associated with the authenticated user.
 */
export async function listRoadmaps(req, res) {
  try {
    const userId = req.user.id;
    const roadmaps = await prisma.roadmap.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" }
    });
    return res.status(200).json(roadmaps);
  } catch (err) {
    console.error("Failed to list roadmaps:", err);
    return res.status(500).json({ error: "Failed to fetch roadmaps list." });
  }
}

/**
 * Returns detailed nested phases, milestones, and tasks for a specific roadmap.
 */
export async function getRoadmapDetail(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const roadmap = await prisma.roadmap.findFirst({
      where: { id, userId },
      include: {
        phases: {
          orderBy: { order: "asc" },
          include: {
            milestones: {
              orderBy: { order: "asc" },
              include: {
                tasks: {
                  orderBy: { order: "asc" }
                }
              }
            }
          }
        }
      }
    });

    if (!roadmap) {
      return res.status(404).json({ error: "Roadmap path not found." });
    }

    return res.status(200).json(roadmap);
  } catch (err) {
    console.error("Failed to get roadmap details:", err);
    return res.status(500).json({ error: "Failed to fetch roadmap details." });
  }
}

/**
 * Updates status of a roadmap (e.g. active, paused, archived).
 */
export async function updateRoadmapStatus(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "paused", "archived", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    const updated = await prisma.roadmap.updateMany({
      where: { id, userId },
      data: { status }
    });

    if (updated.count === 0) {
      return res.status(404).json({ error: "Roadmap not found or unauthorized." });
    }

    return res.status(200).json({ message: `Roadmap status updated to ${status}.` });
  } catch (err) {
    console.error("Failed to update status:", err);
    return res.status(500).json({ error: "Failed to update roadmap status." });
  }
}

/**
 * Toggle task completion and updates corresponding milestone and roadmap progress.
 */
export async function toggleTaskCompletion(req, res) {
  try {
    const userId = req.user.id;
    const { taskId } = req.params;
    const { isCompleted, notes } = req.body;

    const task = await prisma.roadmapTask.findFirst({
      where: { id: taskId },
      include: {
        milestone: {
          include: {
            phase: {
              include: {
                roadmap: true
              }
            }
          }
        }
      }
    });

    if (!task || task.milestone.phase.roadmap.userId !== userId) {
      return res.status(404).json({ error: "Task not found or unauthorized." });
    }

    const roadmapId = task.milestone.phase.roadmap.id;

    await prisma.roadmapTask.update({
      where: { id: taskId },
      data: {
        isCompleted: !!isCompleted,
        notes: notes !== undefined ? notes : task.notes
      }
    });

    const parentMilestoneId = task.milestoneId;
    const siblingTasks = await prisma.roadmapTask.findMany({
      where: { milestoneId: parentMilestoneId }
    });
    
    const milestoneCompleted = siblingTasks.length > 0 && siblingTasks.every(t => t.isCompleted);
    await prisma.milestone.update({
      where: { id: parentMilestoneId },
      data: { isCompleted: milestoneCompleted }
    });

    const allRoadmapTasks = await prisma.roadmapTask.findMany({
      where: {
        milestone: {
          phase: {
            roadmapId: roadmapId
          }
        }
      }
    });

    const totalTasks = allRoadmapTasks.length;
    const completedTasks = allRoadmapTasks.filter(t => t.isCompleted).length;
    const progressPercentage = totalTasks > 0 ? parseFloat(((completedTasks / totalTasks) * 100).toFixed(1)) : 0.0;

    const updatedRoadmap = await prisma.roadmap.update({
      where: { id: roadmapId },
      data: {
        totalTasks,
        completedTasks,
        progressPercentage,
        status: progressPercentage === 100 ? "completed" : "active"
      }
    });

    return res.status(200).json({
      taskId,
      isCompleted: !!isCompleted,
      milestoneId: parentMilestoneId,
      milestoneCompleted,
      completedTasks,
      totalTasks,
      progressPercentage
    });
  } catch (err) {
    console.error("Failed to toggle task:", err);
    return res.status(500).json({ error: "Failed to update task completion." });
  }
}

/**
 * Restructures a roadmap conversationally via Gemini prompt, maintaining completed tasks.
 */
export async function conversationallyEditRoadmap(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { instruction } = req.body;

    if (!instruction || !instruction.trim()) {
      return res.status(400).json({ error: "Instruction instruction is required." });
    }

    const existingRoadmap = await prisma.roadmap.findFirst({
      where: { id, userId },
      include: {
        phases: {
          include: {
            milestones: {
              include: {
                tasks: true
              }
            }
          }
        }
      }
    });

    if (!existingRoadmap) {
      return res.status(404).json({ error: "Roadmap not found." });
    }

    const restructuredMap = await editRoadmap(existingRoadmap, instruction);

    await prisma.$transaction(async (tx) => {
      await tx.phase.deleteMany({
        where: { roadmapId: id }
      });

      for (let pIdx = 0; pIdx < restructuredMap.phases.length; pIdx++) {
        const phase = restructuredMap.phases[pIdx];
        await tx.phase.create({
          data: {
            roadmapId: id,
            title: phase.title,
            duration: phase.duration,
            order: phase.order || pIdx + 1,
            milestones: {
              create: phase.milestones.map((milestone, mIdx) => ({
                title: milestone.title,
                order: milestone.order || mIdx + 1,
                isCompleted: !!milestone.isCompleted,
                tasks: {
                  create: milestone.tasks.map((task, tIdx) => ({
                    title: task.title,
                    description: task.description,
                    durationMins: task.durationMins || 45,
                    arenaTopic: task.arenaTopic || null,
                    sourceType: task.sourceType || "roadmap",
                    order: task.order || tIdx + 1,
                    isCompleted: !!task.isCompleted,
                    notes: task.notes || null
                  }))
                }
              }))
            }
          }
        });
      }

      const allTasks = [];
      restructuredMap.phases.forEach(p => {
        p.milestones.forEach(m => {
          allTasks.push(...m.tasks);
        });
      });

      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter(t => t.isCompleted).length;
      const progressPercentage = totalTasks > 0 ? parseFloat(((completedTasks / totalTasks) * 100).toFixed(1)) : 0.0;

      await tx.roadmap.update({
        where: { id },
        data: {
          title: restructuredMap.title || existingRoadmap.title,
          description: restructuredMap.description || existingRoadmap.description,
          currentFocus: restructuredMap.currentFocus || existingRoadmap.currentFocus,
          totalTasks,
          completedTasks,
          progressPercentage
        }
      });
    });

    const updatedDetail = await prisma.roadmap.findFirst({
      where: { id, userId },
      include: {
        phases: {
          orderBy: { order: "asc" },
          include: {
            milestones: {
              orderBy: { order: "asc" },
              include: {
                tasks: {
                  orderBy: { order: "asc" }
                }
              }
            }
          }
        }
      }
    });

    return res.status(200).json({
      ...updatedDetail,
      _isFallback: restructuredMap._isFallback,
      _error: restructuredMap._error
    });
  } catch (err) {
    console.error("Failed to edit roadmap conversationally:", err);
    return res.status(500).json({ error: "Failed to edit roadmap: " + err.message });
  }
}
