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
import EligibleTrials from "./screens/patients/EligibleTrials";
import HealthProfile from "./screens/patients/HealthProfile";
import Settings from "./screens/patients/Settings";
import ContactUs from "./screens/support/ContactUs";
import Consent from "./screens/patients/Consent";
import Connect from "./screens/patients/Connect";
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
        <Route path="/patients/eligible" element={<RequireRole role="patient" redirectTo="/patients/login"><EligibleTrials /></RequireRole>} />
        <Route path="/patients/health-profile" element={<RequireRole role="patient" redirectTo="/patients/login"><HealthProfile /></RequireRole>} />
        <Route path="/patients/settings" element={<RequireRole role="patient" redirectTo="/patients/login"><Settings /></RequireRole>} />
        <Route path="/trials/:slug" element={<TrialDetails />} />
        <Route path="/contact" element={<ContactUs />} />
      </Routes>
    </Router>
  );
}

export default App;
