import "./site-auth-ui.js";

import {
  loginWithEmail,
  registerStudent,
  getLandingPageForUser
} from "./auth-backend.js";

// Auth modal elements
const authModal = document.getElementById("authModal");
const openAuthBtns = document.querySelectorAll("[data-auth-open], a[href='#login']");
const closeAuthBtns = document.querySelectorAll("[data-auth-close]");
const loginRoleInput = document.getElementById("loginRole");

const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");

const views = {
  login: document.querySelector("[data-auth-view='login']"),
  register: document.querySelector("[data-auth-view='register']")
};

const roleBtns = document.querySelectorAll(".auth-role__btn");
const switchBtns = document.querySelectorAll("[data-auth-switch]");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

function openAuthModal(defaultView = "login") {
  if (!authModal) return;

  authModal.classList.add("is-open");
  authModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-modal-open");

  setAuthView(defaultView);

  const firstInput = authModal.querySelector(".auth-view.is-active .auth-input");
  if (firstInput) firstInput.focus();
}

function closeAuthModal() {
  if (!authModal) return;

  authModal.classList.remove("is-open");
  authModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-modal-open");

  // Remove #login so refresh doesn't reopen the modal
  if (window.location.hash === "#login") {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

function setAuthView(viewName) {
  const isLogin = viewName === "login";

  if (views.login) views.login.classList.toggle("is-active", isLogin);
  if (views.register) views.register.classList.toggle("is-active", !isLogin);

  if (authTitle) authTitle.textContent = isLogin ? "Login" : "Register";
  if (authSubtitle) {
    authSubtitle.textContent = isLogin
      ? "Choose your account type and enter your credentials."
      : "Create your student account to start booking appointments.";
  }
}

function setRole(role) {
  roleBtns.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.role === role));
  if (loginRoleInput) loginRoleInput.value = role;
}

// Expose modal opener so other pages can redirect to index.html#login and open it
window.__openAuthModal = openAuthModal;

openAuthBtns.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const isLoginAnchor = btn.getAttribute("href") === "#login";
    if (btn.hasAttribute("data-auth-open") || isLoginAnchor) {
      e.preventDefault();
      openAuthModal("login");
    }
  });
});

closeAuthBtns.forEach((btn) => btn.addEventListener("click", closeAuthModal));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && authModal?.classList.contains("is-open")) {
    closeAuthModal();
  }
});

roleBtns.forEach((btn) => btn.addEventListener("click", () => setRole(btn.dataset.role)));

switchBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-auth-switch");
    setAuthView(target);
  });
});

function goAfterAuth(defaultUrl) {
  const redirect = sessionStorage.getItem("postAuthRedirect");
  if (redirect) sessionStorage.removeItem("postAuthRedirect");
  window.location.href = redirect || defaultUrl;
}

// Login submit
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
      const user = await loginWithEmail(email, password);
      const landing = await getLandingPageForUser(user);

      closeAuthModal();
      goAfterAuth(landing);
    } catch (err) {
      alert(err.message);
    }
  });
}

// Register submit (student only)
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("regEmail").value.trim();
    const name = document.getElementById("regName").value.trim();
    const password = document.getElementById("regPassword").value;

    try {
      const user = await registerStudent({ email, password, name });
      const landing = await getLandingPageForUser(user);

      closeAuthModal();
      goAfterAuth(landing);
    } catch (err) {
      alert(err.message);
    }
  });
}

// Auto-open modal when arriving from other pages (index.html#login)
window.addEventListener("load", () => {
  if (window.location.hash === "#login") {
    openAuthModal("login");
  }
});
