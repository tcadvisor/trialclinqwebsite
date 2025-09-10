// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SearchResults } from "./screens/SearchResults"; // assuming this IS a named export
import Home from "./routes/Home2/screens/Home";          // ⬅ default import

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search-results" element={<SearchResults />} />
      </Routes>
    </Router>
  );
}

export default App;
