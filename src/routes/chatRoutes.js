import { Router } from "express";
import { authenticateJWT } from './../middlewares/authMiddleware.js';
import {
  getConversations,
  getConversationById,
  createConversation,
  renameConversation,
  deleteConversation,
  sendMessage
} from "../controllers/chatController.js";

const router = Router();

router.get("/conversations", authenticateJWT, getConversations);
router.get("/conversations/:id", authenticateJWT, getConversationById);
router.post("/conversations", authenticateJWT, createConversation);
router.put("/conversations/:id", authenticateJWT, renameConversation);
router.delete("/conversations/:id", authenticateJWT, deleteConversation);
router.post("/conversations/:id/messages", authenticateJWT, sendMessage);

export default router;