import type { Handler } from "@netlify/functions";
import { query, getOrCreateUser, logAuditEvent } from "./db";
import { getUserFromAuthHeader, canAccessPatient } from "./auth-utils";

function cors(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,PUT,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
      "content-type": "application/json",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return cors(204, "");
  }

  if (event.httpMethod !== "PUT" && event.httpMethod !== "POST") {
    return cors(405, { error: "Method not allowed" });
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  if (!authHeader) {
    return cors(401, { error: "Missing Authorization header" });
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    
    const {
      patientId,
      email,
      emailVerified,
      age,
      weight,
      phone,
      gender,
      race,
      language,
      bloodGroup,
      genotype,
      hearingImpaired,
      visionImpaired,
      primaryCondition,
      diagnosed,
      allergies,
      medications,
      additionalInfo,
      additionalInformationAppendMarkdown,
      ecog,
      diseaseStage,
      biomarkers,
      priorTherapies,
      comorbidityCardiac,
      comorbidityRenal,
      comorbidityHepatic,
      comorbidityAutoimmune,
      infectionHIV,
      infectionHBV,
      infectionHCV,
    } = payload;

    if (!patientId || !email) {
      return cors(400, { error: "Missing patientId or email" });
    }

    // Combine additionalInfo and appendMarkdown
    const finalAdditionalInfo = [
      additionalInfo || "",
      additionalInformationAppendMarkdown || ""
    ].filter(Boolean).join("\n\n");

    // Insert or update patient profile in PostgreSQL
    const result = await query(
      `
      INSERT INTO patient_profiles (
        patient_id, email, email_verified, age, weight, phone, gender, race, language,
        blood_group, genotype, hearing_impaired, vision_impaired, primary_condition,
        diagnosed, allergies, medications, additional_info, ecog, disease_stage,
        biomarkers, prior_therapies, comorbidity_cardiac, comorbidity_renal,
        comorbidity_hepatic, comorbidity_autoimmune, infection_hiv, infection_hbv,
        infection_hcv, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, NOW(), NOW())
      ON CONFLICT (patient_id) DO UPDATE SET
        email = $2,
        email_verified = $3,
        age = $4,
        weight = $5,
        phone = $6,
        gender = $7,
        race = $8,
        language = $9,
        blood_group = $10,
        genotype = $11,
        hearing_impaired = $12,
        vision_impaired = $13,
        primary_condition = $14,
        diagnosed = $15,
        allergies = $16,
        medications = $17,
        additional_info = $18,
        ecog = $19,
        disease_stage = $20,
        biomarkers = $21,
        prior_therapies = $22,
        comorbidity_cardiac = $23,
        comorbidity_renal = $24,
        comorbidity_hepatic = $25,
        comorbidity_autoimmune = $26,
        infection_hiv = $27,
        infection_hbv = $28,
        infection_hcv = $29,
        updated_at = NOW()
      RETURNING id, patient_id, email;
      `,
      [
        patientId, email, emailVerified || false, age, weight, phone, gender, race, language,
        bloodGroup, genotype, hearingImpaired || false, visionImpaired || false, primaryCondition,
        diagnosed, allergies ? JSON.stringify(allergies) : null, medications ? JSON.stringify(medications) : null,
        finalAdditionalInfo, ecog, diseaseStage, biomarkers,
        priorTherapies ? JSON.stringify(priorTherapies) : null,
        comorbidityCardiac || false, comorbidityRenal || false, comorbidityHepatic || false,
        comorbidityAutoimmune || false, infectionHIV || false, infectionHBV || false, infectionHCV || false
      ]
    );

    console.log("✅ Patient profile saved to PostgreSQL:", {
      patientId,
      email,
      rowId: result.rows[0]?.id
    });

    return cors(200, {
      ok: true,
      message: "Profile saved successfully",
      patientId: result.rows[0]?.patient_id,
      email: result.rows[0]?.email
    });
  } catch (e: any) {
    console.error("❌ Error saving profile:", e);
    return cors(500, { 
      error: String(e?.message || e || "Unknown error"),
      details: process.env.NODE_ENV === "development" ? e.stack : undefined
    });
  }
};
