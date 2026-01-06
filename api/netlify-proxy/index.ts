import type { AzureFunction, Context, HttpRequest } from "@azure/functions";
import path from "path";

// Allow importing the TypeScript Netlify functions without a separate build step
import "ts-node/register/transpile-only";

type NetlifyHandler = (event: any, context?: any) => Promise<any>;

function buildEvent(req: HttpRequest) {
  const headers = req.headers || {};
  const contentType = (headers["content-type"] || headers["Content-Type"] || "").toLowerCase();
  const isMultipart = contentType.includes("multipart/form-data");

  // Azure Functions exposes rawBody as a string; convert to Buffer so we can produce base64 when needed
  const rawBody = (req as any).rawBody ?? (typeof req.body === "string" ? req.body : req.body ? JSON.stringify(req.body) : "");
  const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(rawBody || "", isMultipart ? "binary" : "utf8");

  return {
    httpMethod: (req.method || "GET").toUpperCase(),
    headers,
    queryStringParameters: req.query,
    body: isMultipart ? bodyBuffer.toString("base64") : rawBody,
    isBase64Encoded: isMultipart,
  };
}

function toAzureResponse(result: any) {
  if (!result) {
    return { status: 500, body: "Internal error: empty response" };
  }

  const isBinary = result.isBase64Encoded && typeof result.body === "string";
  const body = isBinary ? Buffer.from(result.body, "base64") : result.body;

  return {
    status: result.statusCode || result.status || 200,
    headers: result.headers,
    body,
    isRaw: isBinary,
  };
}

async function loadHandler(fnName: string): Promise<NetlifyHandler | null> {
  // Functions are copied into api/netlify/functions during build
  const fnPathTs = path.join(__dirname, "..", "netlify", "functions", `${fnName}.ts`);
  const fnPathJs = path.join(__dirname, "..", "netlify", "functions", `${fnName}.js`);

  try {
    // Try TS first (compiled on-the-fly by ts-node), then JS
    const mod = await import(fnPathTs).catch(async () => import(fnPathJs));
    return mod.handler as NetlifyHandler;
  } catch (err) {
    console.error(`Failed to load function '${fnName}':`, err);
    return null;
  }
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  const segments = (context.bindingData as any)?.segments as string | undefined;
  const parts = (segments || "").split("/").filter(Boolean);
  const fnName = parts[0];

  if (!fnName) {
    context.res = { status: 404, body: "Function name not provided" };
    return;
  }

  const handler = await loadHandler(fnName);
  if (!handler) {
    context.res = { status: 404, body: `Function '${fnName}' not found` };
    return;
  }

  try {
    const event = buildEvent(req);
    const result = await handler(event, {});
    context.res = toAzureResponse(result);
  } catch (err: any) {
    console.error(`Function '${fnName}' execution error:`, err);
    context.res = { status: 500, body: err?.message || "Internal server error" };
  }
};

export default httpTrigger;
