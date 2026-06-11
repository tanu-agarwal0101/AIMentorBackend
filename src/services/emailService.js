import nodemailer from "nodemailer";


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVER || "smtp-relay.brevo.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, 
  auth: {
    user: process.env.SMTP_LOGIN,
    pass: process.env.SMTP_PASSWORD,
  },
});

const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_LOGIN || "noreply@aimentor.app";
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

/**
 * Verify SMTP connectivity on startup.
 * Logs success or failure without crashing the server.
 */
export const verifySmtpConnection = async () => {
  try {
    await transporter.verify();
    console.log("[EMAIL SERVICE] ✅ SMTP Connected — Brevo relay is reachable.");
  } catch (err) {
    console.error("[EMAIL SERVICE] ❌ SMTP Connection Failed:", err.message);
  }
};

/**
 * Sends a styled verification email to a newly registered user.
 * @param {string} email - Recipient's email address
 * @param {string} rawToken - Unhashed verification token
 */
export const sendVerificationEmail = async (email, rawToken) => {
  const verificationLink = `${frontendUrl}/verify-email?token=${rawToken}`;
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #f1f5f9; border-radius: 24px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 28px; font-weight: 800; tracking-wide; color: #0f172a;">AI MENTOR</span>
      </div>
      <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; text-align: center; margin-bottom: 8px;">Verify your AI Mentor account</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 24px;">Welcome to AI Mentor! Please verify your email address to activate your account and gain full access to the learning roadmaps, coding arena, achievements, and chats.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verificationLink}" style="background-color: #ec4899; color: #ffffff; padding: 12px 32px; font-weight: 800; text-decoration: none; border-radius: 12px; display: inline-block; box-shadow: 0 4px 10px rgba(236, 72, 153, 0.25); transition: all 0.2s;">Verify Email</a>
      </div>
      <p style="color: #64748b; font-size: 11px; line-height: 1.6; text-align: center; margin-top: 32px; border-t: 1px solid #f1f5f9; padding-top: 16px;">If the button doesn't work, copy and paste this link into your browser:<br/> <a href="${verificationLink}" style="color: #ec4899; text-decoration: none; font-weight: 600;">${verificationLink}</a></p>
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 16px;">This link is single-use only and will expire in 24 hours.</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"AI Mentor" <${fromEmail}>`,
      to: email,
      subject: "Verify your AI Mentor account",
      html: htmlContent,
    });
    console.log(`[EMAIL SERVICE] Verification email sent to ${email} — MessageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error("[EMAIL SERVICE] Email delivery failed (verification):", err.message);
    throw err;
  }
};

/**
 * Sends a password reset email to a user.
 * @param {string} email - Recipient's email address
 * @param {string} rawToken - Unhashed password reset token
 */
export const sendPasswordResetEmail = async (email, rawToken) => {
  const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #f1f5f9; border-radius: 24px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 28px; font-weight: 800; tracking-wide; color: #0f172a;">AI MENTOR</span>
      </div>
      <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; text-align: center; margin-bottom: 8px;">Reset your AI Mentor password</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 24px;">You requested to reset your password for your AI Mentor account. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 32px; font-weight: 800; text-decoration: none; border-radius: 12px; display: inline-block; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.25); transition: all 0.2s;">Reset Password</a>
      </div>
      <p style="color: #64748b; font-size: 11px; line-height: 1.6; text-align: center; margin-top: 32px; border-t: 1px solid #f1f5f9; padding-top: 16px;">If the button doesn't work, copy and paste this link into your browser:<br/> <a href="${resetLink}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">${resetLink}</a></p>
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 16px;">This link is single-use only and will expire in 1 hour.</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"AI Mentor" <${fromEmail}>`,
      to: email,
      subject: "Reset your AI Mentor password",
      html: htmlContent,
    });
    console.log(`[EMAIL SERVICE] Password reset email sent to ${email} — MessageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error("[EMAIL SERVICE] Email delivery failed (password reset):", err.message);
    throw err;
  }
};

/**
 * Sends an email change verification email when a user updates their email address.
 * @param {string} email - The new email address to verify
 * @param {string} rawToken - Unhashed verification token
 */
export const sendEmailChangeVerification = async (email, rawToken) => {
  const verificationLink = `${frontendUrl}/verify-email?token=${rawToken}`;
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #f1f5f9; border-radius: 24px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 28px; font-weight: 800; tracking-wide; color: #0f172a;">AI MENTOR</span>
      </div>
      <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; text-align: center; margin-bottom: 8px;">Verify your new email address</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 24px;">You recently requested an email address change on your AI Mentor account. Click the button below to verify your new address and regain full access.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verificationLink}" style="background-color: #0ea5e9; color: #ffffff; padding: 12px 32px; font-weight: 800; text-decoration: none; border-radius: 12px; display: inline-block; box-shadow: 0 4px 10px rgba(14, 165, 233, 0.25); transition: all 0.2s;">Verify New Email</a>
      </div>
      <p style="color: #64748b; font-size: 11px; line-height: 1.6; text-align: center; margin-top: 32px; border-t: 1px solid #f1f5f9; padding-top: 16px;">If the button doesn't work, copy and paste this link into your browser:<br/> <a href="${verificationLink}" style="color: #0ea5e9; text-decoration: none; font-weight: 600;">${verificationLink}</a></p>
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 16px;">This link is single-use only and will expire in 24 hours. If you did not request this change, please contact support immediately.</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"AI Mentor" <${fromEmail}>`,
      to: email,
      subject: "Verify your new AI Mentor email address",
      html: htmlContent,
    });
    console.log(`[EMAIL SERVICE] Email change verification sent to ${email} — MessageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error("[EMAIL SERVICE] Email delivery failed (email change verification):", err.message);
    throw err;
  }
};
