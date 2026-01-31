/* =========================
   ADMIN DASHBOARD (demo data)
   ========================= */

(function adminDashboard(){
  const tabs = Array.from(document.querySelectorAll("[data-dashboard-tab]"));
  if (tabs.length) {
    const sections = tabs
      .map((tab) => document.querySelector(tab.getAttribute("href")))
      .filter(Boolean);

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

  // Demo dataset (replace later with real DB)
  const demo = [
    { date: "2026-01-03", student: "2024-00123 • Juan D.", emotion: "Stress", trigger: "Academic", severity: "High", status: "Pending Review" },
    { date: "2026-01-05", student: "2024-00456 • Maria S.", emotion: "Anxiety", trigger: "Family", severity: "Medium", status: "Scheduled" },
    { date: "2026-01-08", student: "2024-00089 • Carlo R.", emotion: "Depression", trigger: "Peer", severity: "High", status: "In Session" },
    { date: "2026-01-10", student: "2024-00301 • Bea C.", emotion: "Stress", trigger: "Financial", severity: "Low", status: "Completed" },
    { date: "2026-01-12", student: "2024-00222 • Alex P.", emotion: "Anxiety", trigger: "Academic", severity: "Medium", status: "Pending Review" },
    { date: "2026-01-14", student: "2024-00555 • Nicole V.", emotion: "Stress", trigger: "Peer", severity: "Low", status: "Scheduled" }
  ];

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

  const appointments = [
    {
      id: "APT-001",
      studentId: "2024-00123",
      name: "Juan Dela Cruz",
      year: "Grade 12",
      course: "STEM",
      email: "juan.delacruz@school.edu",
      reason: "Academic Concern",
      mode: "In-Person",
      date: "2026-01-16",
      time: "10:00 AM",
      status: "Pending",
      hidden: false
    },
    {
      id: "APT-002",
      studentId: "2024-00456",
      name: "Maria Santos",
      year: "Grade 11",
      course: "ABM",
      email: "maria.santos@school.edu",
      reason: "Personal Concern",
      mode: "Online",
      date: "2026-01-18",
      time: "01:30 PM",
      status: "Accepted",
      hidden: false
    },
    {
      id: "APT-003",
      studentId: "2024-00589",
      name: "Kyle Ramirez",
      year: "Grade 10",
      course: "HUMSS",
      email: "kyle.ramirez@school.edu",
      reason: "Mental Wellness",
      mode: "In-Person",
      date: "2025-12-11",
      time: "09:30 AM",
      status: "Completed",
      hidden: false
    }
  ];

  let activeAppointmentFilter = "pending";

  function matchesFilters(row){
    const timeVal = elTime?.value || "30";
    const gradeVal = elGrade?.value || "all";
    const q = (elSearch?.value || "").trim().toLowerCase();

    // Demo grade filter (no real grade data here yet)
    if (gradeVal !== "all") {
      // keep as pass for now to avoid hiding everything
    }

    // Search filter
    if (q) {
      if (!row.student.toLowerCase().includes(q)) return false;
    }

    // Time range filter (simple)
    if (timeVal !== "all") {
      const days = Number(timeVal);
      const now = new Date("2026-01-15"); // static demo anchor date
      const d = new Date(row.date);
      const diff = (now - d) / (1000 * 60 * 60 * 24);
      if (diff > days) return false;
    }

    return true;
  }

  function countBy(rows, key){
    const out = {};
    rows.forEach(r => {
      const k = r[key];
      out[k] = (out[k] || 0) + 1;
    });
    return out;
  }

  function topKey(counts){
    let best = { k: "-", v: -1 };
    Object.keys(counts).forEach(k => {
      if (counts[k] > best.v) best = { k, v: counts[k] };
    });
    return best.k;
  }

  function renderBars(container, counts, order){
    const total = Object.values(counts).reduce((a,b) => a + b, 0) || 1;
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

  function pillHTML(text){
    let variant = "done";
    if (text.toLowerCase().includes("pending")) variant = "warn";
    if (text.toLowerCase().includes("scheduled")) variant = "done";
    if (text.toLowerCase().includes("in session")) variant = "done";

    return `<span class="admin-pill" data-variant="${variant}">${text}</span>`;
  }

  function renderTable(rows){
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
    const query = (userSearch?.value || "").trim().toLowerCase();
    const grade = userGrade?.value || "all";
    const program = userProgram?.value || "all";

    if (grade !== "all" && user.year.toLowerCase() !== grade.replace("g", "grade ")) {
      return false;
    }

    if (program !== "all" && user.program !== program) {
      return false;
    }

    if (query) {
      const haystack = `${user.name} ${user.id}`.toLowerCase();
      if (!haystack.includes(query)) return false;
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
    return status.toLowerCase();
  }

  function statusVariant(status) {
    const text = normalizeStatus(status);
    if (text.includes("pending")) return "warn";
    return "done";
  }

  function renderAppointments() {
    if (!appointmentList) return;

    const rows = appointments.filter((appt) => {
      if (appt.hidden) return false;
      const state = normalizeStatus(appt.status);
      if (activeAppointmentFilter === "pending") {
        return state === "pending" || state === "accepted";
      }
      return state === "completed";
    });

    if (!rows.length) {
      appointmentList.innerHTML = `<p class="admin-empty">No appointments available.</p>`;
      return;
    }

    appointmentList.innerHTML = rows
      .map((appt) => {
        const status = appt.status;
        const statusPill = `<span class="admin-pill" data-variant="${statusVariant(status)}">${status}</span>`;
        const showActions = normalizeStatus(appt.status) === "pending";
        const canOpen = normalizeStatus(appt.status) !== "pending";

        return `
          <article class="admin-item">
            <div class="admin-item__main">
              <h3 class="admin-item__title">${appt.name}</h3>
              <p class="admin-item__meta">
                ${appt.studentId} · ${appt.year} · ${appt.course} · ${appt.email}
              </p>
              <p class="admin-item__meta">
                ${appt.reason} · ${appt.mode} · ${appt.date} · ${appt.time}
              </p>
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

    appointmentModalTitle.textContent = `${appt.name} · ${appt.date}`;
    appointmentModalBody.innerHTML = `
      <div class="admin-detail">
        <div class="admin-detail__block">
          <h3>Appointment Details</h3>
          <p><strong>Student ID:</strong> ${appt.studentId}</p>
          <p><strong>Year & Course:</strong> ${appt.year} · ${appt.course}</p>
          <p><strong>Reason:</strong> ${appt.reason}</p>
          <p><strong>Session Type:</strong> ${appt.mode}</p>
          <p><strong>Date & Time:</strong> ${appt.date} · ${appt.time}</p>
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

  function update(){
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

    // Simple pending counter for demo
    const pending = rows.filter(r => r.status.toLowerCase().includes("pending")).length;
    kpiPending.textContent = String(pending);

    const rangeText =
      elTime.value === "all" ? "Across all time" : `Across last ${elTime.value} days`;
    kpiTotalConcernsHint.textContent = rangeText;
  }

  function reset(){
    elTime.value = "30";
    elGrade.value = "all";
    elSearch.value = "";
    update();
  }

  function exportSummary(){
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
      const appt = appointments.find((item) => item.id === acceptBtn.dataset.accept);
      if (appt) appt.status = "Accepted";
      renderAppointments();
      return;
    }

    if (denyBtn) {
      const appt = appointments.find((item) => item.id === denyBtn.dataset.deny);
      if (appt) appt.hidden = true;
      renderAppointments();
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
    const appt = appointments.find((item) => item.id === completeBtn.dataset.complete);
    if (appt) appt.status = "Completed";
    closeModal(appointmentModal);
    renderAppointments();
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
  renderAppointments();
})();
