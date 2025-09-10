// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SearchResults } from "./screens/SearchResults";
import Home from "./routes/Home2/screens/Home";
import Faq from "./screens/patients/Faq";
import Privacy from "./screens/patients/Privacy";
import Volunteer from "./screens/patients/Volunteer";
import Login from "./screens/patients/Login";

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
      </Routes>
    </Router>
  );
}

export default App;
