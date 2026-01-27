// admin-tools/set-admin-claim.cjs
const admin = require("firebase-admin");

// 1) Update this path to your downloaded service account JSON
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 2) Put your real admin email here
const ADMIN_EMAIL = "guidancecounseling.web@gmail.com";

async function run() {
  const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);

  // Set admin claim
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });

  console.log("✅ Admin claim set for:", ADMIN_EMAIL, "uid:", user.uid);
  console.log("NOTE: The user must sign out and sign in again (or refresh token) to receive updated claims.");
}

run().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
