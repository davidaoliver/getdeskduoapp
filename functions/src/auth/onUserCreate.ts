import { identity } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";

initializeApp();
const db = getFirestore();

/**
 * Runs on every sign-in. On first sign-in, creates the user doc.
 * If the user's email is in PendingStaff, promotes them to admin.
 */
export const onUserSignIn = identity.beforeUserSignedIn(async (event) => {
  const user = event.data!;
  const uid = user.uid;
  const email = user.email?.toLowerCase();

  const existingDoc = await db.collection("users").doc(uid).get();
  if (existingDoc.exists) {
    return; // User already set up
  }

  let role = "client";
  let shopId: string | null = null;

  if (email) {
    const pendingDoc = await db.collection("pendingStaff").doc(email).get();
    if (pendingDoc.exists) {
      const pendingData = pendingDoc.data()!;
      role = pendingData.role || "admin";
      shopId = pendingData.shop_id || null;
      await pendingDoc.ref.delete();
    }
  }

  const userData: Record<string, any> = {
    uid,
    email: email || "",
    phone: user.phoneNumber ?? "",
    display_name: user.displayName ?? "",
    role,
    created_at: FieldValue.serverTimestamp(),
  };

  if (shopId) {
    userData.shop_id = shopId;
  }

  await db.collection("users").doc(uid).set(userData);
});
