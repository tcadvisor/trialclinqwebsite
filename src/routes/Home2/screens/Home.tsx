import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("Chronic Pain");
  const [location, setLocation] = useState("10090, Niagara falls, USA");

  const handleSearch = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    // Example: pass params in the URL
    const params = new URLSearchParams({
      q: query,
      loc: location,
    }).toString();
    navigate(`/search-results?${params}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="w-full bg-gray-100 p-4 text-center border-b">
        <div className="flex justify-center gap-4">
          <Link to="/">
            <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
              Home
            </button>
          </Link>
          <Link to="/search-results">
            <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
              Search Results
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-100 rounded-full px-4 py-2 mb-8 inline-block">
            <span className="text-sm font-medium">Privacy First</span>
            <span className="text-sm text-gray-600 ml-2">HIPAA-secure, patient-approved.</span>
          </div>

          <h1 className="text-5xl font-bold mb-6 text-gray-900">
            The smarter way to find the<br />
            right clinical trial
          </h1>

          <p className="text-xl mb-12 text-gray-600 max-w-2xl mx-auto">
            AI-driven clinical trial matches built around your health data.
          </p>

          <form
            onSubmit={handleSearch}
            className="bg-white rounded-2xl shadow-lg p-6 max-w-3xl mx-auto"
          >
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  I'm looking for a clinical trial
                </label>
                <input
                  type="text"
                  placeholder="Chronic Pain"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Near</label>
                <input
                  type="text"
                  placeholder="10090, Niagara falls, USA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
                >
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-16 text-gray-900">Why Choose TrialCliniq?</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-8 shadow">
              <div className="text-4xl mb-4">🧠</div>
              <h3 className="text-xl font-semibold mb-4">Advanced Matching Algorithm</h3>
              <p className="text-gray-600">Our AI-powered system matches you with the most relevant clinical trials.</p>
            </div>

            <div className="bg-white rounded-lg p-8 shadow">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-4">Secure Health Data</h3>
              <p className="text-gray-600">Your personal health information is protected with HIPAA compliance.</p>
            </div>

            <div className="bg-white rounded-lg p-8 shadow">
              <div className="text-4xl mb-4">👩‍⚕️</div>
              <h3 className="text-xl font-semibold mb-4">Expert Support</h3>
              <p className="text-gray-600">Get guidance from our team of clinical research experts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trial Journey */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-16">Your Trial Journey</h2>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">👤</span>
              </div>
              <p className="text-gray-700 leading-relaxed">
                Create a secure account and share basic health details or connect your EHR and sign consent
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🔍</span>
              </div>
              <p className="text-gray-700 leading-relaxed">
                Our system scans active trials based on your profile, diagnosis, and location then gets you matched
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">📋</span>
              </div>
              <p className="text-gray-700 leading-relaxed">
                Review eligible trials, consent to be contacted by research site and stay updated on new opportunities
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link to="/search-results">
              <button className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-full">
                Find A Trial
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 bg-gray-100">
        <div className="max-w-6xl mx-auto">
          {/* ... keep your footer content here ... */}
          <div className="border-t border-gray-200 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">Copyright © 2025 TrialCliniq.</p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <span className="text-gray-500 text-sm">Website by Apperr</span>
              <button className="text-gray-500 hover:text-gray-700 text-sm">Back to top</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
