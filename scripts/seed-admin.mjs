// One-time script to seed a super_admin into pendingStaff
// Uses Firebase Admin SDK from the functions directory
// Run with: node scripts/seed-admin.mjs

import { createRequire } from "module";
const require = createRequire(import.meta.url + "/../functions/");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp({ projectId: "deskduo-c3982" });
const db = getFirestore();

const email = "davidoliver820@gmail.com";

await db.collection("pendingStaff").doc(email).set({
  email,
  shop_id: "shop_001",
  role: "super_admin",
  invited_by: "system",
  created_at: FieldValue.serverTimestamp(),
});

console.log(`Done — ${email} added as super_admin in pendingStaff`);
console.log("Sign in with this email in the app and you'll be auto-promoted.");
process.exit(0);
