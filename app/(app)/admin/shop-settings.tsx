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
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { SHOP_ID } from "../../../lib/config";
import { colors, fonts, spacing, borderRadius } from "../../../lib/theme";
import type { Shop } from "../../../lib/types";

export default function ShopSettingsScreen() {
  const [shop, setShop] = useState<Partial<Shop>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "shops", SHOP_ID)).then((snap) => {
      if (snap.exists()) setShop(snap.data() as Shop);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "shops", SHOP_ID), {
        name: shop.name,
        address: shop.address,
        phone: shop.phone,
        timezone: shop.timezone,
      });
      Alert.alert("Saved", "Shop settings updated.");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Shop Settings</Text>

      <Text style={styles.label}>Shop Name</Text>
      <TextInput
        style={styles.input}
        value={shop.name || ""}
        onChangeText={(v) => setShop({ ...shop, name: v })}
      />

      <Text style={styles.label}>Address</Text>
      <TextInput
        style={styles.input}
        value={shop.address || ""}
        onChangeText={(v) => setShop({ ...shop, address: v })}
      />

      <Text style={styles.label}>Phone</Text>
      <TextInput
        style={styles.input}
        value={shop.phone || ""}
        onChangeText={(v) => setShop({ ...shop, phone: v })}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Timezone</Text>
      <TextInput
        style={styles.input}
        value={shop.timezone || ""}
        onChangeText={(v) => setShop({ ...shop, timezone: v })}
      />

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.disabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveText}>{saving ? "Saving..." : "Save Changes"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing["3xl"] },
  heading: { fontSize: fonts.sizes["3xl"], fontWeight: fonts.weights.bold, color: colors.text, marginBottom: spacing.lg },
  label: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: fonts.sizes.base, color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    paddingVertical: 14, alignItems: "center", marginTop: spacing.xl,
  },
  disabled: { opacity: 0.6 },
  saveText: { color: colors.white, fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold },
});
