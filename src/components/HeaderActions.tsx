import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserRound } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function HeaderActions() {
  const { isAuthenticated, signOut, user } = useAuth();
  const navigate = useNavigate();

  // One ref/menu state to handle both profile and get-started menus
  const [open, setOpen] = React.useState(false);
  const [getStartedOpen, setGetStartedOpen] = React.useState(false);
  const [signInOpen, setSignInOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (e.target instanceof Node && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setGetStartedOpen(false);
        setSignInOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  if (isAuthenticated) {
    const dashPath = user?.role === "provider" ? "/providers/dashboard" : "/patients/dashboard";
    return (
      <div className="relative flex items-center gap-3" ref={menuRef}>
        <Link to={dashPath} className="px-4 py-2 text-sm rounded-full bg-blue-600 text-white hover:bg-blue-700">Dashboard</Link>
        <button
          aria-label="Profile"
          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white font-medium"
          onClick={() => setOpen((v) => !v)}
          type="button"
          title={user ? `${user.firstName} ${user.lastName}` : "Profile"}
        >
          {(() => {
            const a = (user?.firstName?.[0] || "").toUpperCase();
            const b = (user?.lastName?.[0] || "").toUpperCase();
            const fallback = (user?.email?.[0] || "?").toUpperCase();
            const initials = (a + b) || fallback;
            return initials;
          })()}
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border bg-white shadow-md">
            {user?.role === "patient" && (
              <Link to="/patients/settings" className="block px-3 py-2 text-sm hover:bg-gray-50">Settings</Link>
            )}
            <button
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
              onClick={() => {
                signOut();
                navigate("/", { replace: true });
              }}
              type="button"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-3" ref={menuRef}>
      <button
        className="px-4 py-2 text-sm rounded-full border border-blue-600 text-blue-700 hover:bg-blue-50"
        onClick={() => { setGetStartedOpen(false); setSignInOpen((v) => !v); }}
        type="button"
        aria-haspopup="menu"
        aria-expanded={signInOpen}
      >
        Sign in
      </button>
      {signInOpen && (
        <div className="absolute right-28 top-full mt-2 w-56 rounded-lg border bg-white shadow-md">
          <div className="p-2">
            <Link to="/patients/login" className="block rounded-md px-3 py-2 text-sm hover:bg-gray-50" onClick={() => setSignInOpen(false)}>
              Patient sign in
            </Link>
            <Link to="/providers/login" className="block rounded-md px-3 py-2 text-sm hover:bg-gray-50" onClick={() => setSignInOpen(false)}>
              Researcher sign in
            </Link>
          </div>
        </div>
      )}

      <button
        className="px-4 py-2 text-sm rounded-full bg-blue-600 text-white hover:bg-blue-700"
        onClick={() => { setSignInOpen(false); setGetStartedOpen((v) => !v); }}
        type="button"
        aria-haspopup="menu"
        aria-expanded={getStartedOpen}
      >
        Get Started
      </button>
      {getStartedOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border bg-white shadow-md">
          <div className="p-2">
            <Link
              to="/patients/volunteer"
              className="block rounded-md px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => setGetStartedOpen(false)}
            >
              I’m a Patient
            </Link>
            <Link
              to="/providers/create"
              className="block rounded-md px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => setGetStartedOpen(false)}
            >
              I’m a Researcher / Site
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
