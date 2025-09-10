// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SearchResults } from "./screens/SearchResults";
import Home from "./routes/Home2/screens/Home";
import Contact from "./routes/Contact/Contact";
import GetStarted from "./routes/GetStarted/GetStarted";
import ProvidersBlog from "./routes/Providers/Blog";
import ProvidersMarketing from "./routes/Providers/Marketing";
import ProvidersMulticenter from "./routes/Providers/Multicenter";
import ProvidersSupport from "./routes/Providers/Support";
import ProvidersCreateAccount from "./routes/Providers/CreateAccount";
import ProvidersLogin from "./routes/Providers/Login";
import PatientsFindTrial from "./routes/Patients/FindTrial";
import PatientsFAQ from "./routes/Patients/FAQ";
import PatientsPrivacy from "./routes/Patients/Privacy";
import PatientsVolunteer from "./routes/Patients/Volunteer";
import PatientsLogin from "./routes/Patients/Login";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search-results" element={<SearchResults />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route path="/providers/blog" element={<ProvidersBlog />} />
        <Route path="/providers/marketing" element={<ProvidersMarketing />} />
        <Route path="/providers/multicenter" element={<ProvidersMulticenter />} />
        <Route path="/providers/support" element={<ProvidersSupport />} />
        <Route path="/providers/create-account" element={<ProvidersCreateAccount />} />
        <Route path="/providers/login" element={<ProvidersLogin />} />
        <Route path="/patients/find-trial" element={<PatientsFindTrial />} />
        <Route path="/patients/faq" element={<PatientsFAQ />} />
        <Route path="/patients/privacy" element={<PatientsPrivacy />} />
        <Route path="/patients/volunteer" element={<PatientsVolunteer />} />
        <Route path="/patients/login" element={<PatientsLogin />} />
      </Routes>
    </Router>
  );
}

export default App;
