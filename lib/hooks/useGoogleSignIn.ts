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

export function useGoogleSignIn() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
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
        await signInWithPopup(auth, webProvider);
        return { ok: true };
      }

      if (!ANDROID_CLIENT_ID && !IOS_CLIENT_ID) {
        return {
          ok: false,
          error:
            "Google sign-in isn't configured for native yet. Set EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID / EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID in .env.",
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
