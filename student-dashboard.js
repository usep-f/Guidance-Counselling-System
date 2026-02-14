import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Shared auth user for the whole file (booking + dashboard)
let currentUser = null;

/* Student dashboard tabs management */
(function () {
  const tabs = Array.from(document.querySelectorAll("[data-dashboard-tab]"));
  if (!tabs.length) return;

  const sections = tabs
    .map((tab) => document.querySelector(tab.getAttribute("href")))
    .filter(Boolean);

  function setActive(targetId) {
    tabs.forEach((tab) => {
      const isActive = tab.getAttribute("href") === `#${targetId}`;
      tab.classList.toggle("is-active", isActive);
    });

    sections.forEach((section) => {
      const isActive = section.id === targetId;
      section.classList.toggle("is-active", isActive);
      section.style.display = isActive ? "block" : "none";
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      const targetId = tab.getAttribute("href").substring(1);
      setActive(targetId);
    });
  });

  // Set initial tab
  setActive("dashboard-profile");
})();

/* Inquiry submission (Firestore) */
(function () {
  const form = document.getElementById("inquiryForm");
  const hint = document.getElementById("inquiryHint");

  if (!form || !hint) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      alert("Please log in to submit an inquiry.");
      return;
    }

    const topic = document.getElementById("inquiryTopic")?.value;
    const message = document.getElementById("inquiryMessage")?.value;

    if (!topic || !message) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      // Get student details (best effort)
      let studentNo = "";
      let studentName = currentUser.displayName || "Student";

      try {
        const snap = await getDoc(doc(db, "students", currentUser.uid));
        if (snap.exists()) {
          const d = snap.data();
          studentNo = d.studentNo || "";
          studentName = d.name || studentName;
        }
      } catch (e) {
        console.warn("Could not fetch profile for inquiry", e);
      }

      await addDoc(collection(db, "inquiries"), {
        studentId: currentUser.uid,
        studentName,
        studentNo,
        topic,
        message,
        status: "unread",
        isReplied: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      hint.textContent = "Inquiry sent! The counselor will review your message soon.";
      hint.style.color = "var(--color-primary)";
      form.reset();

      // Clear success message after 5 seconds
      setTimeout(() => {
        hint.textContent = "";
      }, 5000);

    } catch (err) {
      console.error("Error sending inquiry:", err);
      alert("Unable to send inquiry. Please try again.");
    }
  });
})();

