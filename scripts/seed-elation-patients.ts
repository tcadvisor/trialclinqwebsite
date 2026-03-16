/**
 * Elation Sandbox Patient Seeder
 *
 * Creates synthetic patient data in your Elation sandbox for testing.
 *
 * Usage:
 *   npx ts-node scripts/seed-elation-patients.ts
 *
 * Or add to package.json scripts:
 *   "seed:elation": "ts-node scripts/seed-elation-patients.ts"
 *
 * Environment variables required:
 *   - ELATION_CLIENT_ID
 *   - ELATION_CLIENT_SECRET
 *   - ELATION_ACCESS_TOKEN (get from OAuth flow or use API key)
 */

// ============================================================================
// Configuration
// ============================================================================

const ELATION_API_BASE = process.env.ELATION_API_BASE_URL || "https://sandbox.elationemr.com/api/2.0";
const ACCESS_TOKEN = process.env.ELATION_ACCESS_TOKEN || "";
const PRACTICE_ID = process.env.ELATION_PRACTICE_ID ? parseInt(process.env.ELATION_PRACTICE_ID) : undefined;

// Number of patients to create
const NUM_PATIENTS = parseInt(process.env.SEED_PATIENT_COUNT || "25");

// ============================================================================
// Types
// ============================================================================

interface PatientPayload {
  first_name: string;
  last_name: string;
  dob: string;
  sex: "Male" | "Female" | "Other" | "Unknown";
  email?: string;
  primary_phone?: string;
  address?: {
    address_line1?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  practice?: number;
  ssn?: string;
  ethnicity?: string;
  race?: string;
  preferred_language?: string;
}

interface ProblemPayload {
  patient: number;
  description: string;
  icd10_code?: string;
  status: "Active" | "Resolved" | "Inactive";
  onset_date?: string;
  notes?: string;
}

interface AllergyPayload {
  patient: number;
  name: string;
  status: "Active" | "Inactive";
  reaction?: string;
  severity?: "Mild" | "Moderate" | "Severe";
}

interface MedicationPayload {
  patient: number;
  medication_name: string;
  sig?: string;
  status: "Active" | "Inactive" | "Discontinued";
  start_date?: string;
}

// ============================================================================
// Synthetic Data Generators
// ============================================================================

const FIRST_NAMES_FEMALE = [
  "Emma", "Olivia", "Ava", "Isabella", "Sophia", "Mia", "Charlotte", "Amelia",
  "Harper", "Evelyn", "Abigail", "Emily", "Elizabeth", "Sofia", "Ella", "Madison",
  "Scarlett", "Victoria", "Aria", "Grace", "Chloe", "Camila", "Penelope", "Riley",
  "Layla", "Lillian", "Nora", "Zoey", "Hannah", "Lily", "Eleanor", "Hazel",
  "Luna", "Stella", "Aurora", "Natalie", "Emilia", "Everly", "Leah", "Aubrey"
];

const FIRST_NAMES_MALE = [
  "Liam", "Noah", "Oliver", "Elijah", "James", "William", "Benjamin", "Lucas",
  "Henry", "Theodore", "Jack", "Levi", "Alexander", "Mason", "Ethan", "Jacob",
  "Michael", "Daniel", "Matthew", "Sebastian", "David", "Joseph", "Carter", "Owen",
  "Wyatt", "John", "Luke", "Nathan", "Isaac", "Andrew", "Joshua", "Christopher",
  "Samuel", "Ryan", "Gabriel", "Anthony", "Dylan", "Leo", "Lincoln", "Charles"
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell"
];

const CITIES = [
  { city: "New York", state: "NY", zip: "10001" },
  { city: "Los Angeles", state: "CA", zip: "90001" },
  { city: "Chicago", state: "IL", zip: "60601" },
  { city: "Houston", state: "TX", zip: "77001" },
  { city: "Phoenix", state: "AZ", zip: "85001" },
  { city: "Philadelphia", state: "PA", zip: "19101" },
  { city: "San Antonio", state: "TX", zip: "78201" },
  { city: "San Diego", state: "CA", zip: "92101" },
  { city: "Dallas", state: "TX", zip: "75201" },
  { city: "San Jose", state: "CA", zip: "95101" },
  { city: "Austin", state: "TX", zip: "78701" },
  { city: "Jacksonville", state: "FL", zip: "32099" },
  { city: "Fort Worth", state: "TX", zip: "76101" },
  { city: "Columbus", state: "OH", zip: "43085" },
  { city: "Charlotte", state: "NC", zip: "28201" },
  { city: "Seattle", state: "WA", zip: "98101" },
  { city: "Denver", state: "CO", zip: "80201" },
  { city: "Boston", state: "MA", zip: "02101" },
  { city: "Nashville", state: "TN", zip: "37201" },
  { city: "Portland", state: "OR", zip: "97201" },
];

const STREET_NAMES = [
  "Main St", "Oak Ave", "Maple Dr", "Cedar Ln", "Pine St", "Elm St", "Washington Ave",
  "Park Blvd", "Lake Dr", "Hill Rd", "Forest Way", "River Rd", "Valley View",
  "Sunset Blvd", "Highland Ave", "Spring St", "Church St", "Mill Rd", "School St"
];

// Clinical conditions with ICD-10 codes - mix of common conditions for trial matching
const CONDITIONS = [
  // Cardiovascular
  { description: "Essential hypertension", icd10: "I10", category: "cardiovascular" },
  { description: "Type 2 diabetes mellitus without complications", icd10: "E11.9", category: "metabolic" },
  { description: "Type 2 diabetes mellitus with chronic kidney disease", icd10: "E11.22", category: "metabolic" },
  { description: "Hyperlipidemia, unspecified", icd10: "E78.5", category: "metabolic" },
  { description: "Atrial fibrillation", icd10: "I48.91", category: "cardiovascular" },
  { description: "Coronary artery disease", icd10: "I25.10", category: "cardiovascular" },
  { description: "Heart failure, unspecified", icd10: "I50.9", category: "cardiovascular" },

  // Oncology
  { description: "Malignant neoplasm of breast", icd10: "C50.919", category: "oncology" },
  { description: "Malignant neoplasm of prostate", icd10: "C61", category: "oncology" },
  { description: "Non-small cell lung cancer", icd10: "C34.90", category: "oncology" },
  { description: "Colorectal cancer", icd10: "C18.9", category: "oncology" },
  { description: "Melanoma of skin", icd10: "C43.9", category: "oncology" },
  { description: "Pancreatic cancer", icd10: "C25.9", category: "oncology" },

  // Neurological
  { description: "Alzheimer's disease", icd10: "G30.9", category: "neurological" },
  { description: "Parkinson's disease", icd10: "G20", category: "neurological" },
  { description: "Multiple sclerosis", icd10: "G35", category: "neurological" },
  { description: "Epilepsy, unspecified", icd10: "G40.909", category: "neurological" },
  { description: "Migraine, unspecified", icd10: "G43.909", category: "neurological" },

  // Respiratory
  { description: "Chronic obstructive pulmonary disease", icd10: "J44.9", category: "respiratory" },
  { description: "Asthma, unspecified", icd10: "J45.909", category: "respiratory" },
  { description: "Idiopathic pulmonary fibrosis", icd10: "J84.112", category: "respiratory" },

  // Rheumatological
  { description: "Rheumatoid arthritis", icd10: "M06.9", category: "rheumatological" },
  { description: "Systemic lupus erythematosus", icd10: "M32.9", category: "rheumatological" },
  { description: "Psoriatic arthritis", icd10: "L40.50", category: "rheumatological" },
  { description: "Osteoarthritis, unspecified", icd10: "M19.90", category: "rheumatological" },

  // Mental Health
  { description: "Major depressive disorder, recurrent", icd10: "F33.9", category: "mental_health" },
  { description: "Generalized anxiety disorder", icd10: "F41.1", category: "mental_health" },
  { description: "Bipolar disorder", icd10: "F31.9", category: "mental_health" },
  { description: "Post-traumatic stress disorder", icd10: "F43.10", category: "mental_health" },

  // Gastrointestinal
  { description: "Crohn's disease", icd10: "K50.90", category: "gastrointestinal" },
  { description: "Ulcerative colitis", icd10: "K51.90", category: "gastrointestinal" },
  { description: "Irritable bowel syndrome", icd10: "K58.9", category: "gastrointestinal" },
  { description: "Gastroesophageal reflux disease", icd10: "K21.0", category: "gastrointestinal" },

  // Renal
  { description: "Chronic kidney disease, stage 3", icd10: "N18.3", category: "renal" },
  { description: "Chronic kidney disease, stage 4", icd10: "N18.4", category: "renal" },

  // Other
  { description: "Obesity", icd10: "E66.9", category: "metabolic" },
  { description: "Hypothyroidism", icd10: "E03.9", category: "endocrine" },
  { description: "Anemia, unspecified", icd10: "D64.9", category: "hematological" },
];

const ALLERGIES = [
  { name: "Penicillin", reaction: "Rash", severity: "Moderate" as const },
  { name: "Sulfonamides", reaction: "Hives", severity: "Moderate" as const },
  { name: "Aspirin", reaction: "Difficulty breathing", severity: "Severe" as const },
  { name: "Ibuprofen", reaction: "Stomach upset", severity: "Mild" as const },
  { name: "Codeine", reaction: "Nausea", severity: "Mild" as const },
  { name: "Latex", reaction: "Skin irritation", severity: "Moderate" as const },
  { name: "Shellfish", reaction: "Anaphylaxis", severity: "Severe" as const },
  { name: "Peanuts", reaction: "Swelling", severity: "Severe" as const },
  { name: "Eggs", reaction: "Hives", severity: "Moderate" as const },
  { name: "Contrast dye", reaction: "Rash", severity: "Moderate" as const },
  { name: "Metformin", reaction: "GI upset", severity: "Mild" as const },
  { name: "ACE inhibitors", reaction: "Cough, angioedema", severity: "Moderate" as const },
  { name: "Statins", reaction: "Muscle pain", severity: "Mild" as const },
  { name: "No known allergies", reaction: "", severity: "Mild" as const },
];

const MEDICATIONS = [
  { name: "Lisinopril 10mg", sig: "Take 1 tablet by mouth daily" },
  { name: "Metformin 500mg", sig: "Take 1 tablet by mouth twice daily with meals" },
  { name: "Atorvastatin 20mg", sig: "Take 1 tablet by mouth at bedtime" },
  { name: "Amlodipine 5mg", sig: "Take 1 tablet by mouth daily" },
  { name: "Metoprolol 25mg", sig: "Take 1 tablet by mouth twice daily" },
  { name: "Omeprazole 20mg", sig: "Take 1 capsule by mouth daily before breakfast" },
  { name: "Levothyroxine 50mcg", sig: "Take 1 tablet by mouth daily on empty stomach" },
  { name: "Gabapentin 300mg", sig: "Take 1 capsule by mouth three times daily" },
  { name: "Sertraline 50mg", sig: "Take 1 tablet by mouth daily" },
  { name: "Prednisone 10mg", sig: "Take as directed" },
  { name: "Albuterol inhaler", sig: "Inhale 2 puffs every 4-6 hours as needed" },
  { name: "Insulin glargine", sig: "Inject 20 units subcutaneously at bedtime" },
  { name: "Warfarin 5mg", sig: "Take 1 tablet by mouth daily" },
  { name: "Furosemide 40mg", sig: "Take 1 tablet by mouth daily" },
  { name: "Hydrochlorothiazide 25mg", sig: "Take 1 tablet by mouth daily" },
  { name: "Pantoprazole 40mg", sig: "Take 1 tablet by mouth daily" },
  { name: "Duloxetine 30mg", sig: "Take 1 capsule by mouth daily" },
  { name: "Tramadol 50mg", sig: "Take 1 tablet by mouth every 6 hours as needed for pain" },
];

// ============================================================================
// Utility Functions
// ============================================================================

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomElements<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomDate(startYear: number, endYear: number): string {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split("T")[0];
}

function generatePhone(): string {
  const area = Math.floor(Math.random() * 800) + 200;
  const exchange = Math.floor(Math.random() * 800) + 200;
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `(${area}) ${exchange}-${number}`;
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "email.com", "mail.com"];
  const random = Math.floor(Math.random() * 1000);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${random}@${randomElement(domains)}`;
}

function generateSSN(): string {
  // Generate fake SSN format (not real SSNs)
  const area = Math.floor(Math.random() * 899) + 100;
  const group = Math.floor(Math.random() * 99) + 1;
  const serial = Math.floor(Math.random() * 9999) + 1;
  return `${area}-${group.toString().padStart(2, "0")}-${serial.toString().padStart(4, "0")}`;
}

// ============================================================================
// Patient Generator
// ============================================================================

function generatePatient(): PatientPayload {
  const sex = Math.random() > 0.5 ? "Female" : "Male";
  const firstName = sex === "Female"
    ? randomElement(FIRST_NAMES_FEMALE)
    : randomElement(FIRST_NAMES_MALE);
  const lastName = randomElement(LAST_NAMES);
  const location = randomElement(CITIES);

  // Generate age between 18 and 85
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - Math.floor(Math.random() * 67) - 18;
  const dob = randomDate(birthYear, birthYear);

  const patient: PatientPayload = {
    first_name: firstName,
    last_name: lastName,
    dob,
    sex: sex as "Male" | "Female",
    email: generateEmail(firstName, lastName),
    primary_phone: generatePhone(),
    address: {
      address_line1: `${Math.floor(Math.random() * 9999) + 1} ${randomElement(STREET_NAMES)}`,
      city: location.city,
      state: location.state,
      zip: location.zip,
    },
    ethnicity: randomElement(["Hispanic or Latino", "Not Hispanic or Latino", "Unknown"]),
    race: randomElement(["White", "Black or African American", "Asian", "American Indian or Alaska Native", "Native Hawaiian or Other Pacific Islander", "Other", "Unknown"]),
    preferred_language: randomElement(["English", "Spanish", "English", "English", "Chinese", "English"]),
  };

  if (PRACTICE_ID) {
    patient.practice = PRACTICE_ID;
  }

  return patient;
}

function generateProblemsForPatient(patientId: number, patientAge: number, patientSex: string): ProblemPayload[] {
  // Determine number of conditions based on age
  let numConditions: number;
  if (patientAge < 40) {
    numConditions = Math.floor(Math.random() * 3); // 0-2 conditions
  } else if (patientAge < 60) {
    numConditions = Math.floor(Math.random() * 4) + 1; // 1-4 conditions
  } else {
    numConditions = Math.floor(Math.random() * 5) + 2; // 2-6 conditions
  }

  // Filter conditions by sex if applicable
  let availableConditions = [...CONDITIONS];
  if (patientSex === "Male") {
    availableConditions = availableConditions.filter(c => c.icd10 !== "C50.919"); // Remove breast cancer for males (simplified)
  } else if (patientSex === "Female") {
    availableConditions = availableConditions.filter(c => c.icd10 !== "C61"); // Remove prostate cancer for females
  }

  const selectedConditions = randomElements(availableConditions, numConditions, numConditions);

  return selectedConditions.map(condition => {
    const yearsAgo = Math.floor(Math.random() * 10) + 1;
    const onsetDate = new Date();
    onsetDate.setFullYear(onsetDate.getFullYear() - yearsAgo);

    return {
      patient: patientId,
      description: condition.description,
      icd10_code: condition.icd10,
      status: Math.random() > 0.2 ? "Active" : "Resolved" as "Active" | "Resolved",
      onset_date: onsetDate.toISOString().split("T")[0],
    };
  });
}

function generateAllergiesForPatient(patientId: number): AllergyPayload[] {
  const numAllergies = Math.floor(Math.random() * 3); // 0-2 allergies

  if (numAllergies === 0) {
    return [{
      patient: patientId,
      name: "No known allergies",
      status: "Active",
    }];
  }

  const selectedAllergies = randomElements(
    ALLERGIES.filter(a => a.name !== "No known allergies"),
    numAllergies,
    numAllergies
  );

  return selectedAllergies.map(allergy => ({
    patient: patientId,
    name: allergy.name,
    status: "Active" as const,
    reaction: allergy.reaction,
    severity: allergy.severity,
  }));
}

function generateMedicationsForPatient(patientId: number, problems: ProblemPayload[]): MedicationPayload[] {
  // Generate medications based on conditions
  const meds: MedicationPayload[] = [];

  // Add condition-specific medications
  for (const problem of problems) {
    if (problem.status !== "Active") continue;

    // Add relevant medications based on condition
    if (problem.icd10_code === "I10") { // Hypertension
      if (Math.random() > 0.3) meds.push({ patient: patientId, medication_name: "Lisinopril 10mg", sig: "Take 1 tablet by mouth daily", status: "Active" });
      if (Math.random() > 0.5) meds.push({ patient: patientId, medication_name: "Amlodipine 5mg", sig: "Take 1 tablet by mouth daily", status: "Active" });
    }
    if (problem.icd10_code?.startsWith("E11")) { // Diabetes
      if (Math.random() > 0.3) meds.push({ patient: patientId, medication_name: "Metformin 500mg", sig: "Take 1 tablet by mouth twice daily with meals", status: "Active" });
    }
    if (problem.icd10_code === "E78.5") { // Hyperlipidemia
      if (Math.random() > 0.3) meds.push({ patient: patientId, medication_name: "Atorvastatin 20mg", sig: "Take 1 tablet by mouth at bedtime", status: "Active" });
    }
    if (problem.icd10_code?.startsWith("F33") || problem.icd10_code?.startsWith("F41")) { // Depression/Anxiety
      if (Math.random() > 0.3) meds.push({ patient: patientId, medication_name: "Sertraline 50mg", sig: "Take 1 tablet by mouth daily", status: "Active" });
    }
    if (problem.icd10_code?.startsWith("J45")) { // Asthma
      if (Math.random() > 0.3) meds.push({ patient: patientId, medication_name: "Albuterol inhaler", sig: "Inhale 2 puffs every 4-6 hours as needed", status: "Active" });
    }
    if (problem.icd10_code === "E03.9") { // Hypothyroidism
      meds.push({ patient: patientId, medication_name: "Levothyroxine 50mcg", sig: "Take 1 tablet by mouth daily on empty stomach", status: "Active" });
    }
  }

  // Add some random additional medications
  const additionalMeds = Math.floor(Math.random() * 2);
  for (let i = 0; i < additionalMeds; i++) {
    const randomMed = randomElement(MEDICATIONS);
    if (!meds.some(m => m.medication_name === randomMed.name)) {
      meds.push({
        patient: patientId,
        medication_name: randomMed.name,
        sig: randomMed.sig,
        status: "Active",
      });
    }
  }

  return meds;
}

// ============================================================================
// Elation API Functions
// ============================================================================

async function createPatient(patient: PatientPayload): Promise<{ id: number } | null> {
  try {
    const response = await fetch(`${ELATION_API_BASE}/patients/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patient),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to create patient ${patient.first_name} ${patient.last_name}:`, error);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error(`Error creating patient:`, err);
    return null;
  }
}

async function createProblem(problem: ProblemPayload): Promise<boolean> {
  try {
    const response = await fetch(`${ELATION_API_BASE}/problems/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(problem),
    });

    if (!response.ok) {
      console.error(`Failed to create problem:`, await response.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Error creating problem:`, err);
    return false;
  }
}

async function createAllergy(allergy: AllergyPayload): Promise<boolean> {
  try {
    const response = await fetch(`${ELATION_API_BASE}/allergies/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(allergy),
    });

    if (!response.ok) {
      console.error(`Failed to create allergy:`, await response.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Error creating allergy:`, err);
    return false;
  }
}

async function createMedication(medication: MedicationPayload): Promise<boolean> {
  try {
    const response = await fetch(`${ELATION_API_BASE}/medications/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(medication),
    });

    if (!response.ok) {
      console.error(`Failed to create medication:`, await response.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Error creating medication:`, err);
    return false;
  }
}

// ============================================================================
// Main Seeding Function
// ============================================================================

async function seedPatients(): Promise<void> {
  console.log("🏥 Elation Sandbox Patient Seeder");
  console.log("================================\n");

  if (!ACCESS_TOKEN) {
    console.error("❌ Error: ELATION_ACCESS_TOKEN environment variable is required");
    console.log("\nTo get an access token:");
    console.log("1. Complete the OAuth flow in your app to get tokens");
    console.log("2. Or use the Elation sandbox API key if available");
    console.log("\nSet it with: export ELATION_ACCESS_TOKEN=your_token_here");
    process.exit(1);
  }

  console.log(`📍 API Base: ${ELATION_API_BASE}`);
  console.log(`👥 Creating ${NUM_PATIENTS} patients...\n`);

  const stats = {
    patientsCreated: 0,
    problemsCreated: 0,
    allergiesCreated: 0,
    medicationsCreated: 0,
    errors: 0,
  };

  for (let i = 0; i < NUM_PATIENTS; i++) {
    const patientData = generatePatient();
    console.log(`[${i + 1}/${NUM_PATIENTS}] Creating ${patientData.first_name} ${patientData.last_name}...`);

    const patient = await createPatient(patientData);

    if (!patient) {
      stats.errors++;
      continue;
    }

    stats.patientsCreated++;
    const patientId = patient.id;

    // Calculate age for condition generation
    const birthYear = parseInt(patientData.dob.split("-")[0]);
    const patientAge = new Date().getFullYear() - birthYear;

    // Create problems
    const problems = generateProblemsForPatient(patientId, patientAge, patientData.sex);
    for (const problem of problems) {
      if (await createProblem(problem)) {
        stats.problemsCreated++;
      }
    }

    // Create allergies
    const allergies = generateAllergiesForPatient(patientId);
    for (const allergy of allergies) {
      if (await createAllergy(allergy)) {
        stats.allergiesCreated++;
      }
    }

    // Create medications
    const medications = generateMedicationsForPatient(patientId, problems);
    for (const medication of medications) {
      if (await createMedication(medication)) {
        stats.medicationsCreated++;
      }
    }

    console.log(`   ✓ Added ${problems.length} problems, ${allergies.length} allergies, ${medications.length} medications`);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log("\n================================");
  console.log("✅ Seeding Complete!\n");
  console.log("📊 Summary:");
  console.log(`   Patients created:    ${stats.patientsCreated}`);
  console.log(`   Problems created:    ${stats.problemsCreated}`);
  console.log(`   Allergies created:   ${stats.allergiesCreated}`);
  console.log(`   Medications created: ${stats.medicationsCreated}`);
  console.log(`   Errors:              ${stats.errors}`);
}

// ============================================================================
// CLI Entry Point
// ============================================================================

seedPatients().catch(console.error);
