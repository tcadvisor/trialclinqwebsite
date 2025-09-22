import React from "react";
import { useNavigate } from "react-router-dom";

export default function SignupProcessing(): JSX.Element {
  const navigate = useNavigate();

  React.useEffect(() => {
    const t = setTimeout(() => navigate("/patients/dashboard", { replace: true }), 3000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative mx-4 w-full max-w-2xl rounded-2xl bg-white p-8 shadow-xl">
        <button
          aria-label="Close"
          onClick={() => navigate("/patients/dashboard", { replace: true })}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
        <div className="mx-auto mb-6 h-36 w-36 rounded-full bg-gray-100 grid place-items-center">
          <div className="h-20 w-20 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        </div>
        <h2 className="text-center text-lg sm:text-xl font-semibold">Our AI is reviewing your eligibility based on trial requirements...</h2>
        <p className="mt-2 text-center text-sm text-gray-600">Please hold on, this will only take a few seconds</p>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
          <span className="inline-block h-3 w-3 rounded-full border border-gray-300" />
          <span>Your data stays private and protected with HIPAA-compliant security.</span>
        </div>
      </div>
    </div>
  );
}
