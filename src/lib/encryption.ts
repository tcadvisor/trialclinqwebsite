/**
 * Encryption utilities for securing sensitive data in localStorage
 * Uses Web Crypto API with AES-GCM encryption
 */

const ENCRYPTION_KEY_STORAGE = 'tc_encryption_key';
const IV_LENGTH = 12; // 12 bytes for AES-GCM

/**
 * Generate or retrieve encryption key.
 * Stored in localStorage so encrypted data remains recoverable across sessions.
 * The key protects data at rest from external access, not from same-origin scripts.
 */
async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  const storedKey = localStorage.getItem(ENCRYPTION_KEY_STORAGE);

  if (storedKey) {
    try {
      const keyData = JSON.parse(storedKey);
      return await crypto.subtle.importKey(
        'jwk',
        keyData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.warn('Failed to import stored key, generating new one:', error);
    }
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Store key in localStorage so it persists across sessions
  const exportedKey = await crypto.subtle.exportKey('jwk', key);
  localStorage.setItem(ENCRYPTION_KEY_STORAGE, JSON.stringify(exportedKey));

  return key;
}

/**
 * Encrypt data using AES-GCM
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-GCM
 */
export async function decrypt(ciphertext: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();

    // Convert from base64
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encryptedData = combined.slice(IV_LENGTH);

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Securely store encrypted data in localStorage
 */
export async function setEncryptedItem(key: string, value: any): Promise<void> {
  try {
    const plaintext = JSON.stringify(value);
    const encrypted = await encrypt(plaintext);
    localStorage.setItem(key, encrypted);
  } catch (error) {
    console.error('Failed to store encrypted data:', error);
    throw error;
  }
}

/**
 * Retrieve and decrypt data from localStorage
 */
export async function getEncryptedItem<T>(key: string): Promise<T | null> {
  try {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;

    const decrypted = await decrypt(encrypted);
    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.error('Failed to retrieve encrypted data:', error);
    // If decryption fails, remove the corrupted data
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Clear encryption key (call on logout)
 */
export function clearEncryptionKey(): void {
  localStorage.removeItem(ENCRYPTION_KEY_STORAGE);
}

/**
 * Check if data in localStorage is encrypted
 */
export function isEncrypted(value: string | null): boolean {
  if (!value) return false;

  // Encrypted data should be base64 and not parse as JSON
  try {
    JSON.parse(value);
    return false; // If it parses, it's plaintext
  } catch {
    // Try to decode as base64
    try {
      atob(value);
      return true; // Successfully decoded base64, likely encrypted
    } catch {
      return false;
    }
  }
}
