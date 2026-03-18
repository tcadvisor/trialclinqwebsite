"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const db_1 = require("./db");
const cors_utils_1 = require("./cors-utils");
const csrf_utils_1 = require("./csrf-utils");
const crypto_1 = __importDefault(require("crypto"));
function generateMessageId() {
    return "msg_" + Date.now().toString(36) + "_" + crypto_1.default.randomBytes(8).toString("hex");
}
function generateThreadId() {
    return "thread_" + Date.now().toString(36) + "_" + crypto_1.default.randomBytes(6).toString("hex");
}
const handler = async (event) => {
    const cors = (0, cors_utils_1.createCorsHandler)(event);
    if (event.httpMethod === "OPTIONS") {
        return cors.handleOptions("GET,POST,PUT,OPTIONS");
    }
    const userId = event.headers["x-user-id"];
    if (!userId) {
        return cors.response(401, { ok: false, error: "Missing x-user-id header" });
    }
    try {
        // GET - Fetch messages
        if (event.httpMethod === "GET") {
            const { folder = "inbox", threadId, unreadOnly } = event.queryStringParameters || {};
            let sql;
            const params = [];
            let paramIndex = 1;
            if (threadId) {
                // Get specific thread
                sql = `
          SELECT
            m.id,
            m.message_id as "messageId",
            m.sender_id as "senderId",
            m.recipient_id as "recipientId",
            m.thread_id as "threadId",
            m.subject,
            m.content,
            m.nct_id as "nctId",
            m.is_read as "isRead",
            m.read_at as "readAt",
            m.created_at as "createdAt",
            COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as "senderName",
            u.email as "senderEmail"
          FROM messages m
          LEFT JOIN users u ON m.sender_id = u.user_id
          WHERE m.thread_id = $1
            AND (m.sender_id = $2 OR m.recipient_id = $2)
          ORDER BY m.created_at ASC
        `;
                params.push(threadId, userId);
            }
            else if (folder === "inbox") {
                sql = `
          SELECT DISTINCT ON (m.thread_id)
            m.id,
            m.message_id as "messageId",
            m.sender_id as "senderId",
            m.recipient_id as "recipientId",
            m.thread_id as "threadId",
            m.subject,
            m.content,
            m.nct_id as "nctId",
            m.is_read as "isRead",
            m.read_at as "readAt",
            m.created_at as "createdAt",
            COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as "senderName",
            u.email as "senderEmail",
            (SELECT COUNT(*) FROM messages m2 WHERE m2.thread_id = m.thread_id) as "messageCount",
            (SELECT COUNT(*) FROM messages m3 WHERE m3.thread_id = m.thread_id AND m3.recipient_id = $1 AND NOT m3.is_read) as "unreadCount"
          FROM messages m
          LEFT JOIN users u ON m.sender_id = u.user_id
          WHERE m.recipient_id = $1
        `;
                params.push(userId);
                paramIndex = 2;
                if (unreadOnly === "true") {
                    sql += ` AND NOT m.is_read`;
                }
                sql += ` ORDER BY m.thread_id, m.created_at DESC`;
            }
            else if (folder === "sent") {
                sql = `
          SELECT DISTINCT ON (m.thread_id)
            m.id,
            m.message_id as "messageId",
            m.sender_id as "senderId",
            m.recipient_id as "recipientId",
            m.thread_id as "threadId",
            m.subject,
            m.content,
            m.nct_id as "nctId",
            m.is_read as "isRead",
            m.read_at as "readAt",
            m.created_at as "createdAt",
            COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as "recipientName",
            u.email as "recipientEmail"
          FROM messages m
          LEFT JOIN users u ON m.recipient_id = u.user_id
          WHERE m.sender_id = $1
          ORDER BY m.thread_id, m.created_at DESC
        `;
                params.push(userId);
            }
            else {
                return cors.response(400, { ok: false, error: "Invalid folder" });
            }
            const result = await (0, db_1.query)(sql, params);
            // Get unread count
            const unreadResult = await (0, db_1.query)(`SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND NOT is_read`, [userId]);
            return cors.response(200, {
                ok: true,
                messages: result.rows,
                count: result.rows.length,
                unreadCount: parseInt(unreadResult.rows[0]?.count || 0),
            });
        }
        // POST - Send message
        if (event.httpMethod === "POST") {
            const csrfToken = (0, csrf_utils_1.getCsrfTokenFromHeaders)(event.headers);
            if (!csrfToken || !(0, csrf_utils_1.validateCsrfToken)(csrfToken)) {
                return cors.response(403, { error: "Invalid CSRF token" });
            }
            const body = event.body ? JSON.parse(event.body) : {};
            const { recipientId, subject, content, nctId, threadId } = body;
            if (!recipientId || !content) {
                return cors.response(400, {
                    ok: false,
                    error: "recipientId and content are required",
                });
            }
            const messageId = generateMessageId();
            const finalThreadId = threadId || generateThreadId();
            // Verify recipient exists
            const recipientCheck = await (0, db_1.query)(`SELECT user_id FROM users WHERE user_id = $1`, [recipientId]);
            if (recipientCheck.rows.length === 0) {
                return cors.response(404, { ok: false, error: "Recipient not found" });
            }
            const result = await (0, db_1.query)(`INSERT INTO messages (
          message_id, sender_id, recipient_id, thread_id, subject, content, nct_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          message_id as "messageId",
          thread_id as "threadId",
          created_at as "createdAt"`, [messageId, userId, recipientId, finalThreadId, subject || null, content, nctId || null]);
            await (0, db_1.logAuditEvent)(userId, "MESSAGE_SENT", "message", messageId, recipientId, { threadId: finalThreadId, hasNctId: !!nctId }, event.headers?.["x-forwarded-for"], event.headers?.["user-agent"]);
            return cors.response(201, {
                ok: true,
                message: "Message sent successfully",
                data: result.rows[0],
            });
        }
        // PUT - Mark as read
        if (event.httpMethod === "PUT") {
            const body = event.body ? JSON.parse(event.body) : {};
            const { messageId, threadId, action } = body;
            if (action === "markRead") {
                if (threadId) {
                    // Mark entire thread as read
                    await (0, db_1.query)(`UPDATE messages
             SET is_read = true, read_at = NOW()
             WHERE thread_id = $1 AND recipient_id = $2 AND NOT is_read`, [threadId, userId]);
                }
                else if (messageId) {
                    // Mark single message as read
                    await (0, db_1.query)(`UPDATE messages
             SET is_read = true, read_at = NOW()
             WHERE message_id = $1 AND recipient_id = $2`, [messageId, userId]);
                }
                else {
                    return cors.response(400, { ok: false, error: "messageId or threadId required" });
                }
                return cors.response(200, {
                    ok: true,
                    message: "Marked as read",
                });
            }
            if (action === "markAllRead") {
                await (0, db_1.query)(`UPDATE messages SET is_read = true, read_at = NOW() WHERE recipient_id = $1 AND NOT is_read`, [userId]);
                return cors.response(200, {
                    ok: true,
                    message: "All messages marked as read",
                });
            }
            return cors.response(400, { ok: false, error: "Invalid action" });
        }
        return cors.response(405, { error: "Method not allowed" });
    }
    catch (error) {
        console.error("Messages error:", error);
        return cors.response(500, {
            ok: false,
            error: error.message || "Internal server error",
        });
    }
};
exports.handler = handler;
