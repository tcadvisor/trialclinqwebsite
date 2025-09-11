import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Settings as SettingsIcon, ShieldCheck, Bell, Lock } from "lucide-react";

export default function Settings(): JSX.Element {
  const [tab, setTab] = useState<"consent" | "notifications" | "security">("consent");

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img alt="TrialCliniq" className="h-8 w-auto" src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/patients/dashboard" className="hover:text-gray-600">Dashboard</Link>
            <Link to="/patients/eligible" className="hover:text-gray-600">Eligible Trials</Link>
            <Link to="/patients/health-profile" className="hover:text-gray-600">Health Profile</Link>
            <Link to="/patients/faq" className="hover:text-gray-600">Help Center</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/patients/settings" aria-label="Settings" className="h-9 w-9 grid place-items-center rounded-full border bg-white text-gray-700 hover:bg-gray-50">
              <SettingsIcon className="w-4 h-4" />
            </Link>
            <button className="h-9 px-3 rounded-full border bg-white text-gray-700 hover:bg-gray-50">OB</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">Settings</h1>

        <div className="flex items-center gap-6 text-sm border-b">
          <button onClick={() => setTab("consent")} className={`relative -mb-px pb-3 ${tab === "consent" ? "border-b-2 border-[#1033e5] text-gray-900" : "text-gray-600"}`}>
            Consent
          </button>
          <button onClick={() => setTab("notifications")} className={`relative -mb-px pb-3 ${tab === "notifications" ? "border-b-2 border-[#1033e5] text-gray-900" : "text-gray-600"}`}>
            Notifications
          </button>
          <button onClick={() => setTab("security")} className={`relative -mb-px pb-3 ${tab === "security" ? "border-b-2 border-[#1033e5] text-gray-900" : "text-gray-600"}`}>
            Security
          </button>
        </div>

        {tab === "consent" && <ConsentTab />}
        {tab === "notifications" && <NotificationsTab />}
        {tab === "security" && <SecurityTab />}
      </main>

      <footer className="w-full border-t mt-16">
        <div className="w-full max-w-[1200px] mx-auto px-4 py-6 text-sm text-gray-600 flex items-center justify-between">
          <span>Copyright © 2025 TrialCliniq.</span>
          <span>Terms · Privacy</span>
        </div>
      </footer>
    </div>
  );
}

function ConsentTab(): JSX.Element {
  const [checks, setChecks] = useState({
    section1: false,
    section2: false,
    section3: false,
    section4: false,
    final: false,
  });

  // persist to localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tc_consent");
      if (raw) setChecks(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("tc_consent", JSON.stringify(checks));
    } catch {}
  }, [checks]);

  const allSections = checks.section1 && checks.section2 && checks.section3 && checks.section4;
  const canConfirm = allSections && checks.final;

  return (
    <section className="mt-6 grid md:grid-cols-3 gap-4 items-start">
      <div className="md:col-span-2 space-y-4">
        <Card>
          <h3 className="text-lg font-medium">Consent to Collect, Use, and Store Personal Health Information for Clinical Trial Matching</h3>
          <p className="mt-2 text-sm text-gray-600">Thank you for choosing TrialCliniq. Before we continue, we need your permission to collect, process, and securely store your personal and medical information. This allows us to match you with clinical trials that fit your health profile now and in the future.</p>
          <CheckboxRow checked={checks.section1} onChange={(v)=>setChecks(s=>({...s, section1:v}))} label="I have read and understand the information above" />
        </Card>
        <Card>
          <h3 className="text-lg font-medium">What information will we collect?</h3>
          <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-1">
            <li>Basic personal details: name, date of birth, contact information, and language preferences.</li>
            <li>Medical information: health conditions, medications, lab results, medical history, and documents you upload (e.g., MRI reports, lab results, or doctor’s notes).</li>
            <li>Electronic Health Records (EHR) if you choose to connect them.</li>
          </ul>
          <CheckboxRow checked={checks.section2} onChange={(v)=>setChecks(s=>({...s, section2:v}))} label="I have read and understand the information above" />
        </Card>
        <Card>
          <h3 className="text-lg font-medium">How will we use your information?</h3>
          <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-1">
            <li>Securely review your information to find clinical trials you may qualify for.</li>
            <li>Notify you about matching trials and, with your permission, share your interest with research sites conducting those studies.</li>
            <li>Securely store your information to keep you updated about new clinical trials you might be eligible for in the future.</li>
            <li>You will have the option to manage your communication preferences at any time.</li>
          </ul>
          <CheckboxRow checked={checks.section3} onChange={(v)=>setChecks(s=>({...s, section3:v}))} label="I have read and understand the information above" />
        </Card>
        <Card>
          <h3 className="text-lg font-medium">Your rights</h3>
          <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-1">
            <li>Review, update, or delete the information you share with us.</li>
            <li>Withdraw from the platform and revoke your consent at any time, after which your data will be securely deleted.</li>
            <li>Your data is encrypted and stored in compliance with HIPAA and other applicable privacy regulations.</li>
          </ul>
          <CheckboxRow checked={checks.section4} onChange={(v)=>setChecks(s=>({...s, section4:v}))} label="I have read and understand the information above" />
        </Card>
        <Card>
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1 rounded" checked={checks.final} onChange={(e)=>setChecks(s=>({...s, final:e.target.checked}))} />
            <span className="text-sm text-gray-700">I have read and understand this consent form. I agree for TrialCliniq to collect, process, and securely store my personal and medical data to match me with current and future clinical trials until I choose to withdraw my consent.</span>
          </label>
          <div className="mt-4 flex items-center gap-3">
            <button disabled={!canConfirm} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${canConfirm ? "bg-[#1033e5] text-white hover:bg-blue-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}>Confirm consent</button>
            <span className="text-xs text-gray-500">Status: <span className={`font-medium ${canConfirm ? "text-emerald-700" : "text-gray-600"}`}>{canConfirm ? "Active" : "Inactive"}</span></span>
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <StatusCard />
      </div>
    </section>
  );
}

