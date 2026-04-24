import { https } from "firebase-functions/v2";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import twilio from "twilio";

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SERVICE_SID,
} = process.env;

function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new https.HttpsError(
      "failed-precondition",
      "Twilio credentials not configured."
    );
  }
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return trimmed;
  // Default to US if no country code — caller can pass full E.164 for other countries.
  return `+1${trimmed.replace(/\D/g, "")}`;
}

/**
 * Sends an OTP code via Twilio Verify to the given phone number.
 */
export const sendPhoneOtp = https.onCall(async (request) => {
  const phoneRaw = request.data?.phone as string | undefined;
  if (!phoneRaw) {
    throw new https.HttpsError("invalid-argument", "phone is required");
  }
  if (!TWILIO_VERIFY_SERVICE_SID) {
    throw new https.HttpsError(
      "failed-precondition",
      "Twilio Verify service SID not configured."
    );
  }

  const phone = normalizePhone(phoneRaw);
  const client = getTwilioClient();

  try {
    const verification = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: "sms" });

    return { status: verification.status, phone };
  } catch (err: any) {
    throw new https.HttpsError(
      "internal",
      err?.message || "Failed to send verification code"
    );
  }
});

/**
 * Verifies the OTP code with Twilio.
 *
 * Two modes:
 *  - If the caller is already authenticated (request.auth set), links the
 *    phone to their existing account — updates users/{uid}.phone and the
 *    Firebase Auth phoneNumber. Returns { linked: true, uid }.
 *  - Otherwise, signs the user in: finds or creates a Firebase Auth user
 *    keyed by phone number and returns a custom token. Returns
 *    { customToken, uid }.
 */
export const verifyPhoneOtp = https.onCall(async (request) => {
  const phoneRaw = request.data?.phone as string | undefined;
  const code = request.data?.code as string | undefined;

  if (!phoneRaw || !code) {
    throw new https.HttpsError(
      "invalid-argument",
      "phone and code are required"
    );
  }
  if (!TWILIO_VERIFY_SERVICE_SID) {
    throw new https.HttpsError(
      "failed-precondition",
      "Twilio Verify service SID not configured."
    );
  }

  const phone = normalizePhone(phoneRaw);
  const client = getTwilioClient();

  let approved = false;
  try {
    const check = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code });
    approved = check.status === "approved";
  } catch (err: any) {
    throw new https.HttpsError(
      "internal",
      err?.message || "Verification check failed"
    );
  }

  if (!approved) {
    throw new https.HttpsError("invalid-argument", "Invalid or expired code");
  }

  const auth = getAuth();
  const db = getFirestore();
  const callerUid = request.auth?.uid;

  // Mode A: caller is already signed in — link phone to their account.
  if (callerUid) {
    try {
      await auth.updateUser(callerUid, { phoneNumber: phone });
    } catch (err: any) {
      // If another account already owns this phone, Firebase Auth throws.
      if (err?.code === "auth/phone-number-already-exists") {
        throw new https.HttpsError(
          "already-exists",
          "This phone number is already linked to another account."
        );
      }
      throw new https.HttpsError(
        "internal",
        err?.message || "Failed to link phone"
      );
    }
    await db
      .collection("users")
      .doc(callerUid)
      .set({ phone }, { merge: true });
    return { linked: true, uid: callerUid, phone };
  }

  // Mode B: no caller — find or create a user by phone, return custom token.
  let uid: string;
  try {
    const existing = await auth.getUserByPhoneNumber(phone);
    uid = existing.uid;
  } catch (err: any) {
    if (err?.code !== "auth/user-not-found") {
      throw new https.HttpsError(
        "internal",
        err?.message || "Lookup failed"
      );
    }
    const created = await auth.createUser({ phoneNumber: phone });
    uid = created.uid;
  }

  const customToken = await auth.createCustomToken(uid);
  return { customToken, uid, phone };
});
