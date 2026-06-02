import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.js";

export const authenticateJWT = (req, res, next) => {
    const token = req.cookies.token
    
    if(!token) return res.status(401).json({error: "Unauthorized"})

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

export const requireEmailVerified = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { emailVerified: true }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ error: "Email not verified", emailVerified: false });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const socketAuth = async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) return next(new Error("Unauthorized"))
    
    const token = cookieHeader.split(";").find(c => c.trim().startsWith("token="))?.split("=")[1]
    
    if (!token) return next(new Error("Unauthorized"))
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { emailVerified: true }
    });

    if (!user) {
      return next(new Error("User not found"));
    }

    if (!user.emailVerified) {
      return next(new Error("Email not verified"));
    }

    socket.user = decoded
    next()
  } catch (error) {
    next(new Error("Invalid or expired token"))
  }
}