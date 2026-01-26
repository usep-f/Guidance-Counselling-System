// Mobile nav toggle + close on link click
const toggleBtn = document.querySelector(".nav-toggle");
const nav = document.querySelector("[data-nav]");

if (toggleBtn && nav) {
  toggleBtn.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
  });

  nav.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;

    nav.classList.remove("is-open");
    toggleBtn.setAttribute("aria-expanded", "false");
  });
}

document.addEventListener("click", (e) => {
  const nav = document.querySelector("[data-nav]");
  const btn = document.querySelector(".nav-toggle");
  const navbar = document.querySelector(".navbar");
  if (!nav || !btn || !navbar) return;

  if (!navbar.contains(e.target)) {
    nav.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
  }
});

// BOOKING PAGE: stepper + simple calendar availability (front-end only)
(function () {
  const form = document.querySelector("#bookingForm");
  if (!form) return;

  const steps = Array.from(form.querySelectorAll(".bstep"));
  const panels = Array.from(form.querySelectorAll(".bpanel"));
  const btnNext = () => form.querySelector("[data-next]");
  const btnPrev = () => form.querySelector("[data-prev]");

  let active = 0;

  // --- availability (sample only) ---
  // keys: YYYY-MM-DD, values: array of times
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

  function setActiveStep(i) {
    active = Math.max(0, Math.min(i, panels.length - 1));

    panels.forEach((p, idx) => p.classList.toggle("is-active", idx === active));
    steps.forEach((s, idx) => {
      s.classList.toggle("is-active", idx === active);
      s.classList.toggle("is-done", idx < active);
    });

    if (active === 3) buildReview();
  }

  function validatePanel(idx) {
    const panel = panels[idx];
    const required = Array.from(panel.querySelectorAll("[required]"));

    // Step 3 required values are hidden inputs (date/time)
    for (const el of required) {
      if (!el.value) {
        el.focus?.();
        return false;
      }
    }
    return true;
  }

  // stepper click
  steps.forEach((s) => {
    s.addEventListener("click", () => {
      const target = Number(s.dataset.step);
      // prevent skipping forward if current not valid
      if (target > active && !validatePanel(active)) return;
      setActiveStep(target);
    });
  });

  // next/prev (event delegation)
  form.addEventListener("click", (e) => {
    const next = e.target.closest("[data-next]");
    const prev = e.target.closest("[data-prev]");

    if (next) {
      if (!validatePanel(active)) return;
      setActiveStep(active + 1);
    }

    if (prev) {
      setActiveStep(active - 1);
    }
  });

  // submit (demo)
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validatePanel(active)) return;

    alert("Appointment request submitted (demo).");
    form.reset();
    dateInput.value = "";
    timeInput.value = "";
    renderCalendar();
    setActiveStep(0);
  });

  // --- calendar ---
  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function fmtKey(y, m, d) {
    return `${y}-${pad(m)}-${pad(d)}`;
  }

  function monthName(d) {
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
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

    slots.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "slot";
      b.textContent = t;

      b.addEventListener("click", () => {
        // deselect others
        slotGrid.querySelectorAll(".slot").forEach((x) => x.classList.remove("is-selected"));
        b.classList.add("is-selected");
        timeInput.value = t;
      });

      slotGrid.appendChild(b);
    });
  }

  function renderCalendar() {
    const y = view.getFullYear();
    const m = view.getMonth(); // 0-11
    const firstDay = new Date(y, m, 1);
    const startDow = firstDay.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    calTitle.textContent = monthName(view);
    calDays.innerHTML = "";

    // blank slots
    for (let i = 0; i < startDow; i++) {
      const blank = document.createElement("div");
      blank.className = "cal-day is-muted";
      blank.textContent = "";
      calDays.appendChild(blank);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = fmtKey(y, m + 1, d);
      const hasAvail = Boolean(availability[key]);

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-day" + (hasAvail ? " is-available" : " is-muted");
      cell.textContent = String(d);
      if (!hasAvail) cell.disabled = true;

      if (dateInput.value === key) {
        cell.classList.add("is-selected");
      }

      cell.addEventListener("click", () => {
        // select date
        calDays.querySelectorAll(".cal-day").forEach((x) => x.classList.remove("is-selected"));
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

    reviewBox.innerHTML = items
      .map(([k, v]) => `<p><strong>${k}:</strong> ${v || "-"}</p>`)
      .join("");
  }

  renderCalendar();
  setActiveStep(0);
})();
// BOOKING PAGE: stepper + simple calendar availability (front-end only)
(function () {
  const form = document.querySelector("#bookingForm");
  if (!form) return;

  const steps = Array.from(form.querySelectorAll(".bstep"));
  const panels = Array.from(form.querySelectorAll(".bpanel"));
  const btnNext = () => form.querySelector("[data-next]");
  const btnPrev = () => form.querySelector("[data-prev]");

  let active = 0;

  // --- availability (sample only) ---
  // keys: YYYY-MM-DD, values: array of times
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

  function setActiveStep(i) {
    active = Math.max(0, Math.min(i, panels.length - 1));

    panels.forEach((p, idx) => p.classList.toggle("is-active", idx === active));
    steps.forEach((s, idx) => {
      s.classList.toggle("is-active", idx === active);
      s.classList.toggle("is-done", idx < active);
    });

    if (active === 3) buildReview();
  }

  function validatePanel(idx) {
    const panel = panels[idx];
    const required = Array.from(panel.querySelectorAll("[required]"));

    // Step 3 required values are hidden inputs (date/time)
    for (const el of required) {
      if (!el.value) {
        el.focus?.();
        return false;
      }
    }
    return true;
  }

  // stepper click
  steps.forEach((s) => {
    s.addEventListener("click", () => {
      const target = Number(s.dataset.step);
      // prevent skipping forward if current not valid
      if (target > active && !validatePanel(active)) return;
      setActiveStep(target);
    });
  });

  // next/prev (event delegation)
  form.addEventListener("click", (e) => {
    const next = e.target.closest("[data-next]");
    const prev = e.target.closest("[data-prev]");

    if (next) {
      if (!validatePanel(active)) return;
      setActiveStep(active + 1);
    }

    if (prev) {
      setActiveStep(active - 1);
    }
  });

  // submit (demo)
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validatePanel(active)) return;

    alert("Appointment request submitted (demo).");
    form.reset();
    dateInput.value = "";
    timeInput.value = "";
    renderCalendar();
    setActiveStep(0);
  });

  // --- calendar ---
  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function fmtKey(y, m, d) {
    return `${y}-${pad(m)}-${pad(d)}`;
  }

  function monthName(d) {
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
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

    slots.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "slot";
      b.textContent = t;

      b.addEventListener("click", () => {
        // deselect others
        slotGrid.querySelectorAll(".slot").forEach((x) => x.classList.remove("is-selected"));
        b.classList.add("is-selected");
        timeInput.value = t;
      });

      slotGrid.appendChild(b);
    });
  }

  function renderCalendar() {
    const y = view.getFullYear();
    const m = view.getMonth(); // 0-11
    const firstDay = new Date(y, m, 1);
    const startDow = firstDay.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    calTitle.textContent = monthName(view);
    calDays.innerHTML = "";

    // blank slots
    for (let i = 0; i < startDow; i++) {
      const blank = document.createElement("div");
      blank.className = "cal-day is-muted";
      blank.textContent = "";
      calDays.appendChild(blank);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = fmtKey(y, m + 1, d);
      const hasAvail = Boolean(availability[key]);

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-day" + (hasAvail ? " is-available" : " is-muted");
      cell.textContent = String(d);
      if (!hasAvail) cell.disabled = true;

      if (dateInput.value === key) {
        cell.classList.add("is-selected");
      }

      cell.addEventListener("click", () => {
        // select date
        calDays.querySelectorAll(".cal-day").forEach((x) => x.classList.remove("is-selected"));
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

    reviewBox.innerHTML = items
      .map(([k, v]) => `<p><strong>${k}:</strong> ${v || "-"}</p>`)
      .join("");
  }

  renderCalendar();
  setActiveStep(0);
})();
