export type InterestedPatient = {
  id: number;
  patientId: string;
  nctId: string;
  trialTitle?: string;
  expressedAt: string;
  email?: string;
  age?: string;
  gender?: string;
  primaryCondition?: string;
  phone?: string;
};

/**
 * Express patient interest in a clinical trial
 */
// Local storage fallback for when functions aren't available
const INTERESTS_CACHE_KEY = "trial_interests_local_v1";

function getLocalInterests(): Record<string, string[]> {
  try {
    const data = localStorage.getItem(INTERESTS_CACHE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveLocalInterests(interests: Record<string, string[]>) {
  try {
    localStorage.setItem(INTERESTS_CACHE_KEY, JSON.stringify(interests));
  } catch {
    console.warn("Failed to save interests to localStorage");
  }
}

export async function expressInterestInTrial(
  nctId: string,
  trialTitle: string,
  patientId: string,
  userId: string
): Promise<{ ok: boolean; alreadyInterested?: boolean; message: string }> {
  try {
    console.log("[ExpressInterest] Starting request", { nctId, patientId, userId });

    const response = await fetch("/.netlify/functions/express-interest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
        "x-patient-id": patientId,
      },
      body: JSON.stringify({
        nctId,
        trialTitle,
      }),
    });

    console.log("[ExpressInterest] Response received", {
      status: response.status,
      contentType: response.headers.get("content-type"),
    });

    const text = await response.text();

    // Check if we got HTML instead of JSON (404 page)
    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      console.warn("[ExpressInterest] Got HTML response - functions not available");
      throw new Error("Functions not deployed");
    }

    let data: any = { ok: false };

    if (text) {
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error("[ExpressInterest] Failed to parse JSON:", parseErr);
        throw new Error(`Invalid JSON response`);
      }
    }

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status} error`);
    }

    return {
      ok: true,
      alreadyInterested: data.alreadyInterested || false,
      message: data.message || "Interest expressed successfully",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to express interest";
    console.warn("[ExpressInterest] Using localStorage fallback");

    // Fallback to localStorage when function is unavailable (e.g., in dev without netlify dev)
    try {
      const interests = getLocalInterests();
      const patientInterests = interests[patientId] || [];

      if (patientInterests.includes(nctId.toUpperCase())) {
        return {
          ok: true,
          alreadyInterested: true,
          message: "Interest already expressed (local)",
        };
      }

      patientInterests.push(nctId.toUpperCase());
      interests[patientId] = patientInterests;
      saveLocalInterests(interests);

      return {
        ok: true,
        alreadyInterested: false,
        message: "Interest expressed successfully (local)",
      };
    } catch (fallbackErr) {
      console.error("[ExpressInterest] Fallback failed:", fallbackErr);
      return {
        ok: false,
        message: "Could not express interest",
      };
    }
  }
}

/**
 * Get list of interested patients for a trial
 */
export async function getTrialInterestedPatients(
  nctId: string,
  userId: string
): Promise<{ ok: boolean; patients: InterestedPatient[]; count: number; message: string }> {
  try {
    const response = await fetch(
      `/.netlify/functions/get-trial-interests?nctId=${encodeURIComponent(nctId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
      }
    );

    const text = await response.text();
    let data: any = { ok: false, interestedPatients: [] };

    if (text) {
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error("Failed to parse response JSON:", parseErr);
        throw new Error("Invalid response from server");
      }
    }

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: Failed to fetch interested patients`);
    }

    return {
      ok: true,
      patients: data.interestedPatients || [],
      count: data.count || 0,
      message: data.message || "Success",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch interested patients";
    console.error("[GetInterests] Error:", message, "- using localStorage fallback");

    // Fallback to localStorage
    try {
      const interests = getLocalInterests();
      const nctIdUpper = nctId.toUpperCase();

      // Convert local interests to patient objects
      const patients: InterestedPatient[] = [];
      for (const [patientId, nctIds] of Object.entries(interests)) {
        if (nctIds.includes(nctIdUpper)) {
          patients.push({
            id: Math.random(),
            patientId,
            nctId: nctIdUpper,
            expressedAt: new Date().toISOString(),
          });
        }
      }

      return {
        ok: true,
        patients,
        count: patients.length,
        message: "Success (offline mode)",
      };
    } catch (fallbackErr) {
      console.error("[GetInterests] Fallback failed:", fallbackErr);
      return {
        ok: false,
        patients: [],
        count: 0,
        message: "Could not fetch interested patients",
      };
    }
  }
}
