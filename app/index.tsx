import { Redirect } from "expo-router";
import { useAuth } from "../lib/hooks/useAuth";
import { ActivityIndicator, View } from "react-native";
import { colors } from "../lib/theme";

export default function Index() {
  const { user, role, shopId, loading } = useAuth();

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

  // Super admin without a shop needs to create one
  if (role === "super_admin" && !shopId) {
    return <Redirect href="/(onboarding)/create-shop" />;
  }

  return <Redirect href="/(app)/home" />;
}
