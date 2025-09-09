import express from 'express';
import authRoutes from "./authRoutes.js";
import chatRoutes from "./chatRoutes.js"
import userRoutes from "./userRoutes.js"
const router = express.Router()

router.use("/", authRoutes)
router.use("/", chatRoutes)
router.use("/", userRoutes)
export {
    authRoutes, chatRoutes, userRoutes
}