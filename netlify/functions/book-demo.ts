import { Handler } from "@netlify/functions";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const RECIPIENT_EMAIL = "chandler@trialcliniq.com";
const SENDER_EMAIL = "onboarding@resend.dev";

interface FormData {
  type: string;
  name?: string;
  email?: string;
  organization?: string;
  condition?: string;
}

function generateEmailContent(data: FormData): { subject: string; html: string } {
  switch (data.type) {
    case "sponsor_demo":
      return {
        subject: "New Demo Request - TrialClinIQ",
        html: `
          <h2>New Demo Request</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Organization:</strong> ${data.organization}</p>
          <p>Please reach out to schedule a demo call.</p>
        `,
      };
    case "patient_waitlist":
      return {
        subject: "New Patient Waitlist Signup - TrialClinIQ",
        html: `
          <h2>New Patient Waitlist Signup</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>CNS Research Area:</strong> ${data.condition}</p>
          <p>A new patient has signed up for the waitlist.</p>
        `,
      };
    case "newsletter_signup":
      return {
        subject: "New Newsletter Subscriber - TrialClinIQ",
        html: `
          <h2>New Newsletter Subscriber</h2>
          <p><strong>Email:</strong> ${data.email}</p>
          <p>A new subscriber has joined the newsletter.</p>
        `,
      };
    default:
      return {
        subject: "New Form Submission - TrialClinIQ",
        html: `<pre>${JSON.stringify(data, null, 2)}</pre>`,
      };
  }
}

const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!resend || !RESEND_API_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Email service not configured" }),
    };
  }

  try {
    const data: FormData = event.body ? JSON.parse(event.body) : {};

    if (!data.type) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing form type" }),
      };
    }

    const { subject, html } = generateEmailContent(data);

    const result = await resend.emails.send({
      from: SENDER_EMAIL,
      to: RECIPIENT_EMAIL,
      subject,
      html,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Failed to send email", details: result.error }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ ok: true, messageId: result.data?.id }),
    };
  } catch (err: any) {
    console.error("Book demo handler error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err?.message || "Unknown error" }),
    };
  }
};

export { handler };
