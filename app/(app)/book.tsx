import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../lib/firebase";
import { useAuth } from "../../lib/hooks/useAuth";
import { SHOP_ID } from "../../lib/config";
import { colors, fonts, spacing, borderRadius } from "../../lib/theme";
import type { Service, Barber, Shop } from "../../lib/types";

type Step = "barber" | "service" | "date" | "slot" | "confirm";

interface TimeSlot {
  barber_id: string;
  barber_name: string;
  start_time: string;
  end_time: string;
}

function getNextDays(count: number): Date[] {
  const days: Date[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function BookScreen() {
  const { user } = useAuth();

  const [shop, setShop] = useState<Shop | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [step, setStep] = useState<Step>("barber");

  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  const dates = getNextDays(14);

  useEffect(() => {
    getDoc(doc(db, "shops", SHOP_ID)).then((snap) => {
      if (snap.exists()) setShop(snap.data() as Shop);
    });

    const qBarbers = query(collection(db, "barbers"), where("shop_id", "==", SHOP_ID), where("active", "==", true));
    const unsubB = onSnapshot(qBarbers, (snap) => {
      setBarbers(snap.docs.map((d) => ({ ...d.data(), barber_id: d.id } as Barber)));
    });

    const qServices = query(collection(db, "services"), where("shop_id", "==", SHOP_ID), where("active", "==", true));
    const unsubS = onSnapshot(qServices, (snap) => {
      setServices(snap.docs.map((d) => ({ ...d.data(), service_id: d.id } as Service)));
    });

    return () => { unsubB(); unsubS(); };
  }, []);

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const totalDuration = selectedServices.reduce((sum, id) => {
    const svc = services.find((s) => s.service_id === id);
    return sum + (svc?.duration_minutes || 0);
  }, 0);

  const totalPrice = selectedServices.reduce((sum, id) => {
    const svc = services.find((s) => s.service_id === id);
    return sum + (svc?.price || 0);
  }, 0);

  const loadSlots = async (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setLoadingSlots(true);
    setStep("slot");

    try {
      const dateStr = date.toISOString().split("T")[0];
      const checkAvailability = httpsCallable(functions, "checkAvailability");
      const result = await checkAvailability({
        shop_id: SHOP_ID,
        barber_id: selectedBarber,
        service_ids: selectedServices,
        date: dateStr,
      });
      setSlots((result.data as any).slots || []);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load slots.");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBook = async () => {
    if (!selectedSlot) return;
    setBooking(true);
    try {
      const bookAppointment = httpsCallable(functions, "bookAppointment");
      await bookAppointment({
        shop_id: SHOP_ID,
        barber_id: selectedSlot.barber_id,
        service_ids: selectedServices,
        start_time: selectedSlot.start_time,
        source: "app",
      });
      Alert.alert("Booked!", "Your appointment is confirmed. You'll receive a text reminder.", [
        { text: "OK", onPress: () => router.replace("/(app)/home") },
      ]);
    } catch (error: any) {
      Alert.alert("Booking Failed", error.message || "This slot may no longer be available.");
    } finally {
      setBooking(false);
    }
  };

  const resetFlow = () => {
    setStep("barber");
    setSelectedBarber(null);
    setSelectedServices([]);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlots([]);
  };

  if (!shop) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Step 1: Pick barber */}
      {step === "barber" && (
        <>
          <Text style={styles.stepTitle}>Choose a Barber</Text>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => { setSelectedBarber("any"); setStep("service"); }}
          >
            <Text style={styles.optionTitle}>Any Available</Text>
            <Text style={styles.optionSub}>We'll pick the first open barber</Text>
          </TouchableOpacity>
          {barbers.map((b) => (
            <TouchableOpacity
              key={b.barber_id}
              style={styles.optionCard}
              onPress={() => { setSelectedBarber(b.barber_id); setStep("service"); }}
            >
              <Text style={styles.optionTitle}>{b.display_name}</Text>
              {b.bio ? <Text style={styles.optionSub}>{b.bio}</Text> : null}
            </TouchableOpacity>
          ))}
          {barbers.length === 0 && (
            <Text style={styles.empty}>No barbers available yet.</Text>
          )}
        </>
      )}

      {/* Step 2: Pick services */}
      {step === "service" && (
        <>
          <Text style={styles.stepTitle}>Choose Service(s)</Text>
          {services.map((svc) => (
            <TouchableOpacity
              key={svc.service_id}
              style={[styles.optionCard, selectedServices.includes(svc.service_id) && styles.optionSelected]}
              onPress={() => toggleService(svc.service_id)}
            >
              <View style={styles.serviceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{svc.name}</Text>
                  <Text style={styles.optionSub}>{svc.duration_minutes} min</Text>
                </View>
                <Text style={styles.servicePrice}>${svc.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {selectedServices.length > 0 && (
            <TouchableOpacity style={styles.nextButton} onPress={() => setStep("date")}>
              <Text style={styles.nextText}>Continue · {totalDuration} min · ${totalPrice}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => { setStep("barber"); setSelectedServices([]); }}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Step 3: Pick date */}
      {step === "date" && (
        <>
          <Text style={styles.stepTitle}>Pick a Date</Text>
          <View style={styles.dateGrid}>
            {dates.map((d) => {
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <TouchableOpacity key={d.toISOString()} style={styles.dateCard} onPress={() => loadSlots(d)}>
                  <Text style={styles.dateDay}>{isToday ? "Today" : d.toLocaleDateString([], { weekday: "short" })}</Text>
                  <Text style={styles.dateNum}>{d.getDate()}</Text>
                  <Text style={styles.dateMonth}>{d.toLocaleDateString([], { month: "short" })}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity onPress={() => setStep("service")}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Step 4: Pick time slot */}
      {step === "slot" && (
        <>
          <Text style={styles.stepTitle}>
            Available Times — {selectedDate && formatDateShort(selectedDate)}
          </Text>
          {loadingSlots ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : slots.length === 0 ? (
            <Text style={styles.empty}>No available slots on this day. Try another date.</Text>
          ) : (
            <View style={styles.slotGrid}>
              {slots.map((slot, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.slotChip}
                  onPress={() => { setSelectedSlot(slot); setStep("confirm"); }}
                >
                  <Text style={styles.slotTime}>{formatSlotTime(slot.start_time)}</Text>
                  {selectedBarber === "any" && (
                    <Text style={styles.slotBarber}>{slot.barber_name}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity onPress={() => setStep("date")}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Step 5: Confirm */}
      {step === "confirm" && selectedSlot && (
        <>
          <Text style={styles.stepTitle}>Confirm Booking</Text>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmLabel}>Barber</Text>
            <Text style={styles.confirmValue}>{selectedSlot.barber_name}</Text>

            <Text style={styles.confirmLabel}>Date & Time</Text>
            <Text style={styles.confirmValue}>
              {selectedDate && formatDateShort(selectedDate)} at {formatSlotTime(selectedSlot.start_time)}
            </Text>

            <Text style={styles.confirmLabel}>Services</Text>
            {selectedServices.map((id) => {
              const svc = services.find((s) => s.service_id === id);
              return svc ? (
                <Text key={id} style={styles.confirmValue}>{svc.name} — ${svc.price}</Text>
              ) : null;
            })}

            <View style={styles.confirmTotal}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${totalPrice}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.bookButton, booking && styles.bookDisabled]}
            onPress={handleBook}
            disabled={booking}
          >
            <Text style={styles.bookText}>{booking ? "Booking..." : "Confirm Appointment"}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setStep("slot")}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing["3xl"] },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  stepTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.semibold, color: colors.text, marginBottom: spacing.lg },
  optionCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, marginBottom: spacing.sm,
    borderWidth: 2, borderColor: colors.border,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primary + "08" },
  optionTitle: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold, color: colors.text },
  optionSub: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  serviceRow: { flexDirection: "row", alignItems: "center" },
  servicePrice: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold, color: colors.primary },
  nextButton: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: 14, alignItems: "center", marginTop: spacing.md },
  nextText: { color: colors.white, fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold },
  backText: { color: colors.primary, fontSize: fonts.sizes.sm, textAlign: "center", marginTop: spacing.lg },
  empty: { color: colors.textMuted, fontSize: fonts.sizes.base, textAlign: "center", marginTop: spacing.lg },
  dateGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  dateCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, alignItems: "center", width: 72,
    borderWidth: 1, borderColor: colors.border,
  },
  dateDay: { fontSize: fonts.sizes.xs, color: colors.textMuted },
  dateNum: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold, color: colors.text, marginVertical: 2 },
  dateMonth: { fontSize: fonts.sizes.xs, color: colors.textSecondary },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  slotChip: {
    backgroundColor: colors.surface, borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.border, alignItems: "center",
  },
  slotTime: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium, color: colors.text },
  slotBarber: { fontSize: fonts.sizes.xs, color: colors.textMuted, marginTop: 2 },
  confirmCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  confirmLabel: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.medium, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginTop: spacing.md },
  confirmValue: { fontSize: fonts.sizes.base, color: colors.text, marginTop: 2 },
  confirmTotal: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold, color: colors.text },
  totalValue: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold, color: colors.primary },
  bookButton: { backgroundColor: colors.success, borderRadius: borderRadius.md, paddingVertical: 16, alignItems: "center", marginTop: spacing.xl },
  bookDisabled: { opacity: 0.6 },
  bookText: { color: colors.white, fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold },
});
