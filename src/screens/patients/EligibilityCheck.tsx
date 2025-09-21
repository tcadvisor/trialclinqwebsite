import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../../lib/auth";

export default function EligibilityCheck(): JSX.Element {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    const params = new URLSearchParams(search);
    const useProfile = params.get("source") === "profile" || isAuthenticated;

    if (useProfile) {
      try {
        const raw = localStorage.getItem("tc_health_profile_v1");
        if (raw) {
          const hp = JSON.parse(raw) as any;
          const profile = {
            condition: hp.primaryCondition || "",
            healthy: false,
            year: hp.diagnosed || "",
            meds: Array.isArray(hp.medications) ? hp.medications.map((m: any) => m?.name).filter(Boolean).join(", ") : "",
            dob: "",
            age: hp.age ? parseInt(String(hp.age), 10) : undefined,
            zip: "",
            distance: "",
            gender: hp.gender || "",
            race: hp.race || "",
            language: hp.language || "",
          } as Record<string, any>;
          localStorage.setItem("tc_eligibility_profile", JSON.stringify(profile));
        } else {
          const nctId = params.get("nctId");
          navigate(`/patients/connect${nctId ? `?nctId=${encodeURIComponent(nctId)}` : ""}`);
          return;
        }
      } catch {
        const nctId = params.get("nctId");
        navigate(`/patients/connect${nctId ? `?nctId=${encodeURIComponent(nctId)}` : ""}`);
        return;
      }
    }

    const timer = setTimeout(() => {
      const nctId = params.get("nctId");
      navigate(`/patients/result${nctId ? `?nctId=${encodeURIComponent(nctId)}` : ""}`);
    }, 6000);
    return () => clearTimeout(timer);
  }, [navigate, search, isAuthenticated]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl mx-4 rounded-2xl bg-white shadow-xl p-8 text-center">
        {/* Close */}
        <button
          aria-label="Close"
          onClick={() => navigate(-1)}
          className="absolute right-3 top-3 rounded-full p-2 text-gray-500 hover:bg-gray-100"
        >
          ×
        </button>

        {/* Animated orb */}
        <div className="mx-auto mb-6 h-48 w-48 relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-100 via-white to-gray-200 shadow-inner" />
          {/* glow */}
          <div className="absolute -inset-2 rounded-full blur-2xl bg-gradient-to-tr from-blue-200/50 via-emerald-200/40 to-purple-200/40" />
          {/* orbit ring */}
          <div className="absolute inset-0 rounded-full border-2 border-white/40 animate-spin" style={{ animationDuration: "6s" }} />
          {/* orbiting dot */}
          <div className="absolute left-1/2 top-1/2 -ml-1 -mt-1 h-2 w-2 rounded-full bg-[#1033e5] shadow-md animate-[orbit_3s_linear_infinite]" />
          {/* second dot */}
          <div className="absolute left-1/2 top-1/2 -ml-1 -mt-1 h-2 w-2 rounded-full bg-emerald-500 shadow-md animate-[orbit_4s_linear_infinite]" style={{ transform: "rotate(180deg)" }} />
        </div>

        <h2 className="text-lg font-semibold">Our AI is reviewing your eligibility based on trial requirements…</h2>
        <p className="mt-1 text-sm text-gray-600">Please hold on, this will only take a few seconds</p>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-600">
          <Shield className="h-4 w-4" />
          <span>Your data stays private and protected with HIPAA-compliant security.</span>
        </div>

        {/* Local keyframes for fancy motion */}
        <style>{`
          @keyframes orbit {
            0%   { transform: rotate(0deg) translateX(80px) rotate(0deg); }
            100% { transform: rotate(360deg) translateX(80px) rotate(-360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
