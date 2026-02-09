/* =========================
   ADMIN DASHBOARD (Firestore + transaction accept)
   ========================= */

import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
  runTransaction,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

(function adminDashboard() {
  const tabs = Array.from(document.querySelectorAll("[data-dashboard-tab]"));
  if (tabs.length) {
    const sections = tabs
      .map((tab) => document.querySelector(tab.getAttribute("href")))
      .filter(Boolean);

    /**
     * Name: setActiveTab
     * Description: Sets the active dashboard tab and its corresponding section visibility.
     */
    function setActiveTab(targetId) {
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
          setActiveTab(target.id);
        }
      });
    });

    // Use IntersectionObserver to highlight tabs as the user scrolls
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveTab(entry.target.id);
            }
          });
        },
        { rootMargin: "-30% 0px -60% 0px" }
      );
      sections.forEach((section) => observer.observe(section));
    }
  }

  const emotionsEl = document.getElementById("chartEmotions");
  const triggersEl = document.getElementById("chartTriggers");
  const tableEl = document.getElementById("recentTable");
  const enrolledList = document.getElementById("enrolledList");
  const appointmentList = document.getElementById("appointmentList");
  const userSearch = document.getElementById("userSearch");
  const userGrade = document.getElementById("userGrade");
  const userProgram = document.getElementById("userProgram");
  const apptFilters = Array.from(document.querySelectorAll("[data-appt-filter]"));
  const userModal = document.getElementById("userModal");
  const userModalTitle = document.getElementById("userModalTitle");
  const userModalBody = document.getElementById("userModalBody");
  const appointmentModal = document.getElementById("appointmentModal");
  const appointmentModalTitle = document.getElementById("appointmentModalTitle");
  const appointmentModalBody = document.getElementById("appointmentModalBody");

  // If we are not on admin.html, do nothing
  if (!emotionsEl || !triggersEl || !tableEl) return;

  const elTime = document.getElementById("timeRange");
  const elGrade = document.getElementById("gradeLevel");
  const elSearch = document.getElementById("searchStudent");
  const btnReset = document.getElementById("btnReset");
  const btnExport = document.getElementById("btnExport");

  const kpiTotalConcerns = document.getElementById("kpiTotalConcerns");
  const kpiTopEmotion = document.getElementById("kpiTopEmotion");
  const kpiTopTrigger = document.getElementById("kpiTopTrigger");
  const kpiPending = document.getElementById("kpiPending");
  const kpiTotalConcernsHint = document.getElementById("kpiTotalConcernsHint");

  // ============================
  // ✅ ANALYTICS CHANGE ONLY:
  // Start EMPTY dataset (user will insert real data)
  // ============================
  let demo = [];

  // Optional helper: add analytics row later (from other scripts/forms)
  window.addAnalyticsRow = function addAnalyticsRow(row) {
    if (!row || typeof row !== "object") return;
    demo.push(row);
    update();
  };

  // Optional helper: clear analytics any time
  window.clearAnalytics = function clearAnalytics() {
    demo = [];
    update();
  };

  const enrolledUsers = [
    {
      id: "2024-00123",
      name: "Juan Dela Cruz",
      year: "Grade 12",
      course: "STEM",
      email: "juan.delacruz@school.edu",
      program: "stem",
      recent: [
        { date: "2026-01-03", status: "Pending" },
        { date: "2025-12-08", status: "Completed" },
        { date: "2025-11-21", status: "Completed" }
      ],
      history: [
        { date: "2026-01-03", time: "10:00 AM", status: "Pending" },
        { date: "2025-12-08", time: "01:30 PM", status: "Completed" },
        { date: "2025-11-21", time: "09:00 AM", status: "Completed" },
        { date: "2025-10-02", time: "02:30 PM", status: "Completed" }
      ]
    },
    {
      id: "2024-00456",
      name: "Maria Santos",
      year: "Grade 11",
      course: "ABM",
      email: "maria.santos@school.edu",
      program: "abm",
      recent: [
        { date: "2026-01-05", status: "Scheduled" },
        { date: "2025-12-12", status: "Completed" }
      ],
      history: [
        { date: "2026-01-05", time: "11:00 AM", status: "Scheduled" },
        { date: "2025-12-12", time: "08:30 AM", status: "Completed" }
      ]
    },
    {
      id: "2024-00589",
      name: "Kyle Ramirez",
      year: "Grade 10",
      course: "HUMSS",
      email: "kyle.ramirez@school.edu",
      program: "humss",
      recent: [
        { date: "2026-01-12", status: "Pending" },
        { date: "2025-11-18", status: "Completed" }
      ],
      history: [
        { date: "2026-01-12", time: "02:00 PM", status: "Pending" },
        { date: "2025-11-18", time: "09:30 AM", status: "Completed" }
      ]
    }
  ];

  // ============================
  // ✅ APPOINTMENTS (Firestore)
  // ============================
  let appointments = [];
  let unsubscribeAppointments = null;

  // Remove demo helpers from runtime behavior (kept harmless if you used them before)
  window.addAppointment = function () { };
  window.clearAppointments = function () { };

  let activeAppointmentFilter = "pending";

  function matchesFilters(row) {
    const timeVal = elTime?.value || "30";
    const q = (elSearch?.value || "").trim().toLowerCase();

    if (q) {
      if (!row.student.toLowerCase().includes(q)) return false;
    }

    if (timeVal !== "all") {
      const days = Number(timeVal);
      const now = new Date(); // changed from static demo anchor date
      const d = new Date(row.date);
      const diff = (now - d) / (1000 * 60 * 60 * 24);
      if (diff > days) return false;
    }

    return true;
  }

  function countBy(rows, key) {
    const out = {};
    rows.forEach(r => {
      const k = r[key];
      out[k] = (out[k] || 0) + 1;
    });
    return out;
  }

  function topKey(counts) {
    let best = { k: "-", v: -1 };
    Object.keys(counts).forEach(k => {
      if (counts[k] > best.v) best = { k, v: counts[k] };
    });
    return best.k;
  }

  function renderBars(container, counts, order) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    container.innerHTML = "";

    order.forEach(label => {
      const value = counts[label] || 0;
      const pct = Math.round((value / total) * 100);

      const row = document.createElement("div");
      row.className = "barrow";
      row.setAttribute("role", "listitem");

      row.innerHTML = `
        <div class="barrow__label">${label}</div>
        <div class="bartrack" aria-label="${label} ${value}">
          <div class="barfill" style="width: ${pct}%"></div>
        </div>
        <div class="barrow__value">${value}</div>
      `;

      container.appendChild(row);
    });
  }

  function pillHTML(text) {
    let variant = "done";
    if (String(text).toLowerCase().includes("pending")) variant = "warn";
    if (String(text).toLowerCase().includes("scheduled")) variant = "done";
    if (String(text).toLowerCase().includes("in session")) variant = "done";
    return `<span class="admin-pill" data-variant="${variant}">${text}</span>`;
  }

  function renderTable(rows) {
    if (!rows.length) {
      tableEl.innerHTML = `
        <tr>
          <td colspan="6" style="padding:16px;opacity:.6;">No records yet.</td>
        </tr>
      `;
      return;
    }

    tableEl.innerHTML = rows
      .slice(0, 8)
      .map(r => {
        return `
          <tr>
            <td>${r.date}</td>
            <td>${r.student}</td>
            <td>${r.emotion}</td>
            <td>${r.trigger}</td>
            <td>${r.severity}</td>
            <td>${pillHTML(r.status)}</td>
          </tr>
        `;
      })
      .join("");
  }

  function matchesUserFilters(user) {
    const queryVal = (userSearch?.value || "").trim().toLowerCase();
    const grade = userGrade?.value || "all";
    const program = userProgram?.value || "all";

    if (grade !== "all" && user.year.toLowerCase() !== grade.replace("g", "grade ")) {
      return false;
    }

    if (program !== "all" && user.program !== program) {
      return false;
    }

    if (queryVal) {
      const haystack = `${user.name} ${user.id}`.toLowerCase();
      if (!haystack.includes(queryVal)) return false;
    }

    return true;
  }

  function renderUserList() {
    if (!enrolledList) return;
    const rows = enrolledUsers.filter(matchesUserFilters);

    if (!rows.length) {
      enrolledList.innerHTML = `<p class="admin-empty">No enrolled users found.</p>`;
      return;
    }

    enrolledList.innerHTML = rows
      .map((user) => {
        const recent = user.recent
          .map((item) => `<span class="admin-tag">${item.date} · ${item.status}</span>`)
          .join("");
        return `
          <article class="admin-item">
            <div class="admin-item__main">
              <h3 class="admin-item__title">${user.name}</h3>
              <p class="admin-item__meta">
                ${user.id} · ${user.year} · ${user.course} · ${user.email}
              </p>
              <div class="admin-item__tags">${recent}</div>
            </div>
            <div class="admin-item__actions">
              <button class="btn btn--pill btn--ghost" type="button" data-user-open="${user.id}">
                View Profile
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function openUserModal(userId) {
    if (!userModal || !userModalBody || !userModalTitle) return;
    const user = enrolledUsers.find((item) => item.id === userId);
    if (!user) return;

    userModalTitle.textContent = user.name;
    userModalBody.innerHTML = `
      <div class="admin-detail">
        <div class="admin-detail__block">
          <h3>Student Information</h3>
          <p><strong>ID:</strong> ${user.id}</p>
          <p><strong>Year & Course:</strong> ${user.year} · ${user.course}</p>
          <p><strong>Email:</strong> ${user.email}</p>
        </div>
        <div class="admin-detail__block">
          <h3>Recent Appointments</h3>
          <ul class="admin-detail__list">
            ${user.history
        .map(
          (item) =>
            `<li>${item.date} · ${item.time} <span class="admin-tag">${item.status}</span></li>`
        )
        .join("")}
          </ul>
        </div>
      </div>
    `;

    userModal.classList.add("is-open");
    userModal.setAttribute("aria-hidden", "false");
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function normalizeStatus(status) {
    return String(status || "").toLowerCase();
  }

  function statusVariant(status) {
    const text = normalizeStatus(status);
    if (text.includes("pending")) return "warn";
    return "done";
  }

  // Render appointments from Firestore data
  function renderAppointments() {
    if (!appointmentList) return;

    const rows = appointments.filter((appt) => {
      const state = normalizeStatus(appt.status);

      // Hide cancelled everywhere for now (you can add a Cancelled tab later)
      if (state === "cancelled") return false;

      if (activeAppointmentFilter === "pending") {
        // Pending tab shows BOTH pending approval and accepted (matches your earlier behavior)
        return state.includes("pending") || state === "accepted";
      }
      return state === "completed";
    });

    if (!rows.length) {
      appointmentList.innerHTML = `<p class="admin-empty">No appointments available.</p>`;
      return;
    }

    appointmentList.innerHTML = rows
      .map((appt) => {
        const status = appt.status || "-";
        const statusPill = `<span class="admin-pill" data-variant="${statusVariant(status)}">${status}</span>`;

        const state = normalizeStatus(appt.status);

        // Actions only for pending approval
        const showActions = state.includes("pending");
        const canOpen = state !== "cancelled";

        const title = appt.studentName || appt.studentNo || appt.studentId || "Student";
        const meta = `${appt.studentNo || "-"} · ${appt.studentId || "-"}`;
        const details = `${appt.reason || "-"} · ${appt.mode || "-"} · ${appt.date || "-"} · ${appt.time || "-"}`;

        return `
          <article class="admin-item">
            <div class="admin-item__main">
              <h3 class="admin-item__title">${title}</h3>
              <p class="admin-item__meta">${meta}</p>
              <p class="admin-item__meta">${details}</p>
            </div>
            <div class="admin-item__actions">
              ${statusPill}
              ${showActions
            ? `
                  <button class="btn btn--pill btn--primary" type="button" data-accept="${appt.id}">
                    Accept
                  </button>
                  <button class="btn btn--pill btn--ghost" type="button" data-deny="${appt.id}">
                    Deny
                  </button>
                `
            : ""}
              ${canOpen
            ? `
                  <button class="btn btn--pill btn--ghost" type="button" data-appt-open="${appt.id}">
                    Open Details
                  </button>
                `
            : ""}
            </div>
          </article>
        `;
      })
      .join("");
  }

  function openAppointmentModal(appointmentId) {
    if (!appointmentModal || !appointmentModalBody || !appointmentModalTitle) return;
    const appt = appointments.find((item) => item.id === appointmentId);
    if (!appt) return;

    const title = appt.studentName || appt.studentNo || appt.studentId || "Student";
    appointmentModalTitle.textContent = `${title} · ${appt.date || "-"}`;
    appointmentModalBody.innerHTML = `
      <div class="admin-detail">
        <div class="admin-detail__block">
          <h3>Appointment Details</h3>
          <p><strong>Student ID:</strong> ${appt.studentId || "-"}</p>
          <p><strong>Student No:</strong> ${appt.studentNo || "-"}</p>
          <p><strong>Reason:</strong> ${appt.reason || "-"}</p>
          <p><strong>Session Type:</strong> ${appt.mode || "-"}</p>
          <p><strong>Date & Time:</strong> ${appt.date || "-"} · ${appt.time || "-"}</p>
        </div>
        <div class="admin-detail__block">
          <h3>Counselor Notes</h3>
          <textarea class="admin-textarea" rows="5" placeholder="Type session notes here..."></textarea>
        </div>
        <div class="admin-detail__block">
          <h3>Emotional States</h3>
          <div class="admin-checkgrid">
            <label class="admin-check"><input type="checkbox" /> Stress</label>
            <label class="admin-check"><input type="checkbox" /> Anxiety</label>
            <label class="admin-check"><input type="checkbox" /> Depression</label>
          </div>
        </div>
        <div class="admin-detail__block">
          <h3>Environmental Triggers</h3>
          <div class="admin-checkgrid">
            <label class="admin-check"><input type="checkbox" /> Family</label>
            <label class="admin-check"><input type="checkbox" /> Financial</label>
            <label class="admin-check"><input type="checkbox" /> Academic</label>
            <label class="admin-check"><input type="checkbox" /> Peer</label>
          </div>
        </div>
        <div class="admin-detail__actions">
          <button class="btn btn--pill btn--primary" type="button" data-complete="${appt.id}">
            Mark as Complete
          </button>
        </div>
      </div>
    `;

    appointmentModal.classList.add("is-open");
    appointmentModal.setAttribute("aria-hidden", "false");
  }

  function update() {
    const rows = demo.filter(matchesFilters);

    const emotionCounts = countBy(rows, "emotion");
    const triggerCounts = countBy(rows, "trigger");

    const emotionOrder = ["Stress", "Anxiety", "Depression"];
    const triggerOrder = ["Family", "Financial", "Academic", "Peer"];

    renderBars(emotionsEl, emotionCounts, emotionOrder);
    renderBars(triggersEl, triggerCounts, triggerOrder);
    renderTable(rows);

    const totalConcerns = rows.length;
    kpiTotalConcerns.textContent = String(totalConcerns);
    kpiTopEmotion.textContent = topKey(emotionCounts);
    kpiTopTrigger.textContent = topKey(triggerCounts);

    const pending = rows.filter(r => String(r.status || "").toLowerCase().includes("pending")).length;
    kpiPending.textContent = String(pending);

    const rangeText =
      elTime.value === "all" ? "Across all time" : `Across last ${elTime.value} days`;
    kpiTotalConcernsHint.textContent = rangeText;
  }

  function reset() {
    elTime.value = "30";
    elGrade.value = "all";
    elSearch.value = "";
    demo = [];
    update();
  }

  function exportSummary() {
    const rows = demo.filter(matchesFilters);
    const emotionCounts = countBy(rows, "emotion");
    const triggerCounts = countBy(rows, "trigger");

    const lines = [];
    lines.push("Guidance System Admin Summary");
    lines.push(`Exported: ${new Date().toISOString()}`);
    lines.push("");
    lines.push("Emotional States");
    Object.keys(emotionCounts).forEach(k => lines.push(`${k},${emotionCounts[k]}`));
    lines.push("");
    lines.push("Environmental Triggers");
    Object.keys(triggerCounts).forEach(k => lines.push(`${k},${triggerCounts[k]}`));

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "guidance_admin_summary.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  // ============================
  // Firestore subscriptions + actions
  // ============================
  function subscribeAppointments() {
    if (unsubscribeAppointments) unsubscribeAppointments();

    const q = query(collection(db, "appointments"));
    unsubscribeAppointments = onSnapshot(
      q,
      (snap) => {
        appointments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Sort newest first (createdAt Timestamp)
        appointments.sort((a, b) => {
          const at = a.createdAt?.seconds || 0;
          const bt = b.createdAt?.seconds || 0;
          return bt - at;
        });

        renderAppointments();
      },
      (err) => {
        console.error(err);
        if (appointmentList) {
          appointmentList.innerHTML = `<p class="admin-empty">Unable to load appointments. Details: ${err.message}</p>`;
        }
      }
    );
  }

  // Transaction-based Accept:
  // - Block if slot already has Accepted appointment
  // - Accept selected
  // - Auto-cancel other Pending Approval appointments in the same slot
  async function acceptAppointmentTx(appointmentId) {
    const appt = appointments.find((a) => a.id === appointmentId);
    if (!appt) return;

    const date = appt.date;
    const time = appt.time;

    if (!date || !time) {
      alert("Invalid appointment. Missing date/time.");
      return;
    }

    const apptRef = doc(db, "appointments", appointmentId);

    try {
      await runTransaction(db, async (tx) => {
        const apptSnap = await tx.get(apptRef);
        if (!apptSnap.exists()) throw new Error("Appointment no longer exists.");

        const live = apptSnap.data();
        const liveStatus = String(live.status || "");
        const liveDate = live.date;
        const liveTime = live.time;

        // Block if already not pending-like
        if (!String(liveStatus).toLowerCase().includes("pending")) {
          throw new Error("Only pending appointments can be accepted.");
        }

        if (!liveDate || !liveTime) {
          throw new Error("Missing date/time.");
        }

        // Check if slot already accepted (outside tx query, but guarded by re-check below)
        const acceptedQ = query(
          collection(db, "appointments"),
          where("date", "==", liveDate),
          where("time", "==", liveTime),
          where("status", "==", "Accepted")
        );

        const acceptedSnap = await getDocs(acceptedQ);
        const acceptedExists = acceptedSnap.docs.some((d) => d.id !== appointmentId);
        if (acceptedExists) {
          throw new Error("This slot is already allotted (Accepted).");
        }

        // Accept the selected appointment
        tx.update(apptRef, { status: "Accepted", updatedAt: serverTimestamp() });

        // ✅ PUBLIC AVAILABILITY: Write a simple doc { date, time } blocking this slot
        const availRef = doc(db, "availability", `${liveDate}_${liveTime}`);
        tx.set(availRef, {
          date: liveDate,
          time: liveTime,
          appointmentId: appointmentId
        });

        // Auto-cancel other pending requests in same slot
        const pendingQ = query(
          collection(db, "appointments"),
          where("date", "==", liveDate),
          where("time", "==", liveTime),
          where("status", "==", "Pending Approval")
        );

        const pendingSnap = await getDocs(pendingQ);
        pendingSnap.docs.forEach((d) => {
          if (d.id === appointmentId) return;
          tx.update(d.ref, { status: "Cancelled", updatedAt: serverTimestamp() });
        });
      });
    } catch (err) {
      console.error(err);
      alert(err.message || "Unable to accept appointment.");
    }
  }

  async function denyAppointment(appointmentId) {
    try {
      const appt = appointments.find(a => a.id === appointmentId);
      if (appt && appt.date && appt.time) {
        // Remove public block if it exists
        await deleteDoc(doc(db, "availability", `${appt.date}_${appt.time}`));
      }

      await updateDoc(doc(db, "appointments", appointmentId), {
        status: "Cancelled",
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
      alert("Unable to deny appointment.");
    }
  }

  async function completeAppointment(appointmentId) {
    try {
      await updateDoc(doc(db, "appointments", appointmentId), {
        status: "Completed",
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
      alert("Unable to mark as complete.");
    }
  }

  // Event listeners for dashboard controls
  elTime.addEventListener("change", update);
  elGrade.addEventListener("change", update);
  elSearch.addEventListener("input", update);
  btnReset.addEventListener("click", reset);
  btnExport.addEventListener("click", exportSummary);

  update();

  userSearch?.addEventListener("input", renderUserList);
  userGrade?.addEventListener("change", renderUserList);
  userProgram?.addEventListener("change", renderUserList);

  enrolledList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-user-open]");
    if (button) {
      openUserModal(button.dataset.userOpen);
    }
  });

  appointmentList?.addEventListener("click", (event) => {
    const acceptBtn = event.target.closest("[data-accept]");
    const denyBtn = event.target.closest("[data-deny]");
    const openBtn = event.target.closest("[data-appt-open]");

    if (acceptBtn) {
      acceptAppointmentTx(acceptBtn.dataset.accept);
      return;
    }

    if (denyBtn) {
      denyAppointment(denyBtn.dataset.deny);
      return;
    }

    if (openBtn) {
      openAppointmentModal(openBtn.dataset.apptOpen);
      return;
    }
  });

  appointmentModal?.addEventListener("click", (event) => {
    const completeBtn = event.target.closest("[data-complete]");
    if (!completeBtn) return;

    completeAppointment(completeBtn.dataset.complete);
    closeModal(appointmentModal);
  });

  apptFilters.forEach((button) => {
    button.addEventListener("click", () => {
      activeAppointmentFilter = button.dataset.apptFilter;
      apptFilters.forEach((btn) => btn.classList.toggle("is-active", btn === button));
      renderAppointments();
    });
  });

  document.querySelectorAll("[data-modal-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeModal(userModal);
      closeModal(appointmentModal);
    });
  });

  renderUserList();

  onAuthStateChanged(auth, (user) => {
    if (user) {
      subscribeAppointments();
    } else {
      appointments = [];
      renderAppointments();
    }
  });
})();
