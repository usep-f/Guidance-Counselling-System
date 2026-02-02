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

/**
 * Name: watchAuthState
 * Description: Sets up a listener for changes in the user's authentication state.
 */
export function watchAuthState(onChange) {
  return onAuthStateChanged(auth, (user) => onChange(user || null));
}

/**
 * Name: getAccountLabel
 * Description: Returns a display label for the user (Admin, Name, or Email).
 */
export async function getAccountLabel(user) {
  if (!user) return "";
  const admin = await isAdminUser(user);
  if (admin) return "Admin";
  return user.displayName || user.email || "Account";
}

/**
 * Name: loginWithEmail
 * Description: Authenticates a user using email and password with local persistence.
 */
export async function loginWithEmail(email, password) {
  await setPersistence(auth, browserLocalPersistence);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/**
 * Name: saveStudentProfile
 * Description: Persists student-specific metadata to the Firestore "students" collection.
 */
export async function saveStudentProfile(uid, profile) {
  const ref = doc(db, "students", uid);
  await setDoc(ref, { ...profile, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Name: registerStudent
 * Description: Creates a new Firebase Auth account and initializes their Firestore profile.
 */
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

/**
 * Name: logout
 * Description: Signs out the current user from Firebase Authentication.
 */
export async function logout() {
  await signOut(auth);
}

/**
 * Name: isAdminUser
 * Description: Checks if the current user has the 'admin' custom claim in their ID token.
 * ✅ Admin check: CUSTOM CLAIMS ONLY
 */
export async function isAdminUser(user) {
  if (!user) return false;

  // true => forces token refresh, important right after claims are set
  const tokenResult = await getIdTokenResult(user, true);
  return tokenResult?.claims?.admin === true;
}

/**
 * Name: getLandingPageForUser
 * Description: Determines the appropriate dashboard URL based on the user's role.
 */
export async function getLandingPageForUser(user) {
  const admin = await isAdminUser(user);
  return admin ? "admin-dashboard.html" : "student-dashboard.html";
}
