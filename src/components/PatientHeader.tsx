import React from "react";
import { Link, useLocation } from "react-router-dom";
import HeaderActions from "./HeaderActions";

function isActivePath(pathname: string, to: string): boolean {
  if (to === "/patients/dashboard") return pathname.startsWith("/patients/dashboard");
  if (to === "/patients/eligible") return pathname.startsWith("/patients/eligible");
  if (to === "/patients/health-profile") return pathname.startsWith("/patients/health-profile");
  if (to === "/patients/faq") return pathname.startsWith("/patients/faq");
  return pathname === to;
}

function NavItem({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation();
  const active = isActivePath(pathname, to);
  const base = "pb-1";
  const cls = active
    ? `text-gray-900 border-b-2 border-[#1033e5] ${base}`
    : `hover:text-gray-600`;
  return (
    <Link to={to} className={cls}>
      {label}
    </Link>
  );
}

export default function PatientHeader(): JSX.Element {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img
            alt="TrialCliniq"
            className="h-8 w-auto"
            src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png"
          />
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <NavItem to="/patients/dashboard" label="Dashboard" />
          <NavItem to="/patients/eligible" label="Eligible Trials" />
          <NavItem to="/patients/health-profile" label="Health Profile" />
          <NavItem to="/patients/faq" label="Help Center" />
        </nav>
        <HeaderActions />
      </div>
    </header>
  );
}
