import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserRound } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function HeaderActions() {
  const { isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (e.target instanceof Node && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  if (isAuthenticated) {
    return (
      <div className="relative flex items-center gap-3" ref={menuRef}>
        <Link to="/patients/dashboard" className="px-4 py-2 text-sm rounded-full bg-blue-600 text-white hover:bg-blue-700">Dashboard</Link>
        <button
          aria-label="Profile"
          className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 hover:bg-gray-50"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          <UserRound className="h-5 w-5 text-gray-700" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border bg-white shadow-md">
            <Link to="/patients/health-profile" className="block px-3 py-2 text-sm hover:bg-gray-50">Health Profile</Link>
            <Link to="/patients/settings" className="block px-3 py-2 text-sm hover:bg-gray-50">Settings</Link>
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
    <div className="flex items-center gap-3">
      <Link to="/patients/login" className="px-4 py-2 text-sm rounded-full border border-blue-600 text-blue-700 hover:bg-blue-50">Sign in</Link>
      <Link to="/patients/volunteer" className="px-4 py-2 text-sm rounded-full bg-blue-600 text-white hover:bg-blue-700">Get Started</Link>
    </div>
  );
}
