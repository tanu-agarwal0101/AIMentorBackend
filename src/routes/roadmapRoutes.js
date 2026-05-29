import express from "express";
import {
  createRoadmap,
  listRoadmaps,
  getRoadmapDetail,
  updateRoadmapStatus,
  toggleTaskCompletion,
  conversationallyEditRoadmap
} from "../controllers/roadmapController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateJWT);

router.post("/generate", createRoadmap);
router.get("/", listRoadmaps);
router.get("/:id", getRoadmapDetail);
router.put("/:id/status", updateRoadmapStatus);
router.put("/tasks/:taskId", toggleTaskCompletion);
router.post("/:id/edit", conversationallyEditRoadmap);

export default router;
