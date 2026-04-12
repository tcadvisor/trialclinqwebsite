/**
 * AI-Powered Patient-Trial Matching Engine
 *
 * Uses OpenAI to intelligently match patients to clinical trials based on:
 * - Medical conditions (ICD-10 codes, descriptions)
 * - Medications (current treatments, contraindications)
 * - Allergies and sensitivities
 * - Demographics (age, sex, ethnicity)
 * - Lab values and vitals
 * - Prior treatments and procedures
 *
 * Architecture:
 * 1. Parse trial eligibility criteria into structured requirements
 * 2. Analyze patient clinical profile comprehensively
 * 3. Score match quality across multiple dimensions
 * 4. Provide detailed reasoning for matches and exclusions
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MATCHING_MODEL || "gpt-4o";

// ============================================================================
// Types
// ============================================================================

export interface PatientProfile {
  id: number;
  firstName: string;
  lastName: string;
  dob: string;
  age: number;
  sex: string;
  email?: string;
  phone?: string;
  location?: {
    city?: string;
    state?: string;
    zip?: string;
  };
  problems: Problem[];
  allergies: Allergy[];
  medications: Medication[];
  vitals?: Vitals;
  labResults?: LabResult[];
  biomarkers?: string[];
  ecogStatus?: number | null;
  cancerStage?: string | null;
  priorTherapies?: string[];
}

export interface Problem {
  id?: number;
  icd10_code?: string;
  snomed_code?: string;
  description: string;
  status: string;
  onset_date?: string;
  resolved_date?: string;
}

export interface Allergy {
  id?: number;
  name: string;
  status: string;
  reaction?: string;
  severity?: string;
  allergen_type?: string;
}

export interface Medication {
  id?: number;
  medication_name: string;
  generic_name?: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  status: string;
  start_date?: string;
  end_date?: string;
}

export interface Vitals {
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  weight_kg?: number;
  height_cm?: number;
  bmi?: number;
  temperature?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  recorded_at?: string;
}

export interface LabResult {
  test_name: string;
  value: number | string;
  unit?: string;
  reference_range?: string;
  abnormal?: boolean;
  collected_at?: string;
}

export interface TrialCriteria {
  nctId: string;
  title?: string;
  conditions: string[];
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  minAge?: number;
  maxAge?: number;
  gender?: string;
  healthyVolunteers?: boolean;
  phase?: string;
  studyType?: string;
  rawEligibilityText?: string;
}

export interface MatchResult {
  patientId: number;
  patientName: string;
  overallScore: number;
  eligibilityStatus: "highly_eligible" | "likely_eligible" | "potentially_eligible" | "likely_ineligible" | "ineligible";
  confidence: number;
  matchFactors: MatchFactor[];
  inclusionCriteriaMet: CriteriaEvaluation[];
  exclusionCriteriaTriggered: CriteriaEvaluation[];
  missingInformation: string[];
  recommendation: string;
  aiReasoning: string;
}

export interface MatchFactor {
  category: "demographics" | "conditions" | "medications" | "allergies" | "labs" | "vitals" | "other";
  name: string;
  score: number;
  maxScore: number;
  matched: boolean;
  reason: string;
}

export interface CriteriaEvaluation {
  criterion: string;
  met: boolean;
  confidence: number;
  evidence: string;
}

export interface ParsedEligibility {
  structuredInclusion: EligibilityRequirement[];
  structuredExclusion: EligibilityRequirement[];
  targetConditions: string[];
  requiredMedications: string[];
  prohibitedMedications: string[];
  labRequirements: LabRequirement[];
  otherRequirements: string[];
}

export interface EligibilityRequirement {
  criterion: string;
  type: "demographic" | "condition" | "medication" | "lab" | "procedure" | "other";
  required: boolean;
  details?: string;
}

export interface LabRequirement {
  testName: string;
  minValue?: number;
  maxValue?: number;
  unit?: string;
}

// ============================================================================
// Main Matching Functions
// ============================================================================

/**
 * Parse trial eligibility criteria using AI to extract structured requirements
 */
