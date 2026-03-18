"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const path_1 = __importDefault(require("path"));
// Cache for loaded handlers
const handlerCache = {};
function buildEvent(req) {
    const headers = {};
    req.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
    });
    const contentType = (headers["content-type"] || "").toLowerCase();
    const isMultipart = contentType.includes("multipart/form-data");
    const rawBody = req.body ? String(req.body) : "";
    const bodyBuffer = Buffer.from(rawBody || "", isMultipart ? "binary" : "utf8");
    // Convert query params
    const queryStringParameters = {};
    const url = new URL(req.url);
    url.searchParams.forEach((value, key) => {
        queryStringParameters[key] = value;
    });
    return {
        httpMethod: req.method.toUpperCase(),
        headers,
        queryStringParameters,
        body: isMultipart ? bodyBuffer.toString("base64") : rawBody,
        isBase64Encoded: isMultipart,
    };
}
function toAzureResponse(result) {
    if (!result) {
        return { status: 500, body: "Internal error: empty response" };
    }
    const isBinary = result.isBase64Encoded && typeof result.body === "string";
    const body = isBinary ? Buffer.from(result.body, "base64") : result.body;
    // Convert headers
    const headers = {};
    if (result.headers) {
        for (const [key, value] of Object.entries(result.headers)) {
            if (value !== undefined && value !== null) {
                headers[key] = String(value);
            }
        }
    }
    return {
        status: result.statusCode || result.status || 200,
        headers,
        body,
    };
}
async function loadHandler(fnName) {
    // Check cache first
    if (fnName in handlerCache) {
        return handlerCache[fnName];
    }
    // Functions are compiled to JS in the same directory structure
    const fnPath = path_1.default.join(__dirname, "..", "netlify", "functions", `${fnName}.js`);
    try {
        const mod = await Promise.resolve(`${fnPath}`).then(s => __importStar(require(s)));
        const handler = mod.handler;
        handlerCache[fnName] = handler;
        return handler;
    }
    catch (err) {
        console.error(`Failed to load function '${fnName}':`, err);
        handlerCache[fnName] = null;
        return null;
    }
}
async function netlifyProxy(req, context) {
    // Extract function name from URL path
    // URL format: /api/{functionName} or /api/{functionName}/...
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Remove 'api' prefix if present
    const fnIndex = pathParts[0] === "api" ? 1 : 0;
    const fnName = pathParts[fnIndex];
    if (!fnName) {
        return { status: 404, body: "Function name not provided" };
    }
    const handler = await loadHandler(fnName);
    if (!handler) {
        return { status: 404, body: `Function '${fnName}' not found` };
    }
    try {
        const event = buildEvent(req);
        const result = await handler(event, {});
        return toAzureResponse(result);
    }
    catch (err) {
        console.error(`Function '${fnName}' execution error:`, err);
        return { status: 500, body: err?.message || "Internal server error" };
    }
}
// Register the HTTP trigger with Azure Functions v4
functions_1.app.http("netlify-proxy", {
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    authLevel: "anonymous",
    route: "{*segments}",
    handler: netlifyProxy,
});
