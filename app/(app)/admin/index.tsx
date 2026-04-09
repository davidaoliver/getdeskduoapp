import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../../lib/hooks/useAuth";
import { colors, fonts, spacing, borderRadius } from "../../../lib/theme";

const ADMIN_ITEMS = [
  { title: "Dashboard", sub: "Today's appointments & stats", route: "/(app)/admin/dashboard", icon: "📊" },
  { title: "Services", sub: "Manage services & pricing", route: "/(app)/admin/services", icon: "✂️" },
  { title: "Staff", sub: "Invite & manage barbers", route: "/(app)/admin/staff", icon: "👥" },
  { title: "Schedule", sub: "Set barber availability", route: "/(app)/admin/schedule", icon: "🕐" },
  { title: "Shop Settings", sub: "Name, address, hours", route: "/(app)/admin/shop-settings", icon: "🏪" },
];

export default function AdminHub() {
  const { role } = useAuth();
  const isSuperAdmin = role === "super_admin";

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Admin</Text>
      {ADMIN_ITEMS.map((item) => (
        <TouchableOpacity
          key={item.route}
          style={styles.card}
          onPress={() => router.push(item.route as any)}
        >
          <Text style={styles.icon}>{item.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSub}>{item.sub}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  heading: { fontSize: fonts.sizes["3xl"], fontWeight: fonts.weights.bold, color: colors.text, marginBottom: spacing.lg },
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  icon: { fontSize: 24, marginRight: spacing.md },
  cardTitle: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold, color: colors.text },
  cardSub: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  arrow: { fontSize: 24, color: colors.textMuted },
});
