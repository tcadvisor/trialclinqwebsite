import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, CheckCircle2, Shield, UserRound, ArrowRight } from "lucide-react";
import HomeHeader from "../../../components/HomeHeader";
import { useAuth } from "../../../lib/auth";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [showBanner, setShowBanner] = useState(true);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const faq = useMemo(
    () => [
      {
        q: "What is a Clinical Trial?",
        a: "A research study to evaluate medical, surgical, or behavioral interventions. Participation is always voluntary and you may withdraw at any time.",
      },
      {
        q: "Is my data private?",
        a: "Yes. We follow strict security practices and only use your data to match you to trials, with your consent.",
      },
      {
        q: "Who is eligible to join?",
        a: "Eligibility depends on the trial. We help you understand if a study is a good fit based on age, diagnosis, and location.",
      },
    ],
    [],
  );

  const handleSearch = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams({ q: query, loc: location }).toString();
    navigate(`/search-results?${params}`);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {showBanner && (
        <div className="w-full bg-gray-900 text-white text-sm px-4 py-2 flex items-center justify-center gap-2">
          <span>This announcement banner can be used to inform visitors of something important!</span>
          <button aria-label="Dismiss" className="ml-2 text-white/80 hover:text-white" onClick={() => setShowBanner(false)}>✕</button>
        </div>
      )}

      <HomeHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(1200px 400px at 60% 20%, rgba(16,51,229,0.08), transparent 60%), radial-gradient(600px 300px at 30% 50%, rgba(16,229,157,0.08), transparent 60%)",
          }}
        />
        <div className="max-w-5xl mx-auto px-4 pt-14 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 text-xs font-medium">
            <span>Privacy First</span>
            <span className="text-gray-500">HIPAA-secure, patient-approved.</span>
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight">
            The smarter way to find the
            <br className="hidden sm:block" />
            right clinical trial
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            AI-driven clinical trial matches built around your health data.
          </p>

          <form
            onSubmit={handleSearch}
            className="mt-10 bg-white/80 backdrop-blur rounded-2xl shadow-xl ring-1 ring-black/5 p-5 sm:p-7 max-w-3xl mx-auto"
          >
            <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 items-end">
              <label className="text-left text-xs text-gray-600 sm:col-span-1">
                <div className="mb-1">I'm looking for a clinical trial</div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Chronic Pain"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 placeholder:text-gray-400/80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Condition"
                />
              </label>
              <label className="text-left text-xs text-gray-600 sm:col-span-1">
                <div className="mb-1">Near</div>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Niagara Falls, NY"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 placeholder:text-gray-400/80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Location"
                />
              </label>
              <button
                type="submit"
                className="sm:col-span-1 inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 text-white px-3 py-2 text-sm font-medium hover:bg-blue-700"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          </form>

          <div className="mt-4 max-w-3xl mx-auto text-left">
            <div className="rounded-2xl border bg-white/70 backdrop-blur p-4 sm:p-6 flex items-start gap-3">
              <div className="shrink-0 rounded-full bg-blue-50 p-2"><Shield className="h-5 w-5 text-blue-700" /></div>
              <div className="text-sm">
                <div className="font-semibold">Match your Electronic Health Record (EHR) to trials</div>
                <div className="text-gray-600">Import your EHR to browse trials that fit your medical history and lab results — securely and with your consent.</div>
              </div>
              {user ? (
                <Link to="/patients/ehr" className="ml-auto inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-white text-sm hover:bg-black">
                  Connect to Trial Portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  onClick={() => setShowSignupModal(true)}
                  className="ml-auto inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-white text-sm hover:bg-black"
                >
                  Connect to Trial Portal
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Trusted sources */}
      <section id="trusted" className="py-16 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div className="grid grid-cols-3 gap-4">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F3ef0caf3200f4046b04c16f3c60b68c9%2Fc72a3e8ce37647129222f353e12e04d1?format=webp&width=800"
              alt="Healthcare professional with patient"
              className="aspect-[4/5] rounded-3xl object-cover"
            />
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F3ef0caf3200f4046b04c16f3c60b68c9%2Ffacc7c2898e24668b8ebefd37e17c7ca?format=webp&width=800"
              alt="Doctor consulting with patient"
              className="aspect-[4/5] rounded-3xl object-cover translate-y-6"
            />
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F3ef0caf3200f4046b04c16f3c60b68c9%2F05aeac203c0a447fa2c7d7cd8faf2429?format=webp&width=800"
              alt="Medical professional with patient"
              className="aspect-[4/5] rounded-3xl object-cover"
            />
          </div>
          <div>
            <h2 className="text-3xl font-semibold mb-4">Powered by Trusted Sources</h2>
            <p className="text-gray-600 mb-6">We pull trial listings directly from ClinicalTrials.gov and other verified research networks.</p>
            <ul className="space-y-3">
              {[
                "Match patients using AI and EHR integrations",
                "Export pre-screening and eligibility insights instantly",
                "Connect to ClinicalTrials.gov in real-time",
                "Track conversions, funnel drop-offs, and lead sources",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <span className="text-gray-700">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Why */}
      <section id="why" className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F3ef0caf3200f4046b04c16f3c60b68c9%2F05cc97dfd2c94dd5b740abfc6e59421e?format=webp&width=800"
            alt="Researchers collaborating in laboratory"
            className="aspect-[4/3] rounded-3xl object-cover"
          />
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold">Why TrialCliniq?</h2>
            <div className="space-y-5">
              {[
                { icon: Shield, title: "Research Clinics & Hospitals", text: "Optimize trial recruitment and participant engagement." },
                { icon: UserRound, title: "Patients & Caregivers", text: "Discover research opportunities and contribute to healthcare innovation." },
                { icon: CheckCircle2, title: "Trial Sponsors & CROs", text: "Monitor trial performance metrics and site-level recruitment trends." },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-50 p-2"><Icon className="h-5 w-5 text-blue-700" /></div>
                  <div>
                    <div className="font-semibold">{title}</div>
                    <div className="text-gray-600 text-sm">{text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Journey */}
      <section id="journey" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-4">Your Path to the Right Trial</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Simple, secure, and guided. Join thousands of patients finding their match.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg">
                  <UserRound className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Create Your Profile</h3>
                <p className="text-gray-600">Share your basic health information securely, connect your EHR, and provide consent to participate.</p>
              </div>
              <div className="hidden md:block absolute top-20 right-0 w-1/2 h-1 bg-gradient-to-r from-blue-300 to-transparent transform translate-x-1/2" />
            </div>
            <div className="relative">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-6 shadow-lg">
                  <Search className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Get AI-Matched</h3>
                <p className="text-gray-600">Our intelligent system analyzes your profile and scans active trials to find the best matches for you.</p>
              </div>
              <div className="hidden md:block absolute top-20 right-0 w-1/2 h-1 bg-gradient-to-r from-emerald-300 to-transparent transform translate-x-1/2" />
            </div>
            <div>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg">
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Review & Enroll</h3>
                <p className="text-gray-600">Explore eligible trials, review all details, and approve contact from research sites for trials you're interested in.</p>
              </div>
            </div>
          </div>
          <div className="mt-16 text-center">
            <Link to="/search-results" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3 text-white font-medium hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl">
              Find A Trial <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Recruitment cards CTA */}
      <section className="py-24 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Accelerate Your Trial Recruitment</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Get real-time insights into patient matching, consent management, and enrollment funnels with our AI-powered platform.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="rounded-3xl bg-white border border-gray-200 p-8 hover:shadow-xl transition-shadow">
              <div className="mb-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Consent Workflows</h3>
              <p className="text-gray-600 mb-6">Automate consent collection and track real-time enrollment status across your trials.</p>
              <div className="pt-4 border-t">
                <div className="text-sm text-gray-500 mb-3">Status: Active</div>
                <div className="h-2 rounded-full bg-emerald-100">
                  <div className="h-2 w-[95%] rounded-full bg-emerald-500" />
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white border border-gray-200 p-8 hover:shadow-xl transition-shadow">
              <div className="mb-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">AI-Powered Matching</h3>
              <p className="text-gray-600 mb-6">Automatically match qualified patients to your trials using advanced AI and EHR data.</p>
              <div className="pt-4 border-t">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-blue-600">10%</div>
                    <div className="text-gray-500 text-xs">Matched</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-600">10%</div>
                    <div className="text-gray-500 text-xs">Pass Screen</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-600">10%</div>
                    <div className="text-gray-500 text-xs">Enrolled</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white border border-gray-200 p-8 hover:shadow-xl transition-shadow">
              <div className="mb-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                  <UserRound className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Unified Trial Management</h3>
              <p className="text-gray-600 mb-6">Manage multiple trials in one platform with complete HIPAA compliance and security.</p>
              <div className="pt-4 border-t">
                <span className="inline-block rounded-full bg-purple-50 px-3 py-1 text-sm text-purple-700 font-medium">HIPAA Compliant</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-600 mb-6">Ready to transform your recruitment strategy?</p>
            <Link to="/book-demo" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3 text-white font-medium hover:bg-blue-700 transition-colors">
              Book a Demo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Capabilities band */}
      <section className="py-14 border-t">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-semibold mb-8">What You Can Do with TrialCliniq</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              "AI-Powered Trial Matching Engine",
              "Automated Eligibility Scoring",
              "Document Upload & NLP Parsing",
              "Customizable Consent Workflows",
              "Recruitment Funnel Analytics & Metrics",
              "Sites receive daily match alerts",
            ].map((t) => (
              <div key={t} className="rounded-2xl border px-4 py-6 text-sm font-medium">
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-3xl font-semibold mb-8">Got Questions? We’ve got answers</h3>
          <div className="divide-y rounded-2xl border bg-white">
            {faq.map((item, idx) => (
              <details key={idx} className="group open:bg-gray-50 px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-medium marker:content-none">
                  {item.q}
                  <span className="text-gray-400 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-2 text-gray-600">{item.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-10 rounded-3xl bg-gradient-to-r from-blue-100 via-emerald-100 to-purple-100 p-10 text-center">
            <h4 className="text-2xl font-semibold mb-4">Couldn't find answers?</h4>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-white hover:bg-black">Contact Us <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-14 grid md:grid-cols-3 gap-10">
          <div>
            <img
              alt="TrialCliniq"
              className="h-9 w-auto"
              src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2-1.png"
            />
            <p className="mt-4 text-sm text-gray-600 max-w-sm">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam et lacinia mi.
            </p>
            <div className="mt-4 flex gap-4 text-gray-500">
              <span>IG</span><span>TW</span><span>IN</span>
            </div>
          </div>
          <div>
            <div className="text-gray-400 font-medium mb-4">Solutions</div>
            <ul className="space-y-3 text-gray-700">
              {[
                "Find a study",
                "More about trials",
                "How TrialCliniq help",
                "Blog",
              ].map((t) => (
                <li key={t}><a href="#" className="hover:text-gray-900">{t}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-gray-400 font-medium mb-4">Company</div>
            <ul className="space-y-3 text-gray-700">
              {[
                "Terms of Conditions",
                "Contact Us",
                "About Us",
                "Privacy Policy",
              ].map((t) => (
                <li key={t}>
                  {t === "Contact Us" ? (
                    <Link to="/contact" className="hover:text-gray-900">Contact Us</Link>
                  ) : (
                    <a href="#" className="hover:text-gray-900">{t}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t">
          <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-gray-500 flex items-center justify-between">
            <span>Copyright © 2025 TrialCliniq.</span>
            <span>Website by Apperr</span>
            <a href="#top" className="hover:text-gray-700">Back to top</a>
          </div>
        </div>
      </footer>

      {/* Sign Up Modal */}
      {showSignupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSignupModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900">Sign Up to TrialCliniq</h2>
              <button
                onClick={() => setShowSignupModal(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              To connect your electronic health record and find clinical trials tailored to you, you'll need to create an account with TrialCliniq.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowSignupModal(false);
                  navigate("/patients/volunteer");
                }}
                className="w-full rounded-full bg-blue-600 text-white px-4 py-3 font-medium hover:bg-blue-700 transition-colors"
              >
                Create Account
              </button>
              <button
                onClick={() => {
                  setShowSignupModal(false);
                  navigate("/patients/login");
                }}
                className="w-full rounded-full border border-gray-300 text-gray-900 px-4 py-3 font-medium hover:bg-gray-50 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
