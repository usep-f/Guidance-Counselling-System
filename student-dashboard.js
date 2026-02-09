import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
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
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      const target = document.querySelector(tab.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        setActive(target.id);
      }
    });
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );

    sections.forEach((section) => observer.observe(section));
  }
})();

/* Inquiry feedback (demo) */
(function () {
  const form = document.getElementById("inquiryForm");
  const hint = document.getElementById("inquiryHint");

  if (!form || !hint) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    hint.textContent =
      "Inquiry submitted (demo). The counselor will review your message within 1–2 school days.";
    form.reset();
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
    cellDate.setHours(0, 0, 0, 0);
    return cellDate < today;
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

  function renderPending() {
    if (!appointments.length) {
      pendingList.innerHTML = `<p class="form-hint">No pending appointments.</p>`;
      return;
    }

    pendingList.innerHTML = appointments
      .map((item) => {
        const date = item.date || "-";
        const time = item.time || "-";
        const mode = item.mode || "-";
        const status = item.status || "-";

        const reason = item.reason || "-";
        const notes = item.notes || "";
        const studentNo = item.studentNo || "";
        const studentName = item.studentName || "";

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
          </div>

          <span class="dash-pill" data-variant="${statusVariant(status)}">${escapeHtml(status)}</span>
        </article>
      `;
      })
      .join("");
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

        renderPending();
      },
      (err) => {
        console.error(err);
        pendingList.innerHTML = `<p class="form-hint">Unable to load appointments.</p>`;
      }
    );
  }

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

  // ✅ Single source of truth for currentUser
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    loadProfile(user);
    subscribePendingAppointments(user);
  });
})();
