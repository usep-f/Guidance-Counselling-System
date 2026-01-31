import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
/* Student dashboard tabs */
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
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
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

/* Booking stepper + calendar (demo) */
(function () {
  const form = document.querySelector("#bookingForm");
  if (!form) return;

  const steps = Array.from(form.querySelectorAll(".bstep"));
  const panels = Array.from(form.querySelectorAll(".bpanel"));
  let active = 0;

  const availability = {
    "2026-02-03": ["09:00 AM", "10:00 AM", "02:00 PM"],
    "2026-02-05": ["11:00 AM", "01:00 PM", "03:00 PM"],
    "2026-02-10": ["09:00 AM", "10:30 AM", "04:00 PM"],
    "2026-02-12": ["08:30 AM", "01:30 PM", "02:30 PM"],
  };

  const dateInput = document.querySelector("#appointmentDate");
  const timeInput = document.querySelector("#appointmentTime");

  const calTitle = document.querySelector("#calTitle");
  const calDays = document.querySelector("#calDays");
  const slotGrid = document.querySelector("#slotGrid");
  const reviewBox = document.querySelector("#reviewBox");

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

    if (active === 3) buildReview();
  }

  function validatePanel(index) {
    const panel = panels[index];
    const required = Array.from(panel.querySelectorAll("[required]"));

    for (const el of required) {
      if (!el.value) {
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

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validatePanel(active)) return;

    alert("Appointment request submitted (demo).");
    form.reset();
    dateInput.value = "";
    timeInput.value = "";
    renderCalendar();
    setActiveStep(0);
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

  function clearSelection() {
    dateInput.value = "";
    timeInput.value = "";
    slotGrid.innerHTML = `<p class="slot-hint">Select an available date to view time slots.</p>`;
  }

  function renderSlots(dateKey) {
    const slots = availability[dateKey] || [];
    slotGrid.innerHTML = "";

    if (!slots.length) {
      slotGrid.innerHTML = `<p class="slot-hint">No available slots for this date.</p>`;
      return;
    }

    slots.forEach((slot) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slot";
      button.textContent = slot;

      button.addEventListener("click", () => {
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
      const hasAvail = Boolean(availability[key]);

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `cal-day${hasAvail ? " is-available" : " is-muted"}`;
      cell.textContent = String(day);
      if (!hasAvail) cell.disabled = true;

      if (dateInput.value === key) {
        cell.classList.add("is-selected");
      }

      cell.addEventListener("click", () => {
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
    renderCalendar();
  });

  nextMonthBtn?.addEventListener("click", () => {
    view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    clearSelection();
    renderCalendar();
  });

  function buildReview() {
    const data = new FormData(form);
    const items = [
      ["Name", data.get("studentName")],
      ["Student ID", data.get("studentId")],
      ["Grade/Year", data.get("gradeLevel")],
      ["Contact", data.get("contactNo")],
      ["Email", data.get("email")],
      ["Section/Program", data.get("section")],
      ["Reason", data.get("topic")],
      ["Session Type", data.get("mode")],
      ["Date", data.get("appointmentDate")],
      ["Time", data.get("appointmentTime")],
    ];

    reviewBox.innerHTML = items.map(([label, value]) => `<p><strong>${label}:</strong> ${value || "-"}</p>`).join("");
  }

  renderCalendar();
  setActiveStep(0);
})();

/* Dashboard demo data */
(function studentDashboard() {
  const pendingList = document.getElementById("pendingList");
  const trendBox = document.getElementById("trendBox");
  const sessionList = document.getElementById("sessionList");

  if (!pendingList || !trendBox || !sessionList) return;

  const dashName = document.getElementById("dashName");
  const dashInitials = document.getElementById("dashInitials");
  const dashEmail = document.getElementById("dashEmail");
  const dashContact = document.getElementById("dashContact");
  const dashYear = document.getElementById("dashYear");
  const dashCourse = document.getElementById("dashCourse");
  const navUserName = document.getElementById("navUserName");
  const navUserInitials = document.getElementById("navUserInitials");

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
  let currentUser = null;

  const appointments = [
    { date: "2026-02-03", time: "10:00 AM", type: "In-Person", status: "Pending Approval" },
    { date: "2026-02-10", time: "09:00 AM", type: "Online", status: "Scheduled" },
  ];

  const progress = {
    trend: [
      { label: "Session 1", pct: 35 },
      { label: "Session 2", pct: 50 },
      { label: "Session 3", pct: 64 },
      { label: "Session 4", pct: 72 },
    ],
    history: [
      { title: "Session #4", meta: "Jan 18, 2026 · Wellness Check-in", tag: "Improving" },
      { title: "Session #3", meta: "Jan 04, 2026 · Academic Stress", tag: "Stable" },
      { title: "Session #2", meta: "Dec 15, 2025 · Time Management", tag: "Stable" },
      { title: "Session #1", meta: "Dec 01, 2025 · Intake & Goals", tag: "Starting" },
    ],
  };

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
    const safeId = studentNo ? `<strong>${studentNo}</strong>` : "<strong>-</strong>";
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

  function renderProfile(profile={}, user) {
    const displayName = profile.name || user?.displayName || "Student";
    const email = profile.email || user?.email || "-";
    const contact = profile.contact || "Not provided";
    const year = profile.gradeLevel || "Year Level";
    const course = profile.program || "Program";

    if (dashName) dashName.textContent = displayName;
    if (dashInitials) dashInitials.textContent = initials(displayName);
    if (navUserName) navUserName.textContent = displayName;
    if (navUserInitials) navUserInitials.textContent = initials(displayName);
    if (dashEmail) dashEmail.textContent = email;
    if (dashContact) dashContact.textContent = contact;
    if (dashYear) dashYear.textContent = year;
    if (dashCourse) dashCourse.textContent = course;
    if (dashSub) dashSub.innerHTML = formatSubline(profile);
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

    if (!payload.contact) {
      delete payload.contact;
    }

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
      setStatus("Unable to save profile right now.");
    }
  }

  function statusVariant(status) {
    const text = status.toLowerCase();
    if (text.includes("pending")) return "warn";
    return "good";
  }

  function renderPending() {
    if (!appointments.length) {
      pendingList.innerHTML = `<p class="form-hint">No pending appointments.</p>`;
      return;
    }

    pendingList.innerHTML = appointments
      .map((item) => {
        return `
        <article class="dash-item">
          <div>
            <p class="dash-item__title">${item.date} · ${item.time}</p>
            <p class="dash-item__meta">${item.type}</p>
          </div>
          <span class="dash-pill" data-variant="${statusVariant(item.status)}">${item.status}</span>
        </article>
      `;
      })
      .join("");
  }

  function renderProgress() {
    trendBox.innerHTML = progress.trend
      .map((item) => {
        return `
    <div class="pm-row">
      <span class="pm-label">${item.label}</span>
      <div class="pm-bar" aria-label="${item.label} ${item.pct}%">
        <div class="pm-fill" style="width:${item.pct}%"></div>
      </div>
      <span class="pm-value">${item.pct}%</span>
    </div>
  `;
      })
      .join("");

    sessionList.innerHTML = progress.history
      .map((item) => {
        return `
        <article class="session-item">
          <div>
            <p class="session-item__title">${item.title}</p>
            <p class="session-item__meta">${item.meta}</p>
          </div>
          <span class="tag">${item.tag}</span>
        </article>
      `;
      })
      .join("");
  }

  renderProfile();
  renderPending();
  renderProgress();

  if (editProfileBtn && dashProfile) {
    editProfileBtn.addEventListener("click", () => {
      dashProfile.classList.add("is-editing");
      setStatus("");
    });
  }

  if (cancelProfileBtn && dashProfile) {
    cancelProfileBtn.addEventListener("click", () => {
      dashProfile.classList.remove("is-editing");
      if (currentProfile) {
        fillProfileForm(currentProfile);
      }
      setStatus("");
    });
  }

  if (profileForm) {
    profileForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveProfile();
    });
  }

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    loadProfile(user);
  });
})();
