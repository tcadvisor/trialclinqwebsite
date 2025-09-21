import { Link, useNavigate } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

export default function SiteInformation(): JSX.Element {
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    navigate("/providers/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SiteHeader active={undefined} />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-semibold text-center">Site Information</h1>
        <p className="text-center text-gray-600 mt-2">Enter your site's contact and location details for trial coordination</p>

        <div className="mt-8 rounded-2xl border shadow-sm bg-white p-6 md:p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium mb-1">Sponsoring Organization Type<span className="text-red-500">*</span></label>
              <select className="w-full rounded-lg border px-3 py-2 bg-white">
                <option value="">Select your organization type</option>
                <option>Hospital / Health System</option>
                <option>Academic Medical Center</option>
                <option>Private Practice</option>
                <option>Research Site Network</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sponsoring Organization Abbreviations</label>
              <input placeholder="Enter your organization acronym or abbreviation" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Parent Organizations</label>
              <input placeholder="Enter your parent organization if applicable" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Site Name<span className="text-red-500">*</span></label>
              <input placeholder="Enter your site name" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Country<span className="text-red-500">*</span></label>
                <select className="w-full rounded-lg border px-3 py-2 bg-white">
                  <option value="">Select country</option>
                  <option>United States</option>
                  <option>Canada</option>
                  <option>United Kingdom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State<span className="text-red-500">*</span></label>
                <select className="w-full rounded-lg border px-3 py-2 bg-white">
                  <option value="">Select state</option>
                  <option>California</option>
                  <option>New York</option>
                  <option>Texas</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Address<span className="text-red-500">*</span></label>
                <input placeholder="Enter site full address" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Zipcode<span className="text-red-500">*</span></label>
                <input placeholder="Enter zipcode" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Facility Type<span className="text-red-500">*</span></label>
              <select className="w-full rounded-lg border px-3 py-2 bg-white">
                <option value="">Select site type</option>
                <option>Outpatient Clinic</option>
                <option>Inpatient Facility</option>
                <option>Community Site</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Funding Organization<span className="text-red-500">*</span></label>
              <select className="w-full rounded-lg border px-3 py-2 bg-white">
                <option value="">Select your organization type</option>
                <option>Public</option>
                <option>Private</option>
                <option>Mixed</option>
              </select>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border" />
                Same as sponsoring organization
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Conditions Your Site Accepts<span className="text-red-500">*</span></label>
              <div className="flex items-start gap-2 rounded-full border px-3 py-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-1 text-gray-500"><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2"/></svg>
                <input placeholder="You can add as many as apply. If you're unsure of the exact name, type what you know, we'll help match it." className="flex-1 outline-none text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Languages spoken at site<span className="text-red-500">*</span></label>
              <div className="flex items-start gap-2 rounded-full border px-3 py-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-1 text-gray-500"><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2"/></svg>
                <input placeholder="You can add as many as apply. If you're unsure of the exact name, type what you know, we'll help match it." className="flex-1 outline-none text-sm" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link to="/providers/create" className="px-6 py-3 rounded-full border bg-white hover:bg-gray-50">Back</Link>
              <button type="submit" className="px-6 py-3 rounded-full bg-blue-600 text-white hover:bg-blue-700">Continue</button>
            </div>

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
