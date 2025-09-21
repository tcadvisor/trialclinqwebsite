import React from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

export default function CreateAccount(): JSX.Element {
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    navigate("/providers/site-information");
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader active={undefined} />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-semibold text-center mb-8">Create Clinical Site Account</h1>

        <div className="rounded-2xl border shadow-sm p-6 md:p-8 bg-white">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">Email Address<span className="text-red-500">*</span></label>
              <input id="email" name="email" type="email" placeholder="Enter your email" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="phone">Phone Number<span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <select aria-label="Country" className="w-28 rounded-lg border px-2 py-2 bg-white">
                  <option>US</option>
                  <option>CA</option>
                  <option>UK</option>
                </select>
                <input id="phone" name="phone" type="tel" placeholder="+1 (555) 000-0000" className="flex-1 rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="firstName">Your First Name<span className="text-red-500">*</span></label>
                <input id="firstName" name="firstName" placeholder="Enter representative first name" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="lastName">Your Last Name<span className="text-red-500">*</span></label>
                <input id="lastName" name="lastName" placeholder="Enter representative last name" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="password">Password<span className="text-red-500">*</span></label>
              <input id="password" name="password" type="password" placeholder="Create a secure password" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="ref">How did you hear about us?</label>
              <input id="ref" name="ref" placeholder="How did you hear about us?" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <button className="w-full px-4 py-3 rounded-full bg-blue-600 text-white hover:bg-blue-700" type="submit">Get Started</button>
          </form>
          <p className="text-center text-xs text-gray-500 mt-3">
            By clicking the Sign up button you agree to Trialcliniq's latest <Link to="/patients/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
          </p>
        </div>

        <p className="text-sm text-gray-600 mt-6 text-center">Already have an account? <Link to="/providers/login" className="text-blue-600 hover:underline">Sign in</Link></p>
      </main>
    </div>
  );
}
