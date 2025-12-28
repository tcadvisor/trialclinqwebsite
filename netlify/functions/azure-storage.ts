import { BlobServiceClient, ContainerClient, generateBlobSASUrl, BlobSASPermissions } from '@azure/storage-blob';

const CONTAINER_NAME = 'medical-documents';

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
): Promise<{ blobName: string; blobUrl: string }> {
  const containerClient = await getContainerClient();
  const blobName = `${patientId}/${Date.now()}-${fileName}`;

  try {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: { blobContentType: mimeType },
      metadata: {
        patientId,
        uploadedAt: new Date().toISOString(),
      },
    });

    const blobUrl = blockBlobClient.url;
    return { blobName, blobUrl };
  } catch (error: any) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

// Download file from blob storage
export async function downloadFileFromBlob(blobName: string): Promise<Buffer> {
  const containerClient = await getContainerClient();

  try {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const downloadBlockBlobResponse = await blockBlobClient.download(0);
    
    return await streamToBuffer(downloadBlockBlobResponse.readableStreamBody!);
  } catch (error: any) {
    throw new Error(`Failed to download file: ${error.message}`);
  }
}

// List files for a patient
export async function listPatientFiles(patientId: string) {
  const containerClient = await getContainerClient();
  const files = [];

  try {
    for await (const blob of containerClient.listBlobsFlat({ prefix: `${patientId}/` })) {
      files.push({
        name: blob.name,
        size: blob.properties.contentLength,
        url: `${containerClient.getBlockBlobClient(blob.name).url}`,
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

  try {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
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
export async function generateFileAccessUrl(blobName: string, expiryHours: number = 24): Promise<string> {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

  if (!accountName || !accountKey) {
    throw new Error('Missing Azure Storage credentials');
  }

  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + expiryHours);

  try {
    const sasUrl = generateBlobSASUrl({
      accountName,
      containerName: CONTAINER_NAME,
      blobName,
      accountKey,
      permissions: BlobSASPermissions.parse('r'),
      expiresOn: expiryDate,
    });

    return sasUrl;
  } catch (error: any) {
    throw new Error(`Failed to generate SAS URL: ${error.message}`);
  }
}
