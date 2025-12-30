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
export async function expressInterestInTrial(
  nctId: string,
  trialTitle: string,
  patientId: string,
  userId: string
): Promise<{ ok: boolean; alreadyInterested?: boolean; message: string }> {
  try {
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to express interest");
    }

    return {
      ok: true,
      alreadyInterested: data.alreadyInterested || false,
      message: data.message,
    };
  } catch (error) {
    console.error("Error expressing interest:", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to express interest",
    };
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch interested patients");
    }

    return {
      ok: true,
      patients: data.interestedPatients || [],
      count: data.count || 0,
      message: data.message || "Success",
    };
  } catch (error) {
    console.error("Error fetching trial interests:", error);
    return {
      ok: false,
      patients: [],
      count: 0,
      message: error instanceof Error ? error.message : "Failed to fetch interested patients",
    };
  }
}
