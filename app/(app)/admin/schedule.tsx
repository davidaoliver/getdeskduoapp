import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../lib/hooks/useAuth";
import { SHOP_ID } from "../../../lib/config";
import { colors, fonts, spacing, borderRadius } from "../../../lib/theme";
import type { Availability } from "../../../lib/types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DaySchedule {
  enabled: boolean;
  start_time: string;
  end_time: string;
  docId?: string;
}

const DEFAULT_DAY: DaySchedule = { enabled: false, start_time: "09:00", end_time: "17:00" };

export default function ScheduleScreen() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<DaySchedule[]>(DAYS.map(() => ({ ...DEFAULT_DAY })));
  const [saving, setSaving] = useState(false);
  const [barberIds, setBarberIds] = useState<string[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);

  // Get barbers for this shop
  useEffect(() => {
    const q = query(collection(db, "barbers"), where("shop_id", "==", SHOP_ID), where("active", "==", true));
    return onSnapshot(q, (snap) => {
      const ids = snap.docs.map((d) => d.id);
      setBarberIds(ids);
      // Auto-select first barber or find current user's barber doc
      const userBarber = snap.docs.find((d) => d.data().user_id === user?.uid);
      if (userBarber) {
        setSelectedBarber(userBarber.id);
      } else if (ids.length > 0) {
        setSelectedBarber(ids[0]);
      }
    });
  }, [user?.uid]);

  // Load availability for selected barber
  useEffect(() => {
    if (!selectedBarber) return;
    const q = query(collection(db, "availability"), where("barber_id", "==", selectedBarber));
    return onSnapshot(q, (snap) => {
      const fresh = DAYS.map(() => ({ ...DEFAULT_DAY }));
      snap.docs.forEach((d) => {
        const data = d.data();
        const day = data.day_of_week as number;
        if (day >= 0 && day <= 6) {
          fresh[day] = {
            enabled: true,
            start_time: data.start_time || "09:00",
            end_time: data.end_time || "17:00",
            docId: d.id,
          };
        }
      });
      setSchedule(fresh);
    });
  }, [selectedBarber]);

  const toggleDay = (index: number) => {
    setSchedule((prev) =>
      prev.map((d, i) => (i === index ? { ...d, enabled: !d.enabled } : d))
    );
  };

  const updateTime = (index: number, field: "start_time" | "end_time", value: string) => {
    setSchedule((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    );
  };

  const handleSave = async () => {
    if (!selectedBarber) return;
    setSaving(true);
    try {
      for (let i = 0; i < 7; i++) {
        const day = schedule[i];
        if (day.enabled) {
          const data = {
            barber_id: selectedBarber,
            shop_id: SHOP_ID,
            day_of_week: i,
            start_time: day.start_time,
            end_time: day.end_time,
          };
          if (day.docId) {
            await updateDoc(doc(db, "availability", day.docId), data);
          } else {
            await addDoc(collection(db, "availability"), data);
          }
        } else if (day.docId) {
          await deleteDoc(doc(db, "availability", day.docId));
        }
      }
      Alert.alert("Saved", "Availability updated.");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!selectedBarber) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>
          No barbers found. Add staff first, then set their availability.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Weekly Availability</Text>
      <Text style={styles.subheading}>Set the hours this barber is available for bookings.</Text>

      {DAYS.map((day, i) => (
        <View key={day} style={styles.dayRow}>
          <View style={styles.dayLeft}>
            <Switch
              value={schedule[i].enabled}
              onValueChange={() => toggleDay(i)}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
            <Text style={[styles.dayName, !schedule[i].enabled && styles.dayDisabled]}>
              {day}
            </Text>
          </View>
          {schedule[i].enabled ? (
            <View style={styles.timeRow}>
              <TextInput
                style={styles.timeInput}
                value={schedule[i].start_time}
                onChangeText={(v) => updateTime(i, "start_time", v)}
                placeholder="09:00"
              />
              <Text style={styles.timeSep}>to</Text>
              <TextInput
                style={styles.timeInput}
                value={schedule[i].end_time}
                onChangeText={(v) => updateTime(i, "end_time", v)}
                placeholder="17:00"
              />
            </View>
          ) : (
            <Text style={styles.offText}>Off</Text>
          )}
        </View>
      ))}

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveText}>{saving ? "Saving..." : "Save Availability"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing["3xl"] },
  empty: { color: colors.textMuted, fontSize: fonts.sizes.base, textAlign: "center", marginTop: spacing["2xl"] },
  heading: { fontSize: fonts.sizes["3xl"], fontWeight: fonts.weights.bold, color: colors.text, marginBottom: spacing.xs },
  subheading: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginBottom: spacing.xl },
  dayRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  dayLeft: { flexDirection: "row", alignItems: "center" },
  dayName: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.medium, color: colors.text, marginLeft: spacing.sm, width: 100 },
  dayDisabled: { color: colors.textMuted },
  timeRow: { flexDirection: "row", alignItems: "center" },
  timeInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8,
    fontSize: fonts.sizes.sm, width: 70, textAlign: "center",
  },
  timeSep: { marginHorizontal: spacing.sm, color: colors.textMuted, fontSize: fonts.sizes.sm },
  offText: { color: colors.textMuted, fontSize: fonts.sizes.sm },
  saveButton: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    paddingVertical: 14, alignItems: "center", marginTop: spacing.xl,
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: colors.white, fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold },
});
