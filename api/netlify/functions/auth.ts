import type { Handler } from "@netlify/functions";
import { Resend } from "resend";
import { query, logAuditEvent, getOrCreateUser } from "./db";
import { createCorsHandler } from "./cors-utils";
import crypto from "crypto";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Use bcryptjs for password hashing (pure JS, no native deps)
// Note: In production, consider using argon2 for better security
const SALT_ROUNDS = 12;
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(12).toString("hex")}`;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Simple password hashing using PBKDF2 (built into Node.js crypto)
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ":" + derivedKey.toString("hex"));
    });
  });
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(":");
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString("hex"));
    });
  });
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const handler: Handler = async (event) => {
  const cors = createCorsHandler(event);

  if (event.httpMethod === "OPTIONS") {
    return cors.handleOptions("POST,OPTIONS");
  }

  if (event.httpMethod !== "POST") {
    return cors.response(405, { error: "Method not allowed" });
  }

  let body: any = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return cors.response(400, { ok: false, error: "Malformed JSON in request body" });
  }
  const { action } = body;

  try {
    // ==================== SIGNUP ====================
    if (action === "signup") {
      const { email, password, firstName, lastName, role = "patient" } = body;

      if (!email || !password || !firstName || !lastName) {
        return cors.response(400, {
          ok: false,
          error: "Email, password, firstName, and lastName are required",
        });
      }

      if (password.length < 8) {
        return cors.response(400, {
          ok: false,
          error: "Password must be at least 8 characters",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if user already exists
      const existing = await query(
        "SELECT id FROM auth_credentials WHERE email = $1",
        [normalizedEmail]
      );

      if (existing.rows.length > 0) {
        return cors.response(409, {
          ok: false,
          error: "An account with this email already exists",
        });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const userId = generateId("user");
      const verificationToken = generateToken();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Hash the verification token before storing (same pattern as session tokens)
      const verificationTokenHash = hashToken(verificationToken);
      await query(
        `INSERT INTO auth_credentials (
          user_id, email, password_hash, email_verification_token, email_verification_expires
        ) VALUES ($1, $2, $3, $4, $5)`,
        [userId, normalizedEmail, passwordHash, verificationTokenHash, verificationExpires]
      );

      // Create user record
      await getOrCreateUser(userId, normalizedEmail, "", firstName, lastName, role);

      await logAuditEvent(
        userId,
        "USER_SIGNUP",
        "user",
        userId,
        undefined,
        { email: normalizedEmail, role },
        event.headers?.["x-forwarded-for"],
        event.headers?.["user-agent"]
      );

      // Send verification email if Resend is configured, otherwise auto-verify (dev fallback)
      let emailSent = false;
      if (resend) {
        const origin =
          event.headers?.origin ||
          (process.env.ALLOWED_ORIGINS || "").split(",")[0]?.trim() ||
          "https://app.trialcliniq.com";
        const verifyLink = `${origin}/auth-callback?action=verify-email&token=${verificationToken}`;
        const fromAddress = process.env.EMAIL_FROM || "noreply@trialcliniq.com";

        const result = await resend.emails.send({
          from: fromAddress,
          to: normalizedEmail,
          subject: "Verify your TrialClinIQ account",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
              <h2 style="color: #111; margin-bottom: 24px;">Verify your email</h2>
              <p style="color: #333; font-size: 16px; line-height: 1.5;">
                Thanks for signing up for TrialClinIQ. Click the button below to verify your email address.
              </p>
              <a href="${verifyLink}"
                 style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 28px;
                        border-radius: 6px; text-decoration: none; font-weight: 600; margin: 24px 0;">
                Verify Email
              </a>
              <p style="color: #666; font-size: 14px; line-height: 1.5;">
                Or copy and paste this link into your browser:<br/>
                <a href="${verifyLink}" style="color: #2563eb; word-break: break-all;">${verifyLink}</a>
              </p>
              <p style="color: #999; font-size: 13px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
                This link expires in 24 hours. If you didn't create this account, you can ignore this email.
              </p>
            </div>
          `,
        });

        if (result.error) {
          console.error("Failed to send verification email:", result.error);
        } else {
          emailSent = true;
        }
      }

      // No Resend key or email failed -- auto-verify so dev/staging isn't blocked
      if (!emailSent) {
        await query(
          `UPDATE auth_credentials SET email_verified = true WHERE user_id = $1`,
          [userId]
        );
      }

      return cors.response(201, {
        ok: true,
        message: emailSent
          ? "Account created. Check your email to verify your address."
          : "Account created successfully",
        userId,
        requiresVerification: emailSent,
      });
    }

    // ==================== SIGNIN ====================
    if (action === "signin") {
      const { email, password, role = "patient" } = body;

      if (!email || !password) {
        return cors.response(400, {
          ok: false,
          error: "Email and password are required",
        });
      }

      // Universal demo account -- always works regardless of DB state
      if (email.trim().toLowerCase() === "demo@demo.com" && password === "demo") {
        const demoRole = role || "patient";
        const cookieOpts = [
          `session_token=demo-session-token`,
          "HttpOnly",
          "Path=/",
          "Max-Age=604800",
          "SameSite=Lax",
        ];
        if (event.headers?.host?.includes("trialcliniq") || event.headers?.host?.includes("netlify.app")) {
          cookieOpts.push("Secure");
        }
        const corsHeaders = cors.getHeaders();
        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            "Set-Cookie": cookieOpts.join("; "),
          },
          body: JSON.stringify({
            ok: true,
            message: "Signed in as demo user",
            user: {
              userId: `demo-${demoRole}-001`,
              email: `demo@trialcliniq.com`,
              firstName: "Demo",
              lastName: demoRole === "provider" ? "Researcher" : "Patient",
              role: demoRole,
            },
            session: {
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            },
          }),
        };
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Get user credentials
      const result = await query(
        `SELECT
          ac.user_id,
          ac.password_hash,
          ac.email_verified,
          ac.failed_login_attempts,
          ac.locked_until,
          u.first_name,
          u.last_name,
          u.role
         FROM auth_credentials ac
         JOIN users u ON ac.user_id = u.user_id
         WHERE ac.email = $1`,
        [normalizedEmail]
      );

      if (result.rows.length === 0) {
        return cors.response(401, {
          ok: false,
          error: "Invalid email or password",
        });
      }

      const user = result.rows[0];

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const minutesRemaining = Math.ceil(
          (new Date(user.locked_until).getTime() - Date.now()) / 60000
        );
        return cors.response(423, {
          ok: false,
          error: `Account is locked. Try again in ${minutesRemaining} minutes.`,
        });
      }

      // Verify password
      const passwordValid = await verifyPassword(password, user.password_hash);

      if (!passwordValid) {
        // Increment failed attempts
        const newAttempts = (user.failed_login_attempts || 0) + 1;
        const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;

        await query(
          `UPDATE auth_credentials
           SET failed_login_attempts = $1,
               locked_until = $2
           WHERE user_id = $3`,
          [
            newAttempts,
            shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
            user.user_id,
          ]
        );

        await logAuditEvent(
          user.user_id,
          "LOGIN_FAILED",
          "auth",
          user.user_id,
          undefined,
          { attempts: newAttempts },
          event.headers?.["x-forwarded-for"],
          event.headers?.["user-agent"]
        );

        return cors.response(401, {
          ok: false,
          error: "Invalid email or password",
          attemptsRemaining: shouldLock ? 0 : MAX_LOGIN_ATTEMPTS - newAttempts,
        });
      }

      // Block unverified users unless explicitly running in local dev
      const isDevEnv = process.env.NODE_ENV === "development" || process.env.NETLIFY_DEV === "true";
      if (!user.email_verified && !isDevEnv) {
        return cors.response(403, {
          ok: false,
          error: "Please verify your email before signing in",
          requiresVerification: true,
        });
      }

      // Reset failed attempts and create session
      const sessionId = generateId("sess");
      const token = generateToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

      await query(
        `UPDATE auth_credentials
         SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW()
         WHERE user_id = $1`,
        [user.user_id]
      );

      await query(
        `INSERT INTO sessions (session_id, user_id, token_hash, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          sessionId,
          user.user_id,
          tokenHash,
          expiresAt,
          event.headers?.["x-forwarded-for"] || event.headers?.["x-client-ip"],
          event.headers?.["user-agent"],
        ]
      );

      // Use the role from the database, not from the client request (prevents privilege escalation)

      await logAuditEvent(
        user.user_id,
        "LOGIN_SUCCESS",
        "auth",
        user.user_id,
        undefined,
        { sessionId },
        event.headers?.["x-forwarded-for"],
        event.headers?.["user-agent"]
      );

      // Set httpOnly cookie for session token (works in incognito!)
      const isProduction = process.env.NODE_ENV === "production" ||
                           event.headers?.host?.includes("netlify.app") ||
                           event.headers?.host?.includes("trialcliniq");

      const cookieOptions = [
        `session_token=${token}`,
        "HttpOnly",
        "Path=/",
        `Max-Age=${Math.floor(SESSION_EXPIRY_MS / 1000)}`,
        "SameSite=Lax",
      ];

      if (isProduction) {
        cookieOptions.push("Secure");
      }

      // Use CORS handler to get the validated origin
      const corsHeaders = cors.getHeaders();
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          "Set-Cookie": cookieOptions.join("; "),
        },
        body: JSON.stringify({
          ok: true,
          message: "Signed in successfully",
          user: {
            userId: user.user_id,
            email: normalizedEmail,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
          },
          session: {
            // Token is only in the httpOnly cookie -- never expose it in the response body
            expiresAt: expiresAt.toISOString(),
          },
        }),
      };
    }

    // ==================== SIGNOUT ====================
    if (action === "signout") {
      // Check cookie first, then header, then body
      const cookieHeader = event.headers?.cookie || "";
      const cookieMatch = cookieHeader.match(/session_token=([^;]+)/);
      const token = cookieMatch?.[1] || body.token || event.headers["x-session-token"];

      if (token) {
        const tokenHash = hashToken(token);
        await query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
      }

      // Clear the cookie
      const signoutCorsHeaders = cors.getHeaders();
      return {
        statusCode: 200,
        headers: {
          ...signoutCorsHeaders,
          "Set-Cookie": "session_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
        },
        body: JSON.stringify({
          ok: true,
          message: "Signed out successfully",
        }),
      };
    }

    // ==================== VALIDATE SESSION ====================
    if (action === "validate") {
      // Check cookie first (httpOnly cookie), then header, then body
      const cookieHeader = event.headers?.cookie || "";
      const cookieMatch = cookieHeader.match(/session_token=([^;]+)/);
      const token = cookieMatch?.[1] || body.token || event.headers["x-session-token"];

      if (!token) {
        return cors.response(401, { ok: false, error: "No session token provided" });
      }

      const tokenHash = hashToken(token);

      const result = await query(
        `SELECT
          s.user_id,
          s.expires_at,
          u.email,
          u.first_name,
          u.last_name,
          u.role
         FROM sessions s
         JOIN users u ON s.user_id = u.user_id
         WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
        [tokenHash]
      );

      if (result.rows.length === 0) {
        return cors.response(401, { ok: false, error: "Invalid or expired session" });
      }

      const session = result.rows[0];

      // Update last accessed
      await query(
        `UPDATE sessions SET last_accessed = NOW() WHERE token_hash = $1`,
        [tokenHash]
      );

      return cors.response(200, {
        ok: true,
        user: {
          userId: session.user_id,
          email: session.email,
          firstName: session.first_name,
          lastName: session.last_name,
          role: session.role,
        },
        expiresAt: session.expires_at,
      });
    }

    // ==================== REQUEST PASSWORD RESET ====================
    if (action === "request-reset") {
      const { email } = body;

      if (!email) {
        return cors.response(400, { ok: false, error: "Email is required" });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const resetToken = generateToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Hash the reset token before storing
      const resetTokenHash = hashToken(resetToken);
      await query(
        `UPDATE auth_credentials
         SET password_reset_token = $1, password_reset_expires = $2
         WHERE email = $3`,
        [resetTokenHash, resetExpires, normalizedEmail]
      );

      // Send password reset email if Resend is configured
      if (resend) {
        const origin =
          event.headers?.origin ||
          (process.env.ALLOWED_ORIGINS || "").split(",")[0]?.trim() ||
          "https://app.trialcliniq.com";
        const resetLink = `${origin}/auth-callback?action=reset-password&token=${resetToken}`;
        const fromAddress = process.env.EMAIL_FROM || "noreply@trialcliniq.com";

        await resend.emails.send({
          from: fromAddress,
          to: normalizedEmail,
          subject: "Reset your TrialClinIQ password",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
              <h2 style="color: #111; margin-bottom: 24px;">Reset your password</h2>
              <p style="color: #333; font-size: 16px; line-height: 1.5;">
                We received a request to reset your TrialClinIQ password. Click the button below to choose a new password.
              </p>
              <a href="${resetLink}"
                 style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 28px;
                        border-radius: 6px; text-decoration: none; font-weight: 600; margin: 24px 0;">
                Reset Password
              </a>
              <p style="color: #666; font-size: 14px; line-height: 1.5;">
                Or copy and paste this link:<br/>
                <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
              </p>
              <p style="color: #999; font-size: 13px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
                This link expires in 1 hour. If you didn't request this, ignore this email.
              </p>
            </div>
          `,
        }).catch((err) => console.error("Failed to send reset email:", err));
      }

      // Always return success to prevent email enumeration
      return cors.response(200, {
        ok: true,
        message: "If an account exists with this email, a password reset link has been sent",
      });
    }

    // ==================== RESET PASSWORD ====================
    if (action === "reset-password") {
      const { token, newPassword } = body;

      if (!token || !newPassword) {
        return cors.response(400, {
          ok: false,
          error: "Token and new password are required",
        });
      }

      if (newPassword.length < 8) {
        return cors.response(400, {
          ok: false,
          error: "Password must be at least 8 characters",
        });
      }

      // Hash the incoming token to compare against the stored hash
      const incomingTokenHash = hashToken(token);
      const result = await query(
        `SELECT user_id FROM auth_credentials
         WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
        [incomingTokenHash]
      );

      if (result.rows.length === 0) {
        return cors.response(400, {
          ok: false,
          error: "Invalid or expired reset token",
        });
      }

      const userId = result.rows[0].user_id;
      const passwordHash = await hashPassword(newPassword);

      // Update password and clear reset token
      await query(
        `UPDATE auth_credentials
         SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL
         WHERE user_id = $2`,
        [passwordHash, userId]
      );

      // Invalidate all existing sessions
      await query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);

      await logAuditEvent(
        userId,
        "PASSWORD_RESET",
        "auth",
        userId,
        undefined,
        {},
        event.headers?.["x-forwarded-for"],
        event.headers?.["user-agent"]
      );

      return cors.response(200, {
        ok: true,
        message: "Password reset successfully. Please sign in with your new password.",
      });
    }

    // ==================== VERIFY EMAIL ====================
    if (action === "verify-email") {
      const { token } = body;

      if (!token) {
        return cors.response(400, { ok: false, error: "Verification token is required" });
      }

      // Hash incoming token for comparison
      const emailTokenHash = hashToken(token);
      const result = await query(
        `UPDATE auth_credentials
         SET email_verified = true, email_verification_token = NULL, email_verification_expires = NULL
         WHERE email_verification_token = $1 AND email_verification_expires > NOW()
         RETURNING user_id`,
        [emailTokenHash]
      );

      if (result.rows.length === 0) {
        return cors.response(400, {
          ok: false,
          error: "Invalid or expired verification token",
        });
      }

      return cors.response(200, {
        ok: true,
        message: "Email verified successfully. You can now sign in.",
      });
    }

    return cors.response(400, { ok: false, error: "Invalid action" });
  } catch (error: any) {
    console.error("Auth error:", error);
    return cors.response(500, {
      ok: false,
      error: "An error occurred. Please try again.",
    });
  }
};
