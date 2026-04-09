import { https } from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

export const cancelAppointment = https.onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new https.HttpsError("unauthenticated", "Must be signed in.");
  }

  const { apt_id } = request.data;
  if (!apt_id) {
    throw new https.HttpsError("invalid-argument", "apt_id is required.");
  }

  const aptRef = db.collection("appointments").doc(apt_id);
  const aptDoc = await aptRef.get();

  if (!aptDoc.exists) {
    throw new https.HttpsError("not-found", "Appointment not found.");
  }

  const apt = aptDoc.data()!;

  if (apt.status !== "booked") {
    throw new https.HttpsError("failed-precondition", "Only booked appointments can be cancelled.");
  }

  // Check if user is the client or an admin of the shop
  const userDoc = await db.collection("users").doc(uid).get();
  const userData = userDoc.data();
  const isClient = apt.client_id === uid;
  const isAdmin = userData &&
    (userData.role === "admin" || userData.role === "super_admin") &&
    userData.shop_id === apt.shop_id;

  if (!isClient && !isAdmin) {
    throw new https.HttpsError("permission-denied", "You cannot cancel this appointment.");
  }

  // If client is cancelling, enforce cutoff
  if (isClient && !isAdmin) {
    const shopDoc = await db.collection("shops").doc(apt.shop_id).get();
    const cutoffHours = shopDoc.data()?.cancellation_cutoff_hours ?? 2;
    const cutoffMs = cutoffHours * 60 * 60 * 1000;
    const aptStart = apt.start_time.toDate().getTime();
    const now = Date.now();

    if (aptStart - now < cutoffMs) {
      throw new https.HttpsError(
        "failed-precondition",
        `Cancellations must be made at least ${cutoffHours} hours before the appointment.`
      );
    }
  }

  await aptRef.update({
    status: "cancelled",
    cancelled_at: FieldValue.serverTimestamp(),
    cancelled_by: uid,
  });

  return { success: true };
});
