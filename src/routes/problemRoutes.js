import express from "express";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
import { optionalRateLimit } from "../middlewares/optionalRateLimit.js";
import {
  handleImportProblem,
  handleListProblems,
  handleGetProblem,
  handleCreateSession,
  handleGetUserSessions,
  handleGetSession,
  handleUpdateSession,
  handleDeleteSession
} from "../controllers/problemController.js";

const router = express.Router();

// Problem API endpoints
router.post("/import", authenticateJWT, optionalRateLimit, handleImportProblem);
router.get("/", authenticateJWT, handleListProblems);
router.get("/:id", authenticateJWT, handleGetProblem);

// Coding Session API endpoints
router.post("/sessions/create", authenticateJWT, handleCreateSession);
router.get("/sessions/list", authenticateJWT, handleGetUserSessions);
router.get("/sessions/:id", authenticateJWT, handleGetSession);
router.put("/sessions/:id", authenticateJWT, handleUpdateSession);
router.delete("/sessions/:id", authenticateJWT, handleDeleteSession);

export default router;
