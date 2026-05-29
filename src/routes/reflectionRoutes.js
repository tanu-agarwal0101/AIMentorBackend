import express from "express";
import {
  getMemories,
  getMonthlyRecaps,
  getJourneySummary,
  getJourneyHistory,
  regenerateJourneySummary,
  getScrapbook,
  getTimeCapsules,
  createTimeCapsule,
  revealTimeCapsule,
  openTimeCapsule
} from "../controllers/reflectionController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateJWT);

router.get("/memories", getMemories);
router.get("/recaps", getMonthlyRecaps);
router.get("/journey", getJourneySummary);
router.get("/journey/history", getJourneyHistory);
router.post("/journey/regenerate", regenerateJourneySummary);
router.get("/scrapbook", getScrapbook);
router.get("/timecapsules", getTimeCapsules);
router.post("/timecapsules", createTimeCapsule);
router.post("/timecapsules/reveal/:id", revealTimeCapsule);
router.post("/timecapsules/open/:id", openTimeCapsule);

export default router;
