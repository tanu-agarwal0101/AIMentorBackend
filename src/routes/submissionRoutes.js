import express from "express";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
import { optionalRateLimit } from "../middlewares/optionalRateLimit.js";
import { handleRunCode, handleSubmitSolution, handleGetSubmissionHistory } from "../controllers/submissionController.js";

const router = express.Router();

router.post("/run", authenticateJWT, optionalRateLimit, handleRunCode);
router.post("/submit", authenticateJWT, optionalRateLimit, handleSubmitSolution);
router.get("/history", authenticateJWT, handleGetSubmissionHistory);

export default router;
