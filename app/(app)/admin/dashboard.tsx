import { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { SHOP_ID } from "../../../lib/config";
import { colors, fonts, spacing, borderRadius } from "../../../lib/theme";
import type { Appointment } from "../../../lib/types";

export default function DashboardScreen() {
  const [todayApts, setTodayApts] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({ booked: 0, completed: 0, cancelled: 0, noShow: 0 });

  useEffect(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const q = query(
      collection(db, "appointments"),
      where("shop_id", "==", SHOP_ID),
      where("start_time", ">=", Timestamp.fromDate(startOfDay)),
      where("start_time", "<", Timestamp.fromDate(endOfDay)),
      orderBy("start_time", "asc")
    );

    return onSnapshot(q, (snap) => {
      const apts = snap.docs.map((d) => ({ ...d.data(), apt_id: d.id } as Appointment));
      setTodayApts(apts);

      const s = { booked: 0, completed: 0, cancelled: 0, noShow: 0 };
      apts.forEach((a) => {
        if (a.status === "booked") s.booked++;
        else if (a.status === "completed") s.completed++;
        else if (a.status === "cancelled") s.cancelled++;
        else if (a.status === "no_show") s.noShow++;
      });
      setStats(s);
    });
  }, []);

  const formatTime = (ts: Timestamp) =>
    ts.toDate().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.booked}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.success }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.error }]}>{stats.cancelled + stats.noShow}</Text>
          <Text style={styles.statLabel}>Cancelled</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Today's Schedule</Text>

      <FlatList
        data={todayApts.filter((a) => a.status === "booked")}
        keyExtractor={(item) => item.apt_id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No appointments scheduled for today.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.aptCard}>
            <View style={styles.aptTime}>
              <Text style={styles.aptTimeText}>{formatTime(item.start_time)}</Text>
            </View>
            <View style={styles.aptInfo}>
              <Text style={styles.aptSource}>{item.source.toUpperCase()}</Text>
              <Text style={styles.aptServices}>
                {item.service_ids.length} service{item.service_ids.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, alignItems: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  statNumber: { fontSize: fonts.sizes["2xl"], fontWeight: fonts.weights.bold, color: colors.text },
  statLabel: { fontSize: fonts.sizes.xs, color: colors.textMuted, marginTop: spacing.xs },
  sectionTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.semibold, color: colors.text, marginBottom: spacing.md },
  list: { paddingBottom: spacing.xl },
  empty: { color: colors.textMuted, fontSize: fonts.sizes.base, textAlign: "center", marginTop: spacing.lg },
  aptCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  aptTime: { marginRight: spacing.lg },
  aptTimeText: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold, color: colors.text },
  aptInfo: { flex: 1 },
  aptSource: { fontSize: fonts.sizes.xs, color: colors.textMuted, fontWeight: fonts.weights.medium, letterSpacing: 0.5 },
  aptServices: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
});
