// auth-backend.js
import { auth } from "./firebase.js";

import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  getIdTokenResult
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

export function watchAuthState(onChange) {
  return onAuthStateChanged(auth, (user) => onChange(user || null));
}

export function getAccountLabel(user) {
  if (!user) return "";
  return user.displayName || user.email || "Account";
}

export async function loginWithEmail(email, password) {
  await setPersistence(auth, browserLocalPersistence);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function registerStudent({ email, password, name }) {
  await setPersistence(auth, browserLocalPersistence);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

// ✅ Admin check: CUSTOM CLAIMS ONLY
export async function isAdminUser(user) {
  if (!user) return false;

  // true => forces token refresh, important right after claims are set
  const tokenResult = await getIdTokenResult(user, true);
  return tokenResult?.claims?.admin === true;
}

export async function getLandingPageForUser(user) {
  const admin = await isAdminUser(user);
  return admin ? "admin-dashboard.html" : "profile-dashboard.html";
}
