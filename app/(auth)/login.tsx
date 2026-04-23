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
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import {
  signInWithEmail,
  signUpWithEmail,
  auth,
  PhoneAuthProvider,
  RecaptchaVerifier,
} from "../../lib/firebase";
import { signInWithCredential } from "firebase/auth";
import { useGoogleSignIn } from "../../lib/hooks/useGoogleSignIn";
import { colors, fonts, spacing, borderRadius } from "../../lib/theme";

type AuthMode = "email" | "phone";

export default function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>("email");

  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  // Phone state
  const [phone, setPhone] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const recaptchaRef = useRef<any>(null);

  const { signIn: googleSignIn, isReady: googleReady } = useGoogleSignIn();

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      router.replace("/");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const result = await googleSignIn();
      if (result.ok) {
        router.replace("/");
      } else if (result.error !== "cancelled") {
        Alert.alert("Error", result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneCode = async () => {
    if (!phone.trim()) {
      Alert.alert("Error", "Please enter your phone number.");
      return;
    }
    setLoading(true);
    try {
      const formatted = phone.startsWith("+") ? phone : `+1${phone.replace(/\D/g, "")}`;

      if (Platform.OS === "web") {
        if (!recaptchaRef.current) {
          recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible",
          });
        }
      }

      const provider = new PhoneAuthProvider(auth);
      const id = await provider.verifyPhoneNumber(formatted, recaptchaRef.current);
      setVerificationId(id);
      Alert.alert("Code Sent", "Check your phone for a verification code.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneCode = async () => {
    if (!code.trim() || !verificationId) {
      Alert.alert("Error", "Please enter the verification code.");
      return;
    }
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      await signInWithCredential(auth, credential);
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
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Sign in to book your appointment</Text>

        {/* Google button */}
        <TouchableOpacity
          style={[
            styles.socialButton,
            styles.googleButton,
            (loading || !googleReady) && styles.buttonDisabled,
          ]}
          onPress={handleGoogleAuth}
          disabled={loading || !googleReady}
        >
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Mode tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, mode === "email" && styles.tabActive]}
            onPress={() => { setMode("email"); setVerificationId(null); }}
          >
            <Text style={[styles.tabText, mode === "email" && styles.tabTextActive]}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === "phone" && styles.tabActive]}
            onPress={() => setMode("phone")}
          >
            <Text style={[styles.tabText, mode === "phone" && styles.tabTextActive]}>Phone</Text>
          </TouchableOpacity>
        </View>

        {/* Email form */}
        {mode === "email" && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleEmailAuth}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "..." : isSignUp ? "Sign Up" : "Sign In"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.switchText}>
                {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Phone form */}
        {mode === "phone" && !verificationId && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Phone number (e.g. 5551234567)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={sendPhoneCode}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Sending..." : "Send Code"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {mode === "phone" && verificationId && (
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
              onPress={verifyPhoneCode}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Verifying..." : "Verify & Sign In"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => { setVerificationId(null); setCode(""); }}
            >
              <Text style={styles.switchText}>Resend code</Text>
            </TouchableOpacity>
          </>
        )}

        {Platform.OS === "web" && <View nativeID="recaptcha-container" />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing["3xl"],
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: fonts.sizes["4xl"],
    fontWeight: fonts.weights.extrabold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fonts.sizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing["2xl"],
  },
  socialButton: {
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  googleButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  googleText: {
    fontSize: fonts.sizes.base,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    color: colors.textMuted,
    fontSize: fonts.sizes.sm,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.sm,
    padding: 3,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: borderRadius.sm - 2,
  },
  tabActive: {
    backgroundColor: colors.surface,
  },
  tabText: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.medium,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.text,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: fonts.sizes.base,
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
  switchButton: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  switchText: {
    color: colors.primary,
    fontSize: fonts.sizes.sm,
  },
});
