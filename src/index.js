import dotenv from "dotenv"
dotenv.config();
import express from "express"

import cors from "cors"
import { authRoutes } from "./routes/index.js";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "./utils/passport.js";

const app = express();
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
        saveUninitialized: true, 
    })
)
app.use('/api/auth', authRoutes)

app.use(passport.initialize())
app.use(passport.session())

const PORT = process.env.PORT || 5000
app.listen(PORT, ()=> console.log(`Server is running on port ${PORT}`))