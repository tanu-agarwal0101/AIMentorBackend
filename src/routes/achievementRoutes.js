import express from "express";
import { getAchievementsDashboard, markCelebrated, testTriggerEvent, getShowcase, updateShowcase } from "../controllers/achievementController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateJWT);

router.get("/", getAchievementsDashboard);
router.get("/showcase", getShowcase);
router.put("/showcase", updateShowcase);
router.post("/celebrate/:celebrationId", markCelebrated);
router.post("/test-trigger", testTriggerEvent);

export default router;
