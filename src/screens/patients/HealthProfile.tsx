import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  CheckCircle2,
  MailIcon,
  PhoneIcon,
  UserIcon,
  CalendarIcon,
  WeightIcon,
  EyeIcon,
  DownloadIcon,
  Shield,
  Search as SearchIcon
} from "lucide-react";

const Section: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> = ({ title, children, right }) => (
  <div className="rounded-xl border bg-white">
    <div className="flex items-center justify-between px-4 py-3 border-b">
      <h3 className="font-medium">{title}</h3>
      {right}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const Row: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-2 text-gray-600">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
    <div className="text-sm text-gray-900">{value}</div>
  </div>
);

// Documents UI
type DocCategory = "Diagnostic Reports" | "Lab Reports";

type DocItem = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedBy: string;
  uploadedAt: number; // epoch
  category: DocCategory;
  url: string; // object or data URL
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function Documents({ onCountChange }: { onCountChange?: (count: number) => void }): JSX.Element {
  const [category, setCategory] = useState<DocCategory>("Diagnostic Reports");
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<DocItem[]>(() => {
    try {
      const raw = localStorage.getItem("tc_docs");
      return raw ? (JSON.parse(raw) as DocItem[]) : [];
    } catch {
      return [];
    }
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    localStorage.setItem("tc_docs", JSON.stringify(docs));
    onCountChange?.(docs.length);
  }, [docs, onCountChange]);

  const filtered = useMemo(() => {
    const list = docs.filter((d) => d.category === category && d.name.toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [docs, category, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const triggerUpload = () => inputRef.current?.click();

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const uploads: Promise<DocItem>[] = Array.from(files).map(async (file) => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      return {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedBy: "Olivia Brian",
        uploadedAt: Date.now(),
        category,
        url: dataUrl,
      };
    });
    const newDocs = await Promise.all(uploads);
    setDocs((prev) => [...newDocs, ...prev]);
  }

  function downloadDoc(doc: DocItem) {
    const a = document.createElement("a");
    a.href = doc.url;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function viewDoc(doc: DocItem) {
    window.open(doc.url, "_blank", "noopener,noreferrer");
  }

  function renameDoc(id: string) {
    const current = docs.find((d) => d.id === id);
    if (!current) return;
    const name = prompt("Rename document", current.name);
    if (!name || name.trim() === "") return;
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, name: name.trim() } : d)));
  }

  function removeDoc(id: string) {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  const counts = useMemo(() => ({
    diagnostic: docs.filter((d) => d.category === "Diagnostic Reports").length,
    lab: docs.filter((d) => d.category === "Lab Reports").length,
  }), [docs]);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <button
          onClick={() => setCategory("Diagnostic Reports")}
          className={`relative pb-2 ${category === "Diagnostic Reports" ? "border-b-2 border-[#1033e5] text-gray-900" : "text-gray-600"}`}
        >
          Diagnostic Reports <span className="ml-1 inline-flex items-center justify-center px-1.5 h-5 text-xs rounded-full bg-gray-100">{counts.diagnostic}</span>
        </button>
        <button
          onClick={() => setCategory("Lab Reports")}
          className={`relative pb-2 ${category === "Lab Reports" ? "border-b-2 border-[#1033e5] text-gray-900" : "text-gray-600"}`}
        >
          Lab Reports <span className="ml-1 inline-flex items-center justify-center px-1.5 h-5 text-xs rounded-full bg-gray-100">{counts.lab}</span>
        </button>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-64 rounded-full border px-4 py-2 text-sm focus:outline-none"
              placeholder="Search"
            />
          </div>
          <button onClick={triggerUpload} className="inline-flex items-center gap-2 rounded-full bg-[#1033e5] text-white px-3 py-2 text-sm hover:bg-blue-700">
            Upload document
          </button>
          <input ref={inputRef} className="hidden" type="file" multiple onChange={(e) => onFilesSelected(e.target.files)} />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Document Name</th>
              <th className="px-4 py-3 font-medium">Uploaded By</th>
              <th className="px-4 py-3 font-medium">Date Uploaded</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-gray-900">{d.name}</span>
                    <span className="text-xs text-gray-500">{formatBytes(d.size)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{d.uploadedBy}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(d.uploadedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => viewDoc(d)} className="rounded-full border px-3 py-1.5 text-xs hover:bg-gray-50 inline-flex items-center gap-1">
                      <EyeIcon className="w-4 h-4"/> View
                    </button>
                    <button onClick={() => downloadDoc(d)} className="p-1.5 text-gray-600 hover:text-gray-900" aria-label="download">
                      <DownloadIcon className="w-4 h-4"/>
                    </button>
                    <button onClick={() => renameDoc(d.id)} className="p-1.5 text-gray-600 hover:text-gray-900" aria-label="rename">
                      <PencilIcon className="w-4 h-4"/>
                    </button>
                    <button onClick={() => removeDoc(d.id)} className="p-1.5 text-red-600 hover:text-red-700" aria-label="delete">
                      <Trash2Icon className="w-4 h-4"/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-600">No documents yet</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-gray-600">
          <div>Page {page} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`rounded-lg border px-3 py-1.5 ${page === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
            >
              Previous
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={`rounded-lg border px-3 py-1.5 ${page === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectedEHR(): JSX.Element {
  type Vendor = { id: string; brand: string; name: string; portals: number; isNew?: boolean };
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const vendors: Vendor[] = [
    { id: "cmc", brand: "Meditech Expanse", name: "Citizens Medical Center", portals: 1, isNew: true },
    { id: "tea", brand: "athenahealth", name: "Texas Endovascular Associates", portals: 1 },
    { id: "mdacc", brand: "Epic", name: "MD Anderson Cancer Center", portals: 2 },
    { id: "mshs", brand: "Oracle", name: "Mount Sinai Health System", portals: 1 },
    { id: "sutter", brand: "Epic", name: "Sutter Health", portals: 3 },
    { id: "uhs", brand: "Cerner", name: "Universal Health Services", portals: 1 },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(v =>
      v.name.toLowerCase().includes(q) || v.brand.toLowerCase().includes(q)
    );
  }, [query]);

  const list = showAll ? filtered : filtered.slice(0, 4);

  const onConnectNow = () => {
    document.getElementById("available-ehrs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mt-6 space-y-6">
      <Section title="Current Integrations">
        <div className="rounded-xl border bg-white">
          <div className="p-6 sm:p-10">
            <div className="mx-auto max-w-3xl rounded-2xl border bg-gray-50 px-6 py-10 text-center">
              <div className="text-gray-900 font-medium">No connected health records yet.</div>
              <p className="mt-2 text-sm text-gray-600">
                Connect your electronic health record to improve your trial matches and save time
                filling out medical history forms.
              </p>
              <button onClick={onConnectNow} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1033e5] px-4 py-2 text-white text-sm hover:bg-blue-700">
                Connect Now
              </button>
            </div>
            <div className="mt-4 flex items-start gap-2 text-xs text-gray-600">
              <Shield className="h-4 w-4 text-gray-500" />
              <p>
                Your connected health records are encrypted and securely stored in compliance with HIPAA standards. You can disconnect access at any time.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Available EMR/EHRs"
        right={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAll(true)}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              View all
            </button>
          </div>
        }
      >
        <div id="available-ehrs" className="space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search healthcare systems or providers"
              className="w-full rounded-full border pl-9 pr-3 py-2 text-sm focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {list.map((v) => (
              <div key={v.id} className="relative rounded-xl border bg-white p-4">
                <button aria-label={`connect ${v.name}`} className="absolute right-2 top-2 h-7 w-7 rounded-full border text-gray-700 hover:bg-gray-50 flex items-center justify-center">
                  <PlusIcon className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-800">{v.brand}</span>
                  {v.isNew && <span className="inline-flex items-center rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-[11px] font-medium">New</span>}
                </div>
                <div className="mt-2 font-medium text-gray-900 leading-snug">{v.name}</div>
                <div className="mt-4">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">{v.portals} {v.portals === 1 ? "portal" : "portals"}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end text-xs text-gray-500">
            <span>Powered by Health Gorilla</span>
          </div>
        </div>
      </Section>
    </div>
  );
}

export default function HealthProfile(): JSX.Element {
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "ehr">("overview");
  const [docCount, setDocCount] = useState<number>(() => {
    try {
      const raw = localStorage.getItem("tc_docs");
      return raw ? (JSON.parse(raw) as unknown[]).length : 0;
    } catch {
      return 0;
    }
  });

  const Allergies: { name: string; note?: string }[] = [
    { name: "Pollen", note: "Itchy nose and watery eyes" },
    { name: "Caffeine", note: "Sore throat" },
    { name: "Lactose intolerant", note: "Diarrhea and bloating" },
  ];

  const Medications: { name: string; dose?: string; schedule?: string }[] = [
    { name: "Pregabalin" },
    { name: "Gabapentin 75mg", schedule: "Twice Daily" },
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
          <button
            onClick={() => setActiveTab("overview")}
            className={`relative pb-2 ${activeTab === "overview" ? "border-b-2 border-[#1033e5] text-gray-900" : "text-gray-600"}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`relative pb-2 flex items-center gap-2 ${activeTab === "documents" ? "border-b-2 border-[#1033e5] text-gray-900" : "text-gray-600"}`}
          >
            Documents
            <span className="ml-1 inline-flex items-center justify-center px-1.5 h-5 text-xs rounded-full bg-gray-100">{docCount}</span>
          </button>
          <button
            onClick={() => setActiveTab("ehr")}
            className={`relative pb-2 ${activeTab === "ehr" ? "border-b-2 border-[#1033e5] text-gray-900" : "text-gray-600"}`}
          >
            Connected EHR/EMR
          </button>
        </div>

        {activeTab === "overview" && (
          <>
            <div className="mt-6 grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Section
                  title="Personal Details"
                  right={
                    <button className="inline-flex items-center gap-1 text-sm rounded-full border px-3 py-1.5">
                      <PencilIcon className="w-4 h-4" /> Edit
                    </button>
                  }
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                    <Row label="Patient ID" value="CUS_j2kthfmgv3bzr5r" icon={<UserIcon className="w-4 h-4" />} />
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MailIcon className="w-4 h-4" />
                        <span className="text-sm">Email</span>
                      </div>
                      <div className="text-sm text-gray-900 flex items-center gap-2">
                        <span>olivia.br@example.com</span>
                        <span className="text-amber-600 text-xs">Not verified</span>
                        <button className="text-[#1033e5] text-xs underline">Verify Now</button>
                      </div>
                    </div>
                    <Row label="Age" value="27" icon={<CalendarIcon className="w-4 h-4" />} />
                    <Row label="Weight" value="67kg" icon={<WeightIcon className="w-4 h-4" />} />
                    <Row label="Phone Number" value="+1 684 1116" icon={<PhoneIcon className="w-4 h-4" />} />
                    <Row label="Gender" value="Female" icon={<UserIcon className="w-4 h-4" />} />
                    <Row label="Race" value="Black / African American" />
                    <Row label="Language Preference" value="English" />
                  </div>
                </Section>
              </div>

              <div>
                <Section title="Allergies" right={<div className="flex items-center gap-2" />}>
                  <ul className="divide-y">
                    {Allergies.map((a, i) => (
                      <li key={i} className="py-3 flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium">{a.name}</div>
                          {a.note && <div className="text-xs text-gray-600">{a.note}</div>}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <button aria-label="edit">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button aria-label="delete">
                            <Trash2Icon className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">
                    <PlusIcon className="w-4 h-4" /> Add another allergy
                  </button>
                </Section>
              </div>
            </div>

            <div className="mt-4 grid md:grid-cols-3 gap-4">
              <div>
                <Section title="Medications" right={<div />}>
                  <ul className="divide-y">
                    {Medications.map((m, i) => (
                      <li key={i} className="py-3 flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium">{m.name}</div>
                          {(m.dose || m.schedule) && (
                            <div className="text-xs text-gray-600">{[m.dose, m.schedule].filter(Boolean).join(" ")}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <button aria-label="edit">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button aria-label="delete">
                            <Trash2Icon className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">
                    <PlusIcon className="w-4 h-4" /> Add another medication
                  </button>
                </Section>
              </div>

              <div className="md:col-span-2">
                <Section
                  title="Health Profile"
                  right={
                    <button className="inline-flex items-center gap-1 text-sm rounded-full border px-3 py-1.5">
                      <PencilIcon className="w-4 h-4" /> Edit
                    </button>
                  }
                >
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
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Profile is up to date</span>
            </div>
          </>
        )}

        {activeTab === "documents" && <Documents onCountChange={setDocCount} />}

        {activeTab === "ehr" && (
          <ConnectedEHR />
        )}
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
