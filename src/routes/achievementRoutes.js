import express from "express";
import { getAchievementsDashboard, markCelebrated, testTriggerEvent } from "../controllers/achievementController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateJWT);

router.get("/", getAchievementsDashboard);
router.post("/celebrate/:celebrationId", markCelebrated);
router.post("/test-trigger", testTriggerEvent);

export default router;
