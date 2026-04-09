import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, signOut } from "../../lib/firebase";
import { useAuth } from "../../lib/hooks/useAuth";
import { colors, fonts, spacing, borderRadius } from "../../lib/theme";

export default function SettingsScreen() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDisplayName(data.display_name || "");
        setPhone(data.phone || "");
      }
    });
  }, [user?.uid]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        display_name: displayName.trim(),
      });
      Alert.alert("Saved", "Profile updated.");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Profile</Text>

      <Text style={styles.label}>Display Name</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Your name"
      />

      <Text style={styles.label}>Email</Text>
      <View style={styles.readOnlyField}>
        <Text style={styles.readOnlyText}>{user?.email || "—"}</Text>
      </View>

      <Text style={styles.label}>Phone</Text>
      <View style={styles.readOnlyField}>
        <Text style={styles.readOnlyText}>{phone || "Not verified"}</Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.disabled]}
        onPress={handleSaveProfile}
        disabled={saving}
      >
        <Text style={styles.saveText}>{saving ? "Saving..." : "Save Profile"}</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <Text style={styles.heading}>Payment Methods</Text>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Payment methods coming soon.</Text>
      </View>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing["3xl"] },
  heading: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold, color: colors.text, marginBottom: spacing.md, marginTop: spacing.sm },
  label: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: fonts.sizes.base, color: colors.text,
  },
  readOnlyField: {
    backgroundColor: colors.borderLight, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  readOnlyText: { fontSize: fonts.sizes.base, color: colors.textMuted },
  saveButton: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: 14, alignItems: "center", marginTop: spacing.lg },
  disabled: { opacity: 0.6 },
  saveText: { color: colors.white, fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xl },
  placeholder: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.xl, alignItems: "center",
    borderWidth: 1, borderColor: colors.border, borderStyle: "dashed",
  },
  placeholderText: { color: colors.textMuted, fontSize: fonts.sizes.sm },
  signOutButton: { backgroundColor: colors.error, borderRadius: borderRadius.md, paddingVertical: 14, alignItems: "center" },
  signOutText: { color: colors.white, fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold },
});
