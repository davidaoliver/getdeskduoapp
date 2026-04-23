import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/hooks/useAuth";
import { colors, fonts, spacing, borderRadius } from "../../lib/theme";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DayHoursInput {
  open: string;
  close: string;
  closed: boolean;
}

const DEFAULT_HOURS: DayHoursInput = { open: "09:00", close: "17:00", closed: false };

export default function CompleteShopScreen() {
  const { shopId } = useAuth();

  const [loadingShop, setLoadingShop] = useState(true);
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [hours, setHours] = useState<DayHoursInput[]>(
    DAYS.map((_, i) => (i === 0 ? { ...DEFAULT_HOURS, closed: true } : { ...DEFAULT_HOURS }))
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shopId) {
      setLoadingShop(false);
      return;
    }
    (async () => {
      try {
        const snap = await getDoc(doc(db, "shops", shopId));
        if (snap.exists()) {
          const data = snap.data();
          setShopName(data.name || "");
          setAddress(data.address || "");
          setPhone(data.phone || "");
          if (typeof data.timezone === "string") setTimezone(data.timezone);
          if (data.operating_hours && Object.keys(data.operating_hours).length > 0) {
            setHours(
              DAYS.map((_, i) => {
                const d = data.operating_hours[i];
                return d
                  ? {
                      open: d.open || DEFAULT_HOURS.open,
                      close: d.close || DEFAULT_HOURS.close,
                      closed: !!d.closed,
                    }
                  : { ...DEFAULT_HOURS };
              })
            );
          }
        }
      } finally {
        setLoadingShop(false);
      }
    })();
  }, [shopId]);

  const updateDay = (index: number, field: keyof DayHoursInput, value: string | boolean) => {
    setHours((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  };

  const handleSave = async () => {
    if (!shopId) {
      Alert.alert("Error", "No shop linked to your account.");
      return;
    }
    if (!address.trim() || !phone.trim()) {
      Alert.alert("Error", "Address and phone are required.");
      return;
    }

    setSaving(true);
    try {
      const operating_hours: { [day: number]: DayHoursInput } = {};
      hours.forEach((h, i) => {
        operating_hours[i] = h;
      });

      await updateDoc(doc(db, "shops", shopId), {
        name: shopName.trim() || "My Shop",
        address: address.trim(),
        phone: phone.trim(),
        timezone,
        operating_hours,
      });

      router.replace("/(app)/home");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save shop.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingShop) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Finish Setting Up {shopName || "Your Shop"}</Text>
        <Text style={styles.subtitle}>
          We pre-filled what we already know. Fill in the rest to start taking bookings.
        </Text>

        <Text style={styles.label}>Shop Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Fresh Cuts Barbershop"
          value={shopName}
          onChangeText={setShopName}
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          placeholder="123 Main St, City, State"
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="+1 (555) 123-4567"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Timezone</Text>
        <View style={styles.timezoneRow}>
          {TIMEZONES.map((tz) => (
            <TouchableOpacity
              key={tz}
              style={[styles.tzChip, timezone === tz && styles.tzChipActive]}
              onPress={() => setTimezone(tz)}
            >
              <Text
                style={[styles.tzChipText, timezone === tz && styles.tzChipTextActive]}
              >
                {tz.split("/")[1].replace("_", " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Operating Hours</Text>
        {DAYS.map((day, i) => (
          <View key={day} style={styles.dayRow}>
            <TouchableOpacity
              style={styles.dayToggle}
              onPress={() => updateDay(i, "closed", !hours[i].closed)}
            >
              <View
                style={[styles.checkbox, !hours[i].closed && styles.checkboxActive]}
              />
              <Text style={styles.dayName}>{day}</Text>
            </TouchableOpacity>
            {!hours[i].closed ? (
              <View style={styles.hoursInputRow}>
                <TextInput
                  style={styles.timeInput}
                  value={hours[i].open}
                  onChangeText={(v) => updateDay(i, "open", v)}
                  placeholder="09:00"
                />
                <Text style={styles.timeSeparator}>to</Text>
                <TextInput
                  style={styles.timeInput}
                  value={hours[i].close}
                  onChangeText={(v) => updateDay(i, "close", v)}
                  placeholder="17:00"
                />
              </View>
            ) : (
              <Text style={styles.closedText}>Closed</Text>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.buttonText}>
            {saving ? "Saving..." : "Save & Continue"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.xl,
    paddingTop: 60,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: fonts.sizes["3xl"],
    fontWeight: fonts.weights.extrabold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fonts.sizes.base,
    color: colors.textSecondary,
    marginBottom: spacing["2xl"],
  },
  label: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: fonts.sizes.base,
  },
  timezoneRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tzChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tzChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tzChipText: {
    fontSize: fonts.sizes.xs,
    color: colors.textSecondary,
  },
  tzChipTextActive: {
    color: colors.white,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dayToggle: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayName: {
    fontSize: fonts.sizes.sm,
    color: colors.text,
    width: 90,
  },
  hoursInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: fonts.sizes.sm,
    width: 70,
    textAlign: "center",
  },
  timeSeparator: {
    marginHorizontal: spacing.sm,
    color: colors.textMuted,
    fontSize: fonts.sizes.sm,
  },
  closedText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.sm,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing["2xl"],
    marginBottom: spacing["3xl"],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: fonts.sizes.base,
    fontWeight: fonts.weights.semibold,
  },
});
