/**
 * INTEGRATION EXAMPLE
 *
 * This file shows how to integrate the security fixes into your application.
 * Copy the relevant parts into your actual App.tsx or main.tsx file.
 */

import React, { useEffect } from 'react';
import { initializeSecurity, logSecurityWarnings } from './src/lib/securityInit';
import { clearEncryptionKey } from './src/lib/encryption';
import { clearAllEpicData } from './src/lib/tokenManager';

/**
 * Example: Add to your main App component
 */
function App() {
  // Initialize security on app startup
  useEffect(() => {
    // Clean up legacy insecure data and initialize security
    initializeSecurity();

    // Log any security warnings to console
    logSecurityWarnings();
  }, []);

  // ... rest of your App component

  return (
    <div className="App">
      {/* Your app content */}
    </div>
  );
}

/**
 * Example: Add to your logout function
 */
function handleLogout() {
  // Clear all sensitive data
  clearEncryptionKey(); // Clear encryption key from sessionStorage
  clearAllEpicData(); // Clear EPIC tokens and patient data from memory

  // Clear any other app-specific data
  // ... your logout logic
}

/**
 * Example: Using encrypted storage for health profiles
 */
import { cacheProfileLocally, getCachedProfile } from './src/lib/storage';

async function saveHealthProfile(profile: any) {
  try {
    // This now encrypts the profile before storing
    await cacheProfileLocally(profile);
    console.log('Profile saved securely');
  } catch (error) {
    console.error('Failed to save profile:', error);
  }
}

async function loadHealthProfile(patientId: string) {
  try {
    // This now decrypts the profile when retrieving
    const profile = await getCachedProfile(patientId);
    if (profile) {
      console.log('Profile loaded and decrypted');
      return profile;
    } else {
      console.log('No cached profile found');
      return null;
    }
  } catch (error) {
    console.error('Failed to load profile:', error);
    return null;
  }
}

/**
 * Example: Working with EPIC tokens
 */
import { setEpicTokens, getEpicTokens, hasValidEpicTokens } from './src/lib/tokenManager';

function handleEpicCallback(tokenData: any) {
  // Store tokens in memory (NOT localStorage)
  setEpicTokens({
    access_token: tokenData.access_token,
    token_type: tokenData.token_type,
    expires_in: tokenData.expires_in,
    refresh_token: tokenData.refresh_token,
    patient: tokenData.patient,
  });

  console.log('EPIC tokens stored securely in memory');
}

function makeEpicApiCall() {
  // Check if we have valid tokens
  if (!hasValidEpicTokens()) {
    console.error('No valid EPIC tokens available');
    return;
  }

  // Get tokens from memory
  const tokens = getEpicTokens();
  if (!tokens) {
    console.error('Failed to retrieve tokens');
    return;
  }

  // Use tokens for API call
  fetch('https://fhir.epic.com/api/...', {
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`
    }
  });
}

/**
 * Example: Custom encryption for other sensitive data
 */
import { setEncryptedItem, getEncryptedItem } from './src/lib/encryption';

async function saveSecretData(key: string, data: any) {
  try {
    // Encrypt any sensitive data before storing
    await setEncryptedItem(key, data);
    console.log('Data encrypted and stored');
  } catch (error) {
    console.error('Failed to encrypt data:', error);
  }
}

async function loadSecretData(key: string) {
  try {
    // Decrypt when retrieving
    const data = await getEncryptedItem(key);
    if (data) {
      console.log('Data retrieved and decrypted');
      return data;
    }
    return null;
  } catch (error) {
    console.error('Failed to decrypt data:', error);
    return null;
  }
}

/**
 * Example: Security check before rendering sensitive components
 */
import { checkSecuritySupport } from './src/lib/securityInit';

function SecureComponent() {
  const [securitySupport, setSecuritySupport] = React.useState<any>(null);

  useEffect(() => {
    const support = checkSecuritySupport();
    setSecuritySupport(support);

    if (!support.webCrypto) {
      console.error('Web Crypto API not supported - encryption disabled');
    }
  }, []);

  if (!securitySupport?.webCrypto) {
    return (
      <div className="security-warning">
        <h2>Security Warning</h2>
        <p>Your browser does not support required security features.</p>
        <p>Please use a modern browser for enhanced security.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Your secure component */}
    </div>
  );
}

/**
 * MIGRATION NOTES:
 *
 * 1. The following functions are now ASYNC (add await):
 *    - cacheProfileLocally()
 *    - getCachedProfile()
 *    - cacheProviderProfileLocally()
 *    - getCachedProviderProfile()
 *    - setEncryptedItem()
 *    - getEncryptedItem()
 *
 * 2. EPIC tokens are no longer in localStorage:
 *    - Use getEpicTokens() instead of localStorage.getItem('epic:tokens:v1')
 *    - Use setEpicTokens() instead of localStorage.setItem('epic:tokens:v1', ...)
 *
 * 3. Password storage has been removed:
 *    - verifyAccount() now returns null (deprecated)
 *    - Account type no longer has password field
 *    - Implement proper backend authentication
 *
 * 4. On app initialization, call:
 *    - initializeSecurity() - cleans up legacy data
 *    - logSecurityWarnings() - logs security issues
 *
 * 5. On logout, call:
 *    - clearEncryptionKey() - clears encryption key
 *    - clearAllEpicData() - clears tokens from memory
 */

export default App;
