import crypto from 'crypto';
import {
  BlobServiceClient,
  ContainerClient,
  BlobSASPermissions,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';

const CONTAINER_NAME = 'medical-documents';
const PATIENT_ID_REGEX = /^[A-Za-z0-9._-]+$/;

// Initialize Azure Blob Storage client
function getBlobServiceClient(): BlobServiceClient {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

  if (!accountName || !accountKey) {
    throw new Error('Missing Azure Storage credentials');
  }

  return BlobServiceClient.fromConnectionString(
    `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`
  );
}

// Get container client
async function getContainerClient(): Promise<ContainerClient> {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

  // Create container if it doesn't exist
  try {
    await containerClient.create();
  } catch (error: any) {
    // Container already exists
  }

  return containerClient;
}

// Upload file to blob storage
export async function uploadFileToBlob(
  patientId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ blobName: string; blobUrl: string; safeFileName: string }> {
  const safePatientId = ensureValidPatientId(patientId);
  const safeFileName = sanitizeFileName(fileName);
  const blobName = buildBlobName(safePatientId, safeFileName);

  const containerClient = await getContainerClient();

  try {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: { blobContentType: mimeType },
      metadata: {
        patientId: safePatientId,
        originalFileName: fileName,
        safeFileName,
        uploadedAt: new Date().toISOString(),
      },
      contentDisposition: `inline; filename="${encodeURIComponent(safeFileName)}"`,
    });

    const blobUrl = blockBlobClient.url;
    return { blobName, blobUrl, safeFileName };
  } catch (error: any) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

// Download file from blob storage
export async function downloadFileFromBlob(blobName: string): Promise<Buffer> {
  const containerClient = await getContainerClient();
  const normalizedName = normalizeBlobName(blobName);

  if (!normalizedName) {
    throw new Error('Invalid blob name');
  }

  try {
    const blockBlobClient = containerClient.getBlockBlobClient(normalizedName);
    const downloadBlockBlobResponse = await blockBlobClient.download(0);
    
    return await streamToBuffer(downloadBlockBlobResponse.readableStreamBody!);
  } catch (error: any) {
    throw new Error(`Failed to download file: ${error.message}`);
  }
}

// List files for a patient
export async function listPatientFiles(patientId: string) {
  const safePatientId = ensureValidPatientId(patientId);
  const containerClient = await getContainerClient();
  const files: Array<{
    name: string;
    size?: number;
    url: string;
    uploadedAt?: Date;
  }> = [];

  try {
    for await (const blob of containerClient.listBlobsFlat({ prefix: `${safePatientId}/` })) {
      const blobUrl = containerClient.getBlockBlobClient(blob.name).url;
      files.push({
        name: blob.name,
        size: blob.properties.contentLength,
        url: await generateFileAccessUrl(blob.name).catch(() => blobUrl),
        uploadedAt: blob.properties.createdOn,
      });
    }
  } catch (error: any) {
    throw new Error(`Failed to list files: ${error.message}`);
  }

  return files;
}

// Delete file from blob storage
export async function deleteFileFromBlob(blobName: string): Promise<void> {
  const containerClient = await getContainerClient();
  const normalizedName = normalizeBlobName(blobName);
  if (!normalizedName) {
    throw new Error('Invalid blob name');
  }

  try {
    const blockBlobClient = containerClient.getBlockBlobClient(normalizedName);
    await blockBlobClient.delete();
  } catch (error: any) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

// Helper: Convert readable stream to buffer
async function streamToBuffer(readableStream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    readableStream.on('data', (data: any) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });

    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    readableStream.on('error', reject);
  });
}

// Generate SAS URL for file (temporary access)
export async function generateFileAccessUrl(blobNameOrUrl: string, expiryHours: number = 24): Promise<string> {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

  if (!accountName || !accountKey) {
    throw new Error('Missing Azure Storage credentials');
  }

  const blobName = normalizeBlobName(blobNameOrUrl);
  if (!blobName) {
    throw new Error('Invalid blob name or URL');
  }

  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + expiryHours);

  try {
    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    const sasParams = generateBlobSASQueryParameters(
      {
        containerName: CONTAINER_NAME,
        blobName,
        permissions: BlobSASPermissions.parse('r'),
        startsOn: new Date(Date.now() - 5 * 60 * 1000), // allow small clock skew
        expiresOn: expiryDate,
      },
      credential
    ).toString();

    return `https://${accountName}.blob.core.windows.net/${CONTAINER_NAME}/${blobName}?${sasParams}`;
  } catch (error: any) {
    throw new Error(`Failed to generate SAS URL: ${error.message}`);
  }
}

// Normalize blob name regardless of whether a URL or path was provided
function normalizeBlobName(blobNameOrUrl: string): string | null {
  if (!blobNameOrUrl) return null;

  const trimmed = blobNameOrUrl.trim();
  if (!trimmed) return null;

  // If it's a full URL, strip protocol/host and container
  try {
    const url = new URL(trimmed);
    const pathParts = url.pathname.replace(/^\/+/, '').split('/');
    const withoutContainer = pathParts[0] === CONTAINER_NAME ? pathParts.slice(1) : pathParts;
    return withoutContainer.join('/');
  } catch {
    // Not a URL - fall back to a normalized path
    const withoutLeadingSlash = trimmed.replace(/^\/+/, '');
    if (withoutLeadingSlash.startsWith(`${CONTAINER_NAME}/`)) {
      return withoutLeadingSlash.slice(CONTAINER_NAME.length + 1);
    }
    return withoutLeadingSlash;
  }
}

// Validate patient ID format to prevent path traversal and unexpected blob keys
function ensureValidPatientId(patientId: string): string {
  const trimmed = patientId?.trim();
  if (!trimmed || !PATIENT_ID_REGEX.test(trimmed)) {
    throw new Error('Invalid patientId format');
  }
  return trimmed;
}

// Sanitize filename to remove path segments and restrict characters/length
function sanitizeFileName(fileName: string): string {
  const fallback = 'file';
  const base = (fileName || '').split(/[/\\]/).pop() || fallback;

  const parts = base.split('.');
  const ext = parts.length > 1 ? '.' + parts.pop() : '';
  const namePart = parts.join('.') || fallback;

  const safeName = namePart.replace(/[^A-Za-z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 120);
  const safeExt = ext.replace(/[^A-Za-z0-9.]/g, '').slice(0, 20);

  return `${safeName || fallback}${safeExt}`.slice(0, 180);
}

// Build unique blob name using timestamp + random suffix
function buildBlobName(patientId: string, safeFileName: string): string {
  const timestamp = Date.now();
  const randomSuffix = crypto.randomUUID?.() ?? crypto.randomBytes(8).toString('hex');
  return `${patientId}/${timestamp}-${randomSuffix}-${safeFileName}`;
}
