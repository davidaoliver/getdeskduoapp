import { https } from "firebase-functions/v2";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

interface BookRequest {
  shop_id: string;
  barber_id: string;
  service_ids: string[];
  start_time: string; // ISO string
  source?: "app" | "web" | "ai" | "walk_in";
  client_name?: string; // for walk-ins
  client_phone?: string; // for walk-ins
}

export const bookAppointment = https.onCall(async (request) => {
  const uid = request.auth?.uid;
  const data = request.data as BookRequest;

  if (!data.shop_id || !data.barber_id || !data.service_ids?.length || !data.start_time) {
    throw new https.HttpsError("invalid-argument", "shop_id, barber_id, service_ids, and start_time are required.");
  }

  // Walk-ins from admin don't need auth client_id
  const source = data.source || "app";
  const clientId = uid || "";

  if (!uid && source !== "walk_in") {
    throw new https.HttpsError("unauthenticated", "Must be signed in to book.");
  }

  // Calculate total duration server-side (never trust client)
  const serviceDocs = await Promise.all(
    data.service_ids.map((id) => db.collection("services").doc(id).get())
  );
  let totalDuration = 0;
  let maxBuffer = 0;
  for (const sDoc of serviceDocs) {
    if (!sDoc.exists) {
      throw new https.HttpsError("not-found", `Service ${sDoc.id} not found.`);
    }
    const sData = sDoc.data()!;
    if (sData.shop_id !== data.shop_id) {
      throw new https.HttpsError("invalid-argument", "Service does not belong to this shop.");
    }
    totalDuration += sData.duration_minutes || 0;
    maxBuffer = Math.max(maxBuffer, sData.buffer_minutes || 0);
  }

  const startTime = new Date(data.start_time);
  const endTime = new Date(startTime.getTime() + totalDuration * 60 * 1000);
  const endWithBuffer = new Date(startTime.getTime() + (totalDuration + maxBuffer) * 60 * 1000);

  // Use a Firestore transaction to prevent double-booking
  const aptRef = db.collection("appointments").doc();

  await db.runTransaction(async (tx) => {
    // Check for overlapping appointments (not cancelled)
    const dayStart = new Date(startTime);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const existingSnap = await tx.get(
      db.collection("appointments")
        .where("barber_id", "==", data.barber_id)
        .where("start_time", ">=", Timestamp.fromDate(dayStart))
        .where("start_time", "<", Timestamp.fromDate(dayEnd))
    );

    const conflicts = existingSnap.docs.filter((d) => {
      const apt = d.data();
      if (apt.status === "cancelled") return false;
      const aptStart = apt.start_time.toDate().getTime();
      const aptEnd = apt.end_time.toDate().getTime();
      // Check if our slot (with buffer) overlaps
      return startTime.getTime() < aptEnd && endWithBuffer.getTime() > aptStart;
    });

    if (conflicts.length > 0) {
      throw new https.HttpsError("already-exists", "This time slot is no longer available.");
    }

    // Check for overlapping time-off blocks
    const toffSnap = await tx.get(
      db.collection("timeOffBlocks")
        .where("barber_id", "==", data.barber_id)
        .where("start_time", "<", Timestamp.fromDate(endWithBuffer))
        .where("end_time", ">", Timestamp.fromDate(startTime))
    );

    if (!toffSnap.empty) {
      throw new https.HttpsError("already-exists", "Barber is unavailable during this time.");
    }

    // All clear — create the appointment
    const aptData: Record<string, any> = {
      apt_id: aptRef.id,
      shop_id: data.shop_id,
      barber_id: data.barber_id,
      client_id: clientId,
      service_ids: data.service_ids,
      start_time: Timestamp.fromDate(startTime),
      end_time: Timestamp.fromDate(endTime),
      status: "booked",
      source,
      created_at: FieldValue.serverTimestamp(),
    };

    if (data.client_name) aptData.client_name = data.client_name;
    if (data.client_phone) aptData.client_phone = data.client_phone;

    tx.set(aptRef, aptData);
  });

  return { apt_id: aptRef.id };
});
