import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, XCircle, Shield } from "lucide-react";

function Gauge({ value }: { value: number }): JSX.Element {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="w-56">
      <div
        className="mx-auto h-28 w-52 rounded-[140px] overflow-hidden relative"
        aria-label={`Compatibility ${pct}%`}
      >
        <div className="absolute inset-x-0 bottom-0 h-28 rounded-t-[140px] bg-gray-100" />
        <div
          className="absolute inset-x-0 bottom-0 h-28 rounded-t-[140px]"
          style={{
            background: `conic-gradient(#1033e5 ${pct*1.8}deg, #e5e7eb 0deg)`,
            mask: "radial-gradient(circle at 50% 100%, transparent 55%, black 56%)",
            WebkitMask: "radial-gradient(circle at 50% 100%, transparent 55%, black 56%)",
          }}
        />
      </div>
      <div className="text-center mt-2">
        <div className="text-2xl font-semibold">{pct}%</div>
        <div className="text-xs text-gray-600">Criteria passed</div>
      </div>
      <div className="mt-2 text-center">
        <button className="mx-auto rounded-full bg-gray-100 px-3 py-1 text-xs">COMPATIBILITY SCORE</button>
      </div>
    </div>
  );
}

export default function EligibilityResult(): JSX.Element {
  const navigate = useNavigate();
  const { search } = useLocation();

  // Reconstruct basic results from stored profile, or fall back to health profile
  const profile = React.useMemo(() => {
    try {
      const stored = localStorage.getItem("tc_eligibility_profile");
      if (stored) return JSON.parse(stored);
      const hpRaw = localStorage.getItem("tc_health_profile_v1");
      if (hpRaw) {
        const hp = JSON.parse(hpRaw);
        return {
          condition: hp.primaryCondition || "",
          year: hp.diagnosed || "",
          meds: Array.isArray(hp.medications) ? hp.medications.map((m: any)=>m?.name).filter(Boolean).join(", ") : "",
          age: hp.age ? parseInt(String(hp.age), 10) : undefined,
          gender: hp.gender || "",
          race: hp.race || "",
          language: hp.language || "",
        };
      }
    } catch {}
    return {} as any;
  }, []);

  const agePass = (() => {
    if (profile && typeof profile.age === "number") return profile.age >= 18;
    if (profile && profile.dob) {
      const ms = Date.parse(profile.dob);
      if (!Number.isNaN(ms)) {
        const age = Math.floor((Date.now() - ms) / (365.25 * 24 * 3600 * 1000));
        return age >= 18;
      }
    }
    return false;
  })();

  const checks: { label: string; pass: boolean }[] = [
    { label: "Condition match", pass: Boolean(profile.condition) },
    { label: "Location match", pass: Boolean(profile.zip || profile.distance) },
    { label: "Age requirement", pass: agePass },
    { label: "Gender requirement", pass: Boolean(profile.gender) },
    { label: "Race requirement", pass: Boolean(profile.race) },
    { label: "Language requirement", pass: Boolean(profile.language) },
  ];

  const passed = checks.filter(c => c.pass);
  const failed = checks.filter(c => !c.pass);
  const score = (passed.length / checks.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-3xl mx-4 rounded-2xl bg-white shadow-xl p-6 sm:p-8">
        <button aria-label="Close" onClick={() => navigate(-1)} className="absolute right-3 top-3 rounded-full p-2 text-gray-500 hover:bg-gray-100">×</button>
        <h2 className="text-center text-lg font-semibold">Great fit! You may qualify for this study.</h2>
        <p className="mt-1 text-center text-sm text-gray-600">Based on your answers, you passed {passed.length} out of {checks.length} eligibility criteria. See your match details below.</p>

        <div className="mt-6 grid sm:grid-cols-2 gap-6 items-center">
          <div className="flex items-center justify-center"><Gauge value={score} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="font-medium mb-2">Passed Criteria</div>
              <ul className="space-y-2 text-sm">
                {passed.map((c) => (
                  <li key={c.label} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {c.label}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-medium mb-2">Failed Criteria</div>
              <ul className="space-y-2 text-sm">
                {failed.length === 0 ? <li className="text-gray-600">None</li> : failed.map((c) => (
                  <li key={c.label} className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" /> {c.label}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-[#1033e5] text-white p-5">
          <div className="font-medium">Ready to connect with the trial center and learn about next steps?</div>
          <p className="text-sm text-white/90 mt-1">Create a free TrialCliniq account to securely send your eligibility report, contact the study coordinator, and get matched to other future studies you may qualify for.</p>
          <div className="mt-4 text-center">
            <button onClick={() => navigate("/patients/volunteer")} className="inline-flex items-center justify-center rounded-full bg-white text-gray-900 px-5 py-2 text-sm font-medium hover:bg-gray-100">Continue to Sign Up</button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-600"><Shield className="h-4 w-4" /> Your information is securely shared only with this research site and never sold.</div>
      </div>
    </div>
  );
}
