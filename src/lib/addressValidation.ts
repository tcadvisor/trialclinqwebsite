/**
 * Address Validation Utilities
 *
 * Provides validation for addresses, ZIP codes, and postal codes
 * for US, Canada, and UK locations.
 */

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  formatted?: string;
  error?: string;
  suggestions?: string[];
}

export interface AddressComponents {
  street?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
}

// ============================================================================
// ZIP/Postal Code Patterns
// ============================================================================

const PATTERNS = {
  // US ZIP: 12345 or 12345-6789
  US_ZIP: /^\d{5}(-\d{4})?$/,
  // US ZIP loose (just 5 digits anywhere)
  US_ZIP_LOOSE: /\b\d{5}\b/,
  // Canadian: A1A 1A1 or A1A1A1
  CANADA_POSTAL: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
  // UK Postcode patterns
  UK_POSTCODE: /^[A-Za-z]{1,2}\d[A-Za-z\d]?[ ]?\d[A-Za-z]{2}$/,
};

// US State abbreviations
const US_STATE_ABBREVS: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  AS: "American Samoa",
  GU: "Guam",
  MP: "Northern Mariana Islands",
  PR: "Puerto Rico",
  VI: "U.S. Virgin Islands",
};

// Canadian province abbreviations
const CA_PROVINCE_ABBREVS: Record<string, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate US ZIP code
 */
export function validateUSZip(zip: string): ValidationResult {
  const cleaned = zip.trim();

  if (!cleaned) {
    return { valid: false, error: "ZIP code is required" };
  }

  if (PATTERNS.US_ZIP.test(cleaned)) {
    // Format as 5-digit or 9-digit
    const formatted = cleaned.length === 9 && !cleaned.includes("-")
      ? `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`
      : cleaned;
    return { valid: true, formatted };
  }

  // Check if it's close to valid
  const digitsOnly = cleaned.replace(/\D/g, "");
  if (digitsOnly.length === 5) {
    return { valid: true, formatted: digitsOnly };
  }
  if (digitsOnly.length === 9) {
    return { valid: true, formatted: `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5)}` };
  }

  if (digitsOnly.length < 5) {
    return { valid: false, error: "ZIP code must be 5 digits" };
  }

  return { valid: false, error: "Invalid ZIP code format. Use 12345 or 12345-6789" };
}

/**
 * Validate Canadian postal code
 */
export function validateCanadianPostal(postal: string): ValidationResult {
  const cleaned = postal.trim().toUpperCase();

  if (!cleaned) {
    return { valid: false, error: "Postal code is required" };
  }

  if (PATTERNS.CANADA_POSTAL.test(cleaned)) {
    // Format as A1A 1A1
    const noSpace = cleaned.replace(/[ -]/g, "");
    const formatted = `${noSpace.slice(0, 3)} ${noSpace.slice(3)}`;
    return { valid: true, formatted };
  }

  return {
    valid: false,
    error: "Invalid postal code format. Use A1A 1A1",
  };
}

/**
 * Validate UK postcode
 */
export function validateUKPostcode(postcode: string): ValidationResult {
  const cleaned = postcode.trim().toUpperCase();

  if (!cleaned) {
    return { valid: false, error: "Postcode is required" };
  }

  if (PATTERNS.UK_POSTCODE.test(cleaned)) {
    // Format with space before last 3 characters
    const noSpace = cleaned.replace(/\s/g, "");
    const formatted = `${noSpace.slice(0, -3)} ${noSpace.slice(-3)}`;
    return { valid: true, formatted };
  }

  return {
    valid: false,
    error: "Invalid postcode format",
  };
}

/**
 * Validate ZIP/postal code based on country
 */
export function validatePostalCode(
  code: string,
  country: "US" | "CA" | "UK" | string = "US"
): ValidationResult {
  const countryUpper = country.toUpperCase();

  switch (countryUpper) {
    case "US":
    case "USA":
    case "UNITED STATES":
      return validateUSZip(code);
    case "CA":
    case "CANADA":
      return validateCanadianPostal(code);
    case "UK":
    case "GB":
    case "UNITED KINGDOM":
      return validateUKPostcode(code);
    default:
      // For other countries, just check it's not empty
      if (!code.trim()) {
        return { valid: false, error: "Postal code is required" };
      }
      return { valid: true, formatted: code.trim() };
  }
}

/**
 * Parse a location string (e.g., "Buffalo, NY" or "10001")
 */
