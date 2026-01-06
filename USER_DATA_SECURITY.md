# User Data Security & Isolation

## Overview

This document describes the comprehensive security measures implemented to ensure that each user can only access their own health profile data, and that there is no cross-user data leakage.

## Security Architecture

### 1. Patient ID Generation

**File**: `src/lib/patientIdUtils.ts`

- Each patient is assigned a unique `patientId` that is derived from their **Azure AD Object ID (OID)** via `user.userId`
- The `patientId` is **NOT** based on email alone, making it more secure and resistant to email changes
- Formula: `patientId = user.userId` (Azure OID)

```typescript
export function generatePatientId(user: User): string {
  return user.userId; // Azure AD OID
}
```

### 2. User Authentication & Data Validation

**File**: `src/lib/auth.tsx`

When a user signs in, the system performs the following validations:

#### A. Email & Patient ID Validation

```typescript
function clearUserScopedDataIfMismatch(currentUser: { email: string; userId: string })
```

This function:
- Loads the stored health profile from localStorage
- Compares stored email with authenticated user's email
- Compares stored patientId with expected patientId (from user.userId)
- **If either doesn't match**, all user-scoped data is cleared:
  - Health profile (`tc_health_profile_v1`)
  - Profile metadata (`tc_health_profile_metadata_v1`)
  - Documents (`tc_docs`)
  - Eligibility data (`tc_eligibility_profile`)
  - EHR tokens (`epic:patient:v1`, `epic:tokens:v1`)

#### B. Sign-In Flow

When a user signs in (Azure AD or Cognito):
1. User authentication completes
2. System retrieves user details (email, userId/OID, name)
3. `clearUserScopedDataIfMismatch()` is called to validate existing localStorage data
4. If mismatch detected → all data cleared → fresh profile created
5. If match confirmed → existing profile loaded

### 3. Health Profile Validation

**File**: `src/screens/patients/HealthProfile.tsx`

The Health Profile screen has multiple layers of validation:

#### A. Profile Load Validation

```typescript
useEffect(() => {
  if (user) {
    const isValid = isValidProfileForUser(currentProfile, user);
    if (!isValid) {
      // Clear mismatched data
      // Create fresh profile for authenticated user
    }
  }
}, [user]);
```

#### B. Document Upload Validation

Before uploading any files:
1. Resolve `patientId` from localStorage
2. **Validate** that stored `patientId` matches `generatePatientId(user)`
3. If mismatch → reject upload with security error
4. If match → proceed with upload using authenticated token

```typescript
const expectedPatientId = generatePatientId(user);
if (patientId !== expectedPatientId) {
  console.error('⛔ Security: Cannot upload files - patientId mismatch');
  return;
}
```

### 4. Backend Authorization

**File**: `netlify/functions/auth-utils.ts`

The backend enforces the following:

```typescript
export async function canAccessPatient(
  authenticatedUser: { userId: string },
  targetPatientId: string
): Promise<boolean> {
  return authenticatedUser.userId === targetPatientId;
}
```

- All API requests require an authentication token
- Backend extracts `userId` from the token (Azure OID)
- Backend compares `authenticatedUser.userId === targetPatientId`
- If mismatch → `403 Forbidden`
- If match → operation allowed

### 5. Sign-Out Data Clearing

**File**: `src/lib/auth.tsx`

When a user signs out:
```typescript
const signOut = useCallback(async () => {
  await signOutUser();
  clearAllPatientData(); // Clear all localStorage data
  setUser(null);
}, []);
```

All patient-scoped data is automatically cleared to prevent the next user from accessing previous user's data.

## Security Guarantees

### ✅ What is Protected

1. **User Isolation**: Each user can only access their own health profile
2. **Cross-User Prevention**: Signing in with a different account automatically clears previous user's data
3. **Backend Authorization**: All API requests validate userId matches patientId
4. **Document Security**: Files can only be uploaded/accessed by the owning user
5. **Sign-Out Clearing**: All data is cleared when user signs out

### 🔒 Validation Points

1. **Sign-In**: Email + patientId validation
2. **Profile Load**: patientId validation against authenticated user
3. **File Upload**: patientId validation before upload
4. **File Download**: Backend validates userId matches patientId
5. **API Requests**: Backend validates all requests

## Data Storage Keys

All patient-scoped data uses these localStorage keys:

- `tc_health_profile_v1` - Main health profile
- `tc_health_profile_metadata_v1` - Field sources (EPIC sync metadata)
- `tc_docs` - Uploaded documents (references to Azure blobs)
- `tc_eligibility_profile` - Eligibility questionnaire data
- `epic:patient:v1` - EPIC FHIR patient data
- `epic:tokens:v1` - EPIC OAuth tokens

All of these are cleared on:
- User mismatch detection
- Sign-out
- Sign-in with different account

## Testing Security

To verify proper user isolation:

1. **Test Case 1: Different Users**
   - Sign in as User A
   - Fill out health profile
   - Sign out
   - Sign in as User B
   - ✅ User A's data should NOT be visible

2. **Test Case 2: Same User**
   - Sign in as User A
   - Fill out health profile
   - Sign out
   - Sign in as User A again
   - ❌ User A's data should NOT persist (localStorage clears on sign-out)
   - ✅ But data should be available from backend if synced

3. **Test Case 3: File Uploads**
   - Sign in as User A
   - Upload a file
   - Backend should store with User A's patientId
   - Sign out
   - Sign in as User B
   - ✅ User B should NOT be able to access User A's files

## Future Enhancements

1. **Server-Side Sessions**: Move more validation to backend
2. **Data Encryption**: Encrypt sensitive data in localStorage
3. **Activity Logging**: Log all access attempts for audit trail
4. **Session Timeout**: Auto sign-out after inactivity
5. **Multi-Factor Auth**: Add MFA for enhanced security

## Contact

For security concerns or questions, contact the development team.

---

**Last Updated**: 2025-01-03
**Security Review**: Required before production deployment
