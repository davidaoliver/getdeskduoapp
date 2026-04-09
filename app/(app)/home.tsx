import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/hooks/useAuth";
import { SHOP_ID } from "../../lib/config";
import { colors, fonts, spacing, borderRadius } from "../../lib/theme";
import type { Appointment, Shop, DayHours } from "../../lib/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function HomeScreen() {
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    getDoc(doc(db, "shops", SHOP_ID)).then((snap) => {
      if (snap.exists()) setShop(snap.data() as Shop);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "appointments"),
      where("client_id", "==", user.uid),
      where("shop_id", "==", SHOP_ID),
      orderBy("start_time", "desc")
    );
    return onSnapshot(q, (snap) => {
      setAppointments(snap.docs.map((d) => ({ ...d.data(), apt_id: d.id } as Appointment)));
    });
  }, [user?.uid]);

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => a.status === "booked" && a.start_time.toDate() > now
  );
  const past = appointments.filter(
    (a) => a.status !== "booked" || a.start_time.toDate() <= now
  );

  const formatDate = (ts: Timestamp) =>
    ts.toDate().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  const formatTime = (ts: Timestamp) =>
    ts.toDate().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const statusColor = (status: string) => {
    switch (status) {
      case "booked": return colors.primary;
      case "completed": return colors.success;
      case "cancelled": return colors.textMuted;
      case "no_show": return colors.error;
      default: return colors.textMuted;
    }
  };

  const todayHours = shop?.operating_hours?.[now.getDay()] as DayHours | undefined;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.scroll}
      data={[]}
      renderItem={null}
      ListHeaderComponent={
        <>
          {/* Shop Info Card */}
          {shop && (
            <View style={styles.shopCard}>
              <Text style={styles.shopName}>{shop.name}</Text>
              <Text style={styles.shopDetail}>{shop.address}</Text>
              <Text style={styles.shopDetail}>{shop.phone}</Text>
              <View style={styles.hoursRow}>
                <Text style={styles.hoursLabel}>
                  {todayHours?.closed
                    ? "Closed today"
                    : `Open today: ${todayHours?.open || "?"} - ${todayHours?.close || "?"}`}
                </Text>
              </View>
            </View>
          )}

          {/* Next Appointment */}
          {upcoming.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Next Appointment</Text>
              <View style={styles.nextCard}>
                <Text style={styles.nextDate}>{formatDate(upcoming[0].start_time)}</Text>
                <Text style={styles.nextTime}>{formatTime(upcoming[0].start_time)}</Text>
                <Text style={styles.nextServices}>
                  {upcoming[0].service_ids.length} service{upcoming[0].service_ids.length !== 1 ? "s" : ""}
                </Text>
              </View>
            </>
          )}

          {upcoming.length === 0 && (
            <TouchableOpacity style={styles.bookCta} onPress={() => router.push("/(app)/book")}>
              <Text style={styles.bookCtaTitle}>No upcoming appointments</Text>
              <Text style={styles.bookCtaSub}>Tap to book your next visit</Text>
            </TouchableOpacity>
          )}

          {/* Upcoming (if more than 1) */}
          {upcoming.length > 1 && (
            <>
              <Text style={styles.sectionTitle}>Upcoming</Text>
              {upcoming.slice(1).map((apt) => (
                <View key={apt.apt_id} style={styles.aptCard}>
                  <View>
                    <Text style={styles.aptDate}>{formatDate(apt.start_time)}</Text>
                    <Text style={styles.aptTime}>{formatTime(apt.start_time)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(apt.status) + "20" }]}>
                    <Text style={[styles.statusText, { color: statusColor(apt.status) }]}>
                      {apt.status}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* History */}
          {past.length > 0 && (
            <Text style={styles.sectionTitle}>History</Text>
          )}
        </>
      }
      ListFooterComponent={
        <View>
          {past.map((apt) => (
            <View key={apt.apt_id} style={styles.aptCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.aptDate}>{formatDate(apt.start_time)}</Text>
                <Text style={styles.aptTime}>{formatTime(apt.start_time)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(apt.status) + "20" }]}>
                  <Text style={[styles.statusText, { color: statusColor(apt.status) }]}>
                    {apt.status.replace("_", " ")}
                  </Text>
                </View>
                {apt.status === "completed" && (
                  <TouchableOpacity
                    style={styles.rebookBtn}
                    onPress={() => router.push("/(app)/book")}
                  >
                    <Text style={styles.rebookText}>Book Again</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing["3xl"] },
  shopCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  shopName: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold, color: colors.text, marginBottom: spacing.xs },
  shopDetail: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  hoursRow: { marginTop: spacing.sm },
  hoursLabel: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium, color: colors.primary },
  sectionTitle: {
    fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, color: colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.lg,
  },
  nextCard: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    padding: spacing.xl,
  },
  nextDate: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, color: colors.white },
  nextTime: { fontSize: fonts.sizes["2xl"], fontWeight: fonts.weights.extrabold, color: colors.white, marginTop: spacing.xs },
  nextServices: { fontSize: fonts.sizes.sm, color: "rgba(255,255,255,0.8)", marginTop: spacing.sm },
  bookCta: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.xl, alignItems: "center",
    borderWidth: 2, borderColor: colors.primary, borderStyle: "dashed",
    marginTop: spacing.lg,
  },
  bookCtaTitle: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold, color: colors.text },
  bookCtaSub: { fontSize: fonts.sizes.sm, color: colors.primary, marginTop: spacing.xs },
  aptCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  aptDate: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold, color: colors.text },
  aptTime: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  statusText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.medium, textTransform: "capitalize" },
  rebookBtn: { marginTop: spacing.sm },
  rebookText: { fontSize: fonts.sizes.xs, color: colors.primary, fontWeight: fonts.weights.semibold },
});
