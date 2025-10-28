import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

function UploadBox({ onFiles }: { onFiles: (files: FileList | null) => void }) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  return (
    <div className="rounded-xl border p-4 bg-white">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 grid place-items-center rounded-lg bg-gray-100 text-gray-600">⬆️</div>
        <div className="flex-1">
          <div className="font-medium">Upload Medical Documents</div>
          <p className="text-sm text-gray-600">Help us match you to the right clinical trials by sharing relevant medical documents. Our AI will securely scan and extract information from your documents to improve trial matching.</p>
          <div className="mt-3">
            <button onClick={() => inputRef.current?.click()} type="button" className="rounded-full border px-4 py-2 text-sm hover:bg-gray-50">Upload</button>
            <input ref={inputRef} type="file" multiple className="hidden" onChange={(e)=>onFiles(e.target.files)} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupInfo(): JSX.Element {
  const navigate = useNavigate();
  const { search } = useLocation();
  const nctParam = React.useMemo(() => new URLSearchParams(search).get("nctId") || "", [search]);
  // Profile fields
  const [dob, setDob] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [zip, setZip] = React.useState("");
  const [distance, setDistance] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [race, setRace] = React.useState("");
  const [language, setLanguage] = React.useState("");
  const [condition, setCondition] = React.useState("");
  const [healthy, setHealthy] = React.useState(false);
  const [year, setYear] = React.useState("");
  const [meds, setMeds] = React.useState("");
  const [docCount, setDocCount] = React.useState(0);
  const [agree1, setAgree1] = React.useState(false);
  const [agree2, setAgree2] = React.useState(false);

  const years = React.useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 80 }, (_, i) => String(now - i));
  }, []);

  const canSubmit = agree1 && agree2 && dob && weight && gender && race && language && zip && distance;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const profile = {
      dob, weight, gender, race, language, zip, distance,
      condition, healthy, year, meds
    };
    try { localStorage.setItem("tc_eligibility_profile", JSON.stringify(profile)); } catch {}
    navigate(`/patients/check${nctParam ? `?nctId=${encodeURIComponent(nctParam)}` : ""}`);
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-center text-3xl font-semibold">Complete Your Signup Information</h1>
        <p className="mt-2 text-center text-gray-600">Answer a few quick questions to finish creating your account.</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-600">
          <button className="inline-flex items-center gap-1 rounded-full border px-3 py-1 hover:bg-gray-50" type="button">Why are we asking this? <span className="text-gray-400">ⓘ</span></button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Date of Birth<span className="text-red-500">*</span></label>
                <input type="date" value={dob} onChange={(e)=>setDob(e.target.value)} className="mt-2 w-full rounded-full border px-4 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium">Weight (lbs)<span className="text-red-500">*</span></label>
                <input inputMode="decimal" value={weight} onChange={(e)=>setWeight(e.target.value)} className="mt-2 w-full rounded-full border px-4 py-2" placeholder="e.g. 165" required />
              </div>
              <div>
                <label className="block text-sm font-medium">Biological Gender<span className="text-red-500">*</span></label>
                <select value={gender} onChange={(e)=>setGender(e.target.value)} className="mt-2 w-full rounded-full border px-4 py-2" required>
                  <option value="">Select gender</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Non-binary</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Race<span className="text-red-500">*</span></label>
                <select value={race} onChange={(e)=>setRace(e.target.value)} className="mt-2 w-full rounded-full border px-4 py-2" required>
                  <option value="">Select your race</option>
                  {["Asian","Black / African American","White","Native American","Pacific Islander","Other","Prefer not to say"].map((r)=> (<option key={r} value={r}>{r}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Primary Language Spoken<span className="text-red-500">*</span></label>
                <select value={language} onChange={(e)=>setLanguage(e.target.value)} className="mt-2 w-full rounded-full border px-4 py-2" required>
                  <option value="">Select language</option>
                  {[
                    "English",
                    "Spanish",
                    "French",
                    "German",
                    "Italian",
                    "Portuguese",
                  ].map((lng)=> (<option key={lng} value={lng}>{lng}</option>))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium">Your Location (City, State or ZIP)<span className="text-red-500">*</span></label>
                <input value={zip} onChange={(e)=>setZip(e.target.value)} className="mt-2 w-full rounded-full border px-4 py-2" placeholder="e.g. 10001 or Buffalo, NY" required />
              </div>
              <div>
                <label className="block text-sm font-medium">Travel Distance<span className="text-red-500">*</span></label>
                <select value={distance} onChange={(e)=>setDistance(e.target.value)} className="mt-2 w-full rounded-full border px-4 py-2" required>
                  <option value="">How far can you travel</option>
                  {["25mi","50mi","100mi","200mi","300mi","500mi","1000mi"].map((d)=> (<option key={d} value={d}>{d}</option>))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-5">
            <div>
              <label className="block text-sm font-medium">Primary Condition(s)</label>
              <p className="text-xs text-gray-600 mt-1">You can add as many as apply. If you’re unsure of the exact name, type what you know, we’ll help match it.</p>
              <input value={condition} onChange={(e)=>setCondition(e.target.value)} className="mt-2 w-full rounded-full border px-4 py-2" placeholder="Search medical condition or keyword" />
              <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={healthy} onChange={(e)=>setHealthy(e.target.checked)} className="rounded" /> I am a healthy volunteer
              </label>
            </div>
            {!healthy && (
              <>
                <div>
                  <label className="block text-sm font-medium">When were you diagnosed?<span className="text-red-500">*</span></label>
                  <select value={year} onChange={(e)=>setYear(e.target.value)} className="mt-2 w-full rounded-full border px-4 py-2 text-gray-700" required={!healthy}>
                    <option value="">Select year</option>
                    {years.map((y)=> (<option key={y} value={y}>{y}</option>))}
                  </select>
                  <p className="text-xs text-gray-600 mt-1">This can help match you to trials requiring recent or long-term diagnoses.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium">Your Current Medications</label>
                  <p className="text-xs text-gray-600 mt-1">Include prescription, over-the-counter, or supplements you take regularly. Add as many as apply.</p>
                  <input value={meds} onChange={(e)=>setMeds(e.target.value)} className="mt-2 w-full rounded-full border px-4 py-2" placeholder="Start typing a medication name (e.g. Metformin, Lis...)" />
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="rounded" checked={agree1} onChange={(e)=>setAgree1(e.target.checked)} /> I have read and agree to the Consent to Enroll and Privacy Policy.
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="rounded" checked={agree2} onChange={(e)=>setAgree2(e.target.checked)} /> I consent to share my (or the volunteer’s) health data for clinical trial matching under HIPAA-compliant protocols.
            </label>
            <div className="text-xs text-gray-600">You may revoke consent at any time in Settings</div>
            <button disabled={!canSubmit} className={`w-full rounded-full px-6 py-3 text-white font-medium ${canSubmit ? "bg-[#1033e5] hover:bg-blue-700" : "bg-blue-400 cursor-not-allowed"}`}>Continue</button>
            <div className="text-center text-xs text-gray-600">Your data stays private and protected with HIPAA-compliant security.</div>
          </div>
        </form>
      </main>
    </div>
  );
}
