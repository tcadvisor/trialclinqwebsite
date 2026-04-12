import React from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader";
import { useAuth } from "../../lib/auth";
import { addCsrfHeader } from "../../lib/csrf";
import { ChevronLeft, Plus, Trash2, Save, Eye } from "lucide-react";

type TrialFormData = {
  title: string;
  briefSummary: string;
  detailedDescription: string;
  phase: string;
  studyType: string;
  conditions: string[];
  interventions: { type: string; name: string; description: string }[];
  eligibilityCriteria: string;
  minAge: string;
  maxAge: string;
  gender: string;
  enrollmentTarget: string;
  startDate: string;
  estimatedCompletion: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  locations: { name: string; city: string; state: string; country: string }[];
};

const initialFormData: TrialFormData = {
  title: "",
  briefSummary: "",
  detailedDescription: "",
  phase: "",
  studyType: "Interventional",
  conditions: [""],
  interventions: [{ type: "Drug", name: "", description: "" }],
  eligibilityCriteria: "",
  minAge: "18",
  maxAge: "",
  gender: "All",
  enrollmentTarget: "",
  startDate: "",
  estimatedCompletion: "",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  locations: [{ name: "", city: "", state: "", country: "United States" }],
};

export default function CreateTrial(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.userId || "";
  const [formData, setFormData] = React.useState<TrialFormData>(initialFormData);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [activeSection, setActiveSection] = React.useState(0);

  const sections = [
    { id: 0, title: "Basic Information" },
    { id: 1, title: "Study Details" },
    { id: 2, title: "Eligibility" },
    { id: 3, title: "Contact & Locations" },
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleConditionChange = (index: number, value: string) => {
    setFormData((prev) => {
      const conditions = [...prev.conditions];
      conditions[index] = value;
      return { ...prev, conditions };
    });
  };

  const addCondition = () => {
    setFormData((prev) => ({ ...prev, conditions: [...prev.conditions, ""] }));
  };

  const removeCondition = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const handleInterventionChange = (
    index: number,
    field: keyof TrialFormData["interventions"][0],
    value: string
  ) => {
    setFormData((prev) => {
      const interventions = [...prev.interventions];
      interventions[index] = { ...interventions[index], [field]: value };
      return { ...prev, interventions };
    });
  };

  const addIntervention = () => {
    setFormData((prev) => ({
      ...prev,
      interventions: [...prev.interventions, { type: "Drug", name: "", description: "" }],
    }));
  };

  const removeIntervention = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      interventions: prev.interventions.filter((_, i) => i !== index),
    }));
  };

  const handleLocationChange = (
    index: number,
    field: keyof TrialFormData["locations"][0],
    value: string
  ) => {
    setFormData((prev) => {
      const locations = [...prev.locations];
      locations[index] = { ...locations[index], [field]: value };
      return { ...prev, locations };
    });
  };

  const addLocation = () => {
    setFormData((prev) => ({
      ...prev,
      locations: [...prev.locations, { name: "", city: "", state: "", country: "United States" }],
    }));
  };

  const removeLocation = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async (publish: boolean = false) => {
    if (!formData.title) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const headers = await addCsrfHeader({
        "Content-Type": "application/json",
        "x-user-id": userId,
        "x-provider-id": userId,
      });

      const response = await fetch("/api/custom-trials", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...formData,
          conditions: formData.conditions.filter((c) => c.trim()),
          interventions: formData.interventions.filter((i) => i.name.trim()),
          locations: formData.locations.filter((l) => l.name.trim()),
          minAge: formData.minAge ? parseInt(formData.minAge) : null,
          maxAge: formData.maxAge ? parseInt(formData.maxAge) : null,
          enrollmentTarget: formData.enrollmentTarget ? parseInt(formData.enrollmentTarget) : null,
          status: publish ? "recruiting" : "draft",
          isPublished: publish,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create trial");
      }

      navigate("/providers/trials/all");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trial");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-2xl font-semibold">Create New Trial</h1>
        <p className="mt-1 text-sm text-gray-600">
          Create a custom trial that can be published to recruit participants
        </p>

        {/* Section navigation */}
        <div className="mt-6 flex border-b">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                activeSection === section.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {section.title}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-6">
          {/* Section 0: Basic Information */}
          {activeSection === 0 && (
            <div className="bg-white rounded-2xl border p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trial Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Phase 2 Study of Drug X in Adult Patients with Condition Y"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brief Summary
                </label>
                <textarea
                  name="briefSummary"
                  value={formData.briefSummary}
                  onChange={handleInputChange}
                  placeholder="A brief overview of the study (will be shown in search results)"
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detailed Description
                </label>
                <textarea
                  name="detailedDescription"
                  value={formData.detailedDescription}
                  onChange={handleInputChange}
                  placeholder="Detailed description of the study design, objectives, and methodology"
                  rows={5}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phase</label>
                  <select
                    name="phase"
                    value={formData.phase}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select phase</option>
                    <option value="Early Phase 1">Early Phase 1</option>
                    <option value="Phase 1">Phase 1</option>
                    <option value="Phase 1/Phase 2">Phase 1/Phase 2</option>
                    <option value="Phase 2">Phase 2</option>
                    <option value="Phase 2/Phase 3">Phase 2/Phase 3</option>
                    <option value="Phase 3">Phase 3</option>
                    <option value="Phase 4">Phase 4</option>
                    <option value="Not Applicable">Not Applicable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Study Type
                  </label>
                  <select
                    name="studyType"
                    value={formData.studyType}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="Interventional">Interventional</option>
                    <option value="Observational">Observational</option>
                    <option value="Expanded Access">Expanded Access</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Study Details */}
          {activeSection === 1 && (
            <div className="bg-white rounded-2xl border p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Conditions</label>
                  <button
                    type="button"
                    onClick={addCondition}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add condition
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.conditions.map((condition, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={condition}
                        onChange={(e) => handleConditionChange(index, e.target.value)}
                        placeholder="e.g., Type 2 Diabetes"
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      />
                      {formData.conditions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCondition(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Interventions</label>
                  <button
                    type="button"
                    onClick={addIntervention}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add intervention
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.interventions.map((intervention, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={intervention.type}
                          onChange={(e) =>
                            handleInterventionChange(index, "type", e.target.value)
                          }
                          className="border rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="Drug">Drug</option>
                          <option value="Device">Device</option>
                          <option value="Biological">Biological</option>
                          <option value="Procedure">Procedure</option>
                          <option value="Behavioral">Behavioral</option>
                          <option value="Other">Other</option>
                        </select>
                        <input
                          type="text"
                          value={intervention.name}
                          onChange={(e) =>
                            handleInterventionChange(index, "name", e.target.value)
                          }
                          placeholder="Intervention name"
                          className="flex-1 border rounded-lg px-3 py-2 text-sm"
                        />
                        {formData.interventions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeIntervention(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <textarea
                        value={intervention.description}
                        onChange={(e) =>
                          handleInterventionChange(index, "description", e.target.value)
                        }
                        placeholder="Description of the intervention"
                        rows={2}
                        className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Enrollment
                  </label>
                  <input
                    type="number"
                    name="enrollmentTarget"
                    value={formData.enrollmentTarget}
                    onChange={handleInputChange}
                    placeholder="e.g., 100"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Eligibility */}
          {activeSection === 2 && (
            <div className="bg-white rounded-2xl border p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Eligibility Criteria
                </label>
                <textarea
                  name="eligibilityCriteria"
                  value={formData.eligibilityCriteria}
                  onChange={handleInputChange}
                  placeholder="Inclusion criteria:&#10;- Criterion 1&#10;- Criterion 2&#10;&#10;Exclusion criteria:&#10;- Criterion 1&#10;- Criterion 2"
                  rows={10}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Age
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="minAge"
                      value={formData.minAge}
                      onChange={handleInputChange}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                    <span className="text-sm text-gray-500">years</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Age
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="maxAge"
                      value={formData.maxAge}
                      onChange={handleInputChange}
                      placeholder="No limit"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                    <span className="text-sm text-gray-500">years</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sex/Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="All">All</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Contact & Locations */}
          {activeSection === 3 && (
            <div className="bg-white rounded-2xl border p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Primary Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      name="primaryContactName"
                      value={formData.primaryContactName}
                      onChange={handleInputChange}
                      placeholder="Dr. Jane Smith"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Email</label>
                    <input
                      type="email"
                      name="primaryContactEmail"
                      value={formData.primaryContactEmail}
                      onChange={handleInputChange}
                      placeholder="contact@hospital.org"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Phone</label>
                    <input
                      type="tel"
                      name="primaryContactPhone"
                      value={formData.primaryContactPhone}
                      onChange={handleInputChange}
                      placeholder="(555) 123-4567"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Study Locations</h3>
                  <button
                    type="button"
                    onClick={addLocation}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add location
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.locations.map((location, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={location.name}
                            onChange={(e) =>
                              handleLocationChange(index, "name", e.target.value)
                            }
                            placeholder="Facility name"
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={location.city}
                            onChange={(e) =>
                              handleLocationChange(index, "city", e.target.value)
                            }
                            placeholder="City"
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={location.state}
                            onChange={(e) =>
                              handleLocationChange(index, "state", e.target.value)
                            }
                            placeholder="State"
                            className="flex-1 border rounded-lg px-3 py-2 text-sm"
                          />
                          {formData.locations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLocation(index)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-3">
            {activeSection > 0 && (
              <button
                onClick={() => setActiveSection(activeSection - 1)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                Previous
              </button>
            )}
            {activeSection < sections.length - 1 && (
              <button
                onClick={() => setActiveSection(activeSection + 1)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-black"
              >
                Next
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Eye className="h-4 w-4" />
              {saving ? "Publishing..." : "Publish Trial"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
