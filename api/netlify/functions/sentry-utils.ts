import * as Sentry from "@sentry/node";
import type { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1,
  });
}

/**
 * Wraps a Netlify function handler so unhandled errors get
 * reported to Sentry before the response is returned.
 */
export function withSentry(handler: Handler): Handler {
  return async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
    try {
      return await handler(event, context);
    } catch (err) {
      if (dsn) {
        Sentry.captureException(err);
        await Sentry.flush(2000);
      }
      throw err;
    }
  };
}

export { Sentry };
