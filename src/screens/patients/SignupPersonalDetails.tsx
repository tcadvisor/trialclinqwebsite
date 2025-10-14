import React from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

export default function SignupPersonalDetails(): JSX.Element {
  const navigate = useNavigate();
  const [age, setAge] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [race, setRace] = React.useState("");
  const [language, setLanguage] = React.useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!age || !weight || !gender || !race || !language) return;
    let prev: Record<string, unknown> = {};
    try {
      const raw = localStorage.getItem("tc_eligibility_profile");
      if (raw) prev = JSON.parse(raw) as Record<string, unknown>;
    } catch {}
    const next = { ...prev, age, weight, gender, race, language };
    try { localStorage.setItem("tc_eligibility_profile", JSON.stringify(next)); } catch {}
    navigate("/patients/processing");
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-center text-3xl font-semibold">Complete Your Personal Details</h1>
        <p className="mt-2 text-center text-gray-600">These details help personalize your trial matches and profile.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Age<span className="text-red-500">*</span></label>
                <input inputMode="numeric" pattern="[0-9]*" value={age} onChange={(e)=>setAge(e.target.value)} className="mt-2 w-full rounded-full border px-4 py-2" placeholder="e.g. 34" required />
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
                  {[
                    "Asian",
                    "Black / African American",
                    "White",
                    "Native American",
                    "Pacific Islander",
                    "Other",
                    "Prefer not to say",
                  ].map((r)=> (<option key={r} value={r}>{r}</option>))}
                </select>
              </div>
              <div className="sm:col-span-2">
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
            </div>
          </div>

          <button className="w-full rounded-full px-6 py-3 text-white font-medium bg-[#1033e5] hover:bg-blue-700">Continue</button>
          <div className="text-center text-xs text-gray-600">You can update these later from your Health Profile.</div>
        </form>
      </main>
    </div>
  );
}
