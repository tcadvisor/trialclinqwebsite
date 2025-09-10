import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, CheckCircle2, Shield, ArrowRight, ChevronDownIcon, GridIcon, HelpCircleIcon, ShieldIcon, UserPlusIcon, LogInIcon, FileTextIcon, MegaphoneIcon, LayersIcon, LifeBuoyIcon } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("Chronic Pain");
  const [location, setLocation] = useState("10090, Niagara falls, USA");
  const [isPFOpen, setIsPFOpen] = useState(false);
  const [isSIOpen, setIsSIOpen] = useState(false);

  const dropdownItems = [
    {
      icon: GridIcon,
      title: "Find a clinical trial",
      description: "Search active clinical trials near you by using filters and get matched instantly.",
    },
    {
      icon: HelpCircleIcon,
      title: "Frequently Asked Questions",
      description: "Find answers to common questions and resources for navigating your clinical trial journey.",
    },
    {
      icon: ShieldIcon,
      title: "Consent & Data Privacy",
      description: "Learn how your personal health data is securely collected, protected, and used for clinical trial matching.",
    },
    {
      icon: UserPlusIcon,
      title: "Become a clinical trial volunteer",
      description: "Sign up to receive personalized clinical trial matches based on your health profile and location.",
    },
    {
      icon: LogInIcon,
      title: "Participant Login",
      description: "Manage your trial matches and track your enrollment progress.",
    },
  ];

  const providerItems = [
    { icon: FileTextIcon, title: "Insider Blog", description: "Industry trends, site management tips, and recruitment insights." },
    { icon: MegaphoneIcon, title: "Visibility/ Marketing Options", description: "Boost your trial listings and site visibility to eligible patients." },
    { icon: LayersIcon, title: "Multicenter Listings", description: "View and manage your active multicenter trial sites." },
    { icon: LifeBuoyIcon, title: "TrialCliniq Support Center", description: "Contact support or access onboarding guides for investigators." },
    { icon: UserPlusIcon, title: "Create Provider Account", description: "Access your investigator or site admin dashboard." },
    { icon: LogInIcon, title: "Provider Login", description: "Access your investigator or site admin dashboard." },
  ];

  const handleSearch = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams({ q: query, loc: location }).toString();
    navigate(`/search-results?${params}`);
  };

  const faqs = [
    { q: "What is Clinical Trial?", a: "A clinical trial is a research study in which people volunteer to test new treatments, interventions, or tests as a means to prevent, detect, treat, or manage various diseases or medical conditions." },
    { q: "How does matching work?", a: "We use your condition, age, location and optional health profile to filter trials from trusted sources and rank by fit." },
    { q: "Is my data private?", a: "Yes. We follow strong privacy practices and never sell personal data. You stay in control of sharing." },
    { q: "Does it cost anything?", a: "No. Browsing trials and getting matched is free for patients and caregivers." },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png"
              alt="TrialCliniq Logo"
              className="h-8 w-auto"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-700 relative">
            <div
              className="relative"
              onMouseEnter={() => setIsPFOpen(true)}
              onMouseLeave={() => setIsPFOpen(false)}
            >
              <button className="inline-flex items-center gap-1 hover:text-gray-900">
                Patients and Families
                <ChevronDownIcon className="w-4 h-4" />
              </button>
              {isPFOpen && (
                <div className="absolute left-0 mt-3 w-[340px] bg-white rounded-2xl shadow-lg border p-2">
                  <div className="py-2">
                    {dropdownItems.map((item, i) => {
                      const Icon = item.icon as any;
                      return (
                        <a key={i} href="#" className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-gray-50">
                          <Icon className="w-5 h-5 text-gray-600 mt-0.5" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                            <div className="text-xs text-gray-600 leading-relaxed">{item.description}</div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div
              className="relative"
              onMouseEnter={() => setIsSIOpen(true)}
              onMouseLeave={() => setIsSIOpen(false)}
            >
              <button className="inline-flex items-center gap-1 hover:text-gray-900">
                Sites & Investigators
                <ChevronDownIcon className="w-4 h-4" />
              </button>
              {isSIOpen && (
                <div className="absolute left-0 mt-3 w-[360px] bg-white rounded-2xl shadow-lg border p-2">
                  <div className="py-2">
                    {providerItems.map((item, i) => {
                      const Icon = item.icon as any;
                      return (
                        <a key={i} href="#" className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-gray-50">
                          <Icon className="w-5 h-5 text-gray-600 mt-0.5" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                            <div className="text-xs text-gray-600 leading-relaxed">{item.description}</div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <button className="hover:text-gray-900">Contact Us</button>
            <button className="hover:text-gray-900">About Us</button>
          </nav>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm rounded-full border border-gray-300 hover:bg-gray-50">Sign in</button>
            <button className="px-4 py-2 text-sm rounded-full bg-blue-600 text-white hover:bg-blue-700">Get Started</button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50 via-white to-white" />
        <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white/70 border rounded-full px-3 py-1 text-xs text-gray-700 shadow-sm">
            <span className="font-medium">Privacy First</span>
            <Shield className="w-3.5 h-3.5 text-gray-500" />
            <span>HIPAA-secure, patient-approved.</span>
          </div>
          <h1 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900">
            The smarter way to find the
            <br />
            right clinical trial
          </h1>
          <p className="mt-5 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            AI-driven clinical trial matches built around your health data.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mt-8 mx-auto max-w-3xl">
            <div className="flex items-stretch gap-2 rounded-full bg-white shadow-xl p-2 border">
              <div className="flex-1 px-4 py-2">
                <label className="block text-xs text-gray-500">I'm looking for a clinical trial</label>
                <input
                  aria-label="Condition"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm md:text-base"
                  placeholder="Condition"
                />
              </div>
              <div className="w-px bg-gray-200 my-1" />
              <div className="flex-1 px-4 py-2">
                <label className="block text-xs text-gray-500">Near</label>
                <input
                  aria-label="Location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm md:text-base"
                  placeholder="City, ZIP"
                />
              </div>
              <button type="submit" className="shrink-0 inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-5 md:px-6 py-3 hover:bg-blue-700">
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>
          </form>

          {/* EHR Callout */}
          <div className="mt-6 flex flex-col md:flex-row items-center justify-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 px-2.5 py-1 rounded-full border border-blue-100">
              New
              <span className="text-gray-600">Match your Electronic Health Record (EHR) to trials</span>
            </span>
            <button className="inline-flex items-center gap-2 bg-white border rounded-full px-3 py-1.5 shadow-sm hover:bg-gray-50">
              Connect to Trial Portal <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dark ticker */}
        <div className="bg-slate-900 text-slate-200">
          <div className="mx-auto max-w-7xl px-4 py-3 overflow-hidden">
            <div className="whitespace-nowrap text-sm md:text-base tracking-wide">
              <span className="mx-3">NEUROPATHY</span>/
              <span className="mx-3">SCHIZOPHRENIA</span>/
              <span className="mx-3">DEPRESSION</span>/
              <span className="mx-3">PARKINSON'S</span>/
              <span className="mx-3">MIGRAINE</span>/
              <span className="mx-3">DIABETES</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted Sources */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">Powered by Trusted Sources</h2>
          <p className="text-gray-600 max-w-2xl mb-8">
            We pull trial listings directly from ClinicalTrials.gov and other verified research networks.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              "Match patients using AI and EHR integrations",
              "Connect to ClinicalTrials.gov in real‑time",
              "Export pre‑screening and eligibility insights instantly",
              "Track conversions, drop‑offs, and lead sources",
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-4 border shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
                <span className="text-sm text-gray-800">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why TrialCliniq */}
      <section className="py-16 md:py-20 px-4">
        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-10 items-center">
          <div className="rounded-3xl bg-gradient-to-br from-slate-100 to-white border shadow p-6 aspect-[4/3] flex items-center justify-center text-gray-400">
            <span className="text-sm">Product preview</span>
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Why TrialCliniq?</h2>
            <ul className="space-y-6">
              {[
                { t: "Research Clinics & Hospitals", d: "Optimize trial recruitment and participant engagement." },
                { t: "Patients & Caregivers", d: "Discover research opportunities and contribute to innovation." },
                { t: "Trial Sponsors & CROs", d: "Monitor trial performance metrics and recruitment trends." },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <div className="font-semibold text-gray-900">{item.t}</div>
                    <div className="text-gray-600 text-sm">{item.d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Got Questions? We've got answers</h2>
          <div className="divide-y rounded-2xl border overflow-hidden">
            {faqs.map((f, idx) => (
              <details key={idx} className="group open:bg-slate-50">
                <summary className="cursor-pointer list-none px-6 py-4 flex items-center justify-between">
                  <span className="font-medium text-gray-900">{f.q}</span>
                  <span className="text-gray-500 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed">{f.a}</div>
              </details>
            ))}
          </div>
          <div className="text-center mt-10">
            <button className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-full">
              Couldn't find answers? <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t">
        <div className="mx-auto max-w-7xl px-4 py-12 grid md:grid-cols-3 gap-10">
          <div>
            <img
              src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2-1.png"
              alt="TrialCliniq Logo"
              className="h-10 w-auto mb-4"
            />
            <p className="text-gray-600 text-sm">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam et lacinia mi.</p>
          </div>
          <div>
            <div className="text-gray-400 text-sm mb-4">Solutions</div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>Find a study</li>
              <li>More about trials</li>
              <li>How TrialCliniq help</li>
              <li>Blog</li>
            </ul>
          </div>
          <div>
            <div className="text-gray-400 text-sm mb-4">Company</div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>Terms of Conditions</li>
              <li>Contact Us</li>
              <li>About Us</li>
              <li>Privacy Policy</li>
            </ul>
          </div>
        </div>
        <div className="border-t">
          <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between text-xs text-gray-600">
            <div>Copyright © 2025 TrialCliniq.</div>
            <div className="flex items-center gap-6">
              <span>Website by Apperr</span>
              <button className="hover:text-gray-900">Back to top</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
