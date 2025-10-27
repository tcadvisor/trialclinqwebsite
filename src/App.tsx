// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SearchResults } from "./screens/SearchResults";
import Home from "./routes/Home2/screens/Home";
import Faq from "./screens/patients/Faq";
import Privacy from "./screens/patients/Privacy";
import Volunteer from "./screens/patients/Volunteer";
import Login from "./screens/patients/Login";
import InsiderBlog from "./screens/sites/InsiderBlog";
import VisibilityOptions from "./screens/sites/VisibilityOptions";
import MulticenterListings from "./screens/sites/MulticenterListings";
import InvestigatorSupport from "./screens/support/InvestigatorSupport";
import CreateAccount from "./screens/providers/CreateAccount";
import ProviderLogin from "./screens/providers/Login";
import SiteInformation from "./screens/providers/SiteInformation";
import InvestigatorInformation from "./screens/providers/InvestigatorInformation";
import ProviderWelcome from "./screens/providers/Welcome";
import ProviderDashboard from "./screens/providers/ProviderDashboard";
import ProviderTrials from "./screens/providers/Trials";
import AllTrials from "./screens/providers/AllTrials";
import Appointments from "./screens/providers/Appointments";
import Volunteers from "./screens/providers/Volunteers";
import Dashboard from "./screens/patients/Dashboard";
import TrialDetails from "./screens/TrialDetails";
import CtgovStudyDetails from "./screens/CtgovStudyDetails";
import EligibleTrials from "./screens/patients/EligibleTrials";
import HealthProfile from "./screens/patients/HealthProfile";
import Settings from "./screens/patients/Settings";
import EligibilityCheck from "./screens/patients/EligibilityCheck";
import EligibilityResult from "./screens/patients/EligibilityResult";
import ContactUs from "./screens/support/ContactUs";
import BookDemo from "./screens/support/BookDemo";
import EhrDirectory from "./screens/patients/EhrDirectory";
import EhrCallback from "./screens/patients/EhrCallback";
import Consent from "./screens/patients/Consent";
import SignupProcessing from "./screens/patients/SignupProcessing";
import Connect from "./screens/patients/Connect";
import SignupInfo from "./screens/patients/SignupInfo";
import SignupPersonalDetails from "./screens/patients/SignupPersonalDetails";
import { RequireAuth, RequireRole } from "./lib/auth";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
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
    </Router>
  );
}

export default App;
