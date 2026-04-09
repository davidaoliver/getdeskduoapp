import { https } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

interface SlotRequest {
  shop_id: string;
  barber_id: string | "any";
  service_ids: string[];
  date: string; // "YYYY-MM-DD"
}

interface TimeSlot {
  barber_id: string;
  barber_name: string;
  start_time: string; // ISO string
  end_time: string;
}

export const checkAvailability = https.onCall(async (request) => {
  const { shop_id, barber_id, service_ids, date } = request.data as SlotRequest;

  if (!shop_id || !service_ids?.length || !date) {
    throw new https.HttpsError("invalid-argument", "shop_id, service_ids, and date are required.");
  }

  // Get shop for timezone and operating hours
  const shopDoc = await db.collection("shops").doc(shop_id).get();
  if (!shopDoc.exists) {
    throw new https.HttpsError("not-found", "Shop not found.");
  }
  const shop = shopDoc.data()!;

  // Calculate total duration from selected services
  const serviceDocs = await Promise.all(
    service_ids.map((id) => db.collection("services").doc(id).get())
  );
  let totalDuration = 0;
  let maxBuffer = 0;
  for (const sDoc of serviceDocs) {
    if (!sDoc.exists) {
      throw new https.HttpsError("not-found", `Service ${sDoc.id} not found.`);
    }
    const sData = sDoc.data()!;
    totalDuration += sData.duration_minutes || 0;
    maxBuffer = Math.max(maxBuffer, sData.buffer_minutes || 0);
  }
  const totalWithBuffer = totalDuration + maxBuffer;

  // Parse the requested date
  const requestedDate = new Date(date + "T00:00:00");
  const dayOfWeek = requestedDate.getDay(); // 0 = Sunday

  // Check shop operating hours for this day
  const dayHours = shop.operating_hours?.[dayOfWeek];
  if (!dayHours || dayHours.closed) {
    return { slots: [], message: "Shop is closed on this day." };
  }

  // Determine which barbers to check
  let barberIds: string[] = [];
  let barberNames: Record<string, string> = {};

  if (barber_id === "any") {
    const barbersSnap = await db.collection("barbers")
      .where("shop_id", "==", shop_id)
      .where("active", "==", true)
      .get();
    barbersSnap.docs.forEach((d) => {
      // Check if barber offers all requested services
      const data = d.data();
      const offersAll = service_ids.every((sid) => data.services_offered?.includes(sid));
      if (offersAll || !data.services_offered?.length) {
        barberIds.push(d.id);
        barberNames[d.id] = data.display_name || "Barber";
      }
    });
  } else {
    barberIds = [barber_id];
    const bDoc = await db.collection("barbers").doc(barber_id).get();
    if (bDoc.exists) {
      barberNames[barber_id] = bDoc.data()!.display_name || "Barber";
    }
  }

  if (barberIds.length === 0) {
    return { slots: [], message: "No barbers available for these services." };
  }

  // For each barber, find available slots
  const allSlots: TimeSlot[] = [];

  for (const bid of barberIds) {
    // Get barber's availability for this day of week
    const availSnap = await db.collection("availability")
      .where("barber_id", "==", bid)
      .where("day_of_week", "==", dayOfWeek)
      .get();

    if (availSnap.empty) continue;

    const avail = availSnap.docs[0].data();
    const availStart = parseTime(date, avail.start_time);
    const availEnd = parseTime(date, avail.end_time);

    // Clamp to shop hours
    const shopOpen = parseTime(date, dayHours.open);
    const shopClose = parseTime(date, dayHours.close);
    const windowStart = Math.max(availStart, shopOpen);
    const windowEnd = Math.min(availEnd, shopClose);

    if (windowStart >= windowEnd) continue;

    // Get existing appointments for this barber on this date
    const dayStart = new Date(date + "T00:00:00");
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const aptsSnap = await db.collection("appointments")
      .where("barber_id", "==", bid)
      .where("start_time", ">=", dayStart)
      .where("start_time", "<", dayEnd)
      .get();

    const bookedSlots = aptsSnap.docs
      .filter((d) => d.data().status !== "cancelled")
      .map((d) => ({
        start: d.data().start_time.toDate().getTime(),
        end: d.data().end_time.toDate().getTime(),
      }));

    // Get time-off blocks for this date
    const toffSnap = await db.collection("timeOffBlocks")
      .where("barber_id", "==", bid)
      .where("start_time", "<", dayEnd)
      .where("end_time", ">", dayStart)
      .get();

    const blockedSlots = toffSnap.docs.map((d) => ({
      start: d.data().start_time.toDate().getTime(),
      end: d.data().end_time.toDate().getTime(),
    }));

    const allBlocked = [...bookedSlots, ...blockedSlots];

    // Generate slots every 15 minutes
    const slotInterval = 15 * 60 * 1000; // 15 min
    const durationMs = totalWithBuffer * 60 * 1000;

    let cursor = windowStart;
    while (cursor + durationMs <= windowEnd) {
      const slotEnd = cursor + durationMs;

      // Check no overlap with any blocked period
      const hasConflict = allBlocked.some(
        (b) => cursor < b.end && slotEnd > b.start
      );

      if (!hasConflict) {
        allSlots.push({
          barber_id: bid,
          barber_name: barberNames[bid] || "Barber",
          start_time: new Date(cursor).toISOString(),
          end_time: new Date(cursor + totalDuration * 60 * 1000).toISOString(),
        });
      }

      cursor += slotInterval;
    }
  }

  // Sort by start time
  allSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

  return { slots: allSlots };
});

function parseTime(dateStr: string, timeStr: string): number {
  return new Date(`${dateStr}T${timeStr}:00`).getTime();
}