/* Booking stepper + calendar */
(function () {
  const form = document.querySelector("#bookingForm");
  if (!form) return;

  const steps = Array.from(form.querySelectorAll(".bstep"));
  const panels = Array.from(form.querySelectorAll(".bpanel"));
  let active = 0;

  // Fixed daily timeslots (matches your UI / Firestore time strings)
  const TIMESLOTS = ["08:30 AM", "01:30 PM", "02:30 PM"];

  // dateKey -> Set(times) for Accepted appointments
  let blockedByDate = new Map();
  let unsubscribeAccepted = null;

  const dateInput = document.querySelector("#appointmentDate");
  const timeInput = document.querySelector("#appointmentTime");

  const calTitle = document.querySelector("#calTitle");
  const calDays = document.querySelector("#calDays");
  const slotGrid = document.querySelector("#slotGrid");
  const reviewBox = document.querySelector("#reviewBox");
  const dashYear = document.getElementById("dashYear");
  const dashCourse = document.getElementById("dashCourse");
  const profileNameInput = document.getElementById("profileName");
  const profileStudentNoInput = document.getElementById("profileStudentNo");
  const profileYearLevelInput = document.getElementById("profileYearLevel");
  const profileProgramInput = document.getElementById("profileProgram");

  const prevMonthBtn = document.querySelector("[data-cal-prev]");
  const nextMonthBtn = document.querySelector("[data-cal-next]");

  let view = new Date();
  view.setDate(1);

  function setActiveStep(index) {
    active = Math.max(0, Math.min(index, panels.length - 1));

    panels.forEach((panel, idx) => panel.classList.toggle("is-active", idx === active));
    steps.forEach((step, idx) => {
      step.classList.toggle("is-active", idx === active);
      step.classList.toggle("is-done", idx < active);
    });

    if (active === panels.length - 1) buildReview();
  }

  // Slightly better validation (handles checkboxes/radios)
  function isFieldValid(el) {
    if (!el) return false;
    if (el.type === "checkbox") return el.checked;
    if (el.type === "radio") {
      const name = el.name;
      if (!name) return false;
      return !!form.querySelector(`input[type="radio"][name="${CSS.escape(name)}"]:checked`);
    }
    return !!String(el.value || "").trim();
  }

  function validatePanel(index) {
    const panel = panels[index];
    const required = Array.from(panel.querySelectorAll("[required]"));

    for (const el of required) {
      if (!isFieldValid(el)) {
        el.focus?.();
        return false;
      }
    }
    return true;
  }

  steps.forEach((step) => {
    step.addEventListener("click", () => {
      const target = Number(step.dataset.step);
      if (target > active && !validatePanel(active)) return;
      setActiveStep(target);
    });
  });

  form.addEventListener("click", (event) => {
    const next = event.target.closest("[data-next]");
    const prev = event.target.closest("[data-prev]");

    if (next) {
      if (!validatePanel(active)) return;
      setActiveStep(active + 1);
    }

    if (prev) {
      setActiveStep(active - 1);
    }
  });

  // ✅ REAL booking submit → saves to Firestore → pending list auto updates
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validatePanel(active)) return;

    if (!currentUser) {
      alert("Please log in first.");
      return;
    }

    const data = new FormData(form);

    // get student profile fields (studentNo, name) from Firestore
    let studentNo = "";
    let studentName = currentUser.displayName || "";

    try {
      const profileSnap = await getDoc(doc(db, "students", currentUser.uid));
      if (profileSnap.exists()) {
        const p = profileSnap.data();
        studentNo = p.studentNo || "";
        studentName = p.name || studentName;
      }
    } catch (e) {
      console.warn("Could not fetch student profile for appointment metadata.", e);
    }

    const payload = {
      // Auth UID (technical)
      studentId: currentUser.uid,

      // Human-readable identity for admin
      studentNo: studentNo, // <-- STUDENT NUMBER ENTERED
      studentName: studentName || "",

      reason: data.get("topic") || "",
      mode: data.get("mode") || "",
      date: data.get("appointmentDate") || "",
      time: data.get("appointmentTime") || "",
      notes: (data.get("notes") || "").trim(),
      status: "Pending Approval",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "appointments"), payload);

      alert("Appointment request submitted.");
      form.reset();
      dateInput.value = "";
      timeInput.value = "";
      clearSelection();
      renderCalendar();
      setActiveStep(0);
    } catch (err) {
      console.error(err);
      alert("Unable to submit appointment right now. Please try again.");
    }
  });

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function fmtKey(year, month, day) {
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  function monthName(date) {
    return date.toLocaleString("en-US", { month: "long", year: "numeric" });
  }

  function isPastDate(dateKey) {
    const [y, m, d] = dateKey.split("-").map(Number);
    const cellDate = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    cellDate.setHours(0, 0, 0, 0);

    // BLOCK SAME DAY: Must book at least tomorrow
    return cellDate <= today;
  }

  function isSlotBlocked(dateKey, timeLabel) {
    const set = blockedByDate.get(dateKey);
    return !!set && set.has(timeLabel);
  }

  function isDayFullyBlocked(dateKey) {
    const set = blockedByDate.get(dateKey);
    if (!set) return false;
    return TIMESLOTS.every((t) => set.has(t));
  }

  function monthStartEndKeys(dateObj) {
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth();
    const startKey = fmtKey(y, m + 1, 1);
    const lastDay = new Date(y, m + 1, 0).getDate();
    const endKey = fmtKey(y, m + 1, lastDay);
    return { startKey, endKey };
  }

  function clearSelection() {
    dateInput.value = "";
    timeInput.value = "";
    slotGrid.innerHTML = `<p class="slot-hint">Select an available date to view time slots.</p>`;
  }

  function subscribeAcceptedForViewMonth() {
    if (unsubscribeAccepted) unsubscribeAccepted();

    const { startKey, endKey } = monthStartEndKeys(view);

    const q = query(
      collection(db, "availability"),
      where("date", ">=", startKey),
      where("date", "<=", endKey)
    );

    unsubscribeAccepted = onSnapshot(
      q,
      (snap) => {
        const nextMap = new Map();

        snap.forEach((docSnap) => {
          const a = docSnap.data();
          if (!a?.date || !a?.time) return;
          if (!TIMESLOTS.includes(a.time)) return;

          if (!nextMap.has(a.date)) nextMap.set(a.date, new Set());
          nextMap.get(a.date).add(a.time);
        });

        blockedByDate = nextMap;

        // If selected date becomes fully blocked (or is in the past), clear selection
        if (dateInput.value) {
          const selected = dateInput.value;
          if (isPastDate(selected) || isDayFullyBlocked(selected)) {
            clearSelection();
          } else {
            renderSlots(selected);
          }
        }

        renderCalendar();
      },
      (err) => {
        console.error("Accepted appointments listener failed:", err);
      }
    );
  }

  function renderSlots(dateKey) {
    slotGrid.innerHTML = "";

    if (!dateKey) {
      slotGrid.innerHTML = `<p class="slot-hint">Select an available date to view time slots.</p>`;
      return;
    }

    if (isPastDate(dateKey)) {
      slotGrid.innerHTML = `<p class="slot-hint">No available slots for this date.</p>`;
      return;
    }

    if (isDayFullyBlocked(dateKey)) {
      slotGrid.innerHTML = `<p class="slot-hint">No available slots for this date.</p>`;
      return;
    }

    TIMESLOTS.forEach((slot) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slot";
      button.textContent = slot;

      const blocked = isSlotBlocked(dateKey, slot);
      button.disabled = blocked;

      if (timeInput.value === slot && !blocked) button.classList.add("is-selected");

      button.addEventListener("click", () => {
        if (button.disabled) return;

        slotGrid.querySelectorAll(".slot").forEach((el) => el.classList.remove("is-selected"));
        button.classList.add("is-selected");
        timeInput.value = slot;
      });

      slotGrid.appendChild(button);
    });
  }

  function renderCalendar() {
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDow = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    calTitle.textContent = monthName(view);
    calDays.innerHTML = "";

    for (let i = 0; i < startDow; i++) {
      const blank = document.createElement("div");
      blank.className = "cal-day is-muted";
      calDays.appendChild(blank);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const key = fmtKey(year, month + 1, day);

      // Disabled if past OR all 3 timeslots are already Accepted
      const disabled = isPastDate(key) || isDayFullyBlocked(key);

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `cal-day${disabled ? " is-muted" : " is-available"}`;
      cell.textContent = String(day);
      cell.disabled = disabled;

      if (dateInput.value === key) cell.classList.add("is-selected");

      cell.addEventListener("click", () => {
        if (cell.disabled) return;

        calDays.querySelectorAll(".cal-day").forEach((el) => el.classList.remove("is-selected"));
        cell.classList.add("is-selected");

        dateInput.value = key;
        timeInput.value = "";
        renderSlots(key);
      });

      calDays.appendChild(cell);
    }
  }

  prevMonthBtn?.addEventListener("click", () => {
    view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
    clearSelection();
    subscribeAcceptedForViewMonth();
    renderCalendar();
  });

  nextMonthBtn?.addEventListener("click", () => {
    view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    clearSelection();
    subscribeAcceptedForViewMonth();
    renderCalendar();
  });

  function readFieldValue(field, fallback = "-") {
    if (!field) return fallback;
    if (field.tagName === "SELECT") {
      return field.selectedOptions?.[0]?.textContent || field.value || fallback;
    }
    return field.value || fallback;
  }

  function escapeHtml(str = "") {
    return String(str).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));
  }

  function buildReview() {
    const data = new FormData(form);
    const nameValue = readFieldValue(profileNameInput, "Student");
    const studentNoValue = readFieldValue(profileStudentNoInput, "-");
    const yearValue = readFieldValue(profileYearLevelInput, dashYear?.textContent || "Year Level");
    const courseValue = readFieldValue(profileProgramInput, dashCourse?.textContent || "Program");

    const items = [
      ["Full Name", nameValue],
      ["Student No.", studentNoValue],
      ["Year Level", yearValue],
      ["Course", courseValue],
      ["Reason", data.get("topic")],
      ["Session Type", data.get("mode")],
      ["Date", data.get("appointmentDate")],
      ["Time", data.get("appointmentTime")],
    ];

    const studentItems = items.slice(0, 4);
    const appointmentItems = items.slice(4);

    reviewBox.innerHTML = `
      <div class="review__section">
        <h3 class="review__title">Student Details</h3>
        ${studentItems
        .map(([label, value]) =>
          `<p class="review__item"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value || "-")}</p>`
        )
        .join("")}
      </div>
      <div class="review__section">
        <h3 class="review__title">Appointment Details</h3>
        ${appointmentItems
        .map(([label, value]) =>
          `<p class="review__item"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value || "-")}</p>`
        )
        .join("")}
      </div>
    `;
  }

  renderCalendar();
  subscribeAcceptedForViewMonth();
  setActiveStep(0);
})();

