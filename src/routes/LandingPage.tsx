import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Users, FileText, Database, Lock, Activity } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorEmail, setSponsorEmail] = useState("");
  const [sponsorOrg, setSponsorOrg] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientCondition, setPatientCondition] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate("/patients/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png"
              alt="TrialClinIQ"
              className="h-8 w-auto"
            />
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="text-gray-700 hover:text-gray-900">
              Features
            </a>
            <a href="#about" className="text-gray-700 hover:text-gray-900">
              About
            </a>
            <a href="#sponsors-form" className="text-gray-700 hover:text-gray-900">
              For Sponsors & Sites
            </a>
            <Link to="/team" className="text-gray-700 hover:text-gray-900">
              Team
            </Link>
            <Link to="/contact" className="text-gray-700 hover:text-gray-900">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              to="/app"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Go to App
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Consent-Based EHR Aggregation + AI Matching for{" "}
              <span className="text-blue-600">CNS Trials</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Patient-centered trial discovery meets pre-screened, Consent-ready candidates. TrialClinIQ is a secure HIE that empowers CNS patients in life-changing clinical trials while keeping you in control of your health data.
            </p>
            <div className="flex gap-4 mb-8">
              <a
                href="#patients-form"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
              >
                For Patients: Join Waitlist
              </a>
              <a
                href="#sponsors-form"
                className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:border-gray-400"
              >
                For Sites: Request Demo
              </a>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xs">✓</span>
                </div>
                HIPAA Compliant
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xs">✓</span>
                </div>
                FDA Guidance Aligned
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xs">✓</span>
                </div>
                CNS Focused
              </div>
            </div>
          </div>
          <div className="rounded-2xl h-80 overflow-hidden">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F3ef0caf3200f4046b04c16f3c60b68c9%2F318a9ab815c44d8c8942e1b43b6fc8e5?format=webp&width=800"
              alt="Tech collaboration for clinical trials"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                About TrialClinIQ
              </h2>
              <p className="text-lg text-gray-600 mb-4">
                TrialClinIQ is a groundbreaking health information exchange platform designed to revolutionize how CNS patients discover and access clinical trials.
              </p>
              <p className="text-lg text-gray-600 mb-4">
                We believe patients should have control over their health data and easy access to life-changing clinical trials. Our platform combines secure data aggregation with AI-powered matching to connect the right patients with the right trials.
              </p>
              <p className="text-lg text-gray-600 mb-6">
                Founded with a mission to accelerate CNS trial enrollment while prioritizing patient privacy and consent, we're committed to advancing neurological and psychiatric research.
              </p>
              <div className="flex gap-6">
                <div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">100%</div>
                  <p className="text-sm text-gray-600">HIPAA Compliant</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
                  <p className="text-sm text-gray-600">Secure Access</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">FDA</div>
                  <p className="text-sm text-gray-600">Guidance Aligned</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl h-96 overflow-hidden">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2F3ef0caf3200f4046b04c16f3c60b68c9%2F1ad81274c36f413fa0aaf7af86a0c572?format=webp&width=800"
                alt="Medical records and stethoscope"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Your Health Records, Your Clinical Trial Choices
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              TrialClinIQ is a secure Health Information Exchange (HIE) that empowers you to access all your medical records. With your consent, our AI matches you to CNS clinical trials that could transform your care.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Health Information Exchange (HIE)
              </h3>
              <p className="text-gray-600">
                Centralized platform where patients can securely access and manage all their medical records from multiple providers in one place.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Consent-Based Data Sharing
              </h3>
              <p className="text-gray-600">
                Patients control assess—choose when and how to share their health data with our AI matching system that finds relevant trials.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                AI-Powered Trial Matching
              </h3>
              <p className="text-gray-600">
                With your consent, our AI analyzes your complete medical history to match you with relevant CNS clinical trials.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                CNS Trial Specialization
              </h3>
              <p className="text-gray-600">
                Focused exclusively on neurological and psychiatric trials with deep expertise in CNS disorders and therapies.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Real-Time Trial Access
              </h3>
              <p className="text-gray-600">
                Instant visibility into available CNS trials with detailed eligibility information for accurate patient engagement.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Comprehensive Record Integration
              </h3>
              <p className="text-gray-600">
                Seamlessly aggregates records from hospitals, clinics, labs, and other EHR systems for a complete health view.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Ready to Advance CNS Clinical Trials?
            </h2>
            <p className="text-lg text-gray-600">
              Partner with us to accelerate enrollment and connect patients to breakthrough therapies
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Sponsors & Sites */}
            <div id="sponsors-form" className="bg-white p-8 rounded-xl">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                For Sponsors & Sites
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                See how TrialClinIQ accelerates CNS trial enrollment with pre-screened, consent-ready candidates
              </p>
              <form className="space-y-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  placeholder="Work Email"
                  value={sponsorEmail}
                  onChange={(e) => setSponsorEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Organization"
                  value={sponsorOrg}
                  onChange={(e) => setSponsorOrg(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">
                  Book Demo Call
                </button>
              </form>
            </div>

            {/* Patients */}
            <div id="patients-form" className="bg-white p-8 rounded-xl">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                For Patients
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                Be first to access our HIE platform and get matched to CNS clinical trials
              </p>
              <form className="space-y-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <input
                  type="text"
                  placeholder="CNS Research Area (e.g., Alzheimer's)"
                  value={patientCondition}
                  onChange={(e) => setPatientCondition(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button className="w-full bg-teal-600 text-white py-2 rounded-lg font-medium hover:bg-teal-700">
                  Join Waitlist
                </button>
              </form>
            </div>

            {/* Newsletter */}
            <div className="bg-white p-8 rounded-xl">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <Mail className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Newsletter
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                CNS clinical trial insights and trends. Get weekly insights on CNS trial innovations, neuroscience breakthroughs
              </p>
              <form className="space-y-4">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700">
                  Subscribe
                </button>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>✓ CNS trial innovations</li>
                  <li>✓ Neuroscience breakthroughs</li>
                </ul>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Get in Touch
            </h2>
            <p className="text-lg text-gray-600">
              Have questions? We'd love to hear from you. Contact us today.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 max-w-2xl mx-auto p-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
                <a
                  href="mailto:info@trialcliniq.com"
                  className="text-blue-600 hover:text-blue-700"
                >
                  info@trialcliniq.com
                </a>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  For Partnership Inquiries
                </h3>
                <a
                  href="mailto:partnerships@trialcliniq.com"
                  className="text-blue-600 hover:text-blue-700"
                >
                  partnerships@trialcliniq.com
                </a>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  For Patient Support
                </h3>
                <a
                  href="mailto:support@trialcliniq.com"
                  className="text-blue-600 hover:text-blue-700"
                >
                  support@trialcliniq.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-600">
            <p>&copy; 2024 TrialClinIQ. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
