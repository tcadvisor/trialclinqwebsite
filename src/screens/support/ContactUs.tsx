import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import UserActions from "../../components/UserActions";
import { Mail, Phone, Send } from "lucide-react";

export default function ContactUs() {
  const reasons = useMemo(
    () => [
      "General Question",
      "Patient Support",
      "Investigator / Provider",
      "Partnership / Business",
      "Press / Media",
      "Other",
    ],
    [],
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState(reasons[0]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const validate = () => {
    if (!name.trim()) return "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email.";
    if (!message.trim()) return "Please enter a message.";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    try {
      const to = encodeURIComponent("chandler@trialcliniq.com");
      const subject = encodeURIComponent(`${reason} - from ${name}`);
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\nReason: ${reason}\n\n${message}`,
      );
      const mailto = `mailto:${to}?subject=${subject}&body=${body}`;
      window.location.href = mailto;
      setSent(true);
    } catch (err) {
      setError("Unable to open email client. You can email us directly at chandler@trialcliniq.com.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              alt="TrialCliniq"
              className="h-8 w-auto"
              src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/" className="hover:text-gray-600">Home</Link>
            <Link to="/patients/find-trial" className="hover:text-gray-600">Find a Trial</Link>
            <Link to="/patients/faq" className="hover:text-gray-600">FAQ</Link>
            <span className="text-gray-900 font-medium">Contact</span>
          </nav>
          <UserActions />
        </div>
      </header>

      <main className="px-4">
        <section className="max-w-5xl mx-auto pt-12 pb-8">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Contact Us</h1>
          <p className="mt-3 text-gray-600 max-w-2xl">
            Have a question, need support, or want to partner with us? Send us a message and we’ll get back within 1–2 business days.
          </p>
        </section>

        <section className="max-w-5xl mx-auto pb-20 grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="text-sm text-gray-700">
                  <span className="block mb-1">Your name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Jane Doe"
                    aria-label="Your name"
                  />
                </label>
                <label className="text-sm text-gray-700">
                  <span className="block mb-1">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="you@example.com"
                    aria-label="Email"
                  />
                </label>
                <label className="text-sm text-gray-700 md:col-span-2">
                  <span className="block mb-1">Reason</span>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    aria-label="Reason"
                  >
                    {reasons.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-gray-700 md:col-span-2">
                  <span className="block mb-1">Message</span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full min-h-40 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="How can we help?"
                    aria-label="Message"
                  />
                </label>
              </div>

              {error && (
                <div role="alert" className="mt-4 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">
                  {error}
                </div>
              )}

              {sent && (
                <div className="mt-4 rounded-lg bg-emerald-50 text-emerald-800 px-3 py-2 text-sm">
                  We opened your email client with a pre-filled message. If it didn’t open, email us at <a className="underline" href="mailto:chandler@trialcliniq.com">chandler@trialcliniq.com</a>.
                </div>
              )}

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-5 py-2.5 font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  Send message
                </button>
                <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">Back to Home</Link>
              </div>
            </form>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-50 p-2"><Mail className="h-5 w-5 text-blue-700" /></div>
                <div>
                  <div className="font-medium">Email</div>
                  <a href="mailto:chandler@trialcliniq.com" className="text-sm text-gray-700 hover:underline">chandler@trialcliniq.com</a>
                  <div className="text-xs text-gray-500 mt-1">Response within 1–2 business days</div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-50 p-2"><Phone className="h-5 w-5 text-blue-700" /></div>
                <div>
                  <div className="font-medium">Phone</div>
                  <div className="text-sm text-gray-700">Coming soon</div>
                  <div className="text-xs text-gray-500 mt-1">Prefer email for the fastest reply</div>
                </div>
              </div>
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
