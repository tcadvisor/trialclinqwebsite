import React from "react";
import { Link } from "react-router-dom";
import UserActions from "./UserActions";

type ActiveKey = "home" | "find" | "faq" | "contact" | undefined;

function NavItem({ to, label, active }: { to: string; label: string; active: boolean }) {
  if (active) {
    return <span className="text-gray-900 font-medium">{label}</span>;
  }
  return (
    <Link to={to} className="hover:text-gray-600">
      {label}
    </Link>
  );
}

export default function SiteHeader({ active }: { active?: ActiveKey }) {
  return (
    <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img
            alt="TrialCliniq"
            className="h-8 w-auto"
            src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png"
          />
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <NavItem to="/" label="Home" active={active === "home"} />
          <NavItem to="/patients/find-trial" label="Find a Trial" active={active === "find"} />
          <NavItem to="/patients/faq" label="FAQ" active={active === "faq"} />
          <NavItem to="/contact" label="Contact" active={active === "contact"} />
        </nav>
        <UserActions />
      </div>
    </header>
  );
}
