import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function AvatarMenu() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 px-3 rounded-full border bg-white text-gray-700 hover:bg-gray-50"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        OB
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border bg-white shadow-md">
          <Link to="/patients/health-profile" className="block px-3 py-2 text-sm hover:bg-gray-50">Health Profile</Link>
          <button
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
            onClick={() => {
              signOut();
              navigate("/", { replace: true });
            }}
            type="button"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
