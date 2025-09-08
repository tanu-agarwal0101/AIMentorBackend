import express from 'express';
import authRoutes from "./authRoutes.js";
import chatRoutes from "./chatRoutes.js"
const router = express.Router()

router.use("/", authRoutes)
router.use("/", chatRoutes)

export {
    authRoutes, chatRoutes
}