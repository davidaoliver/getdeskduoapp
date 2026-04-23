import { identity } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
// App initialized in index.ts
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
    no_show_count: 0,
    created_at: FieldValue.serverTimestamp(),
  };

  if (shopId) {
    userData.shop_id = shopId;
    // When a shop was provisioned externally (e.g. from the web CRM), the
    // shop doc has owner_id = null. Fill it in now that we know the uid.
    if (role === "super_admin") {
      try {
        await db.collection("shops").doc(shopId).update({ owner_id: uid });
      } catch {
        // Shop doc may not exist yet or already have an owner; ignore.
      }
    }
  }

  await db.collection("users").doc(uid).set(userData);
});
