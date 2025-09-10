// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SearchResults } from "./screens/SearchResults";
import Home from "./routes/Home2/screens/Home";
import Faq from "./screens/patients/Faq";
import Privacy from "./screens/patients/Privacy";
import Volunteer from "./screens/patients/Volunteer";
import Login from "./screens/patients/Login";
import SitesBlog from "./screens/sites/Blog";
import SitesVisibility from "./screens/sites/Visibility";
import SitesMulticenter from "./screens/sites/Multicenter";
import SitesSupport from "./screens/sites/Support";
import SitesCreateAccount from "./screens/sites/CreateAccount";
import SitesLogin from "./screens/sites/Login";
import SignIn from "./screens/auth/SignIn";

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
        <Route path="/patients/login" element={<Login />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/sites/blog" element={<SitesBlog />} />
        <Route path="/sites/visibility" element={<SitesVisibility />} />
        <Route path="/sites/multicenter" element={<SitesMulticenter />} />
        <Route path="/sites/support" element={<SitesSupport />} />
        <Route path="/sites/create-account" element={<SitesCreateAccount />} />
        <Route path="/sites/login" element={<SitesLogin />} />
      </Routes>
    </Router>
  );
}

export default App;
