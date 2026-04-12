import { Handler } from "@netlify/functions";
import { Resend } from "resend";
import { validateCsrfToken, getCsrfTokenFromHeaders } from "./csrf-utils";
import { createCorsHandler } from "./cors-utils";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const RECIPIENT_EMAIL = "chandler@trialcliniq.com";
const SENDER_EMAIL = process.env.EMAIL_FROM || "noreply@trialcliniq.com";

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

function esc(str: string | undefined): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function generateEmailContent(data: BookDemoData): { subject: string; html: string } {
  // Handle demo booking requests
  if (!data.type || data.type === "demo_booking" || data.date) {
    return {
      subject: "New Demo Booking Request - TrialClinIQ",
      html: `
        <h2>New Demo Booking Request</h2>
        <p><strong>Name:</strong> ${esc(data.name) || 'N/A'}</p>
        <p><strong>Email:</strong> ${esc(data.email) || 'N/A'}</p>
        <p><strong>Phone:</strong> ${esc(data.phone) || 'Not provided'}</p>
        <p><strong>Affiliation:</strong> ${esc(data.affiliation) || 'Not provided'}</p>
        <p><strong>Requested Date & Time:</strong> ${data.date ? `${esc(data.date)} at ${esc(data.time)} ${esc(data.timezone)}` : 'Not specified'}</p>
        ${data.comments ? `<p><strong>Comments:</strong></p><p>${esc(data.comments).replace(/\n/g, '<br>')}</p>` : ''}
        <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
          <strong>Next Steps:</strong> Please review this booking request and contact the applicant at ${esc(data.email)} to confirm the appointment.
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
          <p><strong>Name:</strong> ${esc(data.name)}</p>
          <p><strong>Email:</strong> ${esc(data.email)}</p>
          <p><strong>Organization:</strong> ${esc(data.organization)}</p>
          <p>Please reach out to schedule a demo call.</p>
        `,
      };
    case "patient_waitlist":
      return {
        subject: "New Patient Waitlist Signup - TrialClinIQ",
        html: `
          <h2>New Patient Waitlist Signup</h2>
          <p><strong>Name:</strong> ${esc(data.name)}</p>
          <p><strong>Email:</strong> ${esc(data.email)}</p>
          <p><strong>CNS Research Area:</strong> ${esc(data.condition)}</p>
          <p>A new patient has signed up for the waitlist.</p>
        `,
      };
    case "newsletter_signup":
      return {
        subject: "New Newsletter Subscriber - TrialClinIQ",
        html: `
          <h2>New Newsletter Subscriber</h2>
          <p><strong>Email:</strong> ${esc(data.email)}</p>
          <p>A new subscriber has joined the newsletter.</p>
        `,
      };
    case "contact_form":
      return {
        subject: `New Contact Form Message - ${esc(data.subject) || 'TrialClinIQ'}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${esc(data.name)}</p>
          <p><strong>Email:</strong> ${esc(data.email)}</p>
          <p><strong>Subject:</strong> ${esc(data.subject)}</p>
          <p><strong>Message:</strong></p>
          <p>${data.message ? esc(data.message).replace(/\n/g, '<br>') : 'No message provided'}</p>
          <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
            <strong>Reply To:</strong> ${esc(data.email)}
          </p>
        `,
      };
    default:
      return {
        subject: "New Form Submission - TrialClinIQ",
        html: `<pre>${esc(JSON.stringify(data, null, 2))}</pre>`,
      };
  }
}

const handler: Handler = async (event) => {
  const cors = createCorsHandler(event);

  if (event.httpMethod === "OPTIONS") {
    return cors.handleOptions("POST,OPTIONS");
  }

  if (event.httpMethod !== "POST") {
    return cors.response(405, { error: "Method not allowed" });
  }

  // CSRF Protection: Validate CSRF token for state-changing operations
  const csrfToken = getCsrfTokenFromHeaders(event.headers as Record<string, string>);
  if (!csrfToken) {
    console.warn("CSRF validation failed: Missing CSRF token");
    return cors.response(403, { error: "Missing CSRF token" });
  }

  if (!validateCsrfToken(csrfToken)) {
    console.warn("CSRF validation failed: Invalid or expired CSRF token");
    return cors.response(403, { error: "Invalid or expired CSRF token" });
  }

  if (!resend || !RESEND_API_KEY) {
    return cors.response(500, { error: "Email service not configured" });
  }

  try {
    const data: BookDemoData = event.body ? JSON.parse(event.body) : {};

    // Validate required fields for demo booking
    if (!data.email || !data.name) {
      return cors.response(400, { error: "Missing required fields: name and email" });
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
      replyTo: data.email,
    });

    if (result.error) {
      console.error("❌ Resend error:", result.error);
      return cors.response(502, { error: "Failed to send email", details: result.error });
    }

    console.log("✅ Email sent successfully:", result.data?.id);

    return cors.response(200, {
      ok: true,
      messageId: result.data?.id,
      message: "Booking request sent. You'll receive a confirmation email shortly.",
    });
  } catch (err: any) {
    console.error("❌ Book demo handler error:", err);
    return cors.response(500, { error: err?.message || "Unknown error" });
  }
};

export { handler };