/* Dashboard profile and appointment logic */
(function studentDashboard() {
  const pendingList = document.getElementById("pendingList");
  if (!pendingList) return;

  // ✅ empty by default, new account shows "No pending appointments."
  let appointments = [];
  let unsubscribeAppointments = null;

  const dashName = document.getElementById("dashName");
  const dashInitials = document.getElementById("dashInitials");
  const dashEmail = document.getElementById("dashEmail");
  const dashContact = document.getElementById("dashContact");
  const dashYear = document.getElementById("dashYear");
  const dashCourse = document.getElementById("dashCourse");

  const dashSub = document.getElementById("dashSub");
  const dashProfile = document.querySelector(".dash-profile");
  const editProfileBtn = document.getElementById("editProfileBtn");
  const profileForm = document.getElementById("profileForm");
  const cancelProfileBtn = document.getElementById("cancelProfileBtn");
  const profileStatus = document.getElementById("profileStatus");

  const profileNameInput = document.getElementById("profileName");
  const profileStudentNoInput = document.getElementById("profileStudentNo");
  const profileYearLevelInput = document.getElementById("profileYearLevel");
  const profileProgramInput = document.getElementById("profileProgram");
  const profileContactInput = document.getElementById("profileContact");
  const profileEmailInput = document.getElementById("profileEmail");

  let currentProfile = null;

  function initials(name) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  }

  function setStatus(message) {
    if (!profileStatus) return;
    profileStatus.textContent = message || "";
  }

  function formatSubline({ studentNo, gradeLevel, program }) {
    const safeId = studentNo || "-";
    const safeLevel = gradeLevel || "Year Level";
    const safeProgram = program || "Program";
    return `Student ID: ${safeId} · ${safeLevel} · ${safeProgram}`;
  }

  function fillProfileForm(profile) {
    if (!profileForm) return;
    profileNameInput.value = profile.name || "";
    profileStudentNoInput.value = profile.studentNo || "";
    profileYearLevelInput.value = profile.gradeLevel || "";
    profileProgramInput.value = profile.program || "";
    profileContactInput.value = profile.contact || "";
    profileEmailInput.value = profile.email || "";
  }

  function renderProfile(profile = {}, user) {
    const displayName = profile.name || user?.displayName || "Student";
    const email = profile.email || user?.email || "-";
    const contact = profile.contact || "Not provided";
    const year = profile.gradeLevel || "Year Level";
    const course = profile.program || "Program";

    if (dashName) dashName.textContent = displayName;
    if (dashInitials) dashInitials.textContent = initials(displayName);
    if (dashEmail) dashEmail.textContent = email;
    if (dashContact) dashContact.textContent = contact;
    if (dashYear) dashYear.textContent = year;
    if (dashCourse) dashCourse.textContent = course;

    // safer than innerHTML
    if (dashSub) dashSub.textContent = formatSubline(profile);
  }

  async function loadProfile(user) {
    const baseProfile = {
      name: user?.displayName || "",
      email: user?.email || ""
    };

    if (!user) {
      currentProfile = baseProfile;
      renderProfile(currentProfile, user);
      fillProfileForm(currentProfile);
      return;
    }

    try {
      const ref = doc(db, "students", user.uid);
      const snap = await getDoc(ref);
      const profile = snap.exists() ? snap.data() : {};
      currentProfile = { ...baseProfile, ...profile };
      renderProfile(currentProfile, user);
      fillProfileForm(currentProfile);
    } catch (err) {
      console.error(err);
      currentProfile = baseProfile;
      renderProfile(currentProfile, user);
      fillProfileForm(currentProfile);
      setStatus("Unable to load profile right now.");
    }
  }

  async function saveProfile() {
    if (!currentUser || !profileForm) return;
    setStatus("");

    const payload = {
      name: profileNameInput.value.trim(),
      studentNo: profileStudentNoInput.value.trim(),
      gradeLevel: profileYearLevelInput.value,
      program: profileProgramInput.value,
      contact: profileContactInput.value.trim(),
      email: currentUser.email || ""
    };

    if (!payload.contact) delete payload.contact;

    try {
      const ref = doc(db, "students", currentUser.uid);
      await setDoc(ref, { ...payload, updatedAt: serverTimestamp() }, { merge: true });

      if (payload.name && currentUser.displayName !== payload.name) {
        await updateProfile(currentUser, { displayName: payload.name });
      }

      currentProfile = { ...currentProfile, ...payload };
      renderProfile(currentProfile, currentUser);
      fillProfileForm(currentProfile);
      dashProfile?.classList.remove("is-editing");
      setStatus("Profile updated.");
    } catch (err) {
      console.error(err);
      setStatus("Unable to save profile right now.");
    }
  }

  function statusVariant(status) {
    const text = String(status || "").toLowerCase();
    if (text.includes("pending")) return "warn";
    return "good";
  }

  function escapeHtml(str = "") {
    return String(str).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));
  }



  function subscribePendingAppointments(user) {
    if (unsubscribeAppointments) {
      unsubscribeAppointments();
      unsubscribeAppointments = null;
    }

    appointments = [];
    renderPending();

    if (!user) return;

    const q = query(
      collection(db, "appointments"),
      where("studentId", "==", user.uid)
    );

    unsubscribeAppointments = onSnapshot(
      q,
      (snap) => {
        appointments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // sort newest first (createdAt is Timestamp)
        appointments.sort((a, b) => {
          const at = a.createdAt?.seconds || 0;
          const bt = b.createdAt?.seconds || 0;
          return bt - at;
        });

        // Reset to page 1 on new data arrival (optional, but good for "realtime" feeling so they see new stuff)
        // Or keep current page if preferred. Let's reset to see the new item.
        // currentPage = 1; 
        renderPending();
      },
      (err) => {
        console.error(err);
        pendingList.innerHTML = `<p class="form-hint">Unable to load appointments.</p>`;
      }
    );
  }

  // --- Pagination Logic ---
  let currentPage = 1;
  const itemsPerPage = 5;

  const paginationControls = document.getElementById("paginationControls");
  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");
  const pageIndicator = document.getElementById("pageIndicator");

  function renderPagination(totalPages) {
    if (!paginationControls) return;

    if (appointments.length <= itemsPerPage) {
      paginationControls.hidden = true;
      return;
    }

    paginationControls.hidden = false;
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderPending();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(appointments.length / itemsPerPage) || 1;
      if (currentPage < totalPages) {
        currentPage++;
        renderPending();
      }
    });
  }

  function renderPending() {
    if (!appointments.length) {
      pendingList.innerHTML = `<p class="form-hint">No pending appointments.</p>`;
      if (paginationControls) paginationControls.hidden = true;
      return;
    }

    const totalPages = Math.ceil(appointments.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const pagedItems = appointments.slice(startIndex, startIndex + itemsPerPage);

    pendingList.innerHTML = pagedItems
      .map((item) => {
        const date = item.date || "-";
        const time = item.time || "-";
        const mode = item.mode || "-";
        const status = item.status || "-";

        const reason = item.reason || "-";
        const notes = item.notes || "";
        const studentNo = item.studentNo || "";
        const studentName = item.studentName || "";

        const canCancel = status === "Pending Approval" || status === "Accepted";

        return `
        <article class="dash-item">
          <div class="dash-item__content">
            <p class="dash-item__title">${escapeHtml(date)} · ${escapeHtml(time)}</p>
            <p class="dash-item__meta">${escapeHtml(mode)}</p>

            <p class="dash-item__detail"><strong>Reason:</strong> ${escapeHtml(reason)}</p>

            ${notes ? `<p class="dash-item__detail"><strong>Message:</strong> ${escapeHtml(notes)}</p>` : ""}

            ${(studentNo || studentName)
            ? `<p class="dash-item__detail"><strong>Student:</strong> ${escapeHtml(studentNo)} ${studentName ? `· ${escapeHtml(studentName)}` : ""}</p>`
            : ""}
            
            ${canCancel ? `
              <div class="dash-item__actions" style="margin-top: 12px;">
                <button class="btn btn--sm btn--pill btn--ghost" type="button" data-cancel-appt="${item.id}">
                  Cancel Appointment
                </button>
              </div>
            ` : ""}
          </div>

          <span class="dash-pill" data-variant="${statusVariant(status)}">${escapeHtml(status)}</span>
        </article>
      `;
      })
      .join("");

    renderPagination(totalPages);
  }

  async function cancelAppointment(appointmentId) {
    const appt = appointments.find(a => a.id === appointmentId);
    if (!appt) return;

    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      // 1. If it was already accepted, we must also remove the public availability block
      if (appt.status === "Accepted" && appt.date && appt.time) {
        await deleteDoc(doc(db, "availability", `${appt.date}_${appt.time}`));
      }

      // 2. Update status to Cancelled
      await updateDoc(doc(db, "appointments", appointmentId), {
        status: "Cancelled",
        updatedAt: serverTimestamp()
      });

      console.log("Appointment cancelled by student.");
    } catch (err) {
      console.error("Error cancelling appointment:", err);
      alert("Unable to cancel appointment. Please try again.");
    }
  }

  pendingList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cancel-appt]");
    if (btn) cancelAppointment(btn.dataset.cancelAppt);
  });

  renderProfile();
  renderPending();

  if (editProfileBtn && dashProfile) {
    editProfileBtn.addEventListener("click", () => {
      dashProfile.classList.add("is-editing");
      setStatus("");
    });
  }

  if (cancelProfileBtn && dashProfile) {
    cancelProfileBtn.addEventListener("click", () => {
      dashProfile.classList.remove("is-editing");
      if (currentProfile) fillProfileForm(currentProfile);
      setStatus("");
    });
  }

  if (profileForm) {
    profileForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveProfile();
    });
  }

  /* Inquiry History management */
  let myInquiries = [];
  let unsubscribeInquiries = null;

  const myInquiryList = document.getElementById("myInquiryList");
  const stInquiryModal = document.getElementById("studentInquiryModal");
  const stInquiryModalTitle = document.getElementById("stInquiryModalTitle");
  const stInquiryModalBody = document.getElementById("stInquiryModalBody");
  const stInquiryModalEyebrow = document.getElementById("stInquiryModalEyebrow");

  function subscribeMyInquiries(user) {
    if (unsubscribeInquiries) unsubscribeInquiries();
    if (!user || !myInquiryList) return;

    const q = query(
      collection(db, "inquiries"),
      where("studentId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    unsubscribeInquiries = onSnapshot(q, (snap) => {
      myInquiries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderInquiryHistory();
    }, (err) => {
      console.error("Error fetching my inquiries:", err);
      if (myInquiryList) {
        myInquiryList.innerHTML = `<p class="admin-empty">Could not load your inquiries.</p>`;
      }
    });
  }

  function renderInquiryHistory() {
    if (!myInquiryList) return;

    if (myInquiries.length === 0) {
      myInquiryList.innerHTML = `<p class="admin-empty">You haven't submitted any inquiries yet.</p>`;
      return;
    }

    myInquiryList.innerHTML = myInquiries.map(inq => {
      const date = inq.createdAt?.toDate ? inq.createdAt.toDate() : new Date();
      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

      const isReplied = inq.status === "replied";
      const statusLabel = isReplied ? "Replied" : "Pending";
      const variant = isReplied ? "done" : "warn";

      return `
        <article class="dash-item">
          <div class="dash-item__content">
            <p class="dash-item__title">${escapeHtml(inq.topic || "General Inquiry")}</p>
            <p class="dash-item__meta">Sent on ${dateStr}</p>
            <p class="dash-item__preview">${escapeHtml(inq.message?.substring(0, 100))}${inq.message?.length > 100 ? "..." : ""}</p>
            
            <button class="btn btn--sm btn--ghost btn--pill" style="margin-top: 12px;" data-inquiry-view="${inq.id}">
              ${isReplied ? "View Response" : "View Message"}
            </button>
          </div>
          <span class="dash-pill" data-variant="${variant}">${statusLabel}</span>
        </article>
      `;
    }).join("");
  }

  function openInquiryDetail(inqId) {
    const inq = myInquiries.find(i => i.id === inqId);
    if (!inq || !stInquiryModalBody) return;

    const date = inq.createdAt?.toDate ? inq.createdAt.toDate() : new Date();
    const dateStr = date.toLocaleString();

    stInquiryModalEyebrow.textContent = `Inquiry from ${dateStr}`;
    stInquiryModalTitle.textContent = inq.topic || "General Inquiry";

    let contentHTML = `
      <div class="admin-detail">
        <div class="admin-detail__block">
          <h3 style="font-size: 13px; text-transform: uppercase; color: var(--muted); margin-bottom: 8px;">Your Message</h3>
          <p style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${escapeHtml(inq.message)}</p>
        </div>
    `;

    if (inq.status === "replied" && inq.adminResponse) {
      const replyDate = inq.respondedAt?.toDate ? inq.respondedAt.toDate().toLocaleString() : "Recently";
      contentHTML += `
        <div class="admin-detail__block" style="background: rgba(31, 185, 129, 0.05); border: 1px solid rgba(31, 185, 129, 0.2); margin-top: 16px;">
          <h3 style="font-size: 13px; text-transform: uppercase; color: var(--primary); margin-bottom: 8px;">Counselor Response</h3>
          <p style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${escapeHtml(inq.adminResponse)}</p>
          <p class="dash-item__meta" style="margin-top: 10px; font-size: 11px;">Replied on ${replyDate}</p>
        </div>
      `;
    }

    contentHTML += `</div>`;
    stInquiryModalBody.innerHTML = contentHTML;

    stInquiryModal.classList.add("is-open");
    stInquiryModal.setAttribute("aria-hidden", "false");
  }

  myInquiryList?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-inquiry-view]");
    if (btn) openInquiryDetail(btn.dataset.inquiryView);
  });

  /* Session Records / History Monitoring */
  let myRecords = [];
  let unsubscribeRecords = null;

  function subscribeSessionRecords(user) {
    if (unsubscribeRecords) unsubscribeRecords();
    if (!user) return;

    const q = query(
      collection(db, "session_records"),
      where("studentId", "==", user.uid),
      orderBy("timestamp", "desc")
    );

    unsubscribeRecords = onSnapshot(q, (snap) => {
      myRecords = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderHistoryMonitoring();
    });
  }

  function getStatusDescription(status) {
    switch (status) {
      case "Improving": return "Trending upward. Keep following your action steps and attend scheduled sessions.";
      case "Stable": return "Steady progress. Continue your regular check-ins to maintain balance.";
      case "Starting": return "Early stages of guidance. Focus on setting clear goals with your counselor.";
      case "Needs Check-in": return "A follow-up is recommended. Please book a session to discuss recent challenges.";
      default: return "Keep attending your scheduled sessions and follow your action plan.";
    }
  }

  function renderHistoryMonitoring() {
    const totalSessionsEl = document.getElementById("statTotalSessions");
    const lastSessionEl = document.getElementById("statLastSession");
    const wellnessFillEl = document.getElementById("wellnessBarFill");
    const statusTextEl = document.getElementById("statCurrentStatus");
    const trendListEl = document.getElementById("trendList");
    const historyListEl = document.getElementById("sessionHistoryList");

    if (!totalSessionsEl || !myRecords.length) return;

    // 1. KPI Cards
    totalSessionsEl.textContent = myRecords.length;
    const latest = myRecords[0]; // descending order
    if (latest.timestamp) {
      const d = latest.timestamp.toDate();
      lastSessionEl.textContent = `Last session: ${d.toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }

    // 2. Improvement Bar (Latest Wellness Score)
    const score = latest.wellnessScore || 0;
    if (wellnessFillEl) wellnessFillEl.style.width = `${score}%`;

    // 3. Current Status
    if (statusTextEl) statusTextEl.textContent = getStatusDescription(latest.status);

    // 4. Progress Trend (Last 5 records, ascending)
    if (trendListEl) {
      const trendData = [...myRecords].reverse().slice(-5);
      const trendHTML = trendData.map((rec, idx) => `
        <div class="trend__row">
          <span class="trend__label">Session ${myRecords.length - trendData.length + idx + 1}</span>
          <div class="trend__bar"><span style="width: ${rec.wellnessScore || 0}%"></span></div>
          <span class="trend__value">${rec.wellnessScore || 0}%</span>
        </div>
      `).join("");
      trendListEl.innerHTML = trendHTML;
    }

    // 5. Session History List
    if (historyListEl) {
      historyListEl.innerHTML = myRecords.map((rec, idx) => {
        const d = rec.timestamp?.toDate ? rec.timestamp.toDate() : new Date();
        const dateStr = d.toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' });

        // Find appointment mode if possible (or just use "Counseling Session")
        const type = "Counseling Session";
        const status = rec.status || "Stable";

        return `
          <article class="session-item">
            <div>
              <p class="session-item__title">Session #${myRecords.length - idx}</p>
              <p class="session-item__meta">${dateStr} · ${type}</p>
            </div>
            <span class="tag">${status}</span>
          </article>
        `;
      }).join("");
    }
  }

  // Simplified modal close for student side (if not globally handled)
  stInquiryModal?.querySelectorAll("[data-modal-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      stInquiryModal.classList.remove("is-open");
      stInquiryModal.setAttribute("aria-hidden", "true");
    });
  });

  // ✅ Single source of truth for currentUser
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    loadProfile(user);
    subscribePendingAppointments(user);
    subscribeMyInquiries(user);
    subscribeSessionRecords(user);
  });
})();
