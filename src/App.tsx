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
import Dashboard from "./screens/patients/Dashboard";
import TrialDetails from "./screens/TrialDetails";
import EligibleTrials from "./screens/patients/EligibleTrials";
import HealthProfile from "./screens/patients/HealthProfile";
import Settings from "./screens/patients/Settings";
import Welcome from "./screens/patients/Welcome";
import ContactUs from "./screens/support/ContactUs";
import Consent from "./screens/patients/Consent";
import Connect from "./screens/patients/Connect";
import { RequireAuth } from "./lib/auth";

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
        <Route path="/patients/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/patients/eligible" element={<RequireAuth><EligibleTrials /></RequireAuth>} />
        <Route path="/patients/health-profile" element={<RequireAuth><HealthProfile /></RequireAuth>} />
        <Route path="/patients/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/patients/welcome" element={<Welcome />} />
        <Route path="/trials/:slug" element={<TrialDetails />} />
        <Route path="/contact" element={<ContactUs />} />
      </Routes>
    </Router>
  );
}

export default App;
