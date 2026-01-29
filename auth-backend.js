// auth-backend.js
import { auth,db } from "./firebase-config.js";

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

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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

export async function saveStudentProfile(uid, profile) {
  const ref = doc(db, "students", uid);
  await setDoc(ref, { ...profile, updatedAt: serverTimestamp() }, { merge: true });
}

export async function registerStudent({ email, password, name, studentNo, gradeLevel, program }) {
  await setPersistence(auth, browserLocalPersistence);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await saveStudentProfile(cred.user.uid, {
    email,
    name,
    studentNo,
    gradeLevel,
    program,
    createdAt: serverTimestamp()
  });
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
  return admin ? "admin-dashboard.html" : "student-dashboard.html";
}
