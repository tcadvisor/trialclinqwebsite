import React from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

export default function InvestigatorInformation(): JSX.Element {
  const navigate = useNavigate();
  const [useMeForName, setUseMeForName] = React.useState(false);
  const [useMyPhone, setUseMyPhone] = React.useState(false);
  const [useMyEmail, setUseMyEmail] = React.useState(false);
  const [sameAsSponsor, setSameAsSponsor] = React.useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold text-center">Investigator Information</h1>
        <p className="mt-2 text-center text-gray-600">Enter your site's contact and location details for trial coordination</p>

        <form className="mt-6 rounded-2xl border bg-white p-5 shadow-sm space-y-4" onSubmit={(e)=>{e.preventDefault(); navigate("/providers/login");}}>
          <div>
            <label className="block text-xs font-medium text-gray-700">Investigator Name*</label>
            <input className="mt-2 w-full rounded-full border px-4 h-10 text-sm" placeholder="Enter full name of the site investigator" />
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="rounded" checked={useMeForName} onChange={(e)=>setUseMeForName(e.target.checked)} />
              Use my name as investigator
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Affiliated Organization Name*</label>
            <input className="mt-2 w-full rounded-full border px-4 h-10 text-sm" placeholder="Enter the affiliated organization name" />
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="rounded" checked={sameAsSponsor} onChange={(e)=>setSameAsSponsor(e.target.checked)} />
              Same as sponsoring organization
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Investigator Phone*</label>
            <input className="mt-2 w-full rounded-full border px-4 h-10 text-sm" placeholder="Enter the primary phone number for the investigator" />
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="rounded" checked={useMyPhone} onChange={(e)=>setUseMyPhone(e.target.checked)} />
              Use my phone number
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Investigator Email*</label>
            <input className="mt-2 w-full rounded-full border px-4 h-10 text-sm" placeholder="Enter the primary email address for the investigator" />
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="rounded" checked={useMyEmail} onChange={(e)=>setUseMyEmail(e.target.checked)} />
              Use my email address
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Regulatory Authority</label>
            <input className="mt-2 w-full rounded-full border px-4 h-10 text-sm" placeholder="Enter the regulatory authority overseeing the trials" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Regulatory Authority Address</label>
            <input className="mt-2 w-full rounded-full border px-4 h-10 text-sm" placeholder="Enter the full mailing address of the regulatory authority" />
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p>By registering, you consent to receive trial match leads and communication updates from TrialCliniq. Your site, investigator and admin data will be securely stored in compliance with HIPAA standards and will be used solely for trial matching and engagement services within this platform.</p>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              I consent to the use of my professional and site data as described.
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              I agree to receive email and SMS notifications for trial match leads and platform updates.
            </label>
            <div className="text-xs text-gray-500">You may revoke consent at any time in Settings</div>
          </div>

          <div className="pt-2">
            <button type="submit" className="w-full rounded-full bg-[#1033e5] px-5 py-2 text-sm text-white hover:bg-blue-700">Create Account</button>
          </div>

          <div className="text-xs text-gray-600 flex items-center gap-2"><span role="img" aria-label="lock">🔒</span> Your data stays private and protected with HIPAA-compliant security.</div>
        </form>
      </main>
    </div>
  );
}
