import { Router } from "express";
import { authenticateJWT } from "./../middlewares/authMiddleware.js";
import { getProfile, updateProfile } from "../controllers/userController.js";


const router = Router();

router.post("/me", authenticateJWT, getProfile);
router.put("/edit", authenticateJWT, updateProfile);

export default router;
