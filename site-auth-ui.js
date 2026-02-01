// site-auth-ui.js
import {
  watchAuthState,
  getAccountLabel,
  logout,
  getLandingPageForUser
} from "./auth-backend.js";

// Prevent flicker
document.documentElement.classList.add("auth-pending");

const navCta = document.querySelector(".nav-cta");
const logoutBtn = document.getElementById("logoutBtn");
const navbar = document.querySelector(".navbar");
const dashboardLink = document.querySelector("[data-dashboard-link]");

// Mobile nav toggle + close on link click (works on every page that has the navbar)
const toggleBtn = document.querySelector(".nav-toggle");
const nav = document.querySelector("[data-nav]");
function buildInitials(label = "") {
  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

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
  if (!navbar || !nav || !toggleBtn) return;
  if (!navbar.contains(e.target)) {
    nav.classList.remove("is-open");
    toggleBtn.setAttribute("aria-expanded", "false");
  }
});

let currentUser = null;

function openLoginUX() {
  // If index page has modal handler exposed, open it
  if (typeof window.__openAuthModal === "function") {
    window.__openAuthModal("login");
    return;
  }
  // Otherwise redirect to index + auto-open modal
  window.location.href = "index.html#login";
}

function setPostAuthRedirect(href) {
  sessionStorage.setItem("postAuthRedirect", href);
}

watchAuthState(async (user) => {
  currentUser = user || null;
  let landing = null;

  if (navCta && navCta.id !== "logoutBtn") {
    if (!user) {
      navCta.classList.remove("nav-cta--user");
      navCta.innerHTML = `Login / Register <span class="btn__icon" aria-hidden="true">→</span>`;
      navCta.setAttribute("href", "index.html#login");
      navCta.onclick = (e) => {
        e.preventDefault();
        openLoginUX();
      };
    } else {
      const label = getAccountLabel(user);
      const initials = buildInitials(label || "User");
      navCta.classList.add("nav-cta--user");
      navCta.innerHTML = `
        <span class="nav-cta__avatar" aria-hidden="true">
          <span class="nav-cta__initials">${initials || "U"}</span>
        </span>
        <span class="nav-cta__name">${label || "User"}</span>
      `;

      landing = await getLandingPageForUser(user);
      navCta.setAttribute("href", landing);

      navCta.onclick = null;
    }
  }

  if (dashboardLink) {
    if (user) {
      if (!landing) {
        landing = await getLandingPageForUser(user);
      }
      dashboardLink.setAttribute("href", landing);
      dashboardLink.classList.add("is-visible");
    } else {
      dashboardLink.setAttribute("href", "#");
      dashboardLink.classList.remove("is-visible");
    }
  }

  if (logoutBtn) {
    logoutBtn.style.display = user ? "inline-flex" : "none";
  }

  // auth resolved
  document.documentElement.classList.remove("auth-pending");
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await logout();
      window.location.href = "index.html";
    } catch (err) {
      alert(err.message);
    }
  });
}

// OPTIONAL: gate any links that require auth.
// Add data-requires-auth="true" to <a> tags you want protected.
document.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (!a) return;

  const requiresAuth = a.getAttribute("data-requires-auth") === "true";
  if (!requiresAuth) return;

  if (!currentUser) {
    e.preventDefault();
    setPostAuthRedirect(a.getAttribute("href") || "dashboard.html");
    openLoginUX();
  }
});
