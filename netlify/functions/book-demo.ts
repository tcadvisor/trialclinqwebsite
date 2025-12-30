import { Handler } from "@netlify/functions";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const RECIPIENT_EMAIL = "chandler@trialcliniq.com";
const SENDER_EMAIL = "onboarding@resend.dev";

interface BookDemoData {
  type?: string;
  name?: string;
  email?: string;
  organization?: string;
  condition?: string;
  phone?: string;
  affiliation?: string;
  comments?: string;
  date?: string;
  time?: string;
  timezone?: string;
  subject?: string;
  message?: string;
}

function generateEmailContent(data: BookDemoData): { subject: string; html: string } {
  // Handle demo booking requests
  if (!data.type || data.type === "demo_booking" || data.date) {
    return {
      subject: "New Demo Booking Request - TrialClinIQ",
      html: `
        <h2>New Demo Booking Request</h2>
        <p><strong>Name:</strong> ${data.name || 'N/A'}</p>
        <p><strong>Email:</strong> ${data.email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
        <p><strong>Affiliation:</strong> ${data.affiliation || 'Not provided'}</p>
        <p><strong>Requested Date & Time:</strong> ${data.date ? `${data.date} at ${data.time} ${data.timezone}` : 'Not specified'}</p>
        ${data.comments ? `<p><strong>Comments:</strong></p><p>${data.comments.replace(/\n/g, '<br>')}</p>` : ''}
        <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
          <strong>Next Steps:</strong> Please review this booking request and contact the applicant at ${data.email} to confirm the appointment.
        </p>
      `,
    };
  }

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
    const data: BookDemoData = event.body ? JSON.parse(event.body) : {};

    // Validate required fields for demo booking
    if (!data.email || !data.name) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing required fields: name and email" }),
      };
    }

    const { subject, html } = generateEmailContent(data);

    console.log("📧 Sending booking email:", {
      to: RECIPIENT_EMAIL,
      subject,
      from: data.name,
      email: data.email
    });

    const result = await resend.emails.send({
      from: SENDER_EMAIL,
      to: RECIPIENT_EMAIL,
      subject,
      html,
      reply_to: data.email,
    });

    if (result.error) {
      console.error("❌ Resend error:", result.error);
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Failed to send email", details: result.error }),
      };
    }

    console.log("✅ Email sent successfully:", result.data?.id);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        ok: true,
        messageId: result.data?.id,
        message: "Booking request sent. You'll receive a confirmation email shortly."
      }),
    };
  } catch (err: any) {
    console.error("❌ Book demo handler error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err?.message || "Unknown error" }),
    };
  }
};

export { handler };
