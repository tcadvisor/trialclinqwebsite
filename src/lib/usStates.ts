export type StateInfo = { name: string; abbr: string };

const STATE_ENTRIES: StateInfo[] = [
  { name: "Alabama", abbr: "AL" },
  { name: "Alaska", abbr: "AK" },
  { name: "Arizona", abbr: "AZ" },
  { name: "Arkansas", abbr: "AR" },
  { name: "California", abbr: "CA" },
  { name: "Colorado", abbr: "CO" },
  { name: "Connecticut", abbr: "CT" },
  { name: "Delaware", abbr: "DE" },
  { name: "Florida", abbr: "FL" },
  { name: "Georgia", abbr: "GA" },
  { name: "Hawaii", abbr: "HI" },
  { name: "Idaho", abbr: "ID" },
  { name: "Illinois", abbr: "IL" },
  { name: "Indiana", abbr: "IN" },
  { name: "Iowa", abbr: "IA" },
  { name: "Kansas", abbr: "KS" },
  { name: "Kentucky", abbr: "KY" },
  { name: "Louisiana", abbr: "LA" },
  { name: "Maine", abbr: "ME" },
  { name: "Maryland", abbr: "MD" },
  { name: "Massachusetts", abbr: "MA" },
  { name: "Michigan", abbr: "MI" },
  { name: "Minnesota", abbr: "MN" },
  { name: "Mississippi", abbr: "MS" },
  { name: "Missouri", abbr: "MO" },
  { name: "Montana", abbr: "MT" },
  { name: "Nebraska", abbr: "NE" },
  { name: "Nevada", abbr: "NV" },
  { name: "New Hampshire", abbr: "NH" },
  { name: "New Jersey", abbr: "NJ" },
  { name: "New Mexico", abbr: "NM" },
  { name: "New York", abbr: "NY" },
  { name: "North Carolina", abbr: "NC" },
  { name: "North Dakota", abbr: "ND" },
  { name: "Ohio", abbr: "OH" },
  { name: "Oklahoma", abbr: "OK" },
  { name: "Oregon", abbr: "OR" },
  { name: "Pennsylvania", abbr: "PA" },
  { name: "Rhode Island", abbr: "RI" },
  { name: "South Carolina", abbr: "SC" },
  { name: "South Dakota", abbr: "SD" },
  { name: "Tennessee", abbr: "TN" },
  { name: "Texas", abbr: "TX" },
  { name: "Utah", abbr: "UT" },
  { name: "Vermont", abbr: "VT" },
  { name: "Virginia", abbr: "VA" },
  { name: "Washington", abbr: "WA" },
  { name: "West Virginia", abbr: "WV" },
  { name: "Wisconsin", abbr: "WI" },
  { name: "Wyoming", abbr: "WY" },
  { name: "District of Columbia", abbr: "DC" },
];

const EXTRA_NAME_TO_ABBR: Record<string, string> = {
  "district of columbia": "DC",
  "washington dc": "DC",
  "washington d.c": "DC",
  "washington d.c.": "DC",
  "washington d c": "DC",
  "d.c.": "DC",
  "d c": "DC",
};

export const STATE_ABBR_TO_NAME: Record<string, string> = STATE_ENTRIES.reduce((acc, { abbr, name }) => {
  acc[abbr] = name;
  return acc;
}, {} as Record<string, string>);

export const STATE_NAME_TO_ABBR: Record<string, string> = STATE_ENTRIES.reduce((acc, { abbr, name }) => {
  acc[name.toLowerCase()] = abbr;
  return acc;
}, {} as Record<string, string>);

Object.entries(EXTRA_NAME_TO_ABBR).forEach(([name, abbr]) => {
  STATE_NAME_TO_ABBR[name.toLowerCase()] = abbr;
});

export const STATE_ABBR_SET = new Set<string>(Object.keys(STATE_ABBR_TO_NAME).map((k) => k.toLowerCase()));
export const STATE_NAME_SET = new Set<string>(Object.keys(STATE_NAME_TO_ABBR));

const normalizeToken = (raw?: string): string => (raw || "").trim().toLowerCase().replace(/\./g, "");

export function normalizeStateToken(raw?: string): StateInfo | null {
  const norm = normalizeToken(raw);
  if (!norm) return null;

  const abbrFromName = STATE_NAME_TO_ABBR[norm];
  if (abbrFromName && STATE_ABBR_TO_NAME[abbrFromName]) {
    return { abbr: abbrFromName, name: STATE_ABBR_TO_NAME[abbrFromName] };
  }

  const abbrCandidate = norm.toUpperCase();
  if (STATE_ABBR_TO_NAME[abbrCandidate]) {
    return { abbr: abbrCandidate, name: STATE_ABBR_TO_NAME[abbrCandidate] };
  }

  return null;
}
