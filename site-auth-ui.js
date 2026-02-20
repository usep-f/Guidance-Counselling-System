// site-auth-ui.js
import {
  watchAuthState,
  getAccountLabel,
  logout,
  getLandingPageForUser
} from "./auth-backend.js";

// Prevent flicker by hiding content until auth state is resolved
document.documentElement.classList.add("auth-pending");

const navCta = document.querySelector(".nav-cta");
const logoutBtn = document.getElementById("logoutBtn");
const navbar = document.querySelector(".navbar");
const dashboardLink = document.querySelector("[data-dashboard-link]");

// Mobile nav toggle + close on link click (works on every page that has the navbar)
const toggleBtn = document.querySelector(".nav-toggle");
const nav = document.querySelector("[data-nav]");

/**
 * Name: buildInitials
 * Description: Generates a 2-letter uppercase initial string from a user's display label.
 */
function buildInitials(label = "") {
  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

if (toggleBtn && nav) {
  // Handle mobile menu expansion
  toggleBtn.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
  });

  // Automatically close mobile menu when a navigation link is clicked
  nav.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    nav.classList.remove("is-open");
    toggleBtn.setAttribute("aria-expanded", "false");
  });
}

// Close mobile menu if user clicks outside the navigation bar
document.addEventListener("click", (e) => {
  if (!navbar || !nav || !toggleBtn) return;
  if (!navbar.contains(e.target)) {
    nav.classList.remove("is-open");
    toggleBtn.setAttribute("aria-expanded", "false");
  }
});

let currentUser = null;
let authStateSequence = 0; // Sequence counter to prevent race conditions

/**
 * Name: openLoginUX
 * Description: Opens the login modal or redirects to the landing page to trigger authentication.
 */
function openLoginUX() {
  // If index page has modal handler exposed, open it
  if (typeof window.__openAuthModal === "function") {
    window.__openAuthModal("login");
    return;
  }
  // Otherwise redirect to index + auto-open modal
  window.location.href = "index.html#login";
}

/**
 * Name: setPostAuthRedirect
 * Description: Stores the intended destination URL in sessionStorage for redirection after successful login.
 */
function setPostAuthRedirect(href) {
  sessionStorage.setItem("postAuthRedirect", href);
}

// Global listener for Firebase Auth changes
watchAuthState(async (user) => {
  const currentSeq = ++authStateSequence;
  currentUser = user || null;
  let landing = null;

  // Update the primary navigation Call-To-Action (CTA) button
  if (navCta && navCta.id !== "logoutBtn") {
    if (!user) {
      if (currentSeq !== authStateSequence) return;
      // Show generic Login/Register button for guests
      navCta.classList.remove("nav-cta--user");
      navCta.innerHTML = `Login / Register <span class="btn__icon" aria-hidden="true">→</span>`;
      navCta.setAttribute("href", "index.html#login");
      navCta.onclick = (e) => {
        e.preventDefault();
        openLoginUX();
      };
    } else {
      // Show user profile avatar and label for authenticated users
      const label = await getAccountLabel(user);
      if (currentSeq !== authStateSequence) return;

      const initials = buildInitials(label || "User");
      navCta.classList.add("nav-cta--user");
      navCta.innerHTML = `
        <span class="nav-cta__avatar" aria-hidden="true">
          <span class="nav-cta__initials">${initials || "U"}</span>
        </span>
        <span class="nav-cta__name">${label || "User"}</span>
      `;

      landing = await getLandingPageForUser(user);
      if (currentSeq !== authStateSequence) return;

      navCta.setAttribute("href", landing);
      navCta.onclick = null;
    }
  }

  // Update specific dashboard links visibility and targets
  if (dashboardLink) {
    if (user) {
      if (!landing) {
        landing = await getLandingPageForUser(user);
        if (currentSeq !== authStateSequence) return;
      }
      dashboardLink.setAttribute("href", landing);
      dashboardLink.textContent = "Dashboard";
      dashboardLink.classList.add("is-visible");
      dashboardLink.onclick = null;
    } else {
      if (currentSeq !== authStateSequence) return;
      dashboardLink.setAttribute("href", "index.html#login");
      dashboardLink.textContent = "Login";
      dashboardLink.classList.add("is-visible");
      dashboardLink.onclick = (e) => {
        e.preventDefault();
        openLoginUX();
      };
    }
  }

  // Toggle global logout button visibility
  if (currentSeq === authStateSequence) {
    if (logoutBtn) {
      logoutBtn.style.display = user ? "inline-flex" : "none";
    }

    // Resolve auth resolution and reveal page content
    document.documentElement.classList.remove("auth-pending");
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await logout();
      sessionStorage.clear(); // Clear navigation state and other temporary data
      window.location.href = "index.html";
    } catch (err) {
      alert(err.message);
    }
  });
}

/**
 * Handle route protection for links with data-requires-auth="true"
 * Redirects guests to login and saves their intended destination.
 */
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
