import { https } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

export const createShop = https.onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new https.HttpsError("unauthenticated", "Must be signed in.");
  }

  // Verify user is super_admin without a shop
  const userRef = db.collection("users").doc(uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new https.HttpsError("not-found", "User doc not found.");
  }

  const userData = userDoc.data()!;
  if (userData.role !== "super_admin") {
    throw new https.HttpsError("permission-denied", "Only super admins can create shops.");
  }
  if (userData.shop_id) {
    throw new https.HttpsError("already-exists", "You already have a shop.");
  }

  const { name, address, phone, timezone, operating_hours } = request.data;

  if (!name || !address || !phone || !timezone || !operating_hours) {
    throw new https.HttpsError("invalid-argument", "Missing required fields.");
  }

  // Create shop and link to user atomically
  const shopRef = db.collection("shops").doc();
  const batch = db.batch();

  batch.set(shopRef, {
    shop_id: shopRef.id,
    owner_id: uid,
    name,
    address,
    phone,
    ai_enabled: false,
    timezone,
    operating_hours,
    cancellation_cutoff_hours: 2,
    created_at: FieldValue.serverTimestamp(),
  });

  batch.update(userRef, { shop_id: shopRef.id });

  await batch.commit();

  return { shop_id: shopRef.id };
});
