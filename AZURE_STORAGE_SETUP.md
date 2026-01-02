# Azure Storage Setup Guide

## Overview

Your healthcare trial app is now configured to use:
- **Azure PostgreSQL** for persistent data storage (patient profiles, documents metadata)
- **Azure Blob Storage** for secure file storage (PDFs, medical documents)
- **Azure Entra ID** for authentication (already configured)

## Environment Variables

⚠️ **IMPORTANT: Secrets are stored securely via DevServerControl and are NOT checked into git**

Your environment variables have been automatically configured:

```
DATABASE_URL=postgresql://<username>:<password>@<server>.postgres.database.azure.com:<port>/<database>?sslmode=require
PGHOST=<your-postgres-server>.postgres.database.azure.com
PGUSER=<your-postgres-username>
PGPASSWORD=<your-postgres-password>
PGPORT=<your-postgres-port>
PGDATABASE=<your-postgres-database>
AZURE_STORAGE_ACCOUNT_NAME=<your-storage-account-name>
AZURE_STORAGE_ACCOUNT_KEY=<your-storage-account-key>
```

**To view/manage your actual credentials:**
1. Use DevServerControl in the platform UI
2. Check the original Azure Portal for your credentials
3. **Never commit secrets to git** - they are already configured in the development environment

## Database Schema

The application automatically initializes these tables on first connection:

### `patient_profiles`
Stores patient health information and profile data.

**Columns:**
- `id` - Primary key
- `patient_id` - Unique patient identifier (foreign key)
- `email` - Patient email address
- `age`, `weight`, `phone`, `gender`, `race`, `language`
- `blood_group`, `genotype`
- `hearing_impaired`, `vision_impaired` - Boolean flags
- `primary_condition`, `diagnosed` - Medical information
- `allergies`, `medications`, `prior_therapies` - JSON arrays
- `additional_info` - Text field for notes and summaries
- `ecog`, `disease_stage`, `biomarkers` - Clinical data
- `comorbidity_*` - Boolean flags for comorbidities
- `infection_*` - Boolean flags for infections
- `created_at`, `updated_at` - Timestamps

### `patient_documents`
Stores metadata about uploaded medical documents.

**Columns:**
- `id` - Primary key
- `patient_id` - Foreign key to patient_profiles
- `file_name` - Original filename
- `file_type` - MIME type (e.g., application/pdf)
- `file_size` - File size in bytes
- `blob_url` - URL to file in Azure Blob Storage
- `blob_container` - Container name (medical-documents)
- `uploaded_at` - Upload timestamp

## API Endpoints

### 1. Upload Files to Azure Blob Storage
**Endpoint:** `POST /.netlify/functions/upload-file`

**Request:**
```bash
curl -X POST /.netlify/functions/upload-file \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "patientId=patient-123" \
  -F "files=@document.pdf"
```

**Response:**
```json
{
  "ok": true,
  "files": [
    {
      "filename": "document.pdf",
      "size": 125000,
      "url": "https://<your-storage-account>.blob.core.windows.net/medical-documents/patient-123/..."
    }
  ]
}
```

### 2. Get Patient Files
**Endpoint:** `GET /.netlify/functions/get-patient-files?patientId=patient-123`

**Request:**
```bash
curl -X GET "/.netlify/functions/get-patient-files?patientId=patient-123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "ok": true,
  "patientId": "patient-123",
  "files": [
    {
      "id": 1,
      "name": "document.pdf",
      "size": 125000,
      "uploadedAt": "2024-01-15T10:30:00Z",
      "url": "https://... (SAS URL with 24-hour expiry)"
    }
  ]
}
```

### 3. Save Patient Profile
**Endpoint:** `POST /.netlify/functions/profile-write`

**Request:**
```json
{
  "patientId": "patient-123",
  "email": "patient@example.com",
  "age": "45",
  "weight": "70",
  "phone": "+1-555-0123",
  "gender": "Male",
  "primaryCondition": "Alzheimer's Disease",
  "diagnosed": "2023-01-01",
  "allergies": [
    { "name": "Penicillin", "reaction": "Rash" }
  ],
  "medications": [
    { "name": "Lisinopril", "dose": "10mg" }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Profile saved successfully",
  "patientId": "patient-123",
  "email": "patient@example.com"
}
```

## Client-Side Utilities

### Storage Functions

```typescript
import { 
  savePatientProfile, 
  uploadPatientFiles, 
  getPatientFiles,
  getCachedProfile,
  cacheProfileLocally
} from '@/lib/storage';

// Save patient profile
await savePatientProfile({
  patientId: 'patient-123',
  email: 'patient@example.com',
  age: '45',
  // ... other fields
}, authToken);

// Upload files
const uploadedFiles = await uploadPatientFiles(
  'patient-123',
  [file1, file2],
  authToken
);

// Get patient files
const files = await getPatientFiles('patient-123', authToken);

// Cache locally for offline support
cacheProfileLocally(profileData);

// Retrieve cached profile
const cached = getCachedProfile('patient-123');
```

