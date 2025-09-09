import dotenv from "dotenv"
dotenv.config();
import express from "express"
import cors from "cors"
import { authRoutes, chatRoutes } from "./routes/index.js";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "./utils/passport.js";
import http from "http"
import { Server } from "socket.io"
import jwt from 'jsonwebtoken';
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