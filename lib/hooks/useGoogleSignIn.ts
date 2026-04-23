import { useEffect, useCallback } from "react";
import { Platform } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";

WebBrowser.maybeCompleteAuthSession();

const webProvider = new GoogleAuthProvider();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

type SignInResult = { ok: true } | { ok: false; error: string };

// Fall back to the web client ID so useAuthRequest has a non-empty value
// and doesn't throw at init on native dev builds. If the real platform
// client ID isn't set we refuse at signIn time with a clear message.
const ANDROID_ID_EFFECTIVE = ANDROID_CLIENT_ID || WEB_CLIENT_ID;
const IOS_ID_EFFECTIVE = IOS_CLIENT_ID || WEB_CLIENT_ID;

export function useGoogleSignIn() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_ID_EFFECTIVE,
    iosClientId: IOS_ID_EFFECTIVE,
    webClientId: WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === "success" && response.authentication?.idToken) {
      const credential = GoogleAuthProvider.credential(
        response.authentication.idToken,
        response.authentication.accessToken
      );
      signInWithCredential(auth, credential).catch((err) => {
        console.error("Firebase sign-in failed after Google auth:", err);
      });
    }
  }, [response]);

  const signIn = useCallback(async (): Promise<SignInResult> => {
    try {
      if (Platform.OS === "web") {
        if (!WEB_CLIENT_ID) {
          return {
            ok: false,
            error: "Google sign-in isn't configured. Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.",
          };
        }
        await signInWithPopup(auth, webProvider);
        return { ok: true };
      }

      if (Platform.OS === "android" && !ANDROID_CLIENT_ID) {
        return {
          ok: false,
          error:
            "Google sign-in on Android needs EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID. Use email or phone for now.",
        };
      }

      if (Platform.OS === "ios" && !IOS_CLIENT_ID) {
        return {
          ok: false,
          error:
            "Google sign-in on iOS needs EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID. Use email or phone for now.",
        };
      }

      const result = await promptAsync();
      if (result.type === "success") return { ok: true };
      if (result.type === "cancel" || result.type === "dismiss") {
        return { ok: false, error: "cancelled" };
      }
      return { ok: false, error: "Google sign-in failed." };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Google sign-in failed." };
    }
  }, [promptAsync]);

  const isReady = Platform.OS === "web" || request != null;

  return { signIn, isReady };
}
