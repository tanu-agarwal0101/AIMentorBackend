import { Router } from "express";
import { login, register, forgotPassword, resetPassword, verifyEmail, resendVerification, refresh, logout, googleCallback } from "../controllers/authController.js";
import passport from "../utils/passport.js";
import { loginRateLimiter, forgotPasswordRateLimiter, registerRateLimiter } from "../middlewares/authRateLimiter.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
import { resendVerificationRateLimiter } from "../middlewares/authRateLimiter.js";

const router = Router();
router.post('/register', registerRateLimiter, register)
router.post('/login', loginRateLimiter, login)
router.post('/forgot-password', forgotPasswordRateLimiter, forgotPassword)
router.post('/reset-password', forgotPasswordRateLimiter, resetPassword)
router.get('/verify-email', verifyEmail)
router.post('/resend-verification', authenticateJWT, resendVerificationRateLimiter, resendVerification)
router.post('/refresh', refresh)

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:3000"}/login`,
  }),
  googleCallback
);

router.get("/success", (req, res) => {
  res.send("Google login successful, cookie set!");
});

router.post("/logout", logout)

export default router;