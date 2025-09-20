import React from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

export default function SiteInformation(): JSX.Element {
  const navigate = useNavigate();
  const [sameAsSponsor, setSameAsSponsor] = React.useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold text-center">Site Information</h1>
        <p className="mt-2 text-center text-gray-600">Enter your site's contact and location details for trial coordination</p>

        <form className="mt-6 rounded-2xl border bg-white p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Sponsoring Organization Type*</label>
            <select className="mt-2 w-full rounded-full border px-4 h-10 text-sm">
              <option>Select your organization type</option>
              <option>Hospital/Clinic</option>
              <option>Academic</option>
              <option>Research Network</option>
              <option>Private Practice</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Sponsoring Organization Abbreviations</label>
            <input className="mt-2 w-full rounded-full border px-4 h-10 text-sm" placeholder="Enter your organization acronym or abbreviation" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Parent Organizations</label>
            <input className="mt-2 w-full rounded-full border px-4 h-10 text-sm" placeholder="Enter your parent organization if applicable" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Site Name*</label>
            <input className="mt-2 w-full rounded-full border px-4 h-10 text-sm" placeholder="Enter your site name" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700">Country*</label>
              <select className="mt-2 w-full rounded-full border px-4 h-10 text-sm">
                <option>Select country</option>
                <option>United States</option>
                <option>Canada</option>
                <option>United Kingdom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">State*</label>
              <select className="mt-2 w-full rounded-full border px-4 h-10 text-sm">
                <option>Select state</option>
                <option>NY</option>
                <option>CA</option>
                <option>TX</option>
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700">Address*</label>
              <input className="mt-2 w-full rounded-full border px-4 h-10 text-sm" placeholder="Enter site full address" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Zipcode*</label>
              <input className="mt-2 w-full rounded-full border px-4 h-10 text-sm" placeholder="Enter zipcode" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Facility Type*</label>
            <select className="mt-2 w-full rounded-full border px-4 h-10 text-sm">
              <option>Select site type</option>
              <option>Outpatient</option>
              <option>Inpatient</option>
              <option>Both</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Funding Organization*</label>
            <select className="mt-2 w-full rounded-full border px-4 h-10 text-sm">
              <option>Select your organization type</option>
              <option>Private</option>
              <option>Government</option>
              <option>Foundation</option>
            </select>
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="rounded" checked={sameAsSponsor} onChange={(e)=>setSameAsSponsor(e.target.checked)} />
              Same as sponsoring organization
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Conditions Your Site Accepts*</label>
            <div className="mt-2 rounded-full border px-4 h-10 flex items-center text-sm text-gray-500">
              You can add as many as apply. If you're unsure of the exact name, type what you know, we'll help match it.
            </div>
            <input className="mt-2 w-full rounded-full border px-4 h-10 text-sm" placeholder="Search conditions" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Languages spoken at site*</label>
            <div className="mt-2 rounded-full border px-4 h-10 flex items-center text-sm text-gray-500">
              You can add as many as apply. If you're unsure of the exact name, type what you know, we'll help match it.
            </div>
            <input className="mt-2 w-full rounded-full border px-4 h-10 text-sm" placeholder="Search languages" />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={()=>navigate(-1)} className="rounded-full border px-5 py-2 text-sm hover:bg-gray-50">Back</button>
            <button type="button" onClick={()=>navigate("/providers/login")} className="rounded-full bg-[#1033e5] px-5 py-2 text-sm text-white hover:bg-blue-700">Continue</button>
          </div>

          <div className="text-xs text-gray-600 flex items-center gap-2"><span role="img" aria-label="lock">🔒</span> Your data stays private and protected with HIPAA-compliant security.</div>
        </form>
      </main>
    </div>
  );
}
