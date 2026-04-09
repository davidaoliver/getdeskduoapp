import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  Alert,
  Switch,
} from "react-native";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { SHOP_ID } from "../../../lib/config";
import { colors, fonts, spacing, borderRadius } from "../../../lib/theme";
import type { Service } from "../../../lib/types";

const EMPTY_FORM = {
  name: "",
  duration_minutes: "30",
  buffer_minutes: "5",
  price: "",
};

export default function ServicesScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "services"), where("shop_id", "==", SHOP_ID));
    return onSnapshot(q, (snap) => {
      setServices(snap.docs.map((d) => ({ ...d.data(), service_id: d.id } as Service)));
    });
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (svc: Service) => {
    setEditing(svc);
    setForm({
      name: svc.name,
      duration_minutes: String(svc.duration_minutes),
      buffer_minutes: String(svc.buffer_minutes),
      price: String(svc.price),
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim()) {
      Alert.alert("Error", "Name and price are required.");
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        duration_minutes: parseInt(form.duration_minutes, 10) || 30,
        buffer_minutes: parseInt(form.buffer_minutes, 10) || 0,
        price: parseFloat(form.price) || 0,
        shop_id: SHOP_ID,
        active: true,
      };
      if (editing) {
        await updateDoc(doc(db, "services", editing.service_id), data);
      } else {
        await addDoc(collection(db, "services"), data);
      }
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (svc: Service) => {
    await updateDoc(doc(db, "services", svc.service_id), { active: !svc.active });
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={services}
        keyExtractor={(item) => item.service_id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No services yet. Tap + to add one.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, !item.active && styles.inactive]}>
                {item.name}
              </Text>
              <Switch
                value={item.active}
                onValueChange={() => toggleActive(item)}
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
            <View style={styles.cardDetails}>
              <Text style={styles.detail}>{item.duration_minutes} min</Text>
              <Text style={styles.detailDot}>·</Text>
              <Text style={styles.detail}>{item.buffer_minutes} min buffer</Text>
              <Text style={styles.detailDot}>·</Text>
              <Text style={styles.detailPrice}>${item.price}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editing ? "Edit Service" : "Add Service"}
            </Text>

            <Text style={styles.label}>Service Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Classic Haircut"
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Duration (min)</Text>
                <TextInput
                  style={styles.input}
                  value={form.duration_minutes}
                  onChangeText={(v) => setForm({ ...form, duration_minutes: v })}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Buffer (min)</Text>
                <TextInput
                  style={styles.input}
                  value={form.buffer_minutes}
                  onChangeText={(v) => setForm({ ...form, buffer_minutes: v })}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <Text style={styles.label}>Price ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="25.00"
              value={form.price}
              onChangeText={(v) => setForm({ ...form, price: v })}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  empty: { color: colors.textMuted, fontSize: fonts.sizes.base, textAlign: "center", marginTop: spacing["2xl"] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.semibold, color: colors.text },
  inactive: { color: colors.textMuted, textDecorationLine: "line-through" },
  cardDetails: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  detail: { fontSize: fonts.sizes.sm, color: colors.textSecondary },
  detailDot: { marginHorizontal: spacing.xs, color: colors.textMuted },
  detailPrice: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, color: colors.primary },
  fab: {
    position: "absolute", bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
    elevation: 4, shadowColor: colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
  },
  fabText: { color: colors.white, fontSize: 28, fontWeight: fonts.weights.bold, marginTop: -2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg,
    padding: spacing.xl, maxHeight: "80%",
  },
  modalTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold, color: colors.text, marginBottom: spacing.lg },
  label: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fonts.sizes.base,
  },
  row: { flexDirection: "row", gap: spacing.md },
  halfField: { flex: 1 },
  saveButton: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: 14, alignItems: "center", marginTop: spacing.xl },
  buttonDisabled: { opacity: 0.6 },
  saveText: { color: colors.white, fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold },
  cancelBtn: { paddingVertical: 14, alignItems: "center" },
  cancelText: { color: colors.textSecondary, fontSize: fonts.sizes.base },
});
