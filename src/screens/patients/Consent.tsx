import React from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";

export default function Consent(): JSX.Element {
  const [ack1, setAck1] = React.useState(false);
  const [ack2, setAck2] = React.useState(false);
  const [ack3, setAck3] = React.useState(false);
  const [ack4, setAck4] = React.useState(false);
  const allChecked = ack1 && ack2 && ack3 && ack4;
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
          <span role="img" aria-label="consent" className="text-2xl">📝</span>
        </div>
        <h1 className="text-center text-2xl sm:text-3xl font-semibold mb-6">TrialCliniq eConsent Form</h1>

        <section className="space-y-6 text-sm leading-6">
          <div>
            <h2 className="text-base font-semibold mb-1">Consent to Collect, Use, and Store Personal Health Information for Clinical Trial Matching</h2>
            <p className="text-gray-700">Thank you for choosing TrialCliniq. Before we continue, we need your permission to collect, process, and securely store your personal and medical information. This allows us to match you with clinical trials that fit your health profile now and in the future.</p>
            <label className="mt-3 flex items-center gap-2 text-gray-700">
              <input type="checkbox" className="rounded border-gray-300" checked={ack1} onChange={(e)=>setAck1(e.target.checked)} />
              <span>I have read and understand the information above</span>
            </label>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-1">What information will we collect?</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>Basic personal details: name, date of birth, contact information, and language preferences.</li>
              <li>Medical information: including your health conditions, medications, lab results, medical history, and documents you upload (eg. MRI reports, lab results, or doctor’s notes).</li>
              <li>Electronic Health Records (EHR): if you choose to connect them.</li>
            </ul>
            <label className="mt-3 flex items-center gap-2 text-gray-700">
              <input type="checkbox" className="rounded border-gray-300" checked={ack2} onChange={(e)=>setAck2(e.target.checked)} />
              <span>I have read and understand the information above</span>
            </label>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-1">How will we use your information?</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>Our AI will securely review your information to find clinical trials you may qualify for.</li>
              <li>We will notify you about matching trials and, with your permission, share your interest with the research sites conducting those studies.</li>
              <li>We will securely store your information to keep you updated about new clinical trials you might be eligible for in the future.</li>
              <li>You will have the option to manage your communication preferences at any time.</li>
            </ul>
            <label className="mt-3 flex items-center gap-2 text-gray-700">
              <input type="checkbox" className="rounded border-gray-300" checked={ack3} onChange={(e)=>setAck3(e.target.checked)} />
              <span>I have read and understand the information above</span>
            </label>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-1">Your rights</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>Review, update, or delete the information you share with us.</li>
              <li>Withdraw from the platform and revoke your consent at any time, after which your data will be securely deleted.</li>
              <li>Your data is encrypted and stored in compliance with HIPAA and other applicable privacy regulations.</li>
            </ul>
            <label className="mt-3 flex items-start gap-2 text-gray-700">
              <input type="checkbox" className="mt-1 rounded border-gray-300" checked={ack4} onChange={(e)=>setAck4(e.target.checked)} />
              <span>I have read and understand this consent form. I agree for TrialCliniq to collect, process, and securely store my personal and medical data to match me with current and future clinical trials until I choose to withdraw my consent.</span>
            </label>
          </div>
        </section>

        <div className="mt-8 flex items-center gap-3">
          <button
            disabled={!allChecked}
            className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-white text-sm font-medium transition-colors ${allChecked ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-400 cursor-not-allowed"}`}
            onClick={() => navigate("/patients/health-profile")}
            type="button"
          >
            Sign and Continue
          </button>
          <Link to="/" className="inline-flex items-center justify-center rounded-full border border-gray-300 px-5 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</Link>
        </div>
      </main>

      <footer className="bg-gray-50 mt-16 border-t">
        <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-10 text-sm">
          <div>
            <img alt="TrialCliniq" className="h-8 w-auto" src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2-1.png" />
            <p className="mt-4 text-gray-600 max-w-sm">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam et lacinia mi.</p>
          </div>
          <div>
            <div className="text-gray-400 font-medium mb-3">Solutions</div>
            <ul className="space-y-2 text-gray-700">
              <li><Link to="/patients/find-trial" className="hover:text-gray-900">Find a study</Link></li>
              <li><Link to="/patients/faq" className="hover:text-gray-900">More about trials</Link></li>
              <li><Link to="/" className="hover:text-gray-900">How TrialCliniq help</Link></li>
              <li><Link to="/sites/blog" className="hover:text-gray-900">Blog</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-gray-400 font-medium mb-3">Company</div>
            <ul className="space-y-2 text-gray-700">
              <li><Link to="/" className="hover:text-gray-900">Terms of Conditions</Link></li>
              <li><Link to="/contact" className="hover:text-gray-900">Contact Us</Link></li>
              <li><a href="#about" className="hover:text-gray-900">About Us</a></li>
              <li><Link to="/patients/privacy" className="hover:text-gray-900">Privacy Policy</Link></li>
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
    </div>
  );
}
