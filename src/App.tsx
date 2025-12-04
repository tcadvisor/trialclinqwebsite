// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { RequireAuth, RequireRole } from "./lib/auth";
import LandingPage from "./routes/LandingPage";

const SearchResults = lazy(() => import("./screens/SearchResults").then(m => ({ default: m.SearchResults })).catch(() => import("./routes/Home2/screens/Home")));
const Home = lazy(() => import("./routes/Home2/screens/Home"));
const Faq = lazy(() => import("./screens/patients/Faq"));
const Privacy = lazy(() => import("./screens/patients/Privacy"));
const Volunteer = lazy(() => import("./screens/patients/Volunteer"));
const Login = lazy(() => import("./screens/patients/Login"));
const InsiderBlog = lazy(() => import("./screens/sites/InsiderBlog"));
const VisibilityOptions = lazy(() => import("./screens/sites/VisibilityOptions"));
const MulticenterListings = lazy(() => import("./screens/sites/MulticenterListings"));
const InvestigatorSupport = lazy(() => import("./screens/support/InvestigatorSupport"));
const CreateAccount = lazy(() => import("./screens/providers/CreateAccount"));
const ProviderLogin = lazy(() => import("./screens/providers/Login"));
const SiteInformation = lazy(() => import("./screens/providers/SiteInformation"));
const InvestigatorInformation = lazy(() => import("./screens/providers/InvestigatorInformation"));
const ProviderWelcome = lazy(() => import("./screens/providers/Welcome"));
const ProviderDashboard = lazy(() => import("./screens/providers/ProviderDashboard"));
const ProviderTrials = lazy(() => import("./screens/providers/Trials"));
const AllTrials = lazy(() => import("./screens/providers/AllTrials"));
const Appointments = lazy(() => import("./screens/providers/Appointments"));
const Volunteers = lazy(() => import("./screens/providers/Volunteers"));
const Dashboard = lazy(() => import("./screens/patients/Dashboard"));
const TrialDetails = lazy(() => import("./screens/TrialDetails"));
const CtgovStudyDetails = lazy(() => import("./screens/CtgovStudyDetails"));
const EligibleTrials = lazy(() => import("./screens/patients/EligibleTrials"));
const HealthProfile = lazy(() => import("./screens/patients/HealthProfile"));
const Settings = lazy(() => import("./screens/patients/Settings"));
const EligibilityCheck = lazy(() => import("./screens/patients/EligibilityCheck"));
const EligibilityResult = lazy(() => import("./screens/patients/EligibilityResult"));
const ContactUs = lazy(() => import("./screens/support/ContactUs"));
const BookDemo = lazy(() => import("./screens/support/BookDemo"));
const EhrDirectory = lazy(() => import("./screens/patients/EhrDirectory"));
const EhrCallback = lazy(() => import("./screens/patients/EhrCallback"));
const Consent = lazy(() => import("./screens/patients/Consent"));
const SignupProcessing = lazy(() => import("./screens/patients/SignupProcessing"));
const Connect = lazy(() => import("./screens/patients/Connect"));
const SignupInfo = lazy(() => import("./screens/patients/SignupInfo"));
const SignupPersonalDetails = lazy(() => import("./screens/patients/SignupPersonalDetails"));

function LoadingFallback() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/search-results" element={<SearchResults />} />
          <Route path="/patients/find-trial" element={<SearchResults />} />
          <Route path="/patients/faq" element={<Faq />} />
          <Route path="/patients/privacy" element={<Privacy />} />
          <Route path="/patients/volunteer" element={<Volunteer />} />
          <Route path="/patients/consent" element={<Consent />} />
          <Route path="/patients/connect" element={<Connect />} />
          <Route path="/patients/signup-info" element={<SignupInfo />} />
          <Route path="/patients/signup-personal" element={<SignupPersonalDetails />} />
          <Route path="/patients/ehr" element={<EhrDirectory />} />
          <Route path="/patients/ehr-callback" element={<EhrCallback />} />
          <Route path="/patients/check" element={<EligibilityCheck />} />
          <Route path="/patients/result" element={<EligibilityResult />} />
          <Route path="/patients/login" element={<Login />} />
          <Route path="/sites/blog" element={<InsiderBlog />} />
          <Route path="/sites/visibility" element={<VisibilityOptions />} />
          <Route path="/sites/multicenter" element={<MulticenterListings />} />
          <Route path="/support/investigators" element={<InvestigatorSupport />} />
          <Route path="/providers/create" element={<CreateAccount />} />
          <Route path="/providers/login" element={<ProviderLogin />} />
          <Route path="/providers/site-information" element={<SiteInformation />} />
          <Route path="/providers/investigator-information" element={<InvestigatorInformation />} />
          <Route path="/providers/welcome" element={<ProviderWelcome />} />
          <Route path="/providers/trials" element={<RequireRole role="provider" redirectTo="/providers/login"><ProviderTrials /></RequireRole>} />
          <Route path="/providers/trials/all" element={<RequireRole role="provider" redirectTo="/providers/login"><AllTrials /></RequireRole>} />
          <Route path="/providers/dashboard" element={<RequireRole role="provider" redirectTo="/providers/login"><ProviderDashboard /></RequireRole>} />
          <Route path="/providers/appointments" element={<RequireRole role="provider" redirectTo="/providers/login"><Appointments /></RequireRole>} />
          <Route path="/providers/volunteers" element={<RequireRole role="provider" redirectTo="/providers/login"><Volunteers /></RequireRole>} />
          <Route path="/patients/dashboard" element={<RequireRole role="patient" redirectTo="/patients/login"><Dashboard /></RequireRole>} />
          <Route path="/patients/eligible" element={<EligibleTrials />} />
          <Route path="/patients/health-profile" element={<RequireRole role="patient" redirectTo="/patients/login"><HealthProfile /></RequireRole>} />
          <Route path="/patients/settings" element={<RequireRole role="patient" redirectTo="/patients/login"><Settings /></RequireRole>} />
          <Route path="/patients/processing" element={<SignupProcessing />} />
          <Route path="/trials/:slug" element={<TrialDetails />} />
          <Route path="/study/:nctId" element={<CtgovStudyDetails />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/book-demo" element={<BookDemo />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
