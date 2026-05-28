import express from "express";
import { getAnalytics, getActiveSession, getActivityFeed } from "../controllers/statsController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateJWT);

router.get("/analytics", getAnalytics);
router.get("/active-session", getActiveSession);
router.get("/activity-feed", getActivityFeed);

export default router;
