/**
 * Phone number validation and formatting utility
 * Supports US, Canada, and UK phone numbers
 */

export type CountryCode = "US" | "CA" | "UK";

interface CountryConfig {
  pattern: RegExp;
  format: (digits: string) => string;
  description: string;
}

const COUNTRY_CONFIGS: Record<CountryCode, CountryConfig> = {
  US: {
    pattern: /^1?[2-9]\d{2}[2-9](?!11)\d{2}\d{4}$/,
    format: (digits: string) => {
      if (digits.length < 3) return digits;
      if (digits.length < 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    },
    description: "US phone numbers must be 10 digits",
  },
  CA: {
    pattern: /^1?[2-9]\d{2}[2-9](?!11)\d{2}\d{4}$/,
    format: (digits: string) => {
      if (digits.length < 3) return digits;
      if (digits.length < 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    },
    description: "Canadian phone numbers must be 10 digits",
  },
  UK: {
    pattern: /^(?:0|44)[1-9]\d{1,4}\d{3,4}\d{3,4}$/,
    format: (digits: string) => {
      // Format as: 020 xxxx xxxx or 0121 xxx xxxx or +44 20 xxxx xxxx
      if (digits.startsWith("44")) {
        const remaining = digits.slice(2);
        if (remaining.length <= 4) return `+44 ${remaining}`;
        if (remaining.length <= 8) return `+44 ${remaining.slice(0, 4)} ${remaining.slice(4)}`;
        return `+44 ${remaining.slice(0, 4)} ${remaining.slice(4, 8)} ${remaining.slice(8)}`;
      }
      if (digits.length <= 4) return digits;
      if (digits.length <= 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
    },
    description: "UK phone numbers must be 10-11 digits (starting with 0 or 44)",
  },
};

/**
 * Extract only digits from phone input
 */
export function extractDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Format phone number based on country
 */
export function formatPhoneNumber(input: string, country: CountryCode): string {
  const digits = extractDigits(input);
  const config = COUNTRY_CONFIGS[country];
  
  // Remove leading 1 for US/CA if present
  let cleanDigits = digits;
  if ((country === "US" || country === "CA") && digits.startsWith("1")) {
    cleanDigits = digits.slice(1);
  }
  
  // Limit to reasonable length
  const maxLength = country === "UK" ? 13 : 10;
  cleanDigits = cleanDigits.slice(0, maxLength);
  
  return config.format(cleanDigits);
}

/**
 * Validate phone number
 */
export function isValidPhoneNumber(input: string, country: CountryCode): boolean {
  const digits = extractDigits(input);
  const config = COUNTRY_CONFIGS[country];
  
  return config.pattern.test(digits);
}

/**
 * Get validation error message
 */
export function getPhoneValidationError(input: string, country: CountryCode): string | null {
  if (!input.trim()) {
    return "Phone number is required";
  }
  
  const digits = extractDigits(input);
  
  if (digits.length === 0) {
    return "Please enter a valid phone number";
  }
  
  const config = COUNTRY_CONFIGS[country];
  
  if (!isValidPhoneNumber(input, country)) {
    return `Invalid ${country} phone number. ${config.description}`;
  }
  
  return null;
}
