/* =========================
   ADMIN DASHBOARD (demo data)
   ========================= */

(function adminDashboard(){
  const emotionsEl = document.getElementById("chartEmotions");
  const triggersEl = document.getElementById("chartTriggers");
  const tableEl = document.getElementById("recentTable");

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
})();
