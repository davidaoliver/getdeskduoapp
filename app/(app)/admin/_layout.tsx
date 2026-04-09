import { Stack } from "expo-router";
import { colors, fonts } from "../../../lib/theme";

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontWeight: fonts.weights.bold, color: colors.text },
      }}
    />
  );
}
