import React from "react";
import { useLocation } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import { signUpUser } from "../../lib/entraId";
import { generatePatientId } from "../../lib/patientIdUtils";

export default function SignupInfo(): JSX.Element {
  const { search } = useLocation();
  const nctParam = React.useMemo(() => new URLSearchParams(search).get("nctId") || "", [search]);
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  // Profile fields
  const [dob, setDob] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [zip, setZip] = React.useState("");
  const [distance, setDistance] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [race, setRace] = React.useState("");
  const [language, setLanguage] = React.useState("");
  const [conditions, setConditions] = React.useState<string[]>([]);
  const [conditionInput, setConditionInput] = React.useState("");
  const [diagnosisYears, setDiagnosisYears] = React.useState<Record<string, string>>({});
  const [healthy, setHealthy] = React.useState(false);
  const [medications, setMedications] = React.useState<string[]>([]);
  const [medInput, setMedInput] = React.useState("");
  const [agree1, setAgree1] = React.useState(false);
  const [agree2, setAgree2] = React.useState(false);

  const years = React.useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 80 }, (_, i) => String(now - i));
  }, []);

  const canSubmit = agree1 && agree2 && dob && weight && gender && race && language && zip && distance;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    let pending: any = null;
    try {
      const raw = localStorage.getItem("pending_signup_v1");
      pending = raw ? JSON.parse(raw) : null;
    } catch {}

    if (!pending?.email) {
      setError("Please start sign up from the patient registration form.");
      return;
    }

    setError("");
    setIsLoading(true);

    // Calculate age from DOB
    const dobDate = new Date(dob);
    const today = new Date();
    let calculatedAge = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) calculatedAge--;

    // Save to health profile (tc_health_profile_v1)
    const healthProfile = {
      patientId: "CUS_j2kthfmgv3bzr5r",
      email: pending?.email || "",
      emailVerified: false,
      age: String(calculatedAge),
      weight,
      phone: pending?.phone || "",
      gender,
      race,
      language,
      bloodGroup: "",
      genotype: "",
      hearingImpaired: false,
      visionImpaired: false,
      primaryCondition: !healthy && conditions.length > 0 ? conditions[0] : "",
      diagnosed: !healthy && conditions.length > 0 ? diagnosisYears[conditions[0]] || "" : "",
      allergies: [],
      medications: medications.map(m => ({ name: m })),
      additionalInfo: !healthy ? `Location: ${zip}, Travel Distance: ${distance}, Diagnosed Conditions: ${conditions.map(c => `${c} (${diagnosisYears[c] || 'unknown'})`).join(', ')}` : `Location: ${zip}, Travel Distance: ${distance}, Healthy Volunteer`,
      ecog: "",
      diseaseStage: "",
      biomarkers: "",
      priorTherapies: [],
      comorbidityCardiac: false,
      comorbidityRenal: false,
      comorbidityHepatic: false,
      comorbidityAutoimmune: false,
      infectionHIV: false,
      infectionHBV: false,
      infectionHCV: false
    };
    try { localStorage.setItem("tc_health_profile_v1", JSON.stringify(healthProfile)); } catch {}

    // Also save to eligibility profile for backwards compatibility
    const eligibilityProfile = {
      dob, weight, gender, race, language, zip, distance,
      conditions, diagnosisYears, healthy, medications
    };
    try { localStorage.setItem("tc_eligibility_profile", JSON.stringify(eligibilityProfile)); } catch {}

    try {
      localStorage.setItem("pending_role_v1", "patient");
      await signUpUser({
        email: pending.email,
        password: "",
        firstName: pending.firstName || "",
        lastName: pending.lastName || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed. Please try again.");
      setIsLoading(false);
    }
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
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
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
              {!healthy && (
                <>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={conditionInput}
                      onChange={(e)=>setConditionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (conditionInput.trim()) {
                            setConditions([...conditions, conditionInput.trim()]);
                            setConditionInput("");
                          }
                        }
                      }}
                      className="flex-1 w-full rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Search medical condition or keyword"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (conditionInput.trim()) {
                          setConditions([...conditions, conditionInput.trim()]);
                          setConditionInput("");
                        }
                      }}
                      className="rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
                    >
                      Add
                    </button>
                  </div>
                  {conditions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {conditions.map((cond, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 rounded-full bg-blue-50 px-3 py-2">
                          <span className="text-sm text-gray-900">{cond}</span>
                          <button
                            type="button"
                            onClick={() => setConditions(conditions.filter((_, i) => i !== idx))}
                            className="text-gray-500 hover:text-red-600 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {conditions.length === 0 && (
                <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={healthy} onChange={(e)=>setHealthy(e.target.checked)} className="rounded" /> I am a healthy volunteer
                </label>
              )}
            </div>
            {conditions.length > 0 && !healthy && (
              <>
                {conditions.map((cond) => (
                  <div key={cond}>
                    <label className="block text-sm font-medium">When were you diagnosed with {cond}?<span className="text-red-500">*</span></label>
                    <select
                      value={diagnosisYears[cond] || ""}
                      onChange={(e) => setDiagnosisYears({...diagnosisYears, [cond]: e.target.value})}
                      className="mt-2 w-full rounded-full border px-4 py-2 text-gray-700"
                      required
                    >
                      <option value="">Select year</option>
                      {years.map((y)=> (<option key={y} value={y}>{y}</option>))}
                    </select>
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium">Your Current Medications</label>
                  <p className="text-xs text-gray-600 mt-1">Include prescription, over-the-counter, or supplements you take regularly. Add as many as apply.</p>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={medInput}
                      onChange={(e)=>setMedInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (medInput.trim()) {
                            setMedications([...medications, medInput.trim()]);
                            setMedInput("");
                          }
                        }
                      }}
                      className="flex-1 w-full rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Start typing a medication name (e.g. Metformin, Lis...)"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (medInput.trim()) {
                          setMedications([...medications, medInput.trim()]);
                          setMedInput("");
                        }
                      }}
                      className="rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
                    >
                      Add
                    </button>
                  </div>
                  {medications.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {medications.map((med, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 rounded-full bg-blue-50 px-3 py-2">
                          <span className="text-sm text-gray-900">{med}</span>
                          <button
                            type="button"
                            onClick={() => setMedications(medications.filter((_, i) => i !== idx))}
                            className="text-gray-500 hover:text-red-600 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
            <button
              disabled={!canSubmit || isLoading}
              className={`w-full rounded-full px-6 py-3 text-white font-medium ${canSubmit && !isLoading ? "bg-[#1033e5] hover:bg-blue-700" : "bg-blue-400 cursor-not-allowed"}`}
            >
              {isLoading ? "Connecting to Microsoft..." : "Continue"}
            </button>
            <div className="text-center text-xs text-gray-600">Your data stays private and protected with HIPAA-compliant security.</div>
          </div>
        </form>
      </main>
    </div>
  );
}
