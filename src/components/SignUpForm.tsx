import React, { useState } from "react";
import { Link } from "react-router-dom";
import { formatPhoneNumber, getPhoneValidationError, CountryCode } from "../lib/phoneValidation";

export type SignUpFormProps = {
  title: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  signInPath: string;
  privacyPath: string;
  error?: string | null;
  isLoading?: boolean;
};

export default function SignUpForm({ title, onSubmit, signInPath, privacyPath, error, isLoading }: SignUpFormProps): JSX.Element {
  const [country, setCountry] = useState<CountryCode>("US");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatPhoneNumber(value, country);
    setPhone(formatted);

    // Clear error on change, validate only on blur
    if (phoneError) {
      setPhoneError(null);
    }
  };

  const handlePhoneBlur = () => {
    if (phone.trim()) {
      const err = getPhoneValidationError(phone, country);
      setPhoneError(err);
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value as CountryCode;
    setCountry(newCountry);
    // Clear phone validation when country changes
    setPhoneError(null);
    setPhone("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Validate phone before submission
    if (phone.trim()) {
      const err = getPhoneValidationError(phone, country);
      if (err) {
        setPhoneError(err);
        e.preventDefault();
        return;
      }
    }
    onSubmit(e);
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-semibold text-center mb-8">{title}</h1>

      <div className="rounded-2xl border shadow-sm p-6 md:p-8 bg-white">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">Email Address<span className="text-red-500">*</span></label>
            <input id="email" name="email" type="email" placeholder="Enter your email" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="phone">Phone Number<span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <select value={country} onChange={handleCountryChange} aria-label="Country" className="w-28 rounded-lg border px-2 py-2 bg-white">
                <option value="US">US</option>
                <option value="CA">CA</option>
                <option value="UK">UK</option>
              </select>
              <div className="flex-1">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder={country === "UK" ? "+44 20 xxxx xxxx" : "(555) 000-0000"}
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={handlePhoneBlur}
                  className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${phoneError ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"}`}
                  required
                />
                {phoneError && (
                  <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                )}
              </div>
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
            <label className="block text-sm font-medium mb-1" htmlFor="ref">How did you hear about us?</label>
            <input id="ref" name="ref" placeholder="How did you hear about us?" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <button
            className="w-full px-4 py-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={!!isLoading}
          >
            {isLoading ? "Submitting..." : "Get Started"}
          </button>
        </form>
        <p className="text-center text-xs text-gray-500 mt-3">
          By clicking the Sign up button you agree to Trialcliniq's latest <Link to={privacyPath} className="text-blue-600 hover:underline">Privacy Policy</Link>.
        </p>
      </div>

      <p className="text-sm text-gray-600 mt-6 text-center">Already have an account? <Link to={signInPath} className="text-blue-600 hover:underline">Sign in</Link></p>
    </main>
  );
}
