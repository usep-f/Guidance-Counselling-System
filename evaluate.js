import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const form = document.getElementById("evaluationForm");
const submitBtn = document.getElementById("submitBtn");
const loader = document.getElementById("loading");
const successMessage = document.getElementById("successMessage");
const formContainer = document.getElementById("evalFormContainer");

let currentUser = null;
let appointmentId = null;

// 1. Get appointmentId from URL
const urlParams = new URLSearchParams(window.location.search);
appointmentId = urlParams.get("id");

if (!appointmentId) {
  alert("Invalid evaluation link. Redirecting to dashboard...");
  window.location.href = "student-dashboard.html";
}

// 2. Watch Auth State
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await checkInitialState();
  } else {
    // Redirect to login if not authenticated
    sessionStorage.setItem("postAuthRedirect", window.location.href);
    window.location.href = "index.html#login";
  }
});

/**
 * Name: checkInitialState
 * Description: Verifies if the appointment exists, is completed, 
 * and hasn't been evaluated yet.
 */
async function checkInitialState() {
  try {
    const apptRef = doc(db, "appointments", appointmentId);
    const apptSnap = await getDoc(apptRef);

    if (!apptSnap.exists()) {
      alert("Appointment not found.");
      window.location.href = "student-dashboard.html";
      return;
    }

    const apptData = apptSnap.data();

    // Verify ownership
    if (apptData.studentId !== currentUser.uid) {
      alert("Unauthorized access.");
      window.location.href = "student-dashboard.html";
      return;
    }

    // Verify status
    if (apptData.status.toLowerCase() !== "completed") {
      alert("Only completed sessions can be evaluated.");
      window.location.href = "student-dashboard.html";
      return;
    }

    // Check if already evaluated
    const evalQuery = query(
      collection(db, "evaluations"),
      where("appointmentId", "==", appointmentId)
    );
    const evalSnap = await getDocs(evalQuery);

    if (!evalSnap.empty) {
      alert("You have already submitted an evaluation for this session.");
      window.location.href = "student-dashboard.html";
      return;
    }

  } catch (err) {
    console.error("Error checking initial state:", err);
  }
}

// 3. Handle Form Submission
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser || !appointmentId) return;

    const rating = form.querySelector('input[name="rating"]:checked')?.value;
    const comments = document.getElementById("comments").value.trim();

    if (!rating) {
      alert("Please select a rating.");
      return;
    }

    // Loading UI
    submitBtn.disabled = true;
    loader.style.display = "block";

    try {
      // Create evaluation doc
      await addDoc(collection(db, "evaluations"), {
        appointmentId,
        studentId: currentUser.uid,
        rating: Number(rating),
        comment: comments || "",
        timestamp: serverTimestamp()
      });

      // Mark appointment as evaluated
      const apptRef = doc(db, "appointments", appointmentId);
      await updateDoc(apptRef, {
        isEvaluated: true,
        updatedAt: serverTimestamp()
      });

      // Show success
      formContainer.style.display = "none";
      successMessage.classList.add("is-active");

    } catch (err) {
      console.error("Error submitting evaluation:", err);
      alert("Unable to submit evaluation. Please try again.");
      submitBtn.disabled = false;
      loader.style.display = "none";
    }
  });
}
