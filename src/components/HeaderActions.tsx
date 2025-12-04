import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { AuthModal } from "./AuthModal";

export default function HeaderActions() {
  const { isAuthenticated, signOut, user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = React.useState(false);
  const [signInMenuOpen, setSignInMenuOpen] = React.useState(false);
  const [getStartedMenuOpen, setGetStartedMenuOpen] = React.useState(false);
  
  const [patientLoginOpen, setPatientLoginOpen] = React.useState(false);
  const [providerLoginOpen, setProviderLoginOpen] = React.useState(false);
  const [patientSignupOpen, setPatientSignupOpen] = React.useState(false);
  const [providerSignupOpen, setProviderSignupOpen] = React.useState(false);
  
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!menuRef.current) return;
      if (e.target instanceof Node && !menuRef.current.contains(e.target)) {
        setProfileOpen(false);
        setSignInMenuOpen(false);
        setGetStartedMenuOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    const dashPath = user.role === "provider" ? "/providers/dashboard" : "/patients/dashboard";
    return (
      <div className="relative flex items-center gap-3" ref={menuRef}>
        <Link to={dashPath} className="px-4 py-2 text-sm rounded-full bg-blue-600 text-white hover:bg-blue-700">
          Dashboard
        </Link>
        <button
          aria-label="Profile"
          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white font-medium"
          onClick={() => setProfileOpen(!profileOpen)}
          type="button"
          title={`${user.firstName} ${user.lastName}`}
        >
          {((user.firstName?.[0] || "") + (user.lastName?.[0] || "") || user.email?.[0] || "?").toUpperCase()}
        </button>
        {profileOpen && (
          <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border bg-white shadow-md z-40">
            {user.role === "patient" && (
              <Link to="/patients/settings" className="block px-3 py-2 text-sm hover:bg-gray-50">
                Settings
              </Link>
            )}
            <button
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
              onClick={async () => {
                await signOut();
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
    <>
      <div className="relative flex items-center gap-3" ref={menuRef}>
        {/* Sign In Button */}
        <button
          className="px-4 py-2 text-sm rounded-full border border-blue-600 text-blue-700 hover:bg-blue-50"
          onClick={() => setSignInMenuOpen(!signInMenuOpen)}
          type="button"
        >
          Sign in
        </button>
        {signInMenuOpen && (
          <div className="absolute right-32 top-full mt-2 w-56 rounded-lg border bg-white shadow-md z-40">
            <button
              onClick={() => {
                setSignInMenuOpen(false);
                setPatientLoginOpen(true);
              }}
              className="block w-full text-left rounded-md px-4 py-2 text-sm hover:bg-gray-50"
              type="button"
            >
              Participant Sign In
            </button>
            <button
              onClick={() => {
                setSignInMenuOpen(false);
                setProviderLoginOpen(true);
              }}
              className="block w-full text-left rounded-md px-4 py-2 text-sm hover:bg-gray-50"
              type="button"
            >
              Researcher Sign In
            </button>
          </div>
        )}

        {/* Get Started Button */}
        <button
          className="px-4 py-2 text-sm rounded-full bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => setGetStartedMenuOpen(!getStartedMenuOpen)}
          type="button"
        >
          Get Started
        </button>
        {getStartedMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border bg-white shadow-md z-40">
            <button
              onClick={() => {
                setGetStartedMenuOpen(false);
                setPatientSignupOpen(true);
              }}
              className="block w-full text-left rounded-md px-4 py-2 text-sm hover:bg-gray-50"
              type="button"
            >
              I'm a Participant
            </button>
            <button
              onClick={() => {
                setGetStartedMenuOpen(false);
                setProviderSignupOpen(true);
              }}
              className="block w-full text-left rounded-md px-4 py-2 text-sm hover:bg-gray-50"
              type="button"
            >
              I'm a Researcher / Site
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={patientLoginOpen}
        onClose={() => setPatientLoginOpen(false)}
        defaultTab="login"
        role="patient"
      />
      <AuthModal
        isOpen={providerLoginOpen}
        onClose={() => setProviderLoginOpen(false)}
        defaultTab="login"
        role="provider"
      />
      <AuthModal
        isOpen={patientSignupOpen}
        onClose={() => setPatientSignupOpen(false)}
        defaultTab="signup"
        role="patient"
      />
      <AuthModal
        isOpen={providerSignupOpen}
        onClose={() => setProviderSignupOpen(false)}
        defaultTab="signup"
        role="provider"
      />
    </>
  );
}
