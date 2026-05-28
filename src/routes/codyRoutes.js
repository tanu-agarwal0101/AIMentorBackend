import express from "express";
import { handleCodyChat } from "../controllers/codyController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
import { optionalRateLimit } from "../middlewares/optionalRateLimit.js";

const router = express.Router();

router.post("/chat", authenticateJWT, optionalRateLimit, handleCodyChat);

export default router;
