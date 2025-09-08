import { Router } from "express";
import { authenticateJWT } from './../middlewares/authMiddleware.js';
import { getChatHistory, sendMessage } from "../controllers/chatController.js";

const router = Router()

router.post("/send", authenticateJWT, sendMessage)
router.post("/history", authenticateJWT, getChatHistory)


export default router