function NotificationsTab(): JSX.Element {
  const [emailAlerts, setEmailAlerts] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem("tc_notify_email") || "true"); } catch { return true; }
  });
  const [trialUpdates, setTrialUpdates] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem("tc_notify_trials") || "true"); } catch { return true; }
  });
  const [productNews, setProductNews] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem("tc_notify_news") || "false"); } catch { return false; }
  });
  useEffect(() => { localStorage.setItem("tc_notify_email", JSON.stringify(emailAlerts)); }, [emailAlerts]);
  useEffect(() => { localStorage.setItem("tc_notify_trials", JSON.stringify(trialUpdates)); }, [trialUpdates]);
  useEffect(() => { localStorage.setItem("tc_notify_news", JSON.stringify(productNews)); }, [productNews]);

  return (
    <section className="mt-6 grid md:grid-cols-3 gap-4 items-start">
      <div className="md:col-span-2 space-y-4">
        <Card>
          <div className="flex items-center gap-2 text-gray-700"><Bell className="w-4 h-4" /><h3 className="text-lg font-medium">Email notifications</h3></div>
          <ToggleRow label="Clinical trial matches and eligibility updates" checked={trialUpdates} onChange={setTrialUpdates} />
          <ToggleRow label="General account and security alerts" checked={emailAlerts} onChange={setEmailAlerts} />
          <ToggleRow label="Product updates and announcements" checked={productNews} onChange={setProductNews} />
        </Card>
      </div>
    </section>
  );
}

function SecurityTab(): JSX.Element {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const valid = next.length >= 8 && next === confirm && current.length > 0;
  return (
    <section className="mt-6 grid md:grid-cols-3 gap-4 items-start">
      <div className="md:col-span-2 space-y-4">
        <Card>
          <div className="flex items-center gap-2 text-gray-700"><Lock className="w-4 h-4" /><h3 className="text-lg font-medium">Change password</h3></div>
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <label className="text-sm text-gray-700">Current password<input value={current} onChange={(e)=>setCurrent(e.target.value)} type="password" className="mt-1 w-full rounded-md border px-3 py-2" /></label>
            <label className="text-sm text-gray-700">New password<input value={next} onChange={(e)=>setNext(e.target.value)} type="password" className="mt-1 w-full rounded-md border px-3 py-2" /></label>
            <label className="text-sm text-gray-700">Confirm new password<input value={confirm} onChange={(e)=>setConfirm(e.target.value)} type="password" className="mt-1 w-full rounded-md border px-3 py-2" /></label>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button disabled={!valid} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${valid ? "bg-gray-900 text-white hover:bg-black" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}>Update password</button>
            <span className="text-xs text-gray-500">Use at least 8 characters</span>
          </div>
        </Card>
      </div>
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="rounded-xl border bg-white p-4">{children}</div>;
}

function CheckboxRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }): JSX.Element {
  return (
    <label className="mt-3 flex items-start gap-3">
      <input type="checkbox" className="mt-1 rounded" checked={checked} onChange={(e)=>onChange(e.target.checked)} />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean)=>void }): JSX.Element {
  return (
    <div className="mt-3 flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <button onClick={()=>onChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-emerald-500" : "bg-gray-300"}`} aria-pressed={checked}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function StatusCard(): JSX.Element {
  const [status, setStatus] = useState<string>("Inactive");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tc_consent");
      if (!raw) return;
      const v = JSON.parse(raw) as { section1:boolean; section2:boolean; section3:boolean; section4:boolean; final:boolean };
      const active = v.section1 && v.section2 && v.section3 && v.section4 && v.final;
      setStatus(active ? "Active" : "Inactive");
    } catch {}
  }, []);
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm text-gray-600">Consent Status</div>
      <div className={`mt-2 text-lg font-semibold ${status === "Active" ? "text-green-700" : "text-gray-700"}`}>{status}</div>
      <div className="mt-2 text-xs text-gray-500">Last updated: {new Date().toLocaleDateString()}</div>
    </div>
  );
}
