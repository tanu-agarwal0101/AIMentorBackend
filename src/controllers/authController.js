import bcrypt from "bcryptjs"
import prisma from "../utils/prisma.js"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { asyncHandler } from "../utils/asyncHandler.js"
import { cookieOptions } from "../utils/cookieOptions.js"
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/emailService.js"

const generateTokens = async (userId, req, res, familyId = null) => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const rawRefreshToken = crypto.randomBytes(40).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const userAgent = req.headers["user-agent"] || null;
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;
  const currentFamilyId = familyId || crypto.randomUUID();

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      familyId: currentFamilyId,
      userId,
      expiresAt,
      userAgent,
      ipAddress,
    },
  });

  res.cookie("token", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000 // 15 mins
  });

  res.cookie("refreshToken", rawRefreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

const clearAuthCookies = (res) => {
  const clearOptions = { ...cookieOptions };
  delete clearOptions.maxAge;
  res.clearCookie("token", clearOptions);
  res.clearCookie("refreshToken", clearOptions);
};

const validatePasswordStrength = (password) => {
  if (password.length < 8) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Name, email, and password are required"
    });
  }

  if (name.length > 100) {
    return res.status(400).json({ message: "Name cannot exceed 100 characters" });
  }
  if (email.length > 254) {
    return res.status(400).json({ message: "Email cannot exceed 254 characters" });
  }
  if (password.length > 128) {
    return res.status(400).json({ message: "Password cannot exceed 128 characters" });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return res.status(400).json({
      message: "Invalid email format"
    });
  }

  if (!validatePasswordStrength(password)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, and 1 number"
    });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingUser) {
    return res.status(400).json({ message: "An account with this email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const rawVerificationToken = crypto.randomBytes(32).toString("hex");
  const verificationHash = crypto.createHash("sha256").update(rawVerificationToken).digest("hex");
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      password: hashedPassword,
      emailVerified: false,
      emailVerificationTokenHash: verificationHash,
      emailVerificationExpires: verificationExpires
    }
  });

  if (!user) {
    return res.status(400).json({ message: "Unable to create user" });
  }

  try {
    await sendVerificationEmail(user.email, rawVerificationToken);
  } catch (emailErr) {
    console.error("[REGISTER] Failed to send initial verification email:", emailErr);
  }

  await generateTokens(user.id, req, res);

  res.status(201).json({
    message: "Registration successful. Please check your email to verify your account.",
    emailVerified: false,
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required"
    });
  }

  if (email.length > 254) {
    return res.status(400).json({ message: "Email cannot exceed 254 characters" });
  }
  if (password.length > 128) {
    return res.status(400).json({ message: "Password cannot exceed 128 characters" });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  const invalidCredentialsError = () => {
    return res.status(400).json({
      message: "We couldn't find an account matching those credentials."
    });
  };

  if (!user || !user.password) {
    return invalidCredentialsError();
  }

  const isMatch = await bcrypt.compare(password, user.password);
  
  if (!isMatch) {
    return invalidCredentialsError();
  }

  await generateTokens(user.id, req, res);

  if (!user.emailVerified) {
    return res.status(200).json({
      emailVerified: false,
      user: { id: user.id, email: user.email, name: user.name }
    });
  }

  res.status(200).json({
    emailVerified: true,
    user: { id: user.id, email: user.email, name: user.name }
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  const genericResponse = {
    message: "If that email is registered, we have sent instructions to reset your password."
  };

  if (!user) {
    return res.status(200).json(genericResponse);
  }

  if (user.provider === "google" && !user.password) {
    return res.status(200).json(genericResponse);
  }

  const rawToken = crypto.randomBytes(32).toString("hex");

  const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expires = new Date(Date.now() + 3600000); // 1 hour expiry

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordTokenHash: hash,
      resetPasswordExpires: expires
    }
  });

  try {
    await sendPasswordResetEmail(normalizedEmail, rawToken);
  } catch (emailErr) {
    console.error("[FORGOT PASSWORD] Failed to send password reset email:", emailErr);
  }

  res.status(200).json(genericResponse);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "Token and password are required" });
  }

  if (!validatePasswordStrength(password)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, and 1 number"
    });
  }

  const hash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordTokenHash: hash,
      resetPasswordExpires: {
        gt: new Date()
      }
    }
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired reset token" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordTokenHash: null,
      resetPasswordExpires: null
    }
  });

  res.status(200).json({ message: "Password reset successful. You can now login." });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: "Invalid verification link" });
  }

  const hash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationTokenHash: hash,
    },
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid verification link" });
  }

  if (user.emailVerificationExpires < new Date()) {
    return res.status(400).json({ message: "Verification link expired" });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationExpires: null,
    },
  });

  await generateTokens(updatedUser.id, req, res);

  res.status(200).json({ message: "Email verified successfully" });
});

const resendVerification = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.emailVerified) {
    return res.status(400).json({ message: "Email is already verified" });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationTokenHash: hash,
      emailVerificationExpires: expires,
    },
  });

  try {
    await sendVerificationEmail(user.email, rawToken);
  } catch (emailErr) {
    console.error("[RESEND] Failed to send verification email:", emailErr);
    return res.status(500).json({ message: "Failed to send verification email. Please try again." });
  }

  res.status(200).json({ message: "Verification email resent successfully" });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    clearAuthCookies(res);
    return res.status(401).json({ message: "Refresh token missing" });
  }

  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  const dbToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!dbToken) {
    clearAuthCookies(res);
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  if (dbToken.revoked) {
    await prisma.refreshToken.updateMany({
      where: { familyId: dbToken.familyId },
      data: { revoked: true }
    });
    clearAuthCookies(res);
    return res.status(401).json({ message: "Session compromised. Please log in again." });
  }

  if (dbToken.expiresAt < new Date()) {
    clearAuthCookies(res);
    return res.status(401).json({ message: "Refresh token expired" });
  }

  const newRawToken = crypto.randomBytes(40).toString("hex");
  const newHash = crypto.createHash("sha256").update(newRawToken).digest("hex");
  const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const userAgent = req.headers["user-agent"] || null;
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

  await prisma.$transaction(async (tx) => {
    const newToken = await tx.refreshToken.create({
      data: {
        tokenHash: newHash,
        familyId: dbToken.familyId,
        userId: dbToken.userId,
        expiresAt: newExpires,
        userAgent,
        ipAddress,
      }
    });

    await tx.refreshToken.update({
      where: { id: dbToken.id },
      data: {
        revoked: true,
        replacedById: newToken.id
      }
    });
  });

  const accessToken = jwt.sign(
    { id: dbToken.userId },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  res.cookie("token", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000 // 15 mins
  });

  res.cookie("refreshToken", newRawToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.status(200).json({ message: "Token refreshed successfully" });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;
  if (refreshToken) {
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    try {
      await prisma.refreshToken.update({
        where: { tokenHash },
        data: { revoked: true }
      });
    } catch (err) {
    }
  }

  clearAuthCookies(res);

  res.status(200).json({ message: "Logout successful" });
});

const googleCallback = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/login`);
  }
  
  await generateTokens(req.user.id, req, res);

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  res.redirect(`${frontendUrl}/dashboard`);
});

export {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  refresh,
  logout,
  googleCallback
}