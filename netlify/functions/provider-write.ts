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
    // Authenticate user from Azure Entra ID token
    const authenticatedUser = await getUserFromAuthHeader(authHeader);

    // Ensure user exists in database
    await getOrCreateUser(
      authenticatedUser.userId,
      authenticatedUser.email,
      authenticatedUser.oid,
      authenticatedUser.firstName,
      authenticatedUser.lastName,
      authenticatedUser.role
    );

    const payload = event.body ? JSON.parse(event.body) : {};
    
    const {
      providerId,
      email,
      emailVerified,
      siteName,
      organization,
      organizationType,
      organizationAbbreviation,
      parentOrganizations,
      address,
      city,
      state,
      zipcode,
      country,
      facilityType,
      fundingOrganization,
      acceptedConditions,
      languages,
      investigatorName,
      investigatorPhone,
      investigatorEmail,
      affiliatedOrganization,
      regulatoryAuthority,
      regulatoryAuthorityAddress,
      consentsAccepted,
      additionalInfo,
    } = payload;

    if (!providerId || !email) {
      return cors(400, { error: "Missing providerId or email" });
    }

    // AUTHORIZATION CHECK: Ensure user can only modify their own profile
    // Providers can only update their own profile
    if (authenticatedUser.role === 'provider' && authenticatedUser.userId !== providerId) {
      await logAuditEvent(
        authenticatedUser.userId,
        'UNAUTHORIZED_ACCESS',
        'provider_profile',
        providerId,
        providerId,
        { reason: 'User attempted to access another provider\'s profile' },
        event.headers?.['x-forwarded-for'] || event.headers?.['x-client-ip'],
        event.headers?.['user-agent']
      );
      return cors(403, { error: "Unauthorized: You can only update your own profile" });
    }

    // Insert or update provider profile in PostgreSQL with user tracking
    const result = await query(
      `
      INSERT INTO provider_profiles (
        provider_id, user_id, email, email_verified, site_name, organization,
        organization_type, organization_abbreviation, parent_organizations, address,
        city, state, zipcode, country, facility_type, funding_organization,
        accepted_conditions, languages, investigator_name, investigator_phone,
        investigator_email, affiliated_organization, regulatory_authority,
        regulatory_authority_address, consents_accepted, additional_info,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, NOW(), NOW())
      ON CONFLICT (provider_id) DO UPDATE SET
        user_id = $2,
        email = $3,
        email_verified = $4,
        site_name = $5,
        organization = $6,
        organization_type = $7,
        organization_abbreviation = $8,
        parent_organizations = $9,
        address = $10,
        city = $11,
        state = $12,
        zipcode = $13,
        country = $14,
        facility_type = $15,
        funding_organization = $16,
        accepted_conditions = $17,
        languages = $18,
        investigator_name = $19,
        investigator_phone = $20,
        investigator_email = $21,
        affiliated_organization = $22,
        regulatory_authority = $23,
        regulatory_authority_address = $24,
        consents_accepted = $25,
        additional_info = $26,
        updated_at = NOW()
      RETURNING id, provider_id, user_id, email;
      `,
      [
        providerId, authenticatedUser.userId, email, emailVerified || false, siteName, organization,
        organizationType, organizationAbbreviation, parentOrganizations ? JSON.stringify(parentOrganizations) : null,
        address, city, state, zipcode, country, facilityType, fundingOrganization,
        acceptedConditions ? JSON.stringify(acceptedConditions) : null,
        languages ? JSON.stringify(languages) : null,
        investigatorName, investigatorPhone, investigatorEmail, affiliatedOrganization,
        regulatoryAuthority, regulatoryAuthorityAddress,
        consentsAccepted ? JSON.stringify(consentsAccepted) : null,
        additionalInfo
      ]
    );

    console.log("✅ Provider profile saved to PostgreSQL:", {
      providerId,
      userId: authenticatedUser.userId,
      email,
      rowId: result.rows[0]?.id
    });

    // Log audit event
    await logAuditEvent(
      authenticatedUser.userId,
      'PROVIDER_PROFILE_UPDATED',
      'provider_profile',
      String(result.rows[0]?.id),
      providerId,
      { fields_updated: Object.keys(payload).length },
      event.headers?.['x-forwarded-for'] || event.headers?.['x-client-ip'],
      event.headers?.['user-agent']
    );

    return cors(200, {
      ok: true,
      message: "Provider profile saved successfully",
      providerId: result.rows[0]?.provider_id,
      userId: result.rows[0]?.user_id,
      email: result.rows[0]?.email
    });
  } catch (e: any) {
    console.error("❌ Error saving provider profile:", e);

    // Log authentication/authorization errors
    if (e.message?.includes('Unauthorized') || e.message?.includes('Missing Authorization')) {
      try {
        const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
        if (authHeader) {
          const authenticatedUser = await getUserFromAuthHeader(authHeader).catch(() => null);
          if (authenticatedUser) {
            await logAuditEvent(
              authenticatedUser.userId,
              'PROVIDER_PROFILE_UPDATE_FAILED',
              'provider_profile',
              payload?.providerId,
              payload?.providerId,
              { error: e.message },
              event.headers?.['x-forwarded-for'] || event.headers?.['x-client-ip'],
              event.headers?.['user-agent']
            );
          }
        }
      } catch (_) {
        // Ignore logging errors
      }
    }

    return cors(e.message?.includes('Unauthorized') ? 401 : 500, {
      error: String(e?.message || e || "Unknown error"),
      details: process.env.NODE_ENV === "development" ? e.stack : undefined
    });
  }
};