## Security Features

### Storage Guardrails (Enforced in API)
1. **Per-patient authorization** - Patients can only list/upload their own files (server-side check).
2. **Safe blob keys** - Filenames are sanitized and paths include timestamp + random suffix; original name is kept in blob metadata.
3. **Precise SAS links** - SAS URLs are generated from stored blob paths (fallback to stored URL if SAS generation fails).
4. **Upload limits** - Max 5 files per request, 20MB per file, and only PDF/PNG/JPEG mimetypes; unsupported/oversized files return warnings.
5. **Path validation** - Patient IDs are validated to prevent path traversal in blob keys.

### HIPAA Compliance
1. **SSL/TLS Encryption** - All data in transit is encrypted
2. **At-Rest Encryption** - Azure handles encryption for PostgreSQL and Blob Storage
3. **Access Control** - Firewall rules restrict database access
4. **Authentication** - Azure Entra ID with MFA support
5. **Audit Logging** - Database timestamps track all changes
6. **Temporary Access** - SAS URLs for file downloads expire after 24 hours

### Best Practices
1. Always use HTTPS in production
2. Implement proper authorization checks on the backend
3. Monitor Azure logs for suspicious activity
4. Regularly backup your database
5. Rotate access keys periodically
6. Use virtual networks and private endpoints for production

## Testing the Integration

### 1. Test Database Connection
```bash
# From the project root
npm run test:db
```

### 2. Test File Upload
1. Navigate to the app patient health profile
2. Click "Upload document"
3. Select a PDF/PNG/JPEG file (≤20MB; up to 5 at once)
4. Verify the file appears in the documents list
5. Check Azure Portal → Storage Account → Containers to see the file (blob name will be timestamped + random suffix)
6. Re-query `/.netlify/functions/get-patient-files` and confirm the returned `url` (SAS) downloads correctly; warnings indicate skipped files or SAS fallback

### 3. Test Profile Persistence
1. Fill out patient profile fields
2. Upload documents (triggers profile save)
3. Verify data appears in PostgreSQL:
   ```bash
   psql postgresql://<db-user>@<server-name>.postgres.database.azure.com/postgres
   SELECT * FROM patient_profiles WHERE patient_id = 'patient-123';
   SELECT * FROM patient_documents WHERE patient_id = 'patient-123';
   ```

## Troubleshooting

### Connection Errors
**Error:** `Failed to connect to PostgreSQL`
**Solution:** 
- Verify connection string in DevServerControl environment variables
- Check that your IP is whitelisted in Azure Firewall rules
- Verify database credentials are correct

### Upload Errors
**Error:** `Failed to upload files: Invalid credentials`
**Solution:**
- Check `AZURE_STORAGE_ACCOUNT_NAME` and `AZURE_STORAGE_ACCOUNT_KEY`
- Verify the access key hasn't been rotated
- Check that the container exists (medical-documents)

### File Not Found
**Error:** `Failed to retrieve files`
**Solution:**
- Verify the patient ID is correct
- Check that files were successfully uploaded
- Look for errors in Azure Blob Storage container

## Monitoring & Maintenance

### View Logs
```bash
# PostgreSQL error logs
# Azure Portal → PostgreSQL Server → Server logs

# Application logs
# Netlify Functions → Logs section
```

### Database Backups
Azure PostgreSQL automatically backs up your database:
- **Retention:** 7 days (default)
- **Frequency:** Daily
- **View backups:** Azure Portal → PostgreSQL Server → Backups

### Storage Quotas
- **PostgreSQL:** 32 GB storage (adjust in Compute + storage settings)
- **Blob Storage:** Automatically scales

## Next Steps

1. **Production Deployment**
   - Update redirect URIs in Azure Entra ID
   - Enable private endpoints for database
   - Configure advanced security settings

2. **Monitoring**
   - Set up Azure Monitor alerts
   - Configure audit logging
   - Enable threat detection

3. **Scaling**
   - Monitor database performance
   - Increase Blob Storage tier if needed
   - Implement caching for frequently accessed files

## Support

For issues with:
- **Azure Services:** Azure Portal support or [Azure Support](https://azure.microsoft.com/en-us/support/)
- **Application Code:** Check [CLAUDE.md](./CLAUDE.md) or project documentation
- **Database Queries:** See PostgreSQL documentation

---

**Last Updated:** 2024-01-15
**Azure Region:** Canada Central
**Database Version:** PostgreSQL 17
**Storage Account:** trialcliniqdev
