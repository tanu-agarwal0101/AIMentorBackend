import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const isProduction = process.env.NODE_ENV === "production";

if (!apiKey) {
  if (isProduction) {
    throw new Error("[EMAIL SERVICE] CRITICAL: RESEND_API_KEY is missing in production environment.");
  } else {
    console.warn(
      "\n[WARNING] RESEND_API_KEY is missing in development. Email Service will fall back to mock console logs.\n"
    );
  }
}

const resend = apiKey ? new Resend(apiKey) : null;
const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

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

  if (!resend) {
    console.log(`\n=== [MOCK EMAIL SERVICE] VERIFICATION EMAIL ===\nTo: ${email}\nLink: ${verificationLink}\n==============================================\n`);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Verify your AI Mentor account",
      html: htmlContent,
    });

    if (error) {
      console.error("[EMAIL SERVICE] Resend verification email error:", error);
      throw new Error(error.message);
    }
    return data;
  } catch (err) {
    console.error("[EMAIL SERVICE] Resend verification email exception:", err);
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

  if (!resend) {
    console.log(`\n=== [MOCK EMAIL SERVICE] PASSWORD RESET EMAIL ===\nTo: ${email}\nLink: ${resetLink}\n=================================================\n`);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Reset your AI Mentor password",
      html: htmlContent,
    });

    if (error) {
      console.error("[EMAIL SERVICE] Resend password reset email error:", error);
      throw new Error(error.message);
    }
    return data;
  } catch (err) {
    console.error("[EMAIL SERVICE] Resend password reset email exception:", err);
    throw err;
  }
};
