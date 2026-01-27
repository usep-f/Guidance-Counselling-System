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

// Mobile nav toggle + close on link click (works on every page that has the navbar)
const toggleBtn = document.querySelector(".nav-toggle");
const nav = document.querySelector("[data-nav]");
const navbar = document.querySelector(".navbar");

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

  if (navCta) {
    if (!user) {
      navCta.innerHTML = `Login / Register <span class="btn__icon" aria-hidden="true">→</span>`;
      navCta.setAttribute("href", "index.html#login");
      navCta.onclick = (e) => {
        e.preventDefault();
        openLoginUX();
      };
    } else {
      const label = getAccountLabel(user);
      navCta.textContent = label;

      const landing = await getLandingPageForUser(user);
      navCta.setAttribute("href", landing);

      navCta.onclick = null;
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
