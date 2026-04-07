import { Redirect } from "expo-router";
import { useAuth } from "../lib/hooks/useAuth";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (role === "admin" || role === "super_admin") {
    return <Redirect href="/(admin)/dashboard" />;
  }

  return <Redirect href="/(client)/" />;
}
