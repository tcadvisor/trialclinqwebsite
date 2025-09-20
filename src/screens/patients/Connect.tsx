import React from "react";
import { Link, useNavigate } from "react-router-dom";
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

export default function Connect(): JSX.Element {
  const navigate = useNavigate();
  const [condition, setCondition] = React.useState("");
  const [healthy, setHealthy] = React.useState(false);
  const [year, setYear] = React.useState("");
  const [meds, setMeds] = React.useState("");
  const [docCount, setDocCount] = React.useState(0);

  const years = React.useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 80 }, (_, i) => String(now - i));
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate("/patients/login");
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-center text-3xl font-semibold">Connect to clinical trials</h1>
        <p className="mt-2 text-center text-gray-600">Tell us about any medical conditions you’ve been diagnosed with. This helps us find clinical trials that fit your health needs.</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-600">
          <button className="inline-flex items-center gap-1 rounded-full border px-3 py-1 hover:bg-gray-50" type="button">Why are we asking this? <span className="text-gray-400">ⓘ</span></button>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-lg bg-blue-50 text-blue-700">🔗</div>
            <div className="flex-1">
              <div className="font-medium">Match your Electronic Health Record (EHR) to trials</div>
              <p className="text-sm text-gray-600">Import your EHR to browse trials that fit your medical history and lab results with your consent.</p>
              <button type="button" onClick={()=>navigate("/search-results")} className="mt-3 inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-white text-sm hover:bg-black">Connect to Trial Portal →</button>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-5">
            <div>
              <label className="block text-sm font-medium">Primary Condition(s)*</label>
              <p className="text-xs text-gray-600 mt-1">You can add as many as apply. If you’re unsure of the exact name, type what you know, we’ll help match it.</p>
              <input value={condition} onChange={(e)=>setCondition(e.target.value)} className="mt-2 w-full rounded-full border px-4 py-2" placeholder="Search medical condition or keyword" />
              <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={healthy} onChange={(e)=>setHealthy(e.target.checked)} className="rounded" /> I am a healthy volunteer
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium">When were you diagnosed?*</label>
              <select value={year} onChange={(e)=>setYear(e.target.value)} className="mt-2 w-full rounded-full border px-4 py-2 text-gray-700">
                <option value="">Select year</option>
                {years.map((y)=> (<option key={y} value={y}>{y}</option>))}
              </select>
              <p className="text-xs text-gray-600 mt-1">This can help match you to trials requiring recent or long-term diagnoses.</p>
            </div>
            <div>
              <label className="block text-sm font-medium">Your Current Medications*</label>
              <p className="text-xs text-gray-600 mt-1">Include prescription, over-the-counter, or supplements you take regularly. Add as many as apply.</p>
              <input value={meds} onChange={(e)=>setMeds(e.target.value)} className="mt-2 w-full rounded-full border px-4 py-2" placeholder="Start typing a medication name (e.g. Metformin, Lis...)" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Upload medical documents*</label>
              <UploadBox onFiles={(files)=> setDocCount((prev)=> prev + (files ? files.length : 0))} />
            </div>
            <div className="pt-2">
              <button className="w-full rounded-full bg-[#1033e5] px-6 py-3 text-white font-medium hover:bg-blue-700">Create Volunteer Account</button>
              <div className="mt-2 text-center text-xs text-gray-600">Your data stays private and protected with HIPAA-compliant security.</div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
