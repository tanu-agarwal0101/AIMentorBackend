import dotenv from "dotenv"
dotenv.config();
import express from "express";
import cors from "cors";
import { authRoutes, chatRoutes, userRoutes } from "./routes/index.js";
import codyRoutes from "./routes/codyRoutes.js";
import interviewReviewRoutes from "./routes/interviewReviewRoutes.js";
import problemRoutes from "./routes/problemRoutes.js";
import submissionRoutes from "./routes/submissionRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import roadmapRoutes from "./routes/roadmapRoutes.js";
import achievementRoutes from "./routes/achievementRoutes.js";
import reflectionRoutes from "./routes/reflectionRoutes.js";
import { seedAchievementsAndBadges } from "./services/achievementService.js";
import { verifySmtpConnection } from "./services/emailService.js";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "./utils/passport.js";
import http from "http"
import { Server } from "socket.io"
import { registerChatHandlers } from "./utils/chatSocket.js";
import { socketAuth, authenticateJWT, requireEmailVerified } from "./middlewares/authMiddleware.js";
import helmet from "helmet";


const app = express();
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));
app.use(express.json())
app.use(cookieParser())

app.use(
    session({
        secret: process.env.SESSION_SECRET || "secret",
        resave: false,
        saveUninitialized: false, 
    })
)
app.use(passport.initialize())
app.use(passport.session())

app.use('/api/auth', authRoutes)
app.use("/api/chat", authenticateJWT, requireEmailVerified, chatRoutes)
app.use('/api/user', userRoutes)
app.use('/api/cody', authenticateJWT, requireEmailVerified, codyRoutes)
app.use('/api/interview-review', authenticateJWT, requireEmailVerified, interviewReviewRoutes)
app.use('/api/problems', authenticateJWT, requireEmailVerified, problemRoutes)
app.use('/api/submissions', authenticateJWT, requireEmailVerified, submissionRoutes)
app.use('/api/feedback', authenticateJWT, requireEmailVerified, feedbackRoutes)
app.use('/api/events', authenticateJWT, requireEmailVerified, eventRoutes)
app.use('/api/stats', authenticateJWT, requireEmailVerified, statsRoutes)
app.use('/api/roadmaps', authenticateJWT, requireEmailVerified, roadmapRoutes)
app.use('/api/achievements', authenticateJWT, requireEmailVerified, achievementRoutes)
app.use('/api/reflections', authenticateJWT, requireEmailVerified, reflectionRoutes)

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true,
    }
})

io.use(socketAuth)

io.on("connection", (socket) => registerChatHandlers(io, socket))

seedAchievementsAndBadges().then(() => console.log("[STARTUP] Achievements and Badges seeded/validated."));
verifySmtpConnection();

const PORT = process.env.PORT || 5000
server.listen(PORT, ()=> console.log(`Server is running on port ${PORT}`))