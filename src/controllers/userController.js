import prisma from "../utils/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import crypto from "crypto";
import { sendVerificationEmail } from "../services/emailService.js";

const getProfile = asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, email: true, emailVerified: true, provider: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });
    
    res.status(200).json(user);
});

const updateProfile = asyncHandler(async (req, res) => {
    const { name, email } = req.body;

    if (!email && !name) {
        return res.status(400).json({ error: "One of name or email is required" });
    }

    const user = await prisma.user.findUnique({
        where: { id: req.user.id }
    });

    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    const updateData = {};
    if (name !== undefined) {
        if (name.length > 100) {
            return res.status(400).json({ error: "Name cannot exceed 100 characters" });
        }
        updateData.name = name;
    }

    let emailChanged = false;
    let normalizedEmail;

    if (email !== undefined) {
        normalizedEmail = email.trim().toLowerCase();
        if (normalizedEmail.length > 254) {
            return res.status(400).json({ error: "Email cannot exceed 254 characters" });
        }
        
        if (normalizedEmail !== user.email) {
            const existing = await prisma.user.findUnique({
                where: { email: normalizedEmail }
            });
            if (existing && existing.id !== user.id) {
                return res.status(400).json({ error: "An account with this email already exists" });
            }
            emailChanged = true;
            updateData.email = normalizedEmail;
        }
    }

    if (emailChanged) {
        const rawVerificationToken = crypto.randomBytes(32).toString("hex");
        const verificationHash = crypto.createHash("sha256").update(rawVerificationToken).digest("hex");
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        updateData.emailVerified = false;
        updateData.emailVerifiedAt = null;
        updateData.emailVerificationTokenHash = verificationHash;
        updateData.emailVerificationExpires = verificationExpires;

        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
            select: { id: true, name: true, email: true, emailVerified: true, provider: true }
        });

        try {
            await sendVerificationEmail(normalizedEmail, rawVerificationToken);
        } catch (emailErr) {
            console.error("[UPDATE PROFILE] Failed to send verification email:", emailErr);
        }

        return res.status(200).json({
            ...updated,
            message: "Profile updated. A verification link has been sent to your new email address."
        });
    }

    if (Object.keys(updateData).length > 0) {
        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
            select: { id: true, name: true, email: true, emailVerified: true, provider: true }
        });
        return res.status(200).json(updated);
    }

    return res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        provider: user.provider
    });
});

export {
    getProfile, updateProfile
};