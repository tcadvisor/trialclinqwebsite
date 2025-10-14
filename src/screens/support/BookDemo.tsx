import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Clock, Send, Building2, User, Mail, Phone } from "lucide-react";
import SiteHeader from "../../components/SiteHeader";

const WEBHOOK = import.meta.env.VITE_BOOKING_WEBHOOK_URL as string | undefined;

export default function BookDemo() {
  const navigate = useNavigate();
  const defaultTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [comments, setComments] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [tz, setTz] = useState(defaultTz);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function validate() {
    if (!name.trim()) return "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email.";
    if (!date) return "Please select a date.";
    if (!time) return "Please select a time.";
    return null;
  }

  function buildDetails() {
    const when = date && time ? new Date(`${date}T${time}`) : null;
    const whenStr = when ? `${when.toDateString()} ${time} (${tz})` : "";
    const lines = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      affiliation ? `Affiliation: ${affiliation}` : null,
      `When: ${whenStr}`,
      comments ? "\nComments:" : null,
      comments || null,
    ].filter(Boolean);
    return lines.join("\n");
  }

  async function sendViaWebhook(details: string) {
    if (!WEBHOOK) return false;
    try {
      const res = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "DEMO BOOKING",
          to: "chandler@trialcliniq.com",
          details,
          name,
          email,
          phone,
          affiliation,
          comments,
          date,
          time,
          timezone: tz,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  function openMailClient(details: string) {
    const to = encodeURIComponent("chandler@trialcliniq.com");
    const subject = encodeURIComponent("DEMO BOOKING");
    const body = encodeURIComponent(details);
    const mailto = `mailto:${to}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    const details = buildDetails();

    const webhookSent = await sendViaWebhook(details);
    if (webhookSent) {
      setSuccess(true);
      setSubmitting(false);
      setTimeout(() => navigate("/", { replace: true }), 1400);
      return;
    }

    try {
      openMailClient(details);
      setSuccess(true);
    } catch {
      setError("Unable to initiate email. Please email chandler@trialcliniq.com with your booking details.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader active={undefined} />

      <main className="px-4">
        <section className="max-w-5xl mx-auto pt-12 pb-8">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Book a Demo</h1>
          <p className="mt-3 text-gray-600 max-w-2xl">Pick a date and time that works for you. We’ll send the booking to our team with your contact details.</p>
        </section>

        <section className="max-w-5xl mx-auto pb-20 grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="text-sm text-gray-700">
                  <span className="block mb-1">Your name</span>
                  <div className="relative">
                    <User className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Jane Doe" aria-label="Your name" />
                  </div>
                </label>
                <label className="text-sm text-gray-700">
                  <span className="block mb-1">Email</span>
                  <div className="relative">
                    <Mail className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" aria-label="Email" />
                  </div>
                </label>
                <label className="text-sm text-gray-700">
                  <span className="block mb-1">Phone (optional)</span>
                  <div className="relative">
                    <Phone className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+1 555 000 1111" aria-label="Phone" />
                  </div>
                </label>
                <label className="text-sm text-gray-700">
                  <span className="block mb-1">Affiliation</span>
                  <div className="relative">
                    <Building2 className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <input type="text" value={affiliation} onChange={(e) => setAffiliation(e.target.value)} className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Hospital / Site / Organization" aria-label="Affiliation" />
                  </div>
                </label>
                <label className="text-sm text-gray-700 md:col-span-2">
                  <span className="block mb-1">Comments (optional)</span>
                  <textarea value={comments} onChange={(e) => setComments(e.target.value)} className="w-full min-h-32 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Anything we should know before the meeting?" aria-label="Comments" />
                </label>

                <label className="text-sm text-gray-700">
                  <span className="block mb-1">Date</span>
                  <div className="relative">
                    <Calendar className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Date" />
                  </div>
                </label>
                <label className="text-sm text-gray-700">
                  <span className="block mb-1">Time</span>
                  <div className="relative">
                    <Clock className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Time" />
                  </div>
                </label>
                <label className="text-sm text-gray-700">
                  <span className="block mb-1">Time zone</span>
                  <input type="text" value={tz} onChange={(e) => setTz(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Time zone" />
                </label>
              </div>

              {error && (
                <div role="alert" className="mt-4 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
              )}
              {success && (
                <div className="mt-4 rounded-lg bg-emerald-50 text-emerald-800 px-3 py-2 text-sm">Booking submitted. We’ll confirm by email.</div>
              )}

              <div className="mt-6 flex items-center gap-3">
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-5 py-2.5 font-medium hover:bg-blue-700 disabled:opacity-60">
                  <Send className="h-4 w-4" />
                  {submitting ? "Submitting…" : "Book demo"}
                </button>
                <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">Cancel</Link>
              </div>
            </form>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-5">
              <div className="font-medium">What happens next?</div>
              <p className="text-sm text-gray-600 mt-2">You’ll receive a confirmation email. If the time isn’t available, we’ll propose an alternative.</p>
            </div>
            <div className="rounded-2xl border bg-white p-5">
              <div className="font-medium">Prefer email?</div>
              <a className="text-sm text-blue-700 hover:underline" href="mailto:chandler@trialcliniq.com?subject=DEMO%20BOOKING">chandler@trialcliniq.com</a>
            </div>
          </aside>
        </section>
      </main>

      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 py-6 text-xs text-gray-500 flex items-center justify-between">
          <span>© {new Date().getFullYear()} TrialCliniq</span>
          <Link to="/patients/privacy" className="hover:text-gray-700">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
