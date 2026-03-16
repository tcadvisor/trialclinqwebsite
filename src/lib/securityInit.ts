/**
 * Security Initialization
 * Call this on app startup to:
 * 1. Remove legacy insecure data from localStorage
 * 2. Clean up plaintext passwords
 * 3. Migrate to secure storage patterns
 */

import { migrateFromLocalStorage } from './tokenManager';
import { removePasswordData } from './accountStore';

/**
 * Initialize security measures on app startup
 * Should be called once in the main App component
 */
export function initializeSecurity(): void {
  try {
    console.log('[Security] Initializing security measures...');

    // Remove legacy EPIC tokens from localStorage
    migrateFromLocalStorage();

    // Remove any stored passwords from accountStore
    removePasswordData();

    // Remove any other legacy insecure data
    const legacyKeys = [
      'passwords', // In case any other password storage exists
      'user_credentials', // Common insecure pattern
      'auth_data', // Another common pattern
    ];

    legacyKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`[Security] Removed legacy insecure data: ${key}`);
      }
    });

    console.log('[Security] Security initialization complete');
  } catch (error) {
    console.error('[Security] Error during security initialization:', error);
  }
}

/**
 * Check if the browser supports required security features
 */
export function checkSecuritySupport(): {
  webCrypto: boolean;
  sessionStorage: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check Web Crypto API
  const webCrypto = typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
  if (!webCrypto) {
    issues.push('Web Crypto API not supported - encryption features disabled');
  }

  // Check sessionStorage
  let sessionStorageSupported = false;
  try {
    sessionStorage.setItem('__test__', 'test');
    sessionStorage.removeItem('__test__');
    sessionStorageSupported = true;
  } catch {
    issues.push('sessionStorage not available - token security may be compromised');
  }

  return {
    webCrypto,
    sessionStorage: sessionStorageSupported,
    issues,
  };
}

/**
 * Log security warnings to console
 */
export function logSecurityWarnings(): void {
  const support = checkSecuritySupport();

  if (support.issues.length > 0) {
    console.warn('[Security] Security warnings:');
    support.issues.forEach(issue => {
      console.warn(`  - ${issue}`);
    });
  }

  // Warn if not using HTTPS in production
  if (typeof window !== 'undefined' &&
      window.location.protocol === 'http:' &&
      window.location.hostname !== 'localhost' &&
      !window.location.hostname.startsWith('127.')) {
    console.warn('[Security] WARNING: Not using HTTPS. Sensitive data may be transmitted insecurely.');
  }
}
