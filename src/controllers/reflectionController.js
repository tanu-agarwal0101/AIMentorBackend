import prisma from "../utils/prisma.js";
import * as memoryService from "../services/memoryService.js";
import * as recapService from "../services/recapService.js";
import * as journeySummaryService from "../services/journeySummaryService.js";
import * as timeCapsuleService from "../services/timeCapsuleService.js";

export async function getMemories(req, res) {
  try {
    const data = await memoryService.getMemories(req.user.id);
    return res.json(data);
  } catch (error) {
    console.error("Controller getMemories error:", error);
    return res.status(500).json({ error: "Failed to load growth memories." });
  }
}

export async function getMonthlyRecaps(req, res) {
  try {
    const data = await recapService.getMonthlyRecaps(req.user.id);
    return res.json(data);
  } catch (error) {
    console.error("Controller getMonthlyRecaps error:", error);
    return res.status(500).json({ error: "Failed to load monthly learning recaps." });
  }
}

export async function getJourneySummary(req, res) {
  try {
    const data = await journeySummaryService.getJourneySummary(req.user.id);
    return res.json(data);
  } catch (error) {
    console.error("Controller getJourneySummary error:", error);
    return res.status(500).json({ error: "Failed to load journey summary." });
  }
}

export async function getJourneyHistory(req, res) {
  try {
    const data = await journeySummaryService.getJourneyHistory(req.user.id);
    return res.json(data);
  } catch (error) {
    console.error("Controller getJourneyHistory error:", error);
    return res.status(500).json({ error: "Failed to load journey history." });
  }
}

export async function regenerateJourneySummary(req, res) {
  try {
    const type = req.body?.type || "MONTHLY";
    
    await journeySummaryService.regenerateJourneySummary(req.user.id, type);
    return res.json({ message: "Journey summary regeneration queued." });
  } catch (error) {
    console.error("Controller regenerateJourneySummary error:", error);
    const isRateLimit = error.message && error.message.includes("up to date");
    const status = isRateLimit ? 429 : 500;
    const msg = isRateLimit ? error.message : "Failed to trigger journey summary regeneration.";
    return res.status(status).json({ error: msg });
  }
}

export async function getScrapbook(req, res) {
  try {
    const scrapbook = await prisma.milestoneCelebration.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" }
    });
    return res.json(scrapbook);
  } catch (error) {
    console.error("Controller getScrapbook error:", error);
    return res.status(500).json({ error: "Failed to retrieve milestone scrapbook." });
  }
}

export async function getTimeCapsules(req, res) {
  try {
    const data = await timeCapsuleService.getTimeCapsules(req.user.id);
    return res.json(data);
  } catch (error) {
    console.error("Controller getTimeCapsules error:", error);
    return res.status(500).json({ error: "Failed to load time capsules." });
  }
}

export async function createTimeCapsule(req, res) {
  try {
    const { message, milestoneContext, durationDays, durationSeconds } = req.body;
    if (!message || !milestoneContext) {
      return res.status(400).json({ error: "Message and context are required." });
    }

    const data = await timeCapsuleService.createTimeCapsule(
      req.user.id,
      message,
      milestoneContext,
      durationDays || 30,
      durationSeconds
    );
    return res.status(201).json(data);
  } catch (error) {
    console.error("Controller createTimeCapsule error:", error);
    return res.status(500).json({ error: "Failed to lock time capsule note." });
  }
}

export async function revealTimeCapsule(req, res) {
  try {
    const data = await timeCapsuleService.revealTimeCapsule(req.user.id, req.params.id);
    return res.json(data);
  } catch (error) {
    console.error("Controller revealTimeCapsule error:", error);
    return res.status(500).json({ error: error.message || "Failed to reveal time capsule." });
  }
}

export async function openTimeCapsule(req, res) {
  try {
    const data = await timeCapsuleService.openTimeCapsule(req.user.id, req.params.id);
    return res.json(data);
  } catch (error) {
    console.error("Controller openTimeCapsule error:", error);
    return res.status(500).json({ error: error.message || "Failed to open time capsule." });
  }
}
