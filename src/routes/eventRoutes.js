import express from "express";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
import { optionalRateLimit } from "../middlewares/optionalRateLimit.js";
import { handleLogClientEvent } from "../controllers/eventController.js";

const router = express.Router();

router.post("/", authenticateJWT, optionalRateLimit, handleLogClientEvent);

export default router;