export async function parseTrialEligibility(
  criteria: TrialCriteria
): Promise<ParsedEligibility> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const prompt = `You are a clinical trial eligibility expert. Parse the following clinical trial criteria and extract structured requirements.

Trial: ${criteria.title || criteria.nctId}
NCT ID: ${criteria.nctId}
Target Conditions: ${criteria.conditions.join(", ")}
Phase: ${criteria.phase || "Not specified"}

INCLUSION CRITERIA:
${criteria.inclusionCriteria.join("\n") || criteria.rawEligibilityText || "Not specified"}

EXCLUSION CRITERIA:
${criteria.exclusionCriteria.join("\n") || "Not specified"}

Age Range: ${criteria.minAge || 0} - ${criteria.maxAge || 120} years
Gender: ${criteria.gender || "All"}
Healthy Volunteers: ${criteria.healthyVolunteers ? "Yes" : "No"}

Extract and return a JSON object with:
1. structuredInclusion: Array of {criterion, type, required, details}
2. structuredExclusion: Array of {criterion, type, required, details}
3. targetConditions: Array of specific medical conditions being studied
4. requiredMedications: Array of medications patient must be on
5. prohibitedMedications: Array of medications that would exclude patient
6. labRequirements: Array of {testName, minValue?, maxValue?, unit?}
7. otherRequirements: Array of any other requirements

Types for criterion: "demographic", "condition", "medication", "lab", "procedure", "other"

Be thorough and extract ALL requirements, even implicit ones. Return ONLY valid JSON.`;

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.1,
      messages: [
        { role: "system", content: "You are a clinical trial eligibility parser. Output only valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenAI eligibility parsing error:", error);
    throw new Error(`Failed to parse eligibility: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from OpenAI");
  }

  try {
    return JSON.parse(content) as ParsedEligibility;
  } catch {
    console.error("Failed to parse eligibility JSON:", content);
    // Return default structure
    return {
      structuredInclusion: [],
      structuredExclusion: [],
      targetConditions: criteria.conditions,
      requiredMedications: [],
      prohibitedMedications: [],
      labRequirements: [],
      otherRequirements: [],
    };
  }
}

/**
 * Match a single patient against trial criteria using AI
 */
export async function matchPatientToTrial(
  patient: PatientProfile,
  criteria: TrialCriteria,
  parsedEligibility?: ParsedEligibility
): Promise<MatchResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // First, do quick rule-based exclusions (age, gender)
  const quickExclusions = checkQuickExclusions(patient, criteria);
  if (quickExclusions.excluded) {
    return createExclusionResult(patient, quickExclusions.reason);
  }

  // Build comprehensive patient profile for AI analysis
  const patientSummary = buildPatientSummary(patient);

  // Count patient data entries for explicit instruction to GPT
  const activeProblems = patient.problems.filter((p) => p.status === "Active" || p.status === "active");
  const activeMeds = patient.medications.filter((m) => m.status === "Active" || m.status === "active");
  const allergyCount = patient.allergies.length;

  const prompt = `You are a clinical trial matching specialist. Evaluate if this patient is eligible for the clinical trial.

PATIENT PROFILE:
${patientSummary}

IMPORTANT: This patient has ${activeProblems.length} active conditions, ${activeMeds.length} active medications, and ${allergyCount} documented allergies.
You MUST review and consider EVERY SINGLE ENTRY listed above when calculating the eligibility score.

CLINICAL TRIAL: ${criteria.title || criteria.nctId}
NCT ID: ${criteria.nctId}
Target Conditions: ${criteria.conditions.join(", ")}
Phase: ${criteria.phase || "Not specified"}

INCLUSION CRITERIA:
${criteria.inclusionCriteria.join("\n") || criteria.rawEligibilityText || "Not specified"}

EXCLUSION CRITERIA:
${criteria.exclusionCriteria.join("\n") || "Not specified"}

DEMOGRAPHIC REQUIREMENTS:
- Age Range: ${criteria.minAge || 0} - ${criteria.maxAge || 120} years
- Gender: ${criteria.gender || "All"}
- Healthy Volunteers: ${criteria.healthyVolunteers ? "Accepted" : "Not accepted"}

Evaluate the patient against ALL criteria and return a JSON object with:
{
  "overallScore": <0-100 based on how well patient matches - MUST BE SUM OF ALL FACTORS BELOW>,
  "eligibilityStatus": <"highly_eligible"|"likely_eligible"|"potentially_eligible"|"likely_ineligible"|"ineligible">,
  "confidence": <0-100 confidence in assessment>,
  "matchFactors": [
    {
      "category": <"demographics"|"conditions"|"medications"|"allergies"|"labs"|"vitals"|"other">,
      "name": <factor name>,
      "score": <points earned for this factor>,
      "maxScore": <max possible points for this factor>,
      "matched": <true/false>,
      "reason": <explanation>
    }
  ],
  "inclusionCriteriaMet": [
    {"criterion": <text>, "met": <true/false>, "confidence": <0-100>, "evidence": <from patient data>}
  ],
  "exclusionCriteriaTriggered": [
    {"criterion": <text>, "met": <true if triggered/exclusion applies>, "confidence": <0-100>, "evidence": <from patient data>}
  ],
  "missingInformation": [<list of data needed for complete assessment>],
  "recommendation": <1-2 sentence clinical recommendation>,
  "aiReasoning": <detailed paragraph explaining the matching logic>
}

CRITICAL SCORING INSTRUCTIONS - THE overallScore MUST BE THE SUM OF ALL THESE FACTORS:
1. Target condition match (0-40 points): Award points based on how well patient's conditions match trial targets
   - Exact match to primary condition: 35-40 points
   - Related/similar condition: 20-34 points
   - Partial match: 10-19 points
   - No match: 0-9 points

2. Age/demographic match (0-15 points):
   - Age within range: 15 points
   - Near boundary (within 2 years): 10 points
   - Outside range: 0 points

3. Exclusion criteria check (0-20 points):
   - No exclusions triggered: 20 points
   - Minor concerns: 10-15 points
   - Major exclusion triggered: 0 points

4. Medication compatibility (0-10 points):
   - No contraindications: 10 points
   - Minor interactions: 5 points
   - Contraindicated meds: 0 points

5. Lab values/vitals (0-10 points):
   - All in range: 10 points
   - Some abnormal: 5 points
   - Critical values: 0 points

6. Profile completeness bonus (0-5 points):
   - Complete data: 5 points
   - Partial data: 2-3 points

IMPORTANT: The overallScore MUST be calculated as: condition + demographics + exclusions + meds + labs + bonus
For example: If condition=35, demographics=15, exclusions=20, meds=10, labs=10, bonus=5 → overallScore=95

ANALYZE EVERY ENTRY in the patient's medical record:
- Review ALL conditions in the problems list, not just the first one
- Check ALL medications for interactions and contraindications
- Evaluate ALL allergies against trial requirements
- Consider the COMPLETE clinical picture

Be conservative - only mark as "highly_eligible" or "likely_eligible" if strong evidence supports it.
Mark "ineligible" ONLY if clear exclusion criteria are met.
List ALL missing information that would help refine the assessment.`;

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an expert clinical trial matching AI. Analyze patient eligibility thoroughly and objectively. Output only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenAI matching error:", error);
    // Fall back to rule-based matching - CLEARLY FLAG THIS
    const fallback = ruleBasedMatching(patient, criteria);
    (fallback as any)._aiActuallyUsed = false;
    (fallback as any)._scoringMethod = 'rule-based-fallback';
    (fallback as any)._devWarning = `AI_FAILED: OpenAI returned ${response.status} - ${error.slice(0, 100)}`;
    return fallback;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    const fallback = ruleBasedMatching(patient, criteria);
    (fallback as any)._aiActuallyUsed = false;
    (fallback as any)._scoringMethod = 'rule-based-fallback';
    (fallback as any)._devWarning = 'AI_FAILED: No content in OpenAI response';
    return fallback;
  }

  try {
    const aiResult = JSON.parse(content);
    const result: MatchResult & { _aiActuallyUsed?: boolean; _scoringMethod?: string } = {
      patientId: patient.id,
      patientName: `Patient ${patient.id}`,
      overallScore: Math.min(100, Math.max(0, aiResult.overallScore || 0)),
      eligibilityStatus: aiResult.eligibilityStatus || "potentially_eligible",
      confidence: aiResult.confidence || 50,
      matchFactors: aiResult.matchFactors || [],
      inclusionCriteriaMet: aiResult.inclusionCriteriaMet || [],
      exclusionCriteriaTriggered: aiResult.exclusionCriteriaTriggered || [],
      missingInformation: aiResult.missingInformation || [],
      recommendation: aiResult.recommendation || "Manual review recommended",
      aiReasoning: aiResult.aiReasoning || "AI analysis completed",
    };
    // CRITICAL: Flag that AI was actually used successfully
    result._aiActuallyUsed = true;
    result._scoringMethod = 'gpt-4o';
    return result;
  } catch {
    console.error("Failed to parse AI matching result:", content);
    const fallback = ruleBasedMatching(patient, criteria);
    (fallback as any)._aiActuallyUsed = false;
    (fallback as any)._scoringMethod = 'rule-based-fallback';
    (fallback as any)._devWarning = `AI_FAILED: Could not parse JSON response - ${content?.slice(0, 100)}`;
    return fallback;
  }
}

/**
 * Batch match multiple patients to a trial
 */
export async function batchMatchPatientsToTrial(
  patients: PatientProfile[],
  criteria: TrialCriteria,
  options?: {
    maxConcurrent?: number;
    minScore?: number;
  }
): Promise<MatchResult[]> {
  const maxConcurrent = options?.maxConcurrent || 5;
  const minScore = options?.minScore || 20;
  const results: MatchResult[] = [];

  // Parse eligibility once for efficiency
  let parsedEligibility: ParsedEligibility | undefined;
  try {
    parsedEligibility = await parseTrialEligibility(criteria);
  } catch (err) {
    console.warn("Failed to parse eligibility, continuing with raw criteria:", err);
  }

  // Process in batches
  for (let i = 0; i < patients.length; i += maxConcurrent) {
    const batch = patients.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map((patient) =>
        matchPatientToTrial(patient, criteria, parsedEligibility).catch((err) => {
          console.error(`Failed to match patient ${patient.id}:`, err);
          return ruleBasedMatching(patient, criteria);
        })
      )
    );

    // Filter by minimum score
    results.push(...batchResults.filter((r) => r.overallScore >= minScore));
  }

  // Sort by score descending
  return results.sort((a, b) => b.overallScore - a.overallScore);
}

// ============================================================================
// Helper Functions
// ============================================================================

function checkQuickExclusions(
  patient: PatientProfile,
  criteria: TrialCriteria
): { excluded: boolean; reason: string } {
  // Age check
  if (criteria.minAge && patient.age < criteria.minAge) {
    return {
      excluded: true,
      reason: `Patient age (${patient.age}) below minimum (${criteria.minAge})`,
    };
  }
  if (criteria.maxAge && patient.age > criteria.maxAge) {
    return {
      excluded: true,
      reason: `Patient age (${patient.age}) above maximum (${criteria.maxAge})`,
    };
  }

  // Gender check
  if (criteria.gender && criteria.gender !== "All") {
    const patientSex = patient.sex?.toLowerCase();
    const requiredGender = criteria.gender.toLowerCase();
    if (patientSex !== requiredGender && patientSex !== requiredGender.charAt(0)) {
      return {
        excluded: true,
        reason: `Patient gender (${patient.sex}) does not match required (${criteria.gender})`,
      };
    }
  }

  return { excluded: false, reason: "" };
}

function createExclusionResult(patient: PatientProfile, reason: string): MatchResult {
  return {
    patientId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    overallScore: 0,
    eligibilityStatus: "ineligible",
    confidence: 100,
    matchFactors: [
      {
        category: "demographics",
        name: "Quick Exclusion",
        score: 0,
        maxScore: 100,
        matched: false,
        reason: reason,
      },
    ],
    inclusionCriteriaMet: [],
    exclusionCriteriaTriggered: [
      {
        criterion: "Demographic requirements",
        met: true,
        confidence: 100,
        evidence: reason,
      },
    ],
    missingInformation: [],
    recommendation: `Patient excluded: ${reason}`,
    aiReasoning: `Patient was excluded during preliminary screening. ${reason}`,
  };
}

function buildPatientSummary(patient: PatientProfile): string {
  const sections: string[] = [];

  // Demographics -- no names or DOB sent to the model (HIPAA)
  sections.push(`DEMOGRAPHICS:
- Patient: [De-identified]
- Age: ${patient.age} years
- Sex: ${patient.sex}
- Location: ${patient.location?.city ? `${patient.location.city}, ${patient.location.state}` : "Not specified"}`);

  // Oncology-specific fields when available
  const oncoLines: string[] = [];
  if (patient.biomarkers && patient.biomarkers.length) oncoLines.push(`- Biomarkers: ${patient.biomarkers.join(", ")}`);
  if (typeof patient.ecogStatus === "number") oncoLines.push(`- ECOG Performance Status: ${patient.ecogStatus}`);
  if (patient.cancerStage) oncoLines.push(`- Disease Stage: ${patient.cancerStage}`);
  if (patient.priorTherapies && patient.priorTherapies.length) oncoLines.push(`- Prior Therapies: ${patient.priorTherapies.join(", ")}`);
  if (oncoLines.length) sections.push(`\nCLINICAL STAGING:\n${oncoLines.join("\n")}`);

  // Medical conditions
  if (patient.problems.length > 0) {
    const activeProblems = patient.problems.filter((p) => p.status === "Active" || p.status === "active");
    const resolvedProblems = patient.problems.filter((p) => p.status !== "Active" && p.status !== "active");

    sections.push(`\nACTIVE MEDICAL CONDITIONS (${activeProblems.length}):
${activeProblems
  .map(
    (p) =>
      `- ${p.description}${p.icd10_code ? ` [ICD-10: ${p.icd10_code}]` : ""}${p.onset_date ? ` (onset: ${p.onset_date})` : ""}`
  )
  .join("\n") || "None documented"}`);

    if (resolvedProblems.length > 0) {
      sections.push(`\nRESOLVED/HISTORICAL CONDITIONS (${resolvedProblems.length}):
${resolvedProblems.map((p) => `- ${p.description}${p.icd10_code ? ` [ICD-10: ${p.icd10_code}]` : ""}`).join("\n")}`);
    }
  } else {
    sections.push("\nMEDICAL CONDITIONS: None documented");
  }

  // Medications
  if (patient.medications.length > 0) {
    const activeMeds = patient.medications.filter((m) => m.status === "Active" || m.status === "active");
    sections.push(`\nCURRENT MEDICATIONS (${activeMeds.length}):
${activeMeds
  .map(
    (m) =>
      `- ${m.medication_name}${m.dosage ? ` ${m.dosage}` : ""}${m.frequency ? ` (${m.frequency})` : ""}`
  )
  .join("\n") || "None"}`);
  } else {
    sections.push("\nMEDICATIONS: None documented");
  }

  // Allergies
  if (patient.allergies.length > 0) {
    sections.push(`\nALLERGIES (${patient.allergies.length}):
${patient.allergies
  .map(
    (a) =>
      `- ${a.name}${a.reaction ? ` - Reaction: ${a.reaction}` : ""}${a.severity ? ` (${a.severity})` : ""}`
  )
  .join("\n")}`);
  } else {
    sections.push("\nALLERGIES: None documented (NKDA)");
  }

  // Vitals
  if (patient.vitals) {
    const v = patient.vitals;
    sections.push(`\nVITAL SIGNS:
- Blood Pressure: ${v.blood_pressure_systolic ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic} mmHg` : "Not recorded"}
- Heart Rate: ${v.heart_rate ? `${v.heart_rate} bpm` : "Not recorded"}
- Weight: ${v.weight_kg ? `${v.weight_kg} kg` : "Not recorded"}
- Height: ${v.height_cm ? `${v.height_cm} cm` : "Not recorded"}
- BMI: ${v.bmi ? v.bmi.toFixed(1) : "Not calculated"}
- O2 Saturation: ${v.oxygen_saturation ? `${v.oxygen_saturation}%` : "Not recorded"}`);
  }

  // Lab results
  if (patient.labResults && patient.labResults.length > 0) {
    sections.push(`\nRECENT LAB RESULTS (${patient.labResults.length}):
${patient.labResults
  .map(
    (l) =>
      `- ${l.test_name}: ${l.value}${l.unit ? ` ${l.unit}` : ""}${l.abnormal ? " (ABNORMAL)" : ""}${l.reference_range ? ` [ref: ${l.reference_range}]` : ""}`
  )
  .join("\n")}`);
  }

  return sections.join("\n");
}

/**
 * Fallback rule-based matching when AI is unavailable
 */
function ruleBasedMatching(patient: PatientProfile, criteria: TrialCriteria): MatchResult {
  const matchFactors: MatchFactor[] = [];
  let totalScore = 0;

  // Age matching (15 points)
  const ageMatch = checkAgeMatch(patient, criteria);
  matchFactors.push(ageMatch);
  totalScore += ageMatch.score;

  // Gender matching (5 points)
  const genderMatch = checkGenderMatch(patient, criteria);
  matchFactors.push(genderMatch);
  totalScore += genderMatch.score;

  // Condition matching (40 points)
  const conditionMatch = checkConditionMatch(patient, criteria);
  matchFactors.push(conditionMatch);
  totalScore += conditionMatch.score;

  // Medication analysis (20 points)
  const medMatch = checkMedicationCompatibility(patient, criteria);
  matchFactors.push(medMatch);
  totalScore += medMatch.score;

  // Allergy check (10 points)
  const allergyMatch = checkAllergyCompatibility(patient, criteria);
  matchFactors.push(allergyMatch);
  totalScore += allergyMatch.score;

  // Vitals check (10 points)
  const vitalsMatch = checkVitalsCompatibility(patient);
  matchFactors.push(vitalsMatch);
  totalScore += vitalsMatch.score;

  // Determine eligibility status
  let eligibilityStatus: MatchResult["eligibilityStatus"];
  if (totalScore >= 80) eligibilityStatus = "highly_eligible";
  else if (totalScore >= 60) eligibilityStatus = "likely_eligible";
  else if (totalScore >= 40) eligibilityStatus = "potentially_eligible";
  else if (totalScore >= 20) eligibilityStatus = "likely_ineligible";
  else eligibilityStatus = "ineligible";

  const result: MatchResult & { _aiActuallyUsed?: boolean; _scoringMethod?: string; _devWarning?: string } = {
    patientId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    overallScore: totalScore,
    eligibilityStatus,
    confidence: 60, // Rule-based has lower confidence
    matchFactors,
    inclusionCriteriaMet: matchFactors
      .filter((f) => f.matched)
      .map((f) => ({
        criterion: f.name,
        met: true,
        confidence: 70,
        evidence: f.reason,
      })),
    exclusionCriteriaTriggered: matchFactors
      .filter((f) => !f.matched && f.score === 0)
      .map((f) => ({
        criterion: f.name,
        met: true,
        confidence: 70,
        evidence: f.reason,
      })),
    missingInformation: getMissingInformation(patient),
    recommendation:
      totalScore >= 50
        ? "Patient shows potential eligibility. Recommend detailed screening."
        : "Patient may not meet criteria. Review exclusions before proceeding.",
    aiReasoning: `⚠️ RULE-BASED FALLBACK (NOT AI): Score: ${totalScore}/100. ${matchFactors.filter((f) => f.matched).length} of ${matchFactors.length} criteria matched.`,
  };

  // CRITICAL FLAGS: This is NOT an AI result
  result._aiActuallyUsed = false;
  result._scoringMethod = 'rule-based';
  result._devWarning = 'NOT_AI: This score was computed by rule-based fallback, NOT by GPT';

  return result;
}

function checkAgeMatch(patient: PatientProfile, criteria: TrialCriteria): MatchFactor {
  const minAge = criteria.minAge || 0;
  const maxAge = criteria.maxAge || 120;
  const matched = patient.age >= minAge && patient.age <= maxAge;

  return {
    category: "demographics",
    name: "Age Requirement",
    score: matched ? 15 : 0,
    maxScore: 15,
    matched,
    reason: matched
      ? `Age ${patient.age} within range ${minAge}-${maxAge}`
      : `Age ${patient.age} outside range ${minAge}-${maxAge}`,
  };
}

function checkGenderMatch(patient: PatientProfile, criteria: TrialCriteria): MatchFactor {
  if (!criteria.gender || criteria.gender === "All") {
    return {
      category: "demographics",
      name: "Gender Requirement",
      score: 5,
      maxScore: 5,
      matched: true,
      reason: "No gender restriction",
    };
  }

  const patientSex = patient.sex?.toLowerCase();
  const requiredGender = criteria.gender.toLowerCase();
  const matched = patientSex === requiredGender || patientSex === requiredGender.charAt(0);

  return {
    category: "demographics",
    name: "Gender Requirement",
    score: matched ? 5 : 0,
    maxScore: 5,
    matched,
    reason: matched
      ? `Gender ${patient.sex} matches requirement`
      : `Gender ${patient.sex} does not match required ${criteria.gender}`,
  };
}

function checkConditionMatch(patient: PatientProfile, criteria: TrialCriteria): MatchFactor {
  if (!criteria.conditions || criteria.conditions.length === 0) {
    return {
      category: "conditions",
      name: "Target Condition",
      score: 20,
      maxScore: 40,
      matched: true,
      reason: "No specific condition requirement",
    };
  }

  const patientConditions = patient.problems
    .filter((p) => p.status === "Active" || p.status === "active")
    .map((p) => ({
      description: p.description.toLowerCase(),
      icd10: p.icd10_code?.toLowerCase() || "",
    }));

  const trialConditions = criteria.conditions.map((c) => c.toLowerCase());

  let matchedCount = 0;
  const matchedConditions: string[] = [];

  for (const trialCond of trialConditions) {
    for (const patientCond of patientConditions) {
      if (
        patientCond.description.includes(trialCond) ||
        trialCond.includes(patientCond.description) ||
        (patientCond.icd10 && trialCond.includes(patientCond.icd10))
      ) {
        matchedCount++;
        matchedConditions.push(patientCond.description);
        break;
      }
    }
  }

  const score = Math.round((matchedCount / trialConditions.length) * 40);
  const matched = matchedCount > 0;

  return {
    category: "conditions",
    name: "Target Condition",
    score,
    maxScore: 40,
    matched,
    reason: matched
      ? `Matched conditions: ${matchedConditions.join(", ")}`
      : `No matching conditions found for: ${criteria.conditions.join(", ")}`,
  };
}

function checkMedicationCompatibility(patient: PatientProfile, criteria: TrialCriteria): MatchFactor {
  const activeMeds = patient.medications.filter((m) => m.status === "Active" || m.status === "active");

  if (activeMeds.length === 0) {
    return {
      category: "medications",
      name: "Medication Analysis",
      score: 15,
      maxScore: 20,
      matched: true,
      reason: "No current medications documented",
    };
  }

  // Check for common exclusion medications (simplified)
  const exclusionMeds = ["warfarin", "coumadin", "immunosuppressant", "chemotherapy"];
  const hasExclusionMed = activeMeds.some((m) =>
    exclusionMeds.some((ex) => m.medication_name.toLowerCase().includes(ex))
  );

  return {
    category: "medications",
    name: "Medication Analysis",
    score: hasExclusionMed ? 5 : 20,
    maxScore: 20,
    matched: !hasExclusionMed,
    reason: hasExclusionMed
      ? `Potential medication conflict detected. Active medications: ${activeMeds.map((m) => m.medication_name).join(", ")}`
      : `${activeMeds.length} active medications reviewed - no obvious conflicts`,
  };
}

function checkAllergyCompatibility(patient: PatientProfile, criteria: TrialCriteria): MatchFactor {
  if (patient.allergies.length === 0) {
    return {
      category: "allergies",
      name: "Allergy Check",
      score: 10,
      maxScore: 10,
      matched: true,
      reason: "No known drug allergies (NKDA)",
    };
  }

  // Check for severe allergies that might affect trials
  const severeAllergies = patient.allergies.filter(
    (a) => a.severity?.toLowerCase() === "severe" || a.severity?.toLowerCase() === "life-threatening"
  );

  return {
    category: "allergies",
    name: "Allergy Check",
    score: severeAllergies.length > 0 ? 5 : 10,
    maxScore: 10,
    matched: severeAllergies.length === 0,
    reason:
      severeAllergies.length > 0
        ? `${severeAllergies.length} severe allergies documented: ${severeAllergies.map((a) => a.name).join(", ")}`
        : `${patient.allergies.length} allergies documented - none severe`,
  };
}

function checkVitalsCompatibility(patient: PatientProfile): MatchFactor {
  if (!patient.vitals) {
    return {
      category: "vitals",
      name: "Vital Signs",
      score: 5,
      maxScore: 10,
      matched: true,
      reason: "No recent vitals documented",
    };
  }

  const v = patient.vitals;
  const issues: string[] = [];

  // Check for concerning vitals
  if (v.blood_pressure_systolic && v.blood_pressure_systolic > 180) {
    issues.push("Severely elevated blood pressure");
  }
  if (v.heart_rate && (v.heart_rate < 40 || v.heart_rate > 120)) {
    issues.push("Heart rate outside normal range");
  }
  if (v.oxygen_saturation && v.oxygen_saturation < 90) {
    issues.push("Low oxygen saturation");
  }

  return {
    category: "vitals",
    name: "Vital Signs",
    score: issues.length === 0 ? 10 : 5,
    maxScore: 10,
    matched: issues.length === 0,
    reason: issues.length === 0 ? "Vitals within acceptable ranges" : `Concerns: ${issues.join(", ")}`,
  };
}

function getMissingInformation(patient: PatientProfile): string[] {
  const missing: string[] = [];

  if (patient.problems.length === 0) missing.push("Medical history/conditions");
  if (patient.medications.length === 0) missing.push("Current medications");
  if (patient.allergies.length === 0) missing.push("Allergy information");
  if (!patient.vitals) missing.push("Recent vital signs");
  if (!patient.labResults || patient.labResults.length === 0) missing.push("Laboratory results");

  return missing;
}
