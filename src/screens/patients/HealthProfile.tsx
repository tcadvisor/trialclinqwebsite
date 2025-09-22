import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  CheckCircle2,
  AlertTriangle,
  MailIcon,
  PhoneIcon,
  UserIcon,
  CalendarIcon,
  WeightIcon,
  EyeIcon,
  DownloadIcon
} from "lucide-react";
import { useAuth } from "../../lib/auth";
import PatientHeader from "../../components/PatientHeader";
import { findAccountByEmail } from "../../lib/accountStore";

// Editable profile types
type Allergy = { name: string; reaction?: string; severity?: "Mild" | "Moderate" | "Severe"; note?: string };
type Medication = { name: string; dose?: string; amountDaily?: string; schedule?: string };

type HealthProfileData = {
  patientId: string;
  email: string;
  emailVerified: boolean;
  age: string;
  weight: string;
  phone: string;
  gender: string;
  race: string;
  language: string;
  bloodGroup: string;
  genotype: string;
  hearingImpaired: boolean;
  visionImpaired: boolean;
  primaryCondition: string;
  diagnosed: string;
  allergies: Allergy[];
  medications: Medication[];
  additionalInfo: string;
};

const PROFILE_KEY = "tc_health_profile_v1";

const Section: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> = ({ title, children, right }) => (
  <div className="rounded-xl border bg-white">
    <div className="flex items-center justify-between px-4 py-3 border-b">
      <h3 className="font-medium">{title}</h3>
      {right}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const Row: React.FC<{ label: string; value: string; icon?: React.ReactNode; missing?: boolean }> = ({ label, value, icon, missing }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-2 text-gray-600">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
    <div className={`text-sm ${missing ? "text-red-600" : "text-gray-900"}`}>{value || (missing ? "Required" : "")}</div>
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

import ClinicalSummaryUploader from "../../components/ClinicalSummaryUploader";

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
  const { user } = useAuth();
  const currentName = user ? `${user.firstName} ${user.lastName}` : "You";

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
        uploadedBy: currentName,
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
      <div className="mb-4">
        {(() => {
          try {
            const cfg: any = (window as any).__clinicalSummaryUploaderProps || {};
            const raw = localStorage.getItem(PROFILE_KEY);
            const pid = cfg.profileId || (raw ? (JSON.parse(raw).patientId as string) : undefined);
            if (cfg.summarizeApiUrl && cfg.writeProfileApiUrl && pid) {
              return (
                <ClinicalSummaryUploader
                  title={cfg.title || "Summarize Health Record"}
                  acceptedTypes={cfg.acceptedTypes || ["application/pdf", "text/plain", "application/json"]}
                  maxFileSizeMB={cfg.maxFileSizeMB || 25}
                  profileId={pid}
                  summarizeApiUrl={cfg.summarizeApiUrl}
                  writeProfileApiUrl={cfg.writeProfileApiUrl}
                  showEligibilityBadges={cfg.showEligibilityBadges !== undefined ? !!cfg.showEligibilityBadges : true}
                  authHeaderName={cfg.authHeaderName || "Authorization"}
                  getAuthTokenClientFnName={cfg.getAuthTokenClientFnName || "getAuthToken"}
                />
              );
            }
          } catch {}
          return null;
        })()}
      </div>

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

export default function HealthProfile(): JSX.Element {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "ehr">("overview");
  const [docCount, setDocCount] = useState<number>(() => {
    try {
      const raw = localStorage.getItem("tc_docs");
      return raw ? (JSON.parse(raw) as unknown[]).length : 0;
    } catch {
      return 0;
    }
  });

  const [isFirstProfile] = useState<boolean>(() => {
    try { return !localStorage.getItem(PROFILE_KEY); } catch { return true; }
  });

  const [profile, setProfile] = useState<HealthProfileData>(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) return JSON.parse(raw) as HealthProfileData;
    } catch {}
    return {
      patientId: "CUS_j2kthfmgv3bzr5r",
      email: "",
      emailVerified: false,
      age: "",
      weight: "",
      phone: "",
      gender: "",
      race: "",
      language: "",
      bloodGroup: "",
      genotype: "",
      hearingImpaired: false,
      visionImpaired: false,
      primaryCondition: "",
      diagnosed: "",
      allergies: [],
      medications: [],
      additionalInfo: "",
    };
  });

  // Bootstrap from auth/account and eligibility profile
  useEffect(() => {
    setProfile((prev) => {
      let next = { ...prev };
      if ((!next.email || next.email === "") && user?.email) next.email = user.email;
      // Account phone
      const acc = next.email ? findAccountByEmail(next.email) : undefined;
      if (acc?.phone && (!next.phone || next.phone === "")) next.phone = acc.phone;
      // Eligibility fields
      try {
        const raw = localStorage.getItem("tc_eligibility_profile");
        if (raw) {
          const el = JSON.parse(raw) as Partial<Record<string, string>>;
          const dob = (el["dob"] as string) || "";
          const calcAge = () => {
            if (!dob) return "";
            const d = new Date(dob);
            if (isNaN(d.getTime())) return "";
            const today = new Date();
            let age = today.getFullYear() - d.getFullYear();
            const m = today.getMonth() - d.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
            return String(age);
          };
          if (!next.age) next.age = (el["age"] as string) || calcAge();
          if (el["gender"] && !next.gender) next.gender = el["gender"] as string;
          if (el["race"] && !next.race) next.race = el["race"] as string;
          if (el["language"] && !next.language) next.language = el["language"] as string;
          if (el["weight"] && !next.weight) next.weight = el["weight"] as string;
          if (el["condition"] && !next.primaryCondition) next.primaryCondition = el["condition"] as string;
          if (el["year"] && !next.diagnosed) next.diagnosed = el["year"] as string;
        }
      } catch {}
      return next;
    });
  }, [user]);

  // Persist changes
  useEffect(() => {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
  }, [profile]);

  // Edit toggles
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingHealth, setEditingHealth] = useState(false);
  const [editingAdditional, setEditingAdditional] = useState(false);

  // Add forms state
  const [addingAllergy, setAddingAllergy] = useState(false);
  const [newAllergy, setNewAllergy] = useState<Allergy>({ name: "", reaction: "", severity: undefined, note: "" });
  const [addingMedication, setAddingMedication] = useState(false);
  const [newMedication, setNewMedication] = useState<Medication>({ name: "", dose: "", amountDaily: "", schedule: "" });

  // Allergy handlers
  function addAllergy() {
    setAddingAllergy(true);
  }
  function saveNewAllergy() {
    if (!newAllergy.name.trim()) return;
    setProfile((p) => ({
      ...p,
      allergies: [
        ...p.allergies,
        {
          name: newAllergy.name.trim(),
          reaction: newAllergy.reaction?.trim() || undefined,
          severity: newAllergy.severity,
          note: newAllergy.note?.trim() || undefined,
        },
      ],
    }));
    setNewAllergy({ name: "", reaction: "", severity: undefined, note: "" });
    setAddingAllergy(false);
  }
  function cancelNewAllergy() {
    setNewAllergy({ name: "", reaction: "", severity: undefined, note: "" });
    setAddingAllergy(false);
  }
  function editAllergy(index: number) {
    const current = profile.allergies[index];
    const name = prompt("Edit allergy name", current?.name);
    if (!name) return;
    const reaction = prompt("Edit reaction (optional)", current?.reaction || "") || undefined;
    const severityRaw = prompt("Edit severity (Mild, Moderate, Severe) (optional)", current?.severity || "") || undefined;
    const sev = severityRaw === "Mild" || severityRaw === "Moderate" || severityRaw === "Severe" ? (severityRaw as "Mild" | "Moderate" | "Severe") : undefined;
    const note = prompt("Edit notes (optional)", current?.note || "") || undefined;
    setProfile((p) => ({
      ...p,
      allergies: p.allergies.map((a, i) =>
        i === index ? { name: name.trim(), reaction: reaction?.trim() || undefined, severity: sev, note: note?.trim() || undefined } : a
      ),
    }));
  }
  function removeAllergy(index: number) {
    setProfile((p) => ({ ...p, allergies: p.allergies.filter((_, i) => i !== index) }));
  }

  // Medication handlers
  function addMedication() {
    setAddingMedication(true);
  }
  function saveNewMedication() {
    if (!newMedication.name.trim()) return;
    setProfile((p) => ({
      ...p,
      medications: [
        ...p.medications,
        {
          name: newMedication.name.trim(),
          dose: newMedication.dose?.trim() || undefined,
          amountDaily: newMedication.amountDaily?.trim() || undefined,
          schedule: newMedication.schedule?.trim() || undefined,
        },
      ],
    }));
    setNewMedication({ name: "", dose: "", amountDaily: "", schedule: "" });
    setAddingMedication(false);
  }
  function cancelNewMedication() {
    setNewMedication({ name: "", dose: "", amountDaily: "", schedule: "" });
    setAddingMedication(false);
  }
  function editMedication(index: number) {
    const current = profile.medications[index];
    const name = prompt("Edit medication name", current?.name);
    if (!name) return;
    const dose = prompt("Edit dose (optional)", current?.dose || "") || undefined;
    const amountDaily = prompt("Edit amount taken daily (optional)", current?.amountDaily || "") || undefined;
    const schedule = prompt("Edit schedule (optional)", current?.schedule || "") || undefined;
    setProfile((p) => ({
      ...p,
      medications: p.medications.map((m, i) =>
        i === index ? { name: name.trim(), dose: dose?.trim() || undefined, amountDaily: amountDaily?.trim() || undefined, schedule: schedule?.trim() || undefined } : m
      ),
    }));
  }
  function removeMedication(index: number) {
    setProfile((p) => ({ ...p, medications: p.medications.filter((_, i) => i !== index) }));
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <PatientHeader />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-semibold">Health Profile</h1>
        {(() => { const nm = user ? `${user.firstName} ${user.lastName}` : ""; return (<>
          <div className="mt-1 text-gray-700">{nm}</div>
          <div className="text-sm text-gray-500">{profile.email}</div>
        </>); })()}

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
                    editingPersonal ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingPersonal(false)} className="inline-flex items-center gap-1 text-sm rounded-full border px-3 py-1.5">Cancel</button>
                        <button onClick={() => setEditingPersonal(false)} className="inline-flex items-center gap-1 text-sm rounded-full bg-gray-900 text-white px-3 py-1.5">Save</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingPersonal(true)} className="inline-flex items-center gap-1 text-sm rounded-full border px-3 py-1.5">
                        <PencilIcon className="w-4 h-4" /> Edit
                      </button>
                    )
                  }
                >
                  {editingPersonal ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="text-sm text-gray-700">Patient ID
                        <input value={profile.patientId} onChange={(e)=>setProfile(p=>({...p, patientId:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2" />
                      </label>
                      <label className="text-sm text-gray-700">Email
                        <input value={profile.email} onChange={(e)=>setProfile(p=>({...p, email:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2" />
                      </label>
                      <label className="text-sm text-gray-700">Age
                        <input value={profile.age} onChange={(e)=>setProfile(p=>({...p, age:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2" />
                      </label>
                      <label className="text-sm text-gray-700">Weight
                        <input value={profile.weight} onChange={(e)=>setProfile(p=>({...p, weight:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2" />
                      </label>
                      <label className="text-sm text-gray-700">Phone Number
                        <input value={profile.phone} onChange={(e)=>setProfile(p=>({...p, phone:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2" />
                      </label>
                      <label className="text-sm text-gray-700">Gender
                        <select value={profile.gender} onChange={(e)=>setProfile(p=>({...p, gender:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2 bg-white">
                          <option>Female</option>
                          <option>Male</option>
                          <option>Non-binary</option>
                          <option>Prefer not to say</option>
                        </select>
                      </label>
                      <label className="text-sm text-gray-700">Race
                        <input value={profile.race} onChange={(e)=>setProfile(p=>({...p, race:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2" />
                      </label>
                      <label className="text-sm text-gray-700">Language Preference
                        <input value={profile.language} onChange={(e)=>setProfile(p=>({...p, language:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2" />
                      </label>
                      <div className="sm:col-span-2 flex items-center gap-2 text-sm mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${profile.emailVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{profile.emailVerified ? "Verified" : "Not verified"}</span>
                        {!profile.emailVerified && (
                          <button onClick={()=>setProfile(p=>({...p, emailVerified:true}))} className="text-[#1033e5] text-xs underline">Verify Now</button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                      <Row label="Patient ID" value={profile.patientId} icon={<UserIcon className="w-4 h-4" />} />
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          <MailIcon className="w-4 h-4" />
                          <span className="text-sm">Email</span>
                        </div>
                        <div className="text-sm text-gray-900 flex items-center gap-2">
                          <span>{profile.email}</span>
                          <span className={`${profile.emailVerified ? "text-emerald-700" : "text-amber-600"} text-xs`}>{profile.emailVerified ? "Verified" : "Not verified"}</span>
                          {!profile.emailVerified && <button onClick={()=>setProfile(p=>({...p, emailVerified:true}))} className="text-[#1033e5] text-xs underline">Verify Now</button>}
                        </div>
                      </div>
                      <Row label="Age" value={profile.age} icon={<CalendarIcon className="w-4 h-4" />} missing={!profile.age} />
                      <Row label="Weight" value={profile.weight} icon={<WeightIcon className="w-4 h-4" />} missing={!profile.weight} />
                      <Row label="Phone Number" value={profile.phone} icon={<PhoneIcon className="w-4 h-4" />} missing={!profile.phone} />
                      <Row label="Gender" value={profile.gender} icon={<UserIcon className="w-4 h-4" />} missing={!profile.gender} />
                      <Row label="Race" value={profile.race} missing={!profile.race} />
                      <Row label="Language Preference" value={profile.language} missing={!profile.language} />
                    </div>
                  )}
                </Section>
              </div>

              <div>
                <Section title="Allergies" right={<div className="flex items-center gap-2">{profile.allergies.length === 0 && (<span className="text-red-600 text-xs">Required</span>)}</div>}>
                  <ul className="divide-y">
                    {profile.allergies.map((a, i) => (
                      <li key={i} className="py-3 flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium">
                            {a.name}
                            {a.severity && <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{a.severity}</span>}
                          </div>
                          {(a.reaction || a.note) && <div className="text-xs text-gray-600">{[a.reaction, a.note].filter(Boolean).join(" • ")}</div>}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <button onClick={()=>editAllergy(i)} aria-label="edit">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button onClick={()=>removeAllergy(i)} aria-label="delete">
                            <Trash2Icon className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                    {profile.allergies.length === 0 && (
                      <li className="py-3 text-sm text-gray-600">No allergies added</li>
                    )}
                  </ul>

                  {addingAllergy && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <label className="text-gray-700">Allergy Name
                        <input value={newAllergy.name} onChange={(e)=>setNewAllergy(a=>({...a, name:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2" />
                      </label>
                      <label className="text-gray-700">Severity
                        <select value={newAllergy.severity || ""} onChange={(e)=>setNewAllergy(a=>({...a, severity: (e.target.value || undefined) as any}))} className="mt-1 w-full rounded-md border px-3 py-2 bg-white">
                          <option value="">Select</option>
                          <option>Mild</option>
                          <option>Moderate</option>
                          <option>Severe</option>
                        </select>
                      </label>
                      <label className="text-gray-700">Reaction
                        <input value={newAllergy.reaction || ""} onChange={(e)=>setNewAllergy(a=>({...a, reaction:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2" />
                      </label>
                      <label className="text-gray-700 sm:col-span-2">Notes
                        <input value={newAllergy.note || ""} onChange={(e)=>setNewAllergy(a=>({...a, note:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2" />
                      </label>
                      <div className="sm:col-span-2 flex items-center gap-2">
                        <button onClick={cancelNewAllergy} className="inline-flex items-center gap-1 text-sm rounded-full border px-3 py-1.5">Cancel</button>
                        <button onClick={saveNewAllergy} disabled={!newAllergy.name.trim()} className={`inline-flex items-center gap-1 text-sm rounded-full px-3 py-1.5 ${newAllergy.name.trim()?"bg-gray-900 text-white":"bg-gray-200 text-gray-500 cursor-not-allowed"}`}>Save</button>
                      </div>
                    </div>
                  )}

                  {!addingAllergy && (
                    <button onClick={addAllergy} className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">
                      <PlusIcon className="w-4 h-4" /> Add another allergy
                    </button>
                  )}
                </Section>
              </div>
            </div>

            <div className="mt-4 grid md:grid-cols-3 gap-4">
              <div>
                <Section title="Medications" right={<div>{profile.medications.length === 0 && (<span className="text-red-600 text-xs">Required</span>)}</div>}>
                  <ul className="divide-y">
                    {profile.medications.map((m, i) => (
                      <li key={i} className="py-3 flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium">{m.name}</div>
                          {(m.dose || m.amountDaily || m.schedule) && (
                            <div className="text-xs text-gray-600">{[m.dose, m.amountDaily ? `${m.amountDaily} per day` : "", m.schedule].filter(Boolean).join(" • ")}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <button onClick={()=>editMedication(i)} aria-label="edit">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button onClick={()=>removeMedication(i)} aria-label="delete">
                            <Trash2Icon className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                    {profile.medications.length === 0 && (
                      <li className="py-3 text-sm text-gray-600">No medications listed</li>
                    )}
                  </ul>

                  {addingMedication && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <label className="text-gray-700">Medication Name
                        <input value={newMedication.name} onChange={(e)=>setNewMedication(m=>({...m, name:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2" />
                      </label>
                      <label className="text-gray-700">Dose
                        <input value={newMedication.dose || ""} onChange={(e)=>setNewMedication(m=>({...m, dose:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2" />
                      </label>
                      <label className="text-gray-700">Amount taken daily
                        <input value={newMedication.amountDaily || ""} onChange={(e)=>setNewMedication(m=>({...m, amountDaily:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2" />
                      </label>
                      <label className="text-gray-700">Schedule
                        <input value={newMedication.schedule || ""} onChange={(e)=>setNewMedication(m=>({...m, schedule:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2" />
                      </label>
                      <div className="sm:col-span-2 flex items-center gap-2">
                        <button onClick={cancelNewMedication} className="inline-flex items-center gap-1 text-sm rounded-full border px-3 py-1.5">Cancel</button>
                        <button onClick={saveNewMedication} disabled={!newMedication.name.trim()} className={`inline-flex items-center gap-1 text-sm rounded-full px-3 py-1.5 ${newMedication.name.trim()?"bg-gray-900 text-white":"bg-gray-200 text-gray-500 cursor-not-allowed"}`}>Save</button>
                      </div>
                    </div>
                  )}

                  {!addingMedication && (
                    <button onClick={addMedication} className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">
                      <PlusIcon className="w-4 h-4" /> Add another medication
                    </button>
                  )}
                </Section>
              </div>

              <div className="md:col-span-2">
                <Section
                  title="Health Profile"
                  right={
                    editingHealth ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingHealth(false)} className="inline-flex items-center gap-1 text-sm rounded-full border px-3 py-1.5">Cancel</button>
                        <button onClick={() => setEditingHealth(false)} className="inline-flex items-center gap-1 text-sm rounded-full bg-gray-900 text-white px-3 py-1.5">Save</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingHealth(true)} className="inline-flex items-center gap-1 text-sm rounded-full border px-3 py-1.5">
                        <PencilIcon className="w-4 h-4" /> Edit
                      </button>
                    )
                  }
                >
                  {editingHealth ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="text-sm text-gray-700">Blood Group
                        <select value={profile.bloodGroup} onChange={(e)=>setProfile(p=>({...p, bloodGroup:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2 bg-white">
                          {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b=> <option key={b}>{b}</option>)}
                        </select>
                      </label>
                      <label className="text-sm text-gray-700">Genotype
                        <input value={profile.genotype} onChange={(e)=>setProfile(p=>({...p, genotype:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2" />
                      </label>
                      <label className="text-sm text-gray-700">Hearing Impaired
                        <select value={profile.hearingImpaired ? 'Yes' : 'No'} onChange={(e)=>setProfile(p=>({...p, hearingImpaired:e.target.value==='Yes'}))} className="mt-1 w-full rounded-md border px-3 py-2 bg-white">
                          <option>No</option>
                          <option>Yes</option>
                        </select>
                      </label>
                      <label className="text-sm text-gray-700">Vision Impaired
                        <select value={profile.visionImpaired ? 'Yes' : 'No'} onChange={(e)=>setProfile(p=>({...p, visionImpaired:e.target.value==='Yes'}))} className="mt-1 w-full rounded-md border px-3 py-2 bg-white">
                          <option>No</option>
                          <option>Yes</option>
                        </select>
                      </label>
                      <label className="text-sm text-gray-700">Primary Condition
                        <input value={profile.primaryCondition} onChange={(e)=>setProfile(p=>({...p, primaryCondition:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2" />
                      </label>
                      <label className="text-sm text-gray-700">Diagnosed
                        <input value={profile.diagnosed} onChange={(e)=>setProfile(p=>({...p, diagnosed:e.target.value}))} className="mt-1 w-full rounded-md border px-3 py-2" />
                      </label>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                      <Row label="Blood Group" value={profile.bloodGroup} missing={!profile.bloodGroup} />
                      <Row label="Genotype" value={profile.genotype} missing={!profile.genotype} />
                      <Row label="Hearing Impaired" value={profile.hearingImpaired ? 'Yes' : 'No'} />
                      <Row label="Vision Impaired" value={profile.visionImpaired ? 'Yes' : 'No'} />
                      <Row label="Primary Condition" value={profile.primaryCondition} missing={!profile.primaryCondition} />
                      <Row label="Diagnosed" value={profile.diagnosed} missing={!profile.diagnosed} />
                    </div>
                  )}
                </Section>
              </div>
            </div>

            <div className="mt-4">
              <Section
                title="Additional Information"
                right={
                  editingAdditional ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingAdditional(false)} className="inline-flex items-center gap-1 text-sm rounded-full border px-3 py-1.5">Cancel</button>
                      <button onClick={() => setEditingAdditional(false)} className="inline-flex items-center gap-1 text-sm rounded-full bg-gray-900 text-white px-3 py-1.5">Save</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingAdditional(true)} className="inline-flex items-center gap-1 text-sm rounded-full border px-3 py-1.5">
                      <PencilIcon className="w-4 h-4" /> Edit
                    </button>
                  )
                }
              >
                {editingAdditional ? (
                  <textarea value={profile.additionalInfo} onChange={(e)=>setProfile(p=>({...p, additionalInfo:e.target.value}))} rows={4} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Any important details you'd like us to know..."/>
                ) : (
                  <div className="text-sm text-gray-700 min-h-[20px]">{profile.additionalInfo || "No additional information yet"}</div>
                )}
              </Section>
            </div>

            {(() => {
              const needs = !profile.weight || !profile.gender || !profile.phone || !profile.age || !profile.race || !profile.language || !profile.bloodGroup || !profile.genotype || !profile.primaryCondition || !profile.diagnosed || profile.allergies.length === 0 || profile.medications.length === 0;
              return needs ? (
                <div className="mt-6 text-sm text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Some details are missing. Please complete your profile.</span>
                </div>
              ) : (
                <div className="mt-6 text-sm text-gray-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Profile is up to date</span>
                </div>
              );
            })()}
          </>
        )}

        {activeTab === "documents" && <Documents onCountChange={setDocCount} />}

        {activeTab === "ehr" && (
          <div className="mt-6 rounded-xl border bg-white p-4 text-sm text-gray-600">Connect your EHR/EMR provider to sync medical records.</div>
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
