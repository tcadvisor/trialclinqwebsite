import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

// only wire up Sentry when a DSN is actually configured
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    // capture every error
    sampleRate: 1.0,
    // sample 10% of transactions for perf monitoring
    tracesSampleRate: 0.1,
    // attach replay only when an error fires
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}

export default Sentry;
