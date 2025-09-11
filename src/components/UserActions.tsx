import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthUser, logout } from "../lib/auth";

export default function UserActions(): JSX.Element {
  const user = useAuthUser();
  const navigate = useNavigate();

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link to="/patients/dashboard" className="px-3 py-2 text-sm rounded-full border border-gray-300 text-gray-800 hover:bg-gray-50">
          Dashboard
        </Link>
        <button
          className="px-4 py-2 text-sm rounded-full bg-gray-900 text-white hover:bg-black"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          Sign out
        </button>
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
