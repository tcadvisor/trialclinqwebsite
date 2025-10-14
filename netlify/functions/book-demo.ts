import { Handler } from "@netlify/functions";

const BOOKING_WEBHOOK = process.env.BOOKING_WEBHOOK_URL;

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  if (!BOOKING_WEBHOOK) {
    return { statusCode: 500, body: JSON.stringify({ error: "Webhook not configured" }) };
  }

  try {
    const payload = event.body || "";
    const res = await fetch(BOOKING_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { statusCode: 502, body: JSON.stringify({ error: "Upstream webhook error", status: res.status, body: text }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    return { statusCode: 502, body: JSON.stringify({ error: err?.message || String(err) }) };
  }
};

export { handler };
