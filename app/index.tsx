import { Redirect } from "expo-router";
import { useAuth } from "../lib/hooks/useAuth";
import { ActivityIndicator, View } from "react-native";
import { colors } from "../lib/theme";

export default function Index() {
  const { user, role, shopId, hasPhone, shopComplete, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Every user verifies their phone before going further (needed for SMS reminders).
  if (!hasPhone) {
    return <Redirect href="/(auth)/verify-phone" />;
  }

  const isOwner = role === "super_admin" || role === "admin";

  if (isOwner && !shopId) {
    return <Redirect href="/(onboarding)/create-shop" />;
  }

  // Shop exists but setup isn't done yet (e.g. provisioned from the web CRM).
  if (isOwner && shopId && shopComplete === false) {
    return <Redirect href="/(onboarding)/complete-shop" />;
  }

  // Still loading the shop doc — keep the spinner up.
  if (isOwner && shopId && shopComplete === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <Redirect href="/(app)/home" />;
}
