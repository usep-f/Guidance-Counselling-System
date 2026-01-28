/* =========================
   STUDENT DASHBOARD (demo)
   ========================= */
(function studentDashboard(){
  const pendingList = document.getElementById("pendingList");
  const trendBox = document.getElementById("trendBox");
  const sessionList = document.getElementById("sessionList");

  if (!pendingList || !trendBox || !sessionList) return;

  const statusPill = document.getElementById("statusPill");
  const statusText = document.getElementById("statusText");
  const sessionsCompleted = document.getElementById("sessionsCompleted");
  const improvementBar = document.getElementById("improvementBar");
  const improvementHint = document.getElementById("improvementHint");

  const dashName = document.getElementById("dashName");
  const dashInitials = document.getElementById("dashInitials");

  // Demo profile (replace later with auth/user session)
  const profile = {
    name: "Juan Dela Cruz",
    id: "2024-00123",
    level: "Grade 11",
    program: "STEM",
    email: "juan.delacruz@example.com",
    contact: "+63 9XX XXX XXXX",
  };

  // Demo pending appointments
  const appointments = [
    { date: "2026-02-03", time: "10:00 AM", type: "In-Person", status: "Pending Approval" },
    { date: "2026-02-10", time: "09:00 AM", type: "Online", status: "Scheduled" },
  ];

  // Demo progress (same idea as your History page)
  const progress = {
    sessions: 4,
    improvementPct: 72,
    status: { label: "Improving", variant: "good" },
    message: "You’re trending upward. Keep following your action steps and attend scheduled sessions.",
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

  function initials(name){
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join("");
  }

  function statusVariant(s){
    const t = s.toLowerCase();
    if (t.includes("pending")) return "warn";
    return "good";
  }

  function renderPending(){
    if (!appointments.length) {
      pendingList.innerHTML = `<p class="form-hint">No pending appointments.</p>`;
      return;
    }

    pendingList.innerHTML = appointments.map(a => {
      return `
        <article class="dash-item">
          <div>
            <p class="dash-item__title">${a.date} · ${a.time}</p>
            <p class="dash-item__meta">${a.type}</p>
          </div>
          <span class="dash-pill" data-variant="${statusVariant(a.status)}">${a.status}</span>
        </article>
      `;
    }).join("");
  }

  function renderProgress(){
    sessionsCompleted.textContent = String(progress.sessions);
    improvementBar.style.width = `${progress.improvementPct}%`;
    improvementHint.textContent = `${progress.improvementPct}% (demo)`;

    statusPill.textContent = progress.status.label;
    statusPill.setAttribute("data-variant", progress.status.variant);
    statusText.textContent = progress.message;

trendBox.innerHTML = progress.trend.map(t => {
  return `
    <div class="pm-row">
      <span class="pm-label">${t.label}</span>
      <div class="pm-bar" aria-label="${t.label} ${t.pct}%">
        <div class="pm-fill" style="width:${t.pct}%"></div>
      </div>
      <span class="pm-value">${t.pct}%</span>
    </div>
  `;
}).join("");


    sessionList.innerHTML = progress.history.map(h => {
      return `
        <article class="session-item">
          <div>
            <p class="session-item__title">${h.title}</p>
            <p class="session-item__meta">${h.meta}</p>
          </div>
          <span class="tag">${h.tag}</span>
        </article>
      `;
    }).join("");
  }

  function renderProfile(){
    dashName.textContent = profile.name;
    dashInitials.textContent = initials(profile.name);
  }

  renderProfile();
  renderPending();
  renderProgress();
})();
