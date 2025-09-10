import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Mail, Lock, Phone, User, ArrowRight } from "lucide-react";

export default function GetStarted(): JSX.Element {
  const [who, setWho] = useState<'me' | 'other'>('me');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
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
            <Link to="/search-results" className="hover:text-gray-900">Find a Trial</Link>
            <Link to="/contact" className="hover:text-gray-900">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/get-started" className="px-4 py-2 text-sm rounded-full bg-blue-600 text-white hover:bg-blue-700">Get Started</Link>
          </div>
        </div>
      </header>

      <main className="px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-center text-4xl md:text-5xl font-extrabold text-gray-900">Sign up as a volunteer</h1>
          <p className="text-center text-gray-600 mt-2">Join TrialCliniq today and get matched to clinical trials or register someone in your care.</p>

          <button className="mt-6 w-full bg-white text-gray-800 border rounded-full py-3 shadow-sm hover:bg-gray-50 flex items-center justify-center gap-2">
            <img alt="Google" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" />
            Continue with Google
          </button>

          <div className="mt-6 bg-white border rounded-2xl shadow">
            <div className="px-6 py-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Who Are You Signing Up?<span className="text-red-500">*</span></label>
              <div className="inline-flex gap-2 bg-gray-100 p-1 rounded-full">
                <button type="button" onClick={() => setWho('me')} className={`px-4 py-1 rounded-full text-sm ${who==='me'?'bg-white shadow border':''}`}>Myself</button>
                <button type="button" onClick={() => setWho('other')} className={`px-4 py-1 rounded-full text-sm ${who==='other'?'bg-white shadow border':''}`}>Someone else</button>
              </div>

              <div className="mt-6 grid gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Your Full Name (as on medical records)<span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input className="w-full rounded-full border pl-9 pr-3 py-2.5" placeholder="Enter your full name" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Phone Number<span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <select className="rounded-full border px-3 py-2.5 text-sm">
                      <option>US</option>
                      <option>CA</option>
                    </select>
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input className="w-full rounded-full border pl-9 pr-3 py-2.5" placeholder="+1 (555) 000-0000" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Email Address<span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input className="w-full rounded-full border pl-9 pr-3 py-2.5" type="email" placeholder="Enter your email" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">We’ll use this to send trial match updates</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Password<span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input className="w-full rounded-full border pl-9 pr-3 py-2.5" type="password" placeholder="Create a secure password" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters.</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" className="rounded" /> Remember me
                </label>
                <button className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 text-white px-6 py-3 hover:bg-blue-700">
                  Get Started <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-xs text-gray-500 mt-2">By clicking the Sign up button you agree to Trialcliniq’s latest <a className="underline" href="#">Privacy Policy</a>.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
