import express from "express";
import { handleGenerateReview } from "../controllers/interviewReviewController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
import { optionalRateLimit } from "../middlewares/optionalRateLimit.js";

const router = express.Router();

router.post("/generate", authenticateJWT, optionalRateLimit, handleGenerateReview);

export default router;
