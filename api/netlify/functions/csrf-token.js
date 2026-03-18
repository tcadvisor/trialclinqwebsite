"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const csrf_utils_1 = require("./csrf-utils");
/**
 * Generate a new CSRF token
 * This endpoint is called when the app loads to get a fresh CSRF token
 */
const handler = async (event) => {
    // Handle OPTIONS preflight request
    if (event.httpMethod === "OPTIONS") {
        return (0, csrf_utils_1.corsWithCsrf)(204, "");
    }
    // Only allow GET requests
    if (event.httpMethod !== "GET") {
        return (0, csrf_utils_1.corsWithCsrf)(405, { error: "Method not allowed" });
    }
    try {
        // Generate a new CSRF token
        const csrfToken = (0, csrf_utils_1.generateCsrfToken)();
        console.log("✅ CSRF token generated successfully");
        // Return the token in both the response body and header
        return (0, csrf_utils_1.corsWithCsrf)(200, {
            ok: true,
            csrfToken,
            expiresIn: 3600, // 1 hour in seconds
        }, {
            "X-CSRF-Token": csrfToken,
        });
    }
    catch (error) {
        console.error("❌ Error generating CSRF token:", error);
        return (0, csrf_utils_1.corsWithCsrf)(500, {
            error: "Failed to generate CSRF token",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};
exports.handler = handler;
