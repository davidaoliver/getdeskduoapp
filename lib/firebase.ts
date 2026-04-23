import { Platform } from "react-native";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  PhoneAuthProvider,
  linkWithCredential,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type Auth,
  type User,
  type ConfirmationResult,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCn5YbUnhjrYRk7L5V8Tfh2WfDR4MD1yOc",
  authDomain: "deskduo-c3982.firebaseapp.com",
  projectId: "deskduo-c3982",
  storageBucket: "deskduo-c3982.firebasestorage.app",
  messagingSenderId: "597628002604",
  appId: "1:597628002604:web:67952b104ea7912c850c89",
  measurementId: "G-LLVGWF8K54",
};

const app = initializeApp(firebaseConfig);

// On native, persist auth state to AsyncStorage so users stay signed in
// across app restarts. On web, getAuth uses IndexedDB by default.
export const auth: Auth =
  Platform.OS === "web"
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });

export const db = getFirestore(app);
export const functions = getFunctions(app);

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export {
  onAuthStateChanged,
  PhoneAuthProvider,
  linkWithCredential,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type User,
  type ConfirmationResult,
};
