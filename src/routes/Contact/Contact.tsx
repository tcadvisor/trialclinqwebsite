import React from "react";
import { Link } from "react-router-dom";

export default function Contact(): JSX.Element {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png"
              alt="TrialCliniq Logo"
              className="h-8 w-auto"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-700">
            <Link to="/" className="hover:text-gray-900">Home</Link>
            <Link to="/search-results" className="hover:text-gray-900">Search Results</Link>
            <span className="text-gray-900 font-medium">Contact</span>
          </nav>
        </div>
      </header>

      <main className="px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-gray-600 mb-10">Have questions or need help? Send us a message and we’ll get back to you.</p>

          <form className="bg-white border rounded-2xl shadow p-6 grid gap-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">First name</label>
                <input className="w-full rounded-lg border px-3 py-2" type="text" name="firstName" required />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Last name</label>
                <input className="w-full rounded-lg border px-3 py-2" type="text" name="lastName" required />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Email</label>
              <input className="w-full rounded-lg border px-3 py-2" type="email" name="email" required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Message</label>
              <textarea className="w-full rounded-lg border px-3 py-2 h-32" name="message" required />
            </div>
            <button type="submit" className="rounded-full bg-blue-600 text-white px-6 py-3 hover:bg-blue-700 w-max">Send Message</button>
          </form>

          <div className="mt-10 grid md:grid-cols-3 gap-6 text-sm text-gray-700">
            <div className="bg-gray-50 border rounded-xl p-4">
              <div className="font-semibold text-gray-900 mb-1">Email</div>
              <div>support@trialcliniq.com</div>
            </div>
            <div className="bg-gray-50 border rounded-xl p-4">
              <div className="font-semibold text-gray-900 mb-1">Hours</div>
              <div>Mon–Fri, 9am–5pm EST</div>
            </div>
            <div className="bg-gray-50 border rounded-xl p-4">
              <div className="font-semibold text-gray-900 mb-1">Address</div>
              <div>Buffalo, NY</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
