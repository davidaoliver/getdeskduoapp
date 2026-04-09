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
} from "react-native";
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../lib/hooks/useAuth";
import { SHOP_ID } from "../../../lib/config";
import { colors, fonts, spacing, borderRadius } from "../../../lib/theme";
import type { Barber, PendingStaff } from "../../../lib/types";

export default function StaffScreen() {
  const { user, role } = useAuth();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [pending, setPending] = useState<PendingStaff[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const qBarbers = query(collection(db, "barbers"), where("shop_id", "==", SHOP_ID));
    const unsubBarbers = onSnapshot(qBarbers, (snap) => {
      setBarbers(snap.docs.map((d) => ({ ...d.data(), barber_id: d.id } as Barber)));
    });

    const qPending = query(collection(db, "pendingStaff"), where("shop_id", "==", SHOP_ID));
    const unsubPending = onSnapshot(qPending, (snap) => {
      setPending(snap.docs.map((d) => ({ ...d.data(), email: d.id } as PendingStaff)));
    });

    return () => { unsubBarbers(); unsubPending(); };
  }, []);

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      Alert.alert("Error", "Please enter an email address.");
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, "pendingStaff", email), {
        email,
        shop_id: SHOP_ID,
        role: "admin",
        invited_by: user?.uid,
        created_at: serverTimestamp(),
      });
      setInviteEmail("");
      setModalVisible(false);
      Alert.alert("Invited", `${email} will be added as staff when they sign in.`);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleBarberActive = async (barber: Barber) => {
    const newActive = !barber.active;
    if (!newActive) {
      Alert.alert(
        "Deactivate Staff",
        "This will deactivate the barber. Any future appointments should be handled manually.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Deactivate",
            style: "destructive",
            onPress: () => updateDoc(doc(db, "barbers", barber.barber_id), { active: newActive }),
          },
        ]
      );
    } else {
      await updateDoc(doc(db, "barbers", barber.barber_id), { active: newActive });
    }
  };

  const isSuperAdmin = role === "super_admin";

  return (
    <View style={styles.container}>
      <FlatList
        data={[...barbers]}
        keyExtractor={(item) => item.barber_id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          pending.length > 0 ? (
            <View style={styles.pendingSection}>
              <Text style={styles.sectionTitle}>Pending Invites</Text>
              {pending.map((p) => (
                <View key={p.email} style={styles.pendingCard}>
                  <Text style={styles.pendingEmail}>{p.email}</Text>
                  <Text style={styles.pendingBadge}>Invited</Text>
                </View>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            No staff members yet.{isSuperAdmin ? " Tap + to invite." : ""}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardName, !item.active && styles.inactive]}>
                  {item.display_name}
                </Text>
                {item.bio ? <Text style={styles.cardBio}>{item.bio}</Text> : null}
                <Text style={styles.cardServices}>
                  {item.services_offered.length} service{item.services_offered.length !== 1 ? "s" : ""}
                </Text>
              </View>
              {isSuperAdmin && (
                <TouchableOpacity
                  style={[styles.statusBadge, item.active ? styles.activeBadge : styles.inactiveBadge]}
                  onPress={() => toggleBarberActive(item)}
                >
                  <Text style={item.active ? styles.activeBadgeText : styles.inactiveBadgeText}>
                    {item.active ? "Active" : "Inactive"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />

      {isSuperAdmin && (
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Invite Staff</Text>
            <Text style={styles.modalDesc}>
              Enter their email. When they sign up or sign in, they'll automatically be added as staff for your shop.
            </Text>

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="barber@example.com"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleInvite}
              disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? "Sending..." : "Send Invite"}</Text>
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
  pendingSection: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, color: colors.textSecondary, marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 1 },
  pendingCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: borderRadius.sm, padding: spacing.md,
    marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed",
  },
  pendingEmail: { fontSize: fonts.sizes.sm, color: colors.textSecondary },
  pendingBadge: { fontSize: fonts.sizes.xs, color: colors.warning, fontWeight: fonts.weights.medium },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  cardRow: { flexDirection: "row", alignItems: "center" },
  cardName: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.semibold, color: colors.text },
  inactive: { color: colors.textMuted },
  cardBio: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: spacing.xs },
  cardServices: { fontSize: fonts.sizes.sm, color: colors.textMuted, marginTop: spacing.xs },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  activeBadge: { backgroundColor: "#dcfce7" },
  inactiveBadge: { backgroundColor: "#fee2e2" },
  activeBadgeText: { fontSize: fonts.sizes.xs, color: colors.success, fontWeight: fonts.weights.medium },
  inactiveBadgeText: { fontSize: fonts.sizes.xs, color: colors.error, fontWeight: fonts.weights.medium },
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
    backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  modalTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold, color: colors.text, marginBottom: spacing.sm },
  modalDesc: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginBottom: spacing.lg },
  label: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: fonts.sizes.base,
  },
  saveButton: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: 14, alignItems: "center", marginTop: spacing.xl },
  buttonDisabled: { opacity: 0.6 },
  saveText: { color: colors.white, fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold },
  cancelBtn: { paddingVertical: 14, alignItems: "center" },
  cancelText: { color: colors.textSecondary, fontSize: fonts.sizes.base },
});
