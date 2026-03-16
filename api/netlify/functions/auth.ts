import type { Handler } from "@netlify/functions";
import { query, logAuditEvent, getOrCreateUser } from "./db";
import { createCorsHandler } from "./cors-utils";
import crypto from "crypto";

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

  const body = event.body ? JSON.parse(event.body) : {};
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

      // Create auth credentials
      await query(
        `INSERT INTO auth_credentials (
          user_id, email, password_hash, email_verification_token, email_verification_expires
        ) VALUES ($1, $2, $3, $4, $5)`,
        [userId, normalizedEmail, passwordHash, verificationToken, verificationExpires]
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

      // TODO: Send verification email
      // For now, auto-verify in development
      if (process.env.NODE_ENV !== "production") {
        await query(
          `UPDATE auth_credentials SET email_verified = true WHERE user_id = $1`,
          [userId]
        );
      }

      return cors.response(201, {
        ok: true,
        message: "Account created successfully",
        userId,
        requiresVerification: process.env.NODE_ENV === "production",
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

      // Check email verification
      if (!user.email_verified && process.env.NODE_ENV === "production") {
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

      // Update user role if specified
      if (role && role !== user.role) {
        await query(`UPDATE users SET role = $1 WHERE user_id = $2`, [role, user.user_id]);
      }

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

      return cors.response(200, {
        ok: true,
        message: "Signed in successfully",
        user: {
          userId: user.user_id,
          email: normalizedEmail,
          firstName: user.first_name,
          lastName: user.last_name,
          role: role || user.role,
        },
        session: {
          token,
          expiresAt: expiresAt.toISOString(),
        },
      });
    }

    // ==================== SIGNOUT ====================
    if (action === "signout") {
      const token = body.token || event.headers["x-session-token"];

      if (token) {
        const tokenHash = hashToken(token);
        await query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
      }

      return cors.response(200, {
        ok: true,
        message: "Signed out successfully",
      });
    }

    // ==================== VALIDATE SESSION ====================
    if (action === "validate") {
      const token = body.token || event.headers["x-session-token"];

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

      await query(
        `UPDATE auth_credentials
         SET password_reset_token = $1, password_reset_expires = $2
         WHERE email = $3`,
        [resetToken, resetExpires, normalizedEmail]
      );

      // TODO: Send password reset email

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

      const result = await query(
        `SELECT user_id FROM auth_credentials
         WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
        [token]
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

      const result = await query(
        `UPDATE auth_credentials
         SET email_verified = true, email_verification_token = NULL, email_verification_expires = NULL
         WHERE email_verification_token = $1 AND email_verification_expires > NOW()
         RETURNING user_id`,
        [token]
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
