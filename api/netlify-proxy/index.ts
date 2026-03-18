import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import path from "path";

type NetlifyHandler = (event: any, context?: any) => Promise<any>;

// Cache for loaded handlers
const handlerCache: Record<string, NetlifyHandler | null> = {};

function buildEvent(req: HttpRequest) {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const contentType = (headers["content-type"] || "").toLowerCase();
  const isMultipart = contentType.includes("multipart/form-data");

  const rawBody = req.body ? String(req.body) : "";
  const bodyBuffer = Buffer.from(rawBody || "", isMultipart ? "binary" : "utf8");

  // Convert query params
  const queryStringParameters: Record<string, string> = {};
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

function toAzureResponse(result: any): HttpResponseInit {
  if (!result) {
    return { status: 500, body: "Internal error: empty response" };
  }

  const isBinary = result.isBase64Encoded && typeof result.body === "string";
  const body = isBinary ? Buffer.from(result.body, "base64") : result.body;

  // Convert headers
  const headers: Record<string, string> = {};
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

async function loadHandler(fnName: string): Promise<NetlifyHandler | null> {
  // Check cache first
  if (fnName in handlerCache) {
    return handlerCache[fnName];
  }

  // Functions are compiled to JS in the same directory structure
  const fnPath = path.join(__dirname, "..", "netlify", "functions", `${fnName}.js`);

  try {
    const mod = await import(fnPath);
    const handler = mod.handler as NetlifyHandler;
    handlerCache[fnName] = handler;
    return handler;
  } catch (err) {
    console.error(`Failed to load function '${fnName}':`, err);
    handlerCache[fnName] = null;
    return null;
  }
}

async function netlifyProxy(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
  } catch (err: any) {
    console.error(`Function '${fnName}' execution error:`, err);
    return { status: 500, body: err?.message || "Internal server error" };
  }
}

// Register the HTTP trigger with Azure Functions v4
app.http("netlify-proxy", {
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "{*segments}",
  handler: netlifyProxy,
});
