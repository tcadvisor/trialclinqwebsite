import { Link, useNavigate } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import { useState, useRef } from "react";
import { X } from "lucide-react";

const US_STATES_AND_TERRITORIES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "District of Columbia",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
  "American Samoa",
  "Guam",
  "Northern Mariana Islands",
  "Puerto Rico",
  "U.S. Virgin Islands",
];

type TagsInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  "aria-label"?: string;
};

function TagsInput({ value, onChange, placeholder, "aria-label": ariaLabel }: TagsInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  function addTag(tag: string) {
    const t = tag.trim();
    if (!t) return;
    const exists = value.some((v) => v.toLowerCase() === t.toLowerCase());
    if (exists) return;
    onChange([...value, t]);
    setInput("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input) {
      onChange(value.slice(0, -1));
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    const parts = text.split(/,|\n|\t/).map((p) => p.trim()).filter(Boolean);
    if (parts.length) {
      const merged = [...value];
      for (const p of parts) {
        const exists = merged.some((v) => v.toLowerCase() === p.toLowerCase());
        if (!exists) merged.push(p);
      }
      onChange(merged);
      setTimeout(() => inputRef.current?.focus(), 0);
      e.preventDefault();
    }
  }

  function removeTag(idx: number) {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  }

  return (
    <div className="flex items-start gap-2 rounded-full border px-3 py-2">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-1 text-gray-500"><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2"/></svg>
      <div className="flex flex-wrap gap-2 flex-1 min-h-6">
        {value.map((tag, idx) => (
          <span key={tag + idx} className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 text-xs px-2 py-1">
            {tag}
            <button type="button" aria-label={`Remove ${tag}`} className="text-gray-500 hover:text-gray-700" onClick={() => removeTag(idx)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="flex-1 outline-none text-sm min-w-[120px]"
        />
      </div>
    </div>
  );
}

export default function SiteInformation(): JSX.Element {
  const navigate = useNavigate();
  const [country, setCountry] = useState("");
  const [usState, setUsState] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ conditions?: string; languages?: string }>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextErrors: { conditions?: string; languages?: string } = {};
    if (conditions.length === 0) nextErrors.conditions = "Please add at least one condition.";
    if (languages.length === 0) nextErrors.languages = "Please add at least one language.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    navigate("/providers/investigator-information");
  }

  function onCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setCountry(value);
    if (value !== "United States") setUsState("");
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SiteHeader active={undefined} />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-semibold text-center">Site Information</h1>
        <p className="text-center text-gray-600 mt-2">Enter your site's contact and location details for trial coordination</p>

        <div className="mt-8 rounded-2xl border shadow-sm bg-white p-6 md:p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium mb-1">Sponsoring Organization Type<span className="text-red-500">*</span></label>
              <select className="w-full rounded-lg border px-3 py-2 bg-white">
                <option value="">Select your organization type</option>
                <option>Hospital / Health System</option>
                <option>Academic Medical Center</option>
                <option>Private Practice</option>
                <option>Research Site Network</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sponsoring Organization Abbreviations</label>
              <input placeholder="Enter your organization acronym or abbreviation" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Parent Organizations</label>
              <input placeholder="Enter your parent organization if applicable" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Site Name<span className="text-red-500">*</span></label>
              <input placeholder="Enter your site name" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Country<span className="text-red-500">*</span></label>
                <select className="w-full rounded-lg border px-3 py-2 bg-white" value={country} onChange={onCountryChange}>
                  <option value="">Select country</option>
                  <option>United States</option>
                  <option>Canada</option>
                  <option>United Kingdom</option>
                </select>
              </div>
              {country === "United States" && (
                <div>
                  <label className="block text-sm font-medium mb-1">State<span className="text-red-500">*</span></label>
                  <select className="w-full rounded-lg border px-3 py-2 bg-white" value={usState} onChange={(e) => setUsState(e.target.value)} required={country === "United States"}>
                    <option value="">Select state</option>
                    {US_STATES_AND_TERRITORIES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Address<span className="text-red-500">*</span></label>
                <input placeholder="Enter site full address" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Zipcode<span className="text-red-500">*</span></label>
                <input placeholder="Enter zipcode" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Facility Type<span className="text-red-500">*</span></label>
              <select className="w-full rounded-lg border px-3 py-2 bg-white">
                <option value="">Select site type</option>
                <option>Outpatient Clinic</option>
                <option>Inpatient Facility</option>
                <option>Community Site</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Funding Organization<span className="text-red-500">*</span></label>
              <select className="w-full rounded-lg border px-3 py-2 bg-white">
                <option value="">Select your organization type</option>
                <option>Public</option>
                <option>Private</option>
                <option>Mixed</option>
              </select>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border" />
                Same as sponsoring organization
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Conditions Your Site Accepts<span className="text-red-500">*</span></label>
              <TagsInput
                value={conditions}
                onChange={setConditions}
                placeholder="You can add as many as apply. If you're unsure of the exact name, type what you know, we'll help match it."
                aria-label="Conditions your site accepts"
              />
              {errors.conditions && <p className="text-xs text-red-600 mt-1">{errors.conditions}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Languages spoken at site<span className="text-red-500">*</span></label>
              <TagsInput
                value={languages}
                onChange={setLanguages}
                placeholder="You can add as many as apply. If you're unsure of the exact name, type what you know, we'll help match it."
                aria-label="Languages spoken at site"
              />
              {errors.languages && <p className="text-xs text-red-600 mt-1">{errors.languages}</p>}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link to="/providers/create" className="px-6 py-3 rounded-full border bg-white hover:bg-gray-50">Back</Link>
              <button type="submit" className="px-6 py-3 rounded-full bg-blue-600 text-white hover:bg-blue-700">Continue</button>
            </div>

            <p className="text-xs text-gray-500 flex items-center gap-2 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2a9 9 0 1 0 9 9A9.01 9.01 0 0 0 12 2Zm1 13h-2v-2h2Zm0-4h-2V7h2Z"/></svg>
              Your data stays private and protected with HIPAA-compliant security.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
