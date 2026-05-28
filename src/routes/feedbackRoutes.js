import express from "express";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
import { optionalRateLimit } from "../middlewares/optionalRateLimit.js";
import { handleCreateFeedback } from "../controllers/feedbackController.js";

const router = express.Router();

router.post("/", authenticateJWT, optionalRateLimit, handleCreateFeedback);

export default router;
