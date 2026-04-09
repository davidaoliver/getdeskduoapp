import { View, Text, StyleSheet } from "react-native";
import { colors, fonts, spacing } from "../../lib/theme";

export default function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.empty}>No notifications yet.</Text>
      <Text style={styles.sub}>
        You'll see appointment confirmations, reminders, and updates here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  empty: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sub: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
});
