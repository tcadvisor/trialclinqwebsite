import React from "react";
import { Link } from "react-router-dom";

export default function SignIn(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img alt="TrialCliniq" className="h-8 w-auto" src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <span className="inline-flex items-center gap-1">Patients and Families <span className="text-gray-400">▾</span></span>
            <span className="inline-flex items-center gap-1">Sites & Investigators <span className="text-gray-400">▾</span></span>
            <a href="#contact" className="hover:text-gray-600">Contact Us</a>
            <a href="#about" className="hover:text-gray-600">About Us</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/signin" className="px-4 py-2 text-sm rounded-full border border-blue-600 text-blue-700 bg-white">Sign in</Link>
            <Link to="/patients/find-trial" className="px-4 py-2 text-sm rounded-full bg-blue-600 text-white hover:bg-blue-700">Get Started</Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-14">
        <h1 className="text-4xl font-semibold text-center">Welcome Back to TrialCliniq</h1>
        <p className="mt-2 text-center text-gray-600">Sign in to manage your trial matches, update your health profile, or continue your search.</p>

        <div className="mt-8">
          <button className="w-full inline-flex items-center justify-center gap-2 bg-white rounded-full border px-4 py-3 shadow-sm hover:bg-gray-50">
            <img alt="Google" src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5" />
            Continue with Google
          </button>
        </div>

        <div className="mt-6 mx-auto bg-white rounded-2xl border shadow-sm p-6">
          <form className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email Address</label>
              <input type="email" placeholder="Enter your email" className="mt-1 w-full rounded-full border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <input type="password" placeholder="Enter your password" className="mt-1 w-full rounded-full border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                Remember me
              </label>
              <a href="#" className="text-blue-600 hover:underline">Forgot password?</a>
            </div>
            <button type="submit" className="w-full rounded-full bg-blue-600 text-white py-2.5 hover:bg-blue-700">Sign in</button>
            <p className="text-xs text-center text-gray-500">By clicking the Sign in button you agree to TrialCliniq's latest <a className="underline" href="#">Privacy Policy</a>.</p>
          </form>
        </div>
      </main>

      <footer className="bg-white border-t">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-gray-500">
          <img alt="TrialCliniq" className="h-6 w-auto opacity-70" src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2-1.png" />
          <div className="flex gap-8">
            <span>Solutions</span>
            <span>Company</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
