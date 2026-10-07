import { resendClient, sender } from "../lib/resend.js";
import { createWelcomeEmailTemplate } from "../emails/emailTemplates.js";
import { IS_PROD } from "../lib/env.js";
import { AppError } from "../lib/errors.js";

const escapeHtml = (v) =>
  String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const sendWelcomeEmail = async (email, name, clientURL) => {
  if (!resendClient) {
    console.warn("RESEND_API_KEY not set - skipping welcome email");
    return;
  }

  const { data, error } = await resendClient.emails.send({
    from: `${sender.name} <${sender.email}>`,
    to: email,
    subject: "Welcome to Chatify!",
    html: createWelcomeEmailTemplate(escapeHtml(name), clientURL),
  });

  if (error) {
    console.error("Error sending welcome email:", error);
    throw new Error("Failed to send welcome email");
  }

  console.log("Welcome Email sent successfully", data);
};

const PURPOSE_TEXT = {
  signup: { subject: "Confirm your email", intro: "Use this code to finish creating your account." },
  login: { subject: "Your login code", intro: "Use this code to finish logging in." },
  enable2fa: { subject: "Turn on two-factor authentication", intro: "Use this code to turn on two-factor authentication." },
};

const codeTemplate = (name, code, intro) => `<!DOCTYPE html>
<html lang="en"><body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f5f5f5;margin:0;padding:24px;color:#333">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.06)">
    <div style="background:linear-gradient(to right,#6d7cff,#d946ef);padding:24px;text-align:center;color:#fff;font-size:20px;font-weight:600">Tanvir's Chatapp</div>
    <div style="padding:28px">
      <p style="margin:0 0 8px">Hi ${name},</p>
      <p style="margin:0 0 20px">${intro}</p>
      <div style="text-align:center;font-size:34px;letter-spacing:10px;font-weight:700;background:#f0f1ff;border-radius:12px;padding:16px 0;color:#4a46d4">${code}</div>
      <p style="font-size:13px;color:#777;margin:20px 0 0">The code expires in 10 minutes. If you didn't ask for it, you can ignore this email - nobody can use it without your password.</p>
    </div>
  </div>
</body></html>`;

// sends a 6 digit code. Without an email provider the code is logged (development only).
export const sendVerificationEmail = async (email, name, code, purpose) => {
  const text = PURPOSE_TEXT[purpose];
  if (!resendClient) {
    if (IS_PROD) throw new AppError(503, "Email delivery is not configured right now. Please try later.", "EMAIL_DOWN");
    console.log(`[dev] ${purpose} code for ${email}: ${code}`);
    return;
  }
  const { error } = await resendClient.emails.send({
    from: `${sender.name} <${sender.email}>`,
    to: email,
    subject: `${code} is your Chatapp code - ${text.subject}`,
    html: codeTemplate(escapeHtml(name), code, text.intro),
  });
  if (error) {
    console.error("Verification email failed:", error);
    throw new AppError(502, "We couldn't send the email. Check the address and try again.", "EMAIL_FAILED");
  }
};
