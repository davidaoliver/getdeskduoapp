import { View, Text, StyleSheet } from "react-native";
import { useAuth } from "../../lib/hooks/useAuth";

export default function ClientHome() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        Hey{user?.displayName ? `, ${user.displayName}` : ""}!
      </Text>
      <Text style={styles.subtitle}>Find a shop and book your next appointment.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
  },
});
