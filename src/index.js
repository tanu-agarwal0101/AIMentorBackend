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
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "./utils/passport.js";
import http from "http"
import { Server } from "socket.io"
import { registerChatHandlers } from "./utils/chatSocket.js";
import { socketAuth } from "./middlewares/authMiddleware.js";


const app = express();
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    saveUninitialized: false,
}));
app.use(express.json())
app.use(cookieParser())

app.use(
    session({
        secret: process.env.SESSION_SECRET || "secret",
        resave: false,
        saveUninitialized: true, 
    })
)
app.use('/api/auth', authRoutes)
// app.use("/api/chat", chatRoutes)
app.use('/api/user', userRoutes)
app.use('/api/cody', codyRoutes)
app.use('/api/interview-review', interviewReviewRoutes)
app.use('/api/problems', problemRoutes)
app.use('/api/submissions', submissionRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/roadmaps', roadmapRoutes)

app.use(passport.initialize())
app.use(passport.session())


const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true,
    }
})

io.use(socketAuth)

io.on("connection", (socket) => registerChatHandlers(io, socket))

const PORT = process.env.PORT || 5000
server.listen(PORT, ()=> console.log(`Server is running on port ${PORT}`))