import React from "react";
import { Link } from "react-router-dom";
import { PencilIcon, Trash2Icon, PlusIcon, CheckCircle2, MailIcon, PhoneIcon, UserIcon, CalendarIcon, WeighingScaleIcon as WeightIcon } from "lucide-react";

const Section: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }>=({ title, children, right })=> (
  <div className="rounded-xl border bg-white">
    <div className="flex items-center justify-between px-4 py-3 border-b">
      <h3 className="font-medium">{title}</h3>
      {right}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const Row: React.FC<{ label: string; value: string; icon?: React.ReactNode }>=({ label, value, icon })=> (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-2 text-gray-600">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
    <div className="text-sm text-gray-900">{value}</div>
  </div>
);

export default function HealthProfile(): JSX.Element {
  const Allergies: { name: string; note?: string }[] = [
    { name: 'Pollen', note: 'Itchy nose and watery eyes' },
    { name: 'Caffeine', note: 'Sore throat' },
    { name: 'Lactose intolerant', note: 'Diarrhea and bloating' },
  ];

  const Medications: { name: string; dose?: string; schedule?: string }[] = [
    { name: 'Pregabalin' },
    { name: 'Gabapentin 75mg', schedule: 'Twice Daily' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img alt="TrialCliniq" className="h-8 w-auto" src="https://c.animaapp.com/mf3cenl8GIzqBa/img/igiwdhcu2mb98arpst9kn-2.png" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/patients/dashboard" className="hover:text-gray-600">Dashboard</Link>
            <Link to="/patients/eligible" className="hover:text-gray-600">Eligible Trials</Link>
            <Link to="/patients/health-profile" className="text-gray-900 border-b-2 border-[#1033e5] pb-1">Health Profile</Link>
            <Link to="/patients/faq" className="hover:text-gray-600">Help Center</Link>
          </nav>
          <div className="flex items-center gap-3">
            <button className="h-9 px-3 rounded-full border bg-white text-gray-700 hover:bg-gray-50">OB</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-semibold">Health Profile</h1>
        <div className="mt-1 text-gray-700">Olivia Brian</div>
        <div className="text-sm text-gray-500">olivia.br@example.com</div>

        <div className="mt-6 flex items-center gap-6 text-sm">
          <button className="relative pb-2 border-b-2 border-[#1033e5] text-gray-900">Overview</button>
          <button className="relative pb-2 text-gray-600 flex items-center gap-2">Documents <span className="ml-1 inline-flex items-center justify-center px-1.5 h-5 text-xs rounded-full bg-gray-100">6</span></button>
          <button className="relative pb-2 text-gray-600">Connected EHR/EMR</button>
        </div>

        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {/* Personal details */}
          <div className="md:col-span-2">
            <Section title="Personal Details" right={<button className="inline-flex items-center gap-1 text-sm rounded-full border px-3 py-1.5"><PencilIcon className="w-4 h-4"/> Edit</button>}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Row label="Patient ID" value="CUS_j2kthfmgv3bzr5r" icon={<UserIcon className="w-4 h-4"/>} />
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-gray-600"><MailIcon className="w-4 h-4"/><span className="text-sm">Email</span></div>
                  <div className="text-sm text-gray-900 flex items-center gap-2">
                    <span>olivia.br@example.com</span>
                    <span className="text-amber-600 text-xs">Not verified</span>
                    <button className="text-[#1033e5] text-xs underline">Verify Now</button>
                  </div>
                </div>
                <Row label="Age" value="27" icon={<CalendarIcon className="w-4 h-4"/>} />
                <Row label="Weight" value="67kg" icon={<WeightIcon className="w-4 h-4"/>} />
                <Row label="Phone Number" value="+1 684 1116" icon={<PhoneIcon className="w-4 h-4"/>} />
                <Row label="Gender" value="Female" icon={<UserIcon className="w-4 h-4"/>} />
                <Row label="Race" value="Black / African American" />
                <Row label="Language Preference" value="English" />
              </div>
            </Section>
          </div>

          {/* Allergies */}
          <div>
            <Section title="Allergies" right={<div className="flex items-center gap-2"/>}>
              <ul className="divide-y">
                {Allergies.map((a,i)=> (
                  <li key={i} className="py-3 flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium">{a.name}</div>
                      {a.note && <div className="text-xs text-gray-600">{a.note}</div>}
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <button aria-label="edit"><PencilIcon className="w-4 h-4"/></button>
                      <button aria-label="delete"><Trash2Icon className="w-4 h-4"/></button>
                    </div>
                  </li>
                ))}
              </ul>
              <button className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"><PlusIcon className="w-4 h-4"/> Add another allergy</button>
            </Section>
          </div>
        </div>

        <div className="mt-4 grid md:grid-cols-3 gap-4">
          {/* Medications */}
          <div>
            <Section title="Medications" right={<div/>}>
              <ul className="divide-y">
                {Medications.map((m,i)=> (
                  <li key={i} className="py-3 flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium">{m.name}</div>
                      {(m.dose || m.schedule) && (
                        <div className="text-xs text-gray-600">{[m.dose, m.schedule].filter(Boolean).join(' ')}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <button aria-label="edit"><PencilIcon className="w-4 h-4"/></button>
                      <button aria-label="delete"><Trash2Icon className="w-4 h-4"/></button>
                    </div>
                  </li>
                ))}
              </ul>
              <button className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"><PlusIcon className="w-4 h-4"/> Add another medication</button>
            </Section>
          </div>

          {/* Health Profile details */}
          <div className="md:col-span-2">
            <Section title="Health Profile" right={<button className="inline-flex items-center gap-1 text-sm rounded-full border px-3 py-1.5"><PencilIcon className="w-4 h-4"/> Edit</button>}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Row label="Blood Group" value="O+" />
                <Row label="Genotype" value="AA" />
                <Row label="Hearing Impaired" value="No" />
                <Row label="Vision Impaired" value="No" />
                <Row label="Primary Condition" value="Chronic Pain" />
                <Row label="Diagnosed" value="2024" />
              </div>
            </Section>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-600 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600"/>
          <span>Profile is up to date</span>
        </div>
      </main>

      <footer className="w-full border-t mt-16">
        <div className="w-full max-w-[1200px] mx-auto px-4 py-6 text-sm text-gray-600 flex items-center justify-between">
          <span>Copyright © 2025 TrialCliniq.</span>
          <span>Terms · Privacy</span>
        </div>
      </footer>
    </div>
  );
}
