import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HomeHeader from "../../components/HomeHeader";
import { formatPhoneNumber, getPhoneValidationError } from "../../lib/phoneValidation";
import { signUpUser } from "../../lib/simpleAuth";
import { useAuth } from "../../lib/auth";

export default function InvestigatorInformation(): JSX.Element {
  const navigate = useNavigate();
  const { signIn } = useAuth();
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
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consentData, setConsentData] = useState(false);
  const [consentComms, setConsentComms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial data from localStorage if it exists
  useEffect(() => {
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
    } catch (e) {
      console.error("Error loading provider profile from localStorage:", e);
    }
  }, []);

  // Auto-populate fields when "use my" checkboxes are toggled
  useEffect(() => {
    try {
      const pending = localStorage.getItem("pending_signup_v1");
      if (!pending) return;
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
    } catch {}
  }, [useMyName, useMyPhone, useMyEmail]);

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

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!consentData) {
      setError("You must consent to the use of your professional and site data to continue.");
      return;
    }

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

      // Create account with simple auth
      const result = await signUpUser({
        email: pending.email || "",
        password,
        firstName: pending.firstName || "",
        lastName: pending.lastName || "",
      });

      // Sign in the user after successful signup
      signIn({
        email: pending.email || "",
        firstName: pending.firstName || "",
        lastName: pending.lastName || "",
        userId: result.userId,
        role: "provider",
      });

      // Clean up pending signup data
      localStorage.removeItem("pending_signup_v1");
      localStorage.removeItem("pending_role_v1");

      // Navigate to provider dashboard
      navigate("/providers/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <HomeHeader />
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
              <label className="block text-sm font-medium mb-1">Affiliated Organization Name<span className="text-red-500">*</span></label>
              <input value={affiliatedOrg} onChange={(e) => setAffiliatedOrg(e.target.value)} placeholder="Enter the affiliated organization name" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Investigator Phone<span className="text-red-500">*</span></label>
              <input
                type="tel"
                value={investigatorPhone}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
                placeholder="(555) 000-0000"
                className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${phoneError ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"}`}
                required
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
              <label className="block text-sm font-medium mb-1">Investigator Email<span className="text-red-500">*</span></label>
              <input type="email" value={investigatorEmail} onChange={(e) => setInvestigatorEmail(e.target.value)} placeholder="Enter the primary email address for the investigator" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={useMyEmail} onChange={(e) => setUseMyEmail(e.target.checked)} className="h-4 w-4" />
                Use my email address
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Regulatory Authority<span className="text-red-500">*</span></label>
              <input value={regulatoryAuthority} onChange={(e) => setRegulatoryAuthority(e.target.value)} placeholder="Enter the regulatory authority overseeing the trials" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Regulatory Authority Address<span className="text-red-500">*</span></label>
              <input value={regulatoryAddress} onChange={(e) => setRegulatoryAddress(e.target.value)} placeholder="Enter the full mailing address of the regulatory authority" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Password<span className="text-red-500">*</span></label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required minLength={8} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password<span className="text-red-500">*</span></label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required minLength={8} />
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-700">
              <p>
                By registering, you consent to receive trial match leads and communication updates from TrialCliniq. Your site, investigator and admin data will be securely stored in compliance with HIPAA standards and will be used solely for trial matching and engagement services within this platform.
              </p>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border" checked={consentData} onChange={(e) => setConsentData(e.target.checked)} />
                I consent to the use of my professional and site data as described.
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border" checked={consentComms} onChange={(e) => setConsentComms(e.target.checked)} />
                I agree to receive email and SMS notifications for trial match leads and platform updates.
              </label>
              <p className="flex items-center gap-2 text-xs text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2a9 9 0 1 0 9 9A9.01 9.01 0 0 0 12 2Zm1 13h-2v-2h2Zm0-4h-2V7h2Z"/></svg>
                You may revoke consent at any time in Settings
              </p>
            </div>

            <button type="submit" disabled={isLoading} className="mt-2 w-full px-6 py-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{isLoading ? "Creating Account..." : "Create Account"}</button>

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
