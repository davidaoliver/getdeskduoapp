import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import {
  auth,
  PhoneAuthProvider,
  linkWithCredential,
  db,
} from "../../lib/firebase";
import { RecaptchaVerifier } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { colors, fonts, spacing, borderRadius } from "../../lib/theme";

export default function VerifyPhoneScreen() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const recaptchaRef = useRef<any>(null);

  const sendCode = async () => {
    if (!phone.trim()) {
      Alert.alert("Error", "Please enter your phone number.");
      return;
    }

    setLoading(true);
    try {
      // Format phone number
      const formatted = phone.startsWith("+") ? phone : `+1${phone.replace(/\D/g, "")}`;

      if (Platform.OS === "web") {
        if (!recaptchaRef.current) {
          recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible",
          });
        }
        const provider = new PhoneAuthProvider(auth);
        const id = await provider.verifyPhoneNumber(formatted, recaptchaRef.current);
        setVerificationId(id);
      } else {
        // Native platforms — will need expo-firebase-recaptcha or similar
        // For now, use the same web approach
        const provider = new PhoneAuthProvider(auth);
        const id = await provider.verifyPhoneNumber(formatted, recaptchaRef.current);
        setVerificationId(id);
      }

      Alert.alert("Code Sent", "Check your phone for a verification code.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code.trim() || !verificationId) {
      Alert.alert("Error", "Please enter the verification code.");
      return;
    }

    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      const user = auth.currentUser;

      if (user) {
        // Link phone to existing account
        await linkWithCredential(user, credential);

        // Update the user doc with the verified phone
        const formatted = phone.startsWith("+") ? phone : `+1${phone.replace(/\D/g, "")}`;
        await updateDoc(doc(db, "users", user.uid), { phone: formatted });
      }

      router.replace("/");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Invalid code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Verify Your Phone</Text>
        <Text style={styles.subtitle}>
          We need your phone number to send appointment reminders.
        </Text>

        {!verificationId ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="(555) 123-4567"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={sendCode}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Sending..." : "Send Code"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={verifyCode}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Verifying..." : "Verify"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resendButton}
              onPress={() => {
                setVerificationId(null);
                setCode("");
              }}
            >
              <Text style={styles.resendText}>Resend code</Text>
            </TouchableOpacity>
          </>
        )}

        {Platform.OS === "web" && <View nativeID="recaptcha-container" />}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: fonts.sizes["3xl"],
    fontWeight: fonts.weights.extrabold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fonts.sizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing["2xl"],
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: fonts.sizes.lg,
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: fonts.sizes.base,
    fontWeight: fonts.weights.semibold,
  },
  resendButton: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  resendText: {
    color: colors.primary,
    fontSize: fonts.sizes.sm,
  },
});
