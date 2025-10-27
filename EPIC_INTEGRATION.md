# EPIC EHR Sandbox Integration

This document describes the EPIC FHIR integration for TrialCliniq.

## Overview

The EPIC integration allows patients to securely authenticate with their EPIC EHR systems and automatically import their health data (allergies, medications, conditions) for clinical trial matching.

## Setup

### Environment Variables

The following environment variables are required:

- `VITE_EPIC_CLIENT_ID`: Your EPIC sandbox application's Non-Production Client ID
  - Value: `16877631-c6a9-4080-98b2-0e8e3346313b`

- `VITE_EPIC_FHIR_URL`: Your EPIC FHIR Base URL
  - Value: `https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/`

- `VITE_EPIC_REDIRECT_URI`: The OAuth redirect URI registered with EPIC
  - Value: `https://2a2c1d9f4dd2421fbb1d612523d028a5-04347dc479b34f07b144f8d96.fly.dev/patients/ehr-callback`

These are already configured in the dev environment.

## Architecture

### Components

1. **`src/lib/epic.ts`**: Core EPIC FHIR client library
   - OAuth configuration and token management
   - FHIR patient data fetching
   - Token persistence

2. **`src/screens/patients/EhrDirectory.tsx`**: EHR provider directory
   - Lists available EHR systems
   - Provides quick access to test patients
   - Initiates EPIC OAuth flow

3. **`src/screens/patients/EhrCallback.tsx`**: OAuth callback handler
   - Exchanges authorization code for access token
   - Fetches patient data from EPIC FHIR server
   - Stores data locally and redirects to health profile

### OAuth Flow

```
User clicks "Connect" → 
  Authorization request to EPIC →
  User logs in and consents →
  Redirects to /patients/ehr-callback with code →
  Exchange code for access token →
  Fetch patient data (allergies, medications, conditions) →
  Store in localStorage →
  Redirect to /patients/health-profile
```

## Testing with EPIC Sandbox

### Test Patients

Three test patients are available in the EPIC sandbox:

1. **Camila Lopez**
   - FHIR ID: `e3u7nUSdz9pwVvtEMp3`
   - Conditions: Diabetes, Hypertension
   - Medications: Metformin, Lisinopril

2. **Derrick Lih**
   - FHIR ID: `ey8t1fDgQJm6tJhGmQoD`
   - Conditions: COPD, Asthma
   - Medications: Albuterol, Fluticasone

3. **Desiree Powell**
   - FHIR ID: `aKBm0I8k8uvJdcnsrXMm3`
   - Conditions: Immunization, Observation
   - Medications: Vitamins

### How to Test

1. Navigate to `/patients/ehr`
2. Click "Show Test Patients" to see the sandbox test patients
3. Click "Connect as [Patient Name]" to initiate OAuth flow
4. You'll be redirected to EPIC's OAuth authorization screen
5. Log in with the test patient credentials (if required)
6. Grant permissions to the application
7. You'll be redirected back to the app with the patient's data

### Manual Test Patient Login (if needed)

If EPIC's sandbox requires explicit login:

- **Username**: `fhir.USER` or `fhir{Patient}`
- **Password**: `epichosp1` (or as configured in your sandbox)

See EPIC's sandbox test data documentation for the exact credentials.

## Data Fetching

The integration fetches the following FHIR resources:

- **Patient**: Basic demographic information
- **AllergyIntolerance**: Patient allergies and reactions
- **MedicationRequest**: Current and past medications
- **Condition**: Active and resolved conditions

All data is fetched with the patient's authorization token and stored locally in the browser's localStorage.

## Security Considerations

1. **Access Tokens**: Stored in localStorage with a 1-hour expiration (EPIC default)
2. **Patient Data**: Stored locally only after successful authorization
3. **HTTPS Only**: All EPIC API calls use HTTPS
4. **Token Refresh**: Implement token refresh logic if implementing persistent sessions

## API Integration Points

### Core Files

- **FHIR Endpoint**: `https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/`
- **Well-Known Configuration**: `{FHIR_ENDPOINT}.well-known/smart-configuration`

### FHIR Resources Used

```
GET {FHIR_ENDPOINT}Patient/{patientId}
GET {FHIR_ENDPOINT}AllergyIntolerance?patient={patientId}
GET {FHIR_ENDPOINT}MedicationRequest?patient={patientId}
GET {FHIR_ENDPOINT}Condition?patient={patientId}
```

## Troubleshooting

### "Missing EPIC configuration" Error

Ensure all three environment variables are set:
- `VITE_EPIC_CLIENT_ID`
- `VITE_EPIC_FHIR_URL`
- `VITE_EPIC_REDIRECT_URI`

### OAuth Redirect Not Working

1. Verify the redirect URI matches exactly what's registered in EPIC
2. Check that your app is accessible at the registered domain
3. Ensure the route `/patients/ehr-callback` is properly configured

### "Failed to fetch patient data"

1. Verify the access token is valid
2. Check that the FHIR endpoint URL is correct
3. Ensure the patient has authorized access to the requested resources

### Sandbox Test Patient Not Found

1. Verify you're using the correct FHIR IDs from the test data
2. Check that you're connecting to the correct EPIC sandbox instance
3. Confirm the test patient data is configured in your sandbox

## Next Steps

1. **Integrate with Health Profile**: Update `/patients/health-profile` to display imported EPIC data
2. **Token Refresh**: Implement automatic token refresh for persistent sessions
3. **Error Handling**: Add more granular error handling for different failure scenarios
4. **Data Validation**: Validate FHIR responses before storing
5. **Consent Management**: Implement persistent consent tracking

## References

- [EPIC FHIR Documentation](https://fhir.epic.com/Documentation)
- [SMART on FHIR Specification](http://www.hl7.org/fhir/smart-app-launch/)
- [OAuth 2.0 Authorization Code Flow](https://tools.ietf.org/html/rfc6749#section-1.3.1)
