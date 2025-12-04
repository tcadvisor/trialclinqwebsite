import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { AuthModal } from "./AuthModal";

export default function HeaderActions() {
  const { isAuthenticated, signOut, user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = React.useState(false);
  const [signInOpen, setSignInOpen] = React.useState(false);
  const [patientModalOpen, setPatientModalOpen] = React.useState(false);
  const [providerModalOpen, setProviderModalOpen] = React.useState(false);
  const [patientModalTab, setPatientModalTab] = React.useState<'login' | 'signup'>('login');
  const [providerModalTab, setProviderModalTab] = React.useState<'login' | 'signup'>('login');
  const [getStartedOpen, setGetStartedOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (e.target instanceof Node && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setGetStartedOpen(false);
        setPatientModalOpen(false);
        setProviderModalOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
      </div>
    );
  }

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
          <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border bg-white shadow-md z-40">
            {user?.role === "patient" && (
              <Link to="/patients/settings" className="block px-3 py-2 text-sm hover:bg-gray-50">Settings</Link>
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

  const [signInOpen, setSignInOpen] = React.useState(false);

  return (
    <>
      <div className="relative flex items-center gap-3" ref={menuRef}>
        <button
          className="px-4 py-2 text-sm rounded-full border border-blue-600 text-blue-700 hover:bg-blue-50"
          onClick={() => {
            setSignInOpen((v) => !v);
          }}
          type="button"
          aria-haspopup="menu"
          aria-expanded={signInOpen}
        >
          Sign in
        </button>
        {signInOpen && (
          <div className="absolute right-24 top-full mt-2 w-56 rounded-lg border bg-white shadow-md z-40">
            <div className="p-2">
              <button
                onClick={() => {
                  setPatientModalTab('login');
                  setPatientModalOpen(true);
                  setSignInOpen(false);
                }}
                className="block w-full text-left rounded-md px-3 py-2 text-sm hover:bg-gray-50"
              >
                Participant Sign In
              </button>
              <button
                onClick={() => {
                  setProviderModalTab('login');
                  setProviderModalOpen(true);
                  setSignInOpen(false);
                }}
                className="block w-full text-left rounded-md px-3 py-2 text-sm hover:bg-gray-50"
              >
                Researcher Sign In
              </button>
            </div>
          </div>
        )}

        <button
          className="px-4 py-2 text-sm rounded-full bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => {
            setGetStartedOpen((v) => !v);
          }}
          type="button"
          aria-haspopup="menu"
          aria-expanded={getStartedOpen}
        >
          Get Started
        </button>
        {getStartedOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border bg-white shadow-md z-40">
            <div className="p-2">
              <button
                onClick={() => {
                  setPatientModalTab('signup');
                  setPatientModalOpen(true);
                  setGetStartedOpen(false);
                }}
                className="block w-full text-left rounded-md px-3 py-2 text-sm hover:bg-gray-50"
              >
                I'm a Participant
              </button>
              <button
                onClick={() => {
                  setProviderModalTab('signup');
                  setProviderModalOpen(true);
                  setGetStartedOpen(false);
                }}
                className="block w-full text-left rounded-md px-3 py-2 text-sm hover:bg-gray-50"
              >
                I'm a Researcher / Site
              </button>
            </div>
          </div>
        )}
      </div>

      <AuthModal
        isOpen={patientModalOpen}
        onClose={() => setPatientModalOpen(false)}
        defaultTab={patientModalTab}
        role="patient"
      />
      <AuthModal
        isOpen={providerModalOpen}
        onClose={() => setProviderModalOpen(false)}
        defaultTab={providerModalTab}
        role="provider"
      />
    </>
  );
}
