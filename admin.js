/* =========================
   ADMIN DASHBOARD (Firestore + transaction accept)
   ========================= */

import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged, getIdTokenResult } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
  runTransaction,
  setDoc,
  deleteDoc,
  writeBatch
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
        setActiveTab(targetId);

        if (targetId === "admin-availability") {
          renderAvailCalendar();
        }
      });
    });

    // Set initial tab
    setActiveTab("admin-analytics");
  }

  const emotionsEl = document.getElementById("chartEmotions");
  const triggersEl = document.getElementById("chartTriggers");
  const tableEl = document.getElementById("recentTable");
  const enrolledList = document.getElementById("enrolledList");
  const appointmentList = document.getElementById("appointmentList");
  const userSearch = document.getElementById("userSearch");
  const userYear = document.getElementById("userYear");
  const userCourse = document.getElementById("userCourse");
  const apptFilters = Array.from(document.querySelectorAll("[data-appt-filter]"));
  const userModal = document.getElementById("userModal");
  const userModalTitle = document.getElementById("userModalTitle");
  const userModalBody = document.getElementById("userModalBody");
  const appointmentModal = document.getElementById("appointmentModal");
  const appointmentModalTitle = document.getElementById("appointmentModalTitle");
  const appointmentModalBody = document.getElementById("appointmentModalBody");
  const inquiryList = document.getElementById("inquiryList");
  const inquiryModal = document.getElementById("inquiryModal");
  const inquiryModalTitle = document.getElementById("inquiryModalTitle");
  const inquiryModalBody = document.getElementById("inquiryModalBody");
  const inquiryModalEyebrow = document.getElementById("inquiryModalEyebrow");
  const inquiryResponseForm = document.getElementById("inquiryResponseForm");
  const adminResponseMessage = document.getElementById("adminResponseMessage");
  const btnSubmitInquiryResponse = document.getElementById("btnSubmitInquiryResponse");
  const confirmAcceptModal = document.getElementById("confirmAcceptModal");
  const btnConfirmAction = document.getElementById("btnConfirmAction");
  const confirmModalTitle = document.getElementById("confirmModalTitle");
  const confirmModalBody = document.getElementById("confirmModalBody");

  // Pagination controls
  const paginationControls = document.getElementById("paginationControls");
  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");
  const pageIndicator = document.getElementById("pageIndicator");

  // If we are not on admin.html, do nothing
  if (!emotionsEl || !triggersEl || !tableEl) return;

  const elTime = document.getElementById("timeRange");
  const elYear = document.getElementById("gradeLevel");
  const elSearch = document.getElementById("searchStudent");
  const btnReset = document.getElementById("btnReset");
  const btnExport = document.getElementById("btnExport");

  // Availability UI Elements
  const availCalendarDays = document.getElementById("availCalendarDays");
  const availMonthTitle = document.getElementById("availMonthTitle");
  const prevAvailMonth = document.getElementById("prevAvailMonth");
  const nextAvailMonth = document.getElementById("nextAvailMonth");
  const availSlotManager = document.getElementById("availSlotManager");
  const masterSlotGrid = document.getElementById("masterSlotGrid");
  const availSlotTitle = document.getElementById("availSlotTitle");
  const availDateSubtitle = document.getElementById("availDateSubtitle");
  const availNoDateHint = document.getElementById("availNoDateHint");
  const btnSaveSchedule = document.getElementById("btnSaveSchedule");

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

  // ============================
  // ✅ REAL STUDENTS (Firestore)
  // ============================
  let students = [];
  let unsubscribeStudents = null;

  // ============================
  // ✅ REAL SESSION RECORDS (New)
  // ============================
  let sessionRecords = [];
  let unsubscribeSessionRecords = null;

  // ============================
  // ✅ COUNSELOR SCHEDULES (New)
  // ============================
  let counselorSchedules = [];
  let unsubscribeCounselorSchedules = null;
  let availViewDate = new Date();
  availViewDate.setDate(1);
  let selectedAvailDate = null;
  const AVAIL_MASTER_SLOTS = [
    "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
    "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"
  ];

  // ============================
  // ✅ WEEKLY TEMPLATE (New)
  // ============================
  let weeklyTemplate = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  };
  let unsubscribeWeeklyTemplate = null;

  // Preset configurations
  const PRESET_CONFIGS = {
    full_day: ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
      "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"],
    morning: ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM"],
    afternoon: ["01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"],
    clear: []
  };

  // New UI elements for enhanced availability
  const availViewTabs = Array.from(document.querySelectorAll("[data-avail-view]"));
  const availCalendarView = document.getElementById("availCalendarView");
  const availTemplateView = document.getElementById("availTemplateView");
  const btnSaveTemplate = document.getElementById("btnSaveTemplate");
  const btnUseTemplate = document.getElementById("btnUseTemplate");
  const templateIndicator = document.getElementById("templateIndicator");



  function subscribeSessionRecords() {
    if (unsubscribeSessionRecords) unsubscribeSessionRecords();

    const q = query(collection(db, "session_records"), orderBy("timestamp", "desc"));
    unsubscribeSessionRecords = onSnapshot(
      q,
      (snap) => {
        sessionRecords = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        update(); // Re-run analytics when records change
      },
      (err) => {
        console.error("Error fetching session records:", err);
      }
    );
  }

  function subscribeStudents() {
    if (unsubscribeStudents) unsubscribeStudents();

    const q = query(collection(db, "students"));
    unsubscribeStudents = onSnapshot(
      q,
      (snap) => {
        students = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderUserList();
      },
      (err) => {
        console.error("Error fetching students:", err);
        if (enrolledList) {
          enrolledList.innerHTML = `<p class="admin-empty">Unable to load students.</p>`;
        }
      }
    );
  }

  // ============================
  // ✅ APPOINTMENTS (Firestore)
  // ============================
  let appointments = [];
  let unsubscribeAppointments = null;

  // Pagination state
  let currentPage = 1;
  const itemsPerPage = 5;

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

  // ============================
  // ✅ INQUIRIES (Firestore)
  // ============================
  let inquiries = [];
  let unsubscribeInquiries = null;

  function subscribeInquiries() {
    if (unsubscribeInquiries) unsubscribeInquiries();

    const q = query(collection(db, "inquiries"), orderBy("createdAt", "desc"));
    unsubscribeInquiries = onSnapshot(
      q,
      (snap) => {
        inquiries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderInquiryList();
      },
      (err) => {
        console.error("Error fetching inquiries:", err);
        if (inquiryList) {
          inquiryList.innerHTML = `<p class="admin-empty">Unable to load inquiries.</p>`;
        }
      }
    );
  }

  function renderInquiryList() {
    if (!inquiryList) return;

    if (inquiries.length === 0) {
      inquiryList.innerHTML = `<p class="admin-empty">No inquiries found.</p>`;
      return;
    }

    inquiryList.innerHTML = inquiries
      .map((inq) => {
        const date = inq.createdAt?.toDate ? inq.createdAt.toDate() : new Date();
        const dateStr = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        });
        const timeStr = date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit"
        });

        const statusLabel = inq.status === "replied" ? "Replied" : "Pending";
        const statusVariant = inq.status === "replied" ? "done" : "warn";

        return `
        <div class="admin-item" data-inquiry-id="${inq.id}">
          <div class="admin-item__main">
            <div class="admin-item__info">
              <span class="admin-pill" data-variant="${statusVariant}" style="margin-bottom: 8px;">${statusLabel}</span>
              <span class="admin-item__label">${inq.topic || "General"}</span>
              <h3 class="admin-item__title">${inq.studentName || "Anonymous"}</h3>
              <p class="admin-item__sub">
                ${inq.studentNo || "No ID"} · ${dateStr} at ${timeStr}
              </p>
            </div>
            <div class="admin-item__preview">
               ${inq.message ? inq.message.substring(0, 80) + (inq.message.length > 80 ? "..." : "") : "No content"}
            </div>
          </div>
          <div class="admin-item__actions">
            <button class="btn btn--sm btn--pill btn--ghost" data-inquiry-view="${inq.id}">
              View & Reply
            </button>
          </div>
        </div>
      `;
      })
      .join("");
  }

  let activeInquiryId = null;

  function openInquiryModal(inqId) {
    const inq = inquiries.find((i) => i.id === inqId);
    if (!inq) return;

    activeInquiryId = inqId;

    const date = inq.createdAt?.toDate ? inq.createdAt.toDate() : new Date();
    const dateStr = date.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });

    inquiryModalEyebrow.textContent = `Message from ${inq.studentName || "Anonymous"} (${inq.studentNo || "N/A"})`;
    inquiryModalTitle.textContent = inq.topic || "General Inquiry";

    let bodyHTML = `
      <div class="admin-detail">
        <div class="admin-detail__meta">
          <span><strong>Sent on:</strong> ${dateStr}</span>
        </div>
        <div class="admin-detail__block">
          <p style="white-space: pre-wrap; line-height: 1.6; color: var(--color-text-body);">
            ${inq.message || "No content provided."}
          </p>
        </div>
    `;

    if (inq.status === "replied" && inq.adminResponse) {
      bodyHTML += `
        <div class="admin-detail__block" style="background: rgba(31, 185, 129, 0.05); border-color: rgba(31, 185, 129, 0.2);">
          <h3 style="color: var(--primary);">Counselor Response</h3>
          <p style="white-space: pre-wrap; line-height: 1.6;">${inq.adminResponse}</p>
          <small style="opacity: 0.6;">Replied on ${inq.respondedAt?.toDate ? inq.respondedAt.toDate().toLocaleString() : "just now"}</small>
        </div>
      `;
      inquiryResponseForm.hidden = true;
      btnSubmitInquiryResponse.hidden = true;
    } else {
      inquiryResponseForm.hidden = false;
      btnSubmitInquiryResponse.hidden = false;
      adminResponseMessage.value = ""; // Clear for new reply
    }

    bodyHTML += `</div>`;
    inquiryModalBody.innerHTML = bodyHTML;

    inquiryModal.classList.add("is-open");
    inquiryModal.setAttribute("aria-hidden", "false");
  }

  async function submitInquiryResponse() {
    if (!activeInquiryId) return;
    const response = adminResponseMessage.value.trim();
    if (!response) {
      alert("Please enter a response.");
      return;
    }

    try {
      const inqRef = doc(db, "inquiries", activeInquiryId);
      await updateDoc(inqRef, {
        adminResponse: response,
        respondedAt: serverTimestamp(),
        status: "replied"
      });

      closeModal(inquiryModal);
      activeInquiryId = null;
    } catch (err) {
      console.error("Error submitting response:", err);
      alert("Failed to send response.");
    }
  }

  function matchesUserFilters(user) {
    const queryVal = (userSearch?.value || "").trim().toLowerCase();
    const year = userYear?.value || "all";
    const course = userCourse?.value || "all";

    const uProgram = (user.program || "").toLowerCase();
    const uName = (user.name || "").toLowerCase();
    const uId = (user.studentNo || "").toLowerCase();
    const uYear = (user.gradeLevel || "").toLowerCase();

    if (year !== "all" && uYear !== year.toLowerCase()) {
      return false;
    }

    if (course !== "all" && uProgram !== course.toLowerCase()) {
      return false;
    }

    if (queryVal) {
      const haystack = `${uName} ${uId}`;
      if (!haystack.includes(queryVal)) return false;
    }

    return true;
  }

  function renderUserList() {
    if (!enrolledList) return;
    const rows = students.filter(matchesUserFilters);

    if (!rows.length) {
      enrolledList.innerHTML = `<p class="admin-empty">No enrolled users found.</p>`;
      return;
    }

    enrolledList.innerHTML = rows
      .map((user) => {
        // Find recent appointments for this student
        const userAppts = appointments
          .filter(a => a.studentId === user.id)
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 3);

        const recent = userAppts
          .map((item) => `<span class="admin-tag">${item.date} · ${item.status}</span>`)
          .join("");

        const displayName = user.name || "Student";
        const displayId = user.studentNo || "No ID";
        const displayYear = user.gradeLevel || "Year Level";
        const displayProgram = user.program || "Program";
        const displayEmail = user.email || "";

        return `
          <article class="admin-item">
            <div class="admin-item__main">
              <h3 class="admin-item__title">${displayName}</h3>
              <p class="admin-item__meta">
                ${displayId} · ${displayYear} · ${displayProgram} · ${displayEmail}
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
    const user = students.find((item) => item.id === userId);
    if (!user) return;

    userModalTitle.textContent = user.name || "Student Profile";

    // Get full history
    const history = appointments
      .filter(a => a.studentId === user.id)
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    userModalBody.innerHTML = `
      <div class="admin-detail">
        <div class="admin-detail__block">
          <h3>Student Information</h3>
          <p><strong>Name:</strong> ${user.name || "-"}</p>
          <p><strong>Student No:</strong> ${user.studentNo || "-"}</p>
          <p><strong>Program/Year:</strong> ${user.program || "-"} / ${user.gradeLevel || "-"}</p>
          <p><strong>Email:</strong> ${user.email || "-"}</p>
          <p><strong>Contact:</strong> ${user.contact || "Not provided"}</p>
        </div>
        <div class="admin-detail__block">
          <h3>Appointment History</h3>
          ${history.length === 0 ? '<p class="admin-empty">No appointments found.</p>' : ''}
          <ul class="admin-detail__list">
            ${history
        .map(
          (item) =>
            `<li>${item.date} · ${item.time} <span class="admin-tag">${item.status}</span><br>
             <small>${item.reason || "No reason"} · ${item.mode || "-"}</small>
            </li>`
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

    // 1. First filter the "raw" list based on tabs/search/etc
    const filteredRows = appointments.filter((appt) => {
      const state = normalizeStatus(appt.status);

      // Hide cancelled everywhere for now
      if (state === "cancelled") return false;

      if (activeAppointmentFilter === "pending") {
        return state === "pending approval";
      }
      if (activeAppointmentFilter === "accepted") {
        return state === "accepted";
      }
      return state === "completed";
    });

    if (!filteredRows.length) {
      appointmentList.innerHTML = `<p class="admin-empty">No appointments found.</p>`;
      if (paginationControls) paginationControls.hidden = true;
      return;
    }

    // 2. Calculate pagination on the FILTERED list
    const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    // 3. Slice for current page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const pagedItems = filteredRows.slice(startIndex, startIndex + itemsPerPage);

    // 4. Render only the paged items
    appointmentList.innerHTML = pagedItems
      .map((appt) => {
        const status = appt.status || "-";
        const statusPill = `<span class="admin-pill" data-variant="${statusVariant(status)}">${status}</span>`;

        const state = normalizeStatus(appt.status);

        // Actions only for pending approval
        const showActions = state === "pending approval";
        const canOpen = state === "accepted" || state === "completed";

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
                  ${state === "accepted" ? `
                    <button class="btn btn--pill btn--ghost" type="button" data-deny="${appt.id}">
                      Cancel
                    </button>
                  ` : ""}
                `
            : ""}
            </div>
          </article>
        `;
      })
      .join("");

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    if (!paginationControls) return;

    paginationControls.hidden = false;
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
  }

  function openAppointmentModal(appointmentId) {
    if (!appointmentModal || !appointmentModalBody || !appointmentModalTitle) return;
    const appt = appointments.find((item) => item.id === appointmentId);
    if (!appt) return;

    const title = appt.studentName || appt.studentNo || appt.studentId || "Student";
    appointmentModalTitle.textContent = `${title} · ${appt.date || "-"}`;

    // check if it's already completed to hide "complete" action
    const isCompleted = normalizeStatus(appt.status) === "completed";

    // ✅ Find clinical data if completed
    const record = isCompleted ? sessionRecords.find(r => r.appointmentId === appointmentId) : null;
    const notes = record?.notes || "";
    const savedEmotions = record?.emotions || [];
    const savedTriggers = record?.triggers || [];

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
          <textarea id="sessionNotes" class="admin-textarea" rows="5" placeholder="Type session notes here..." ${isCompleted ? 'disabled' : ''}>${notes}</textarea>
        </div>
        <div class="admin-detail__block">
          <h3>Emotional States</h3>
          <div class="admin-checkgrid" id="emotionGrid">
            <label class="admin-check"><input type="checkbox" value="Stress" ${savedEmotions.includes("Stress") ? "checked" : ""} ${isCompleted ? 'disabled' : ''} /> Stress</label>
            <label class="admin-check"><input type="checkbox" value="Anxiety" ${savedEmotions.includes("Anxiety") ? "checked" : ""} ${isCompleted ? 'disabled' : ''} /> Anxiety</label>
            <label class="admin-check"><input type="checkbox" value="Depression" ${savedEmotions.includes("Depression") ? "checked" : ""} ${isCompleted ? 'disabled' : ''} /> Depression</label>
          </div>
        </div>
        <div class="admin-detail__block">
          <h3>Environmental Triggers</h3>
          <div class="admin-checkgrid" id="triggerGrid">
            <label class="admin-check"><input type="checkbox" value="Family" ${savedTriggers.includes("Family") ? "checked" : ""} ${isCompleted ? 'disabled' : ''} /> Family</label>
            <label class="admin-check"><input type="checkbox" value="Financial" ${savedTriggers.includes("Financial") ? "checked" : ""} ${isCompleted ? 'disabled' : ''} /> Financial</label>
            <label class="admin-check"><input type="checkbox" value="Academic" ${savedTriggers.includes("Academic") ? "checked" : ""} ${isCompleted ? 'disabled' : ''} /> Academic</label>
            <label class="admin-check"><input type="checkbox" value="Peer" ${savedTriggers.includes("Peer") ? "checked" : ""} ${isCompleted ? 'disabled' : ''} /> Peer</label>
          </div>
        </div>
        <div class="admin-detail__block">
          <h3>Progress Tracking</h3>
          <div class="admin-detail__grid" style="display: grid; gap: 16px; grid-template-columns: 1fr 1fr;">
            <div>
              <label class="admin-label">Progress Status</label>
              <select id="progressStatus" class="admin-control" ${isCompleted ? 'disabled' : ''}>
                <option value="Starting" ${record?.status === "Starting" ? "selected" : ""}>Starting</option>
                <option value="Stable" ${record?.status === "Stable" ? "selected" : ""}>Stable</option>
                <option value="Improving" ${record?.status === "Improving" ? "selected" : ""}>Improving</option>
                <option value="Needs Check-in" ${record?.status === "Needs Check-in" ? "selected" : ""}>Needs Check-in</option>
              </select>
            </div>
            <div>
              <label class="admin-label">Wellness Score</label>
              <div class="admin-range-wrap">
                <input type="range" id="wellnessScore" class="admin-range" min="0" max="100" value="${record?.wellnessScore || 50}" ${isCompleted ? 'disabled' : ''}>
                <span class="admin-range-info" id="wellnessVal">${record?.wellnessScore || 50}%</span>
              </div>
            </div>
          </div>
        </div>
        ${!isCompleted ? `
        <div class="admin-detail__actions">
          <button class="btn btn--pill btn--primary" type="button" data-complete="${appt.id}">
            Mark as Complete
          </button>
        </div>
        ` : ""}
      </div>
    `;

    appointmentModal.classList.add("is-open");
    appointmentModal.setAttribute("aria-hidden", "false");

    // ✅ Listen for slider updates
    const scoreSlider = document.getElementById("wellnessScore");
    const scoreVal = document.getElementById("wellnessVal");
    if (scoreSlider && scoreVal) {
      scoreSlider.addEventListener("input", (e) => {
        scoreVal.textContent = `${e.target.value}%`;
      });
    }
  }

  /**
   * Analytics Helpers
   */
  function topKey(obj) {
    let top = "None";
    let max = 0;
    for (const k in obj) {
      if (obj[k] > max) {
        max = obj[k];
        top = k;
      }
    }
    return top;
  }

  function renderBars(container, counts, order) {
    if (!container) return;
    const max = Math.max(...Object.values(counts), 1);

    container.innerHTML = order
      .map((key) => {
        const val = counts[key] || 0;
        const percent = (val / max) * 100;
        return `
        <div class="barrow">
          <span class="barrow__label">${key}</span>
          <div class="bartrack">
            <div class="barfill" style="width: ${percent}%"></div>
          </div>
          <span class="barrow__value">${val}</span>
        </div>
      `;
      })
      .join("");
  }

  function renderTable(data) {
    if (!tableEl) return;
    if (!data.length) {
      tableEl.innerHTML = `<tr><td colspan="6" class="admin-empty">No recent activity.</td></tr>`;
      return;
    }

    tableEl.innerHTML = data
      .map(
        (row) => `
      <tr>
        <td>${row.date}</td>
        <td>${row.student}</td>
        <td>${row.emotion}</td>
        <td>${row.trigger}</td>
        <td>${row.severity}</td>
        <td>
          <span class="admin-pill" data-variant="done">${row.status}</span>
        </td>
      </tr>
    `
      )
      .join("");
  }

  function update() {
    // 1. FILTERS (from inputs)
    const timeVal = elTime?.value || "30";
    const yearVal = elYear?.value || "all";
    const searchVal = (elSearch?.value || "").trim().toLowerCase();

    // 2. Aggregate Data from sessionRecords
    const filteredRecords = sessionRecords.filter(rec => {
      // Time filter
      if (timeVal !== "all") {
        const days = Number(timeVal);
        const now = new Date();
        const d = rec.timestamp?.toDate ? rec.timestamp.toDate() : new Date();
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        if (diff > days) return false;
      }

      // Year Level filter (requires student profile data join or stored year)
      if (yearVal !== "all") {
        if ((rec.gradeLevel || "").toLowerCase() !== yearVal.toLowerCase()) return false;
      }

      // Search filter
      if (searchVal) {
        const haystack = `${rec.studentName} ${rec.studentNo}`.toLowerCase();
        if (!haystack.includes(searchVal)) return false;
      }

      return true;
    });

    // 3. Count Emotions & Triggers
    const emotionCounts = { "Stress": 0, "Anxiety": 0, "Depression": 0 };
    const triggerCounts = { "Family": 0, "Financial": 0, "Academic": 0, "Peer": 0 };

    filteredRecords.forEach(rec => {
      if (Array.isArray(rec.emotions)) {
        rec.emotions.forEach(e => { if (e in emotionCounts) emotionCounts[e]++; });
      }
      if (Array.isArray(rec.triggers)) {
        rec.triggers.forEach(t => { if (t in triggerCounts) triggerCounts[t]++; });
      }
    });

    // 4. Render Bars
    const emotionOrder = ["Stress", "Anxiety", "Depression"];
    const triggerOrder = ["Family", "Financial", "Academic", "Peer"];
    renderBars(emotionsEl, emotionCounts, emotionOrder);
    renderBars(triggersEl, triggerCounts, triggerOrder);

    // 5. Update KPI Cards
    kpiTotalConcerns.textContent = String(filteredRecords.length);
    kpiTopEmotion.textContent = topKey(emotionCounts);
    kpiTopTrigger.textContent = topKey(triggerCounts);

    const rangeText = timeVal === "all" ? "Across all time" : `Across last ${timeVal} days`;
    kpiTotalConcernsHint.textContent = rangeText;

    // 6. Update Pending KPI (from real appointments)
    const pendingCount = appointments.filter(a => normalizeStatus(a.status) === "pending approval").length;
    kpiPending.textContent = String(pendingCount);

    // 7. Render Recent Table (from filteredRecords)
    renderTable(filteredRecords.map(rec => ({
      date: rec.timestamp?.toDate ? rec.timestamp.toDate().toLocaleDateString() : "-",
      student: rec.studentName || "-",
      emotion: (rec.emotions || []).join(", ") || "-",
      trigger: (rec.triggers || []).join(", ") || "-",
      severity: rec.notes ? "Detailed" : "Logged",
      status: "Recorded"
    })));
  }

  function reset() {
    elTime.value = "30";
    elYear.value = "all";
    elSearch.value = "";
    demo = [];
    update();
  }

  function exportSummary() {
    const timeVal = elTime?.value || "30";
    const yearVal = elYear?.value || "all";
    const searchVal = (elSearch?.value || "").trim().toLowerCase();

    // 1. Filter sessionRecords using same logic as update()
    const rows = sessionRecords.filter(rec => {
      if (timeVal !== "all") {
        const days = Number(timeVal);
        const now = new Date();
        const d = rec.timestamp?.toDate ? rec.timestamp.toDate() : new Date();
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        if (diff > days) return false;
      }
      if (yearVal !== "all") {
        if ((rec.gradeLevel || "").toLowerCase() !== yearVal.toLowerCase()) return false;
      }
      if (searchVal) {
        const haystack = `${rec.studentName} ${rec.studentNo}`.toLowerCase();
        if (!haystack.includes(searchVal)) return false;
      }
      return true;
    });

    // 2. Format as CSV
    const csvRows = [];
    // Header
    csvRows.push(["Date", "Student Name", "Student ID", "Year", "Emotions", "Triggers", "Notes"].map(h => `"${h}"`).join(","));

    // Body
    rows.forEach(r => {
      const date = r.timestamp?.toDate ? r.timestamp.toDate().toLocaleDateString() : "-";
      csvRows.push([
        date,
        r.studentName || "-",
        r.studentNo || "-",
        r.gradeLevel || "-",
        (r.emotions || []).join("; "),
        (r.triggers || []).join("; "),
        r.notes || ""
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(","));
    });

    // 3. Download
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `guidance_summary_${new Date().toISOString().split('T')[0]}.csv`;
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
    const apptRef = doc(db, "appointments", appointmentId);

    // Dynamic text for Accept
    if (confirmModalTitle) confirmModalTitle.textContent = "Confirm Appointment";
    if (confirmModalBody) {
      confirmModalBody.innerHTML = `<p>Are you sure you want to accept this appointment request? This will block the selected slot and notify the student.</p>`;
    }
    if (btnConfirmAction) btnConfirmAction.textContent = "Confirm & Accept";

    // Show confirmation modal
    confirmAcceptModal.classList.add("is-open");
    confirmAcceptModal.setAttribute("aria-hidden", "false");

    // Setup the confirm button
    btnConfirmAction.onclick = async () => {
      closeModal(confirmAcceptModal);
      try {
        await runTransaction(db, async (tx) => {
          const apptSnap = await tx.get(apptRef);
          if (!apptSnap.exists()) throw new Error("Appointment no longer exists.");

          const live = apptSnap.data();
          const liveStatus = String(live.status || "");
          const liveDate = live.date;
          const liveTime = live.time;

          if (!String(liveStatus).toLowerCase().includes("pending")) {
            throw new Error("Only pending appointments can be accepted.");
          }

          if (!liveDate || !liveTime) {
            throw new Error("Missing date/time.");
          }

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

          tx.update(apptRef, { status: "Accepted", updatedAt: serverTimestamp() });

          const availRef = doc(db, "availability", `${liveDate}_${liveTime}`);
          tx.set(availRef, {
            date: liveDate,
            time: liveTime,
            appointmentId: appointmentId
          });

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
    };
  }

  async function denyAppointment(appointmentId) {
    const appt = appointments.find(a => a.id === appointmentId);
    if (!appt) return;

    const isAccepted = normalizeStatus(appt.status) === "accepted";

    // Dynamic text for Deny/Cancel
    if (confirmModalTitle) {
      confirmModalTitle.textContent = isAccepted ? "Cancel Appointment" : "Deny Appointment";
    }
    if (confirmModalBody) {
      const msg = isAccepted
        ? "Are you sure you want to cancel this accepted appointment? The slot will be freed for other students."
        : "Are you sure you want to deny this appointment request?";
      confirmModalBody.innerHTML = `<p>${msg}</p>`;
    }
    if (btnConfirmAction) {
      btnConfirmAction.textContent = isAccepted ? "Confirm Cancellation" : "Confirm Deny";
    }

    // Show confirmation modal
    confirmAcceptModal.classList.add("is-open");
    confirmAcceptModal.setAttribute("aria-hidden", "false");

    btnConfirmAction.onclick = async () => {
      closeModal(confirmAcceptModal);
      try {
        if (appt.date && appt.time) {
          // Remove public block if it exists
          await deleteDoc(doc(db, "availability", `${appt.date}_${appt.time}`));
        }

        await updateDoc(doc(db, "appointments", appointmentId), {
          status: "Cancelled",
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.error(err);
        alert("Unable to process cancellation.");
      }
    };
  }

  async function completeAppointment(appointmentId) {
    const appt = appointments.find(a => a.id === appointmentId);
    if (!appt) return;

    // 1. Collect Clinical Data from UI
    const notes = document.getElementById("sessionNotes")?.value || "";
    const emotions = Array.from(document.querySelectorAll("#emotionGrid input:checked")).map(cb => cb.value);
    const triggers = Array.from(document.querySelectorAll("#triggerGrid input:checked")).map(cb => cb.value);

    // ✅ Collect Metrics
    const wellnessScore = Number(document.getElementById("wellnessScore")?.value || 0);
    const status = document.getElementById("progressStatus")?.value || "Starting";

    try {
      // 2. Create the Session Record (Secure Clinical Data)
      await addDoc(collection(db, "session_records"), {
        appointmentId,
        studentId: appt.studentId || "",
        studentName: appt.studentName || "",
        studentNo: appt.studentNo || "",
        gradeLevel: appt.gradeLevel || "",
        notes,
        emotions,
        triggers,
        wellnessScore,
        status,
        timestamp: serverTimestamp()
      });

      // 3. Update Appointment Status to Completed
      await updateDoc(doc(db, "appointments", appointmentId), {
        status: "Completed",
        updatedAt: serverTimestamp()
      });

      console.log("Session record created and appointment completed.");
    } catch (err) {
      console.error("Error completing appointment:", err);
      alert("Unable to mark as complete. Details: " + err.message);
    }
  }

  // Event listeners for dashboard controls
  elTime.addEventListener("change", update);
  elYear.addEventListener("change", update);
  elSearch.addEventListener("input", update);
  btnReset.addEventListener("click", reset);
  btnExport.addEventListener("click", exportSummary);

  update();

  /* 
     NOTE: The following event listeners were redundant or incorrect. 
     The correct listeners for userYear and userCourse are added below 
     in the "User list filter listeners" block. 
     I will remove the specific lines causing ReferenceErrors here.
  */

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
      currentPage = 1; // Reset to page 1 when filter changes
      renderAppointments();
    });
  });

  // User list filter listeners
  if (userSearch) {
    userSearch.addEventListener("input", renderUserList);
  }
  if (userYear) {
    userYear.addEventListener("change", renderUserList);
  }
  if (userCourse) {
    userCourse.addEventListener("change", renderUserList);
  }

  // Pagination event listeners
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderAppointments();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      // Calculate total pages again based on 3-tab filter
      const filtered = appointments.filter((appt) => {
        const state = normalizeStatus(appt.status);
        if (state === "cancelled") return false;
        if (activeAppointmentFilter === "pending") return state === "pending approval";
        if (activeAppointmentFilter === "accepted") return state === "accepted";
        return state === "completed";
      });
      const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

      if (currentPage < totalPages) {
        currentPage++;
        renderAppointments();
      }
    });
  }

  inquiryList?.addEventListener("click", (event) => {
    const viewBtn = event.target.closest("[data-inquiry-view]");
    if (viewBtn) {
      openInquiryModal(viewBtn.dataset.inquiryView);
    }
  });

  btnSubmitInquiryResponse?.addEventListener("click", submitInquiryResponse);

  document.querySelectorAll("[data-modal-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeModal(userModal);
      closeModal(appointmentModal);
      closeModal(inquiryModal);
      closeModal(confirmAcceptModal);
    });
  });

  renderUserList();
  renderInquiryList();


  // ============================
  // ✅ ENHANCED AVAILABILITY MANAGER
  // ============================

  // Subscribe to weekly template
  function subscribeWeeklyTemplate() {
    if (unsubscribeWeeklyTemplate) unsubscribeWeeklyTemplate();

    const templateDoc = doc(db, "weekly_schedule_template", "default");
    unsubscribeWeeklyTemplate = onSnapshot(
      templateDoc,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          weeklyTemplate = {
            monday: data.monday || [],
            tuesday: data.tuesday || [],
            wednesday: data.wednesday || [],
            thursday: data.thursday || [],
            friday: data.friday || [],
            saturday: data.saturday || [],
            sunday: data.sunday || []
          };
        } else {
          // Initialize with empty template
          weeklyTemplate = {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
          };
        }
        renderWeeklyTemplateEditor();
        renderAvailCalendar(); // Refresh calendar to show template indicators
      },
      (err) => console.error("Error fetching weekly template:", err)
    );
  }

  // Get effective schedule for a date (template or override)
  function getEffectiveSchedule(dateKey) {
    // Check if there's an explicit schedule for this date
    const explicitSchedule = counselorSchedules.find(s => s.id === dateKey);
    if (explicitSchedule && explicitSchedule.slots) {
      return { slots: explicitSchedule.slots, source: 'custom' };
    }

    // Otherwise, use weekly template
    const date = new Date(dateKey);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];
    return { slots: weeklyTemplate[dayName] || [], source: 'template' };
  }

  // Render weekly template editor
  function renderWeeklyTemplateEditor() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    days.forEach(day => {
      const container = document.querySelector(`[data-template-slots="${day}"]`);
      const rangeStart = document.querySelector(`[data-template-range-start="${day}"]`);
      const rangeEnd = document.querySelector(`[data-template-range-end="${day}"]`);

      if (!container) return;

      // Populate time range dropdowns
      if (rangeStart && rangeEnd) {
        rangeStart.innerHTML = '<option value="">Start</option>' +
          AVAIL_MASTER_SLOTS.map(slot => `<option value="${slot}">${slot}</option>`).join('');
        rangeEnd.innerHTML = '<option value="">End</option>' +
          AVAIL_MASTER_SLOTS.map(slot => `<option value="${slot}">${slot}</option>`).join('');
      }

      // Render slot checkboxes
      const activeSlots = weeklyTemplate[day] || [];
      container.innerHTML = AVAIL_MASTER_SLOTS.map(slot => `
        <label class="admin-check">
          <input type="checkbox" value="${slot}" ${activeSlots.includes(slot) ? 'checked' : ''} />
          ${slot}
        </label>
      `).join('');
    });
  }

  // Apply preset to a specific day in template
  function applyTemplatePreset(day, presetType) {
    const container = document.querySelector(`[data-template-slots="${day}"]`);
    if (!container) return;

    const slots = PRESET_CONFIGS[presetType] || [];
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach(cb => {
      cb.checked = slots.includes(cb.value);
    });
  }

  // Apply time range to a specific day in template
  function applyTemplateTimeRange(day) {
    const rangeStart = document.querySelector(`[data-template-range-start="${day}"]`);
    const rangeEnd = document.querySelector(`[data-template-range-end="${day}"]`);
    const container = document.querySelector(`[data-template-slots="${day}"]`);

    if (!rangeStart || !rangeEnd || !container) return;

    const startTime = rangeStart.value;
    const endTime = rangeEnd.value;

    if (!startTime || !endTime) {
      alert('Please select both start and end times.');
      return;
    }

    const startIndex = AVAIL_MASTER_SLOTS.indexOf(startTime);
    const endIndex = AVAIL_MASTER_SLOTS.indexOf(endTime);

    if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
      alert('Invalid time range.');
      return;
    }

    const slotsInRange = AVAIL_MASTER_SLOTS.slice(startIndex, endIndex + 1);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach(cb => {
      cb.checked = slotsInRange.includes(cb.value);
    });
  }

  // Save weekly template
  async function saveWeeklyTemplate() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const templateData = {};

    days.forEach(day => {
      const container = document.querySelector(`[data-template-slots="${day}"]`);
      if (container) {
        const checked = Array.from(container.querySelectorAll('input:checked')).map(cb => cb.value);
        templateData[day] = checked;
      }
    });

    try {
      // Save the template
      await setDoc(doc(db, "weekly_schedule_template", "default"), {
        ...templateData,
        updatedAt: serverTimestamp()
      });

      // Auto-apply template to future dates (next 60 days)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysToGenerate = 60; // Generate 2 months ahead
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

      const batch = writeBatch(db);
      let batchCount = 0;

      for (let i = 0; i < daysToGenerate; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + i);

        const dateKey = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}-${String(futureDate.getDate()).padStart(2, "0")}`;
        const dayName = dayNames[futureDate.getDay()];
        const slotsForDay = templateData[dayName] || [];

        // Only create/update if there are slots for this day
        if (slotsForDay.length > 0) {
          const scheduleRef = doc(db, "counselor_schedule", dateKey);
          batch.set(scheduleRef, {
            slots: slotsForDay,
            updatedAt: serverTimestamp(),
            fromTemplate: true // Mark as template-generated
          });
          batchCount++;

          // Firestore batch limit is 500, commit if we reach it
          if (batchCount >= 500) {
            await batch.commit();
            batchCount = 0;
          }
        }
      }

      // Commit remaining batch
      if (batchCount > 0) {
        await batch.commit();
      }

      alert('Weekly template saved and applied to future dates successfully!');
    } catch (err) {
      console.error("Error saving template:", err);
      alert('Failed to save template: ' + err.message);
    }
  }

  // Apply preset to calendar view (single date)
  function applyCalendarPreset(presetType) {
    if (!masterSlotGrid) return;

    const slots = PRESET_CONFIGS[presetType] || [];
    const checkboxes = masterSlotGrid.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach(cb => {
      cb.checked = slots.includes(cb.value);
    });
  }

  // Apply time range to calendar view (single date)
  function applyCalendarTimeRange() {
    if (!rangeStartTime || !rangeEndTime || !masterSlotGrid) return;

    const startTime = rangeStartTime.value;
    const endTime = rangeEndTime.value;

    if (!startTime || !endTime) {
      alert('Please select both start and end times.');
      return;
    }

    const startIndex = AVAIL_MASTER_SLOTS.indexOf(startTime);
    const endIndex = AVAIL_MASTER_SLOTS.indexOf(endTime);

    if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
      alert('Invalid time range.');
      return;
    }

    const slotsInRange = AVAIL_MASTER_SLOTS.slice(startIndex, endIndex + 1);
    const checkboxes = masterSlotGrid.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach(cb => {
      cb.checked = slotsInRange.includes(cb.value);
    });
  }

  // Use template for selected date
  function useTemplateForDate() {
    if (!selectedAvailDate || !masterSlotGrid) return;

    const effective = getEffectiveSchedule(selectedAvailDate);
    const templateSlots = effective.slots;

    const checkboxes = masterSlotGrid.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = templateSlots.includes(cb.value);
    });
  }

  // Switch between calendar and template views
  function switchAvailView(viewMode) {
    if (viewMode === 'calendar') {
      availCalendarView.hidden = false;
      availTemplateView.hidden = true;
    } else {
      availCalendarView.hidden = true;
      availTemplateView.hidden = false;
      renderWeeklyTemplateEditor();
    }

    availViewTabs.forEach(tab => {
      tab.classList.toggle('is-active', tab.dataset.availView === viewMode);
    });
  }

  // ============================
  // ✅ AVAILABILITY MANAGER LOGIC
  // ============================
  function subscribeCounselorSchedules() {
    if (unsubscribeCounselorSchedules) unsubscribeCounselorSchedules();

    const q = query(collection(db, "counselor_schedule"));
    unsubscribeCounselorSchedules = onSnapshot(
      q,
      (snap) => {
        counselorSchedules = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderAvailCalendar();
      },
      (err) => console.error("Error fetching schedules:", err)
    );
  }

  function renderAvailCalendar() {
    if (!availCalendarDays || !availMonthTitle) return;

    const year = availViewDate.getFullYear();
    const month = availViewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDow = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    availMonthTitle.textContent = availViewDate.toLocaleString("en-US", { month: "long", year: "numeric" });
    availCalendarDays.innerHTML = "";

    // Blank cells
    for (let i = 0; i < startDow; i++) {
      const blank = document.createElement("div");
      blank.className = "admin-cal-day is-muted";
      availCalendarDays.appendChild(blank);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const el = document.createElement("div");
      el.className = "admin-cal-day";
      el.textContent = day;

      if (cellDate < today) el.classList.add("is-past");
      if (cellDate.getTime() === today.getTime()) el.classList.add("is-today");

      const hasSchedule = counselorSchedules.some(s => s.id === dateKey && s.slots?.length > 0);
      if (hasSchedule) el.classList.add("has-schedule");

      if (selectedAvailDate === dateKey) el.classList.add("is-active");

      el.addEventListener("click", () => {
        if (cellDate < today) return;
        selectedAvailDate = dateKey;
        renderAvailCalendar();
        openAvailSlotManager(dateKey);
      });

      availCalendarDays.appendChild(el);
    }
  }

  function openAvailSlotManager(dateKey) {
    if (!availSlotManager || !masterSlotGrid || !availDateSubtitle || !availNoDateHint) return;

    availNoDateHint.hidden = true;
    availSlotManager.hidden = false;

    // Format date for subtitle
    const d = new Date(dateKey);
    availDateSubtitle.textContent = d.toLocaleDateString("en-US", { month: 'long', day: 'numeric', year: 'numeric' });

    // Get effective schedule (template or custom)
    const effective = getEffectiveSchedule(dateKey);
    const activeSlots = effective.slots;

    // Show template indicator if using template
    if (templateIndicator) {
      if (effective.source === 'template' && activeSlots.length > 0) {
        templateIndicator.style.display = 'block';
      } else {
        templateIndicator.style.display = 'none';
      }
    }


    masterSlotGrid.innerHTML = AVAIL_MASTER_SLOTS.map(slot => `
      <label class="admin-check">
        <input type="checkbox" value="${slot}" ${activeSlots.includes(slot) ? 'checked' : ''} />
        ${slot}
      </label>
    `).join('');
  }

  async function saveCounselorSchedule() {
    if (!selectedAvailDate) {
      alert("Please select a date first.");
      return;
    }

    const checked = Array.from(masterSlotGrid.querySelectorAll("input:checked")).map(cb => cb.value);

    // Conflict Detection (Option B)
    const conflicts = appointments.filter(appt => {
      const status = String(appt.status || "").toLowerCase();
      return appt.date === selectedAvailDate &&
        !checked.includes(appt.time) &&
        (status === "pending approval" || status === "accepted");
    });

    if (conflicts.length > 0) {
      const acceptedCount = conflicts.filter(c => String(c.status || "").toLowerCase() === "accepted").length;
      const pendingCount = conflicts.filter(c => String(c.status || "").toLowerCase() === "pending approval").length;

      let msg = `You are removing slots that have active appointments:\n`;
      if (pendingCount > 0) msg += `- ${pendingCount} Pending request(s) will be auto-cancelled.\n`;
      if (acceptedCount > 0) msg += `- ${acceptedCount} Accepted appointment(s) will be cancelled.\n`;
      msg += `\nDo you want to proceed and notify these students?`;

      if (!confirm(msg)) return;

      // Batch Handling
      try {
        for (const appt of conflicts) {
          const status = String(appt.status || "").toLowerCase();
          await updateDoc(doc(db, "appointments", appt.id), {
            status: "Cancelled",
            adminNote: "Counselor schedule updated; time slot removed.",
            updatedAt: serverTimestamp()
          });

          if (status === "accepted") {
            await deleteDoc(doc(db, "availability", `${appt.date}_${appt.time}`));
          }
        }
      } catch (err) {
        console.error("Error handling conflicts:", err);
        alert("Failed to update conflicting appointments. Schedule not saved.");
        return;
      }
    }

    try {
      await setDoc(doc(db, "counselor_schedule", selectedAvailDate), {
        slots: checked,
        updatedAt: serverTimestamp()
      });
      alert(`Schedule saved for ${selectedAvailDate}.`);
    } catch (err) {
      console.error("Error saving schedule:", err);
      alert("Failed to save schedule.");
    }
  }

  function changeAvailMonth(offset) {
    availViewDate.setMonth(availViewDate.getMonth() + offset);
    renderAvailCalendar();
  }

  // Event Listeners for Availability
  prevAvailMonth?.addEventListener("click", () => changeAvailMonth(-1));
  nextAvailMonth?.addEventListener("click", () => changeAvailMonth(1));
  btnSaveSchedule?.addEventListener("click", saveCounselorSchedule);

  // ✅ NEW: Enhanced Availability Event Listeners

  // View switching (Calendar vs Template)
  availViewTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      switchAvailView(tab.dataset.availView);
    });
  });

  // Calendar view: Quick presets
  document.addEventListener("click", (e) => {
    const presetBtn = e.target.closest("[data-preset]");
    if (presetBtn && !presetBtn.closest("#availTemplateView")) {
      applyCalendarPreset(presetBtn.dataset.preset);
    }
  });

  // Calendar view: Use template button
  btnUseTemplate?.addEventListener("click", useTemplateForDate);

  // Template view: Preset buttons
  document.addEventListener("click", (e) => {
    const templatePresetBtn = e.target.closest("[data-template-preset]");
    if (templatePresetBtn) {
      const day = templatePresetBtn.dataset.templatePreset;
      const presetType = templatePresetBtn.dataset.presetType;
      applyTemplatePreset(day, presetType);
    }
  });

  // Template view: Save template
  btnSaveTemplate?.addEventListener("click", saveWeeklyTemplate);


  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        // Force token refresh to ensure custom claims (admin: true) are loaded
        const tokenResult = await getIdTokenResult(user, true);
        if (tokenResult.claims.admin !== true) {
          console.warn("User is not an admin. Redirecting...");
          window.location.href = "login.html";
          return;
        }

        // Only start subscriptions if verified as admin
        subscribeStudents();
        subscribeAppointments();
        subscribeInquiries();
        subscribeSessionRecords();
        subscribeCounselorSchedules();
        subscribeWeeklyTemplate(); // ✅ NEW: Subscribe to weekly template
      } catch (err) {
        console.error("Error verifying admin status:", err);
        window.location.href = "login.html";
      }
    } else {
      students = [];
      appointments = [];
      inquiries = [];
      sessionRecords = [];
      renderUserList();
      renderAppointments();
      renderInquiryList();
      update();
    }
  });
})();