export function parseLocationString(location: string): {
  type: "zip" | "city_state" | "unknown";
  zip?: string;
  city?: string;
  state?: string;
  stateAbbrev?: string;
} {
  const trimmed = location.trim();

  // Check for ZIP code
  if (PATTERNS.US_ZIP.test(trimmed)) {
    return { type: "zip", zip: trimmed };
  }

  // Check for Canadian postal code
  if (PATTERNS.CANADA_POSTAL.test(trimmed)) {
    return { type: "zip", zip: trimmed.toUpperCase() };
  }

  // Check for "City, State" format
  const cityStateMatch = trimmed.match(/^([^,]+),\s*([A-Za-z]{2}|[A-Za-z ]+)$/);
  if (cityStateMatch) {
    const city = cityStateMatch[1].trim();
    const stateInput = cityStateMatch[2].trim().toUpperCase();

    // Check if it's an abbreviation
    if (US_STATE_ABBREVS[stateInput]) {
      return {
        type: "city_state",
        city,
        state: US_STATE_ABBREVS[stateInput],
        stateAbbrev: stateInput,
      };
    }

    // Check if it's a full state name
    const abbrev = Object.entries(US_STATE_ABBREVS).find(
      ([_, name]) => name.toUpperCase() === stateInput
    );
    if (abbrev) {
      return {
        type: "city_state",
        city,
        state: abbrev[1],
        stateAbbrev: abbrev[0],
      };
    }

    // Check Canadian provinces
    if (CA_PROVINCE_ABBREVS[stateInput]) {
      return {
        type: "city_state",
        city,
        state: CA_PROVINCE_ABBREVS[stateInput],
        stateAbbrev: stateInput,
      };
    }

    // Unknown state but still city, state format
    return { type: "city_state", city, state: cityStateMatch[2].trim() };
  }

  // Check for embedded ZIP in string
  const zipMatch = trimmed.match(PATTERNS.US_ZIP_LOOSE);
  if (zipMatch) {
    return { type: "zip", zip: zipMatch[0] };
  }

  return { type: "unknown" };
}

/**
 * Validate a location string (ZIP, city/state, or postal code)
 */
export function validateLocation(location: string): ValidationResult {
  const trimmed = location.trim();

  if (!trimmed) {
    return { valid: false, error: "Location is required" };
  }

  const parsed = parseLocationString(trimmed);

  if (parsed.type === "zip" && parsed.zip) {
    // Validate the ZIP code
    const zipResult = validateUSZip(parsed.zip);
    if (zipResult.valid) {
      return { valid: true, formatted: zipResult.formatted };
    }

    // Try Canadian
    const caResult = validateCanadianPostal(parsed.zip);
    if (caResult.valid) {
      return { valid: true, formatted: caResult.formatted };
    }

    return zipResult; // Return US ZIP error
  }

  if (parsed.type === "city_state") {
    if (parsed.city && parsed.state) {
      return {
        valid: true,
        formatted: `${parsed.city}, ${parsed.stateAbbrev || parsed.state}`,
      };
    }
  }

  // Allow any non-empty value as a fallback (user might enter international address)
  if (trimmed.length >= 2) {
    return { valid: true, formatted: trimmed };
  }

  return {
    valid: false,
    error: "Please enter a valid ZIP code or City, State",
    suggestions: ["12345", "Buffalo, NY", "Los Angeles, CA"],
  };
}

/**
 * Validate a complete address
 */
export function validateAddress(address: AddressComponents, country?: string): ValidationResult {
  const errors: string[] = [];

  // Check ZIP/postal code if provided
  if (address.zipcode) {
    const zipResult = validatePostalCode(address.zipcode, country || address.country || "US");
    if (!zipResult.valid) {
      errors.push(zipResult.error || "Invalid postal code");
    }
  }

  // Check state for US addresses
  if ((country === "US" || address.country === "US" || address.country === "United States") && address.state) {
    const stateUpper = address.state.toUpperCase();
    const isValidState =
      US_STATE_ABBREVS[stateUpper] ||
      Object.values(US_STATE_ABBREVS).some((name) => name.toUpperCase() === stateUpper);
    if (!isValidState) {
      errors.push("Invalid US state");
    }
  }

  if (errors.length > 0) {
    return { valid: false, error: errors.join(". ") };
  }

  return { valid: true };
}

/**
 * Format state name to abbreviation or vice versa
 */
export function formatState(state: string, toAbbrev = true): string {
  const stateUpper = state.trim().toUpperCase();

  if (toAbbrev) {
    // Convert full name to abbreviation
    if (US_STATE_ABBREVS[stateUpper]) {
      return stateUpper; // Already an abbreviation
    }
    const entry = Object.entries(US_STATE_ABBREVS).find(
      ([_, name]) => name.toUpperCase() === stateUpper
    );
    return entry ? entry[0] : state;
  } else {
    // Convert abbreviation to full name
    if (US_STATE_ABBREVS[stateUpper]) {
      return US_STATE_ABBREVS[stateUpper];
    }
    return state;
  }
}

// ============================================================================
// Exports
// ============================================================================

export const StateAbbreviations = US_STATE_ABBREVS;
export const ProvinceAbbreviations = CA_PROVINCE_ABBREVS;
