import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import { formatPhoneNumber, getPhoneValidationError } from "../../lib/phoneValidation";
import { signUpUser } from "../../lib/entraId";

export default function InvestigatorInformation(): JSX.Element {
  const navigate = useNavigate();
  const [investigatorName, setInvestigatorName] = useState("");
  const [investigatorPhone, setInvestigatorPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [investigatorEmail, setInvestigatorEmail] = useState("");
  const [affiliatedOrg, setAffiliatedOrg] = useState("");
  const [regulatoryAuthority, setRegulatoryAuthority] = useState("");
  const [regulatoryAddress, setRegulatoryAddress] = useState("");
  const [useMyName, setUseMyName] = useState(false);
  const [useMyPhone, setUseMyPhone] = useState(false);
  const [useMyEmail, setUseMyEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial data from localStorage if it exists
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("tc_provider_profile_v1");
      if (raw) {
        const profile = JSON.parse(raw);
        if (profile.investigatorName) setInvestigatorName(profile.investigatorName);
        if (profile.investigatorPhone) setInvestigatorPhone(profile.investigatorPhone);
        if (profile.investigatorEmail) setInvestigatorEmail(profile.investigatorEmail);
        if (profile.affiliatedOrganization) setAffiliatedOrg(profile.affiliatedOrganization);
        if (profile.regulatoryAuthority) setRegulatoryAuthority(profile.regulatoryAuthority);
      }
      // Auto-populate from pending signup if available
      const pending = localStorage.getItem("pending_signup_v1");
      if (pending) {
        const pendingData = JSON.parse(pending);
        if (useMyName && pendingData.firstName && pendingData.lastName) {
          setInvestigatorName(`${pendingData.firstName} ${pendingData.lastName}`);
        }
        if (useMyPhone && pendingData.phone) {
          setInvestigatorPhone(pendingData.phone);
        }
        if (useMyEmail && pendingData.email) {
          setInvestigatorEmail(pendingData.email);
        }
      }
    } catch (e) {
      console.error("Error loading provider profile from localStorage:", e);
    }
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatPhoneNumber(value, "US");
    setInvestigatorPhone(formatted);

    if (phoneError) {
      setPhoneError(null);
    }
  };

  const handlePhoneBlur = () => {
    if (investigatorPhone.trim()) {
      const err = getPhoneValidationError(investigatorPhone, "US");
      setPhoneError(err);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Validate phone before submission
    if (investigatorPhone.trim()) {
      const err = getPhoneValidationError(investigatorPhone, "US");
      if (err) {
        setPhoneError(err);
        return;
      }
    }

    setIsLoading(true);

    try {
      // Save investigator information to localStorage
      const raw = localStorage.getItem("tc_provider_profile_v1");
      const existing = raw ? JSON.parse(raw) : {};
      const profile = {
        ...existing,
        investigatorName,
        investigatorPhone,
        investigatorEmail,
        affiliatedOrganization: affiliatedOrg,
        regulatoryAuthority,
        regulatoryAuthorityAddress: regulatoryAddress,
      };
      localStorage.setItem("tc_provider_profile_v1", JSON.stringify(profile));
      console.log("✅ Investigator information saved to localStorage");

      // Get pending signup info
      const pendingRaw = localStorage.getItem("pending_signup_v1");
      const pending = pendingRaw ? JSON.parse(pendingRaw) : {};

      // Now trigger Azure signup (mirrors patient flow after SignupInfo)
      await signUpUser({
        email: pending.email || "",
        password: "",
        firstName: pending.firstName || "",
        lastName: pending.lastName || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SiteHeader active={undefined} />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-semibold text-center">Investigator Information</h1>
        <p className="text-center text-gray-600 mt-2">Enter your site's contact and location details for trial coordination</p>

        <div className="mt-8 rounded-2xl border shadow-sm bg-white p-6 md:p-8">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium mb-1">Investigator Name<span className="text-red-500">*</span></label>
              <input value={investigatorName} onChange={(e) => setInvestigatorName(e.target.value)} placeholder="Enter full name of the site investigator" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={useMyName} onChange={(e) => setUseMyName(e.target.checked)} className="h-4 w-4" />
                Use my name as investigator
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Affiliated Organization Name<span className="text-gray-500">*</span></label>
              <input value={affiliatedOrg} onChange={(e) => setAffiliatedOrg(e.target.value)} placeholder="Enter the affiliated organization name" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Investigator Phone<span className="text-gray-500">*</span></label>
              <input
                type="tel"
                value={investigatorPhone}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
                placeholder="(555) 000-0000"
                className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${phoneError ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"}`}
              />
              {phoneError && (
                <p className="mt-1 text-sm text-red-600">{phoneError}</p>
              )}
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={useMyPhone} onChange={(e) => setUseMyPhone(e.target.checked)} className="h-4 w-4" />
                Use my phone number
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Investigator Email<span className="text-gray-500">*</span></label>
              <input type="email" value={investigatorEmail} onChange={(e) => setInvestigatorEmail(e.target.value)} placeholder="Enter the primary email address for the investigator" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={useMyEmail} onChange={(e) => setUseMyEmail(e.target.checked)} className="h-4 w-4" />
                Use my email address
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Regulatory Authority</label>
              <input value={regulatoryAuthority} onChange={(e) => setRegulatoryAuthority(e.target.value)} placeholder="Enter the regulatory authority overseeing the trials" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Regulatory Authority Address</label>
              <input placeholder="Enter the full mailing address of the regulatory authority" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="space-y-3 text-sm text-gray-700">
              <p>
                By registering, you consent to receive trial match leads and communication updates from TrialCliniq. Your site, investigator and admin data will be securely stored in compliance with HIPAA standards and will be used solely for trial matching and engagement services within this platform.
              </p>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border" />
                I consent to the use of my professional and site data as described.
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border" />
                I agree to receive email and SMS notifications for trial match leads and platform updates.
              </label>
              <p className="flex items-center gap-2 text-xs text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2a9 9 0 1 0 9 9A9.01 9.01 0 0 0 12 2Zm1 13h-2v-2h2Zm0-4h-2V7h2Z"/></svg>
                You may revoke consent at any time in Settings
              </p>
            </div>

            <button type="submit" className="mt-2 w-full px-6 py-3 rounded-full bg-blue-600 text-white hover:bg-blue-700">Create Account</button>

            <p className="text-xs text-gray-500 flex items-center gap-2 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2a9 9 0 1 0 9 9A9.01 9.01 0 0 0 12 2Zm1 13h-2v-2h2Zm0-4h-2V7h2Z"/></svg>
              Your data stays private and protected with HIPAA-compliant security.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
