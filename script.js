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

// Auth modal (front-end only)
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

function openAuthModal(defaultView = "login") {
  if (!authModal) return;

  authModal.classList.add("is-open");
  authModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-modal-open");

  setAuthView(defaultView);

  // Focus first input
  const firstInput = authModal.querySelector(".auth-view.is-active .auth-input");
  if (firstInput) firstInput.focus();
}

function closeAuthModal() {
  if (!authModal) return;

  authModal.classList.remove("is-open");
  authModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-modal-open");
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

openAuthBtns.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    // Only intercept #login or explicit data-auth-open
    const isLoginAnchor = btn.getAttribute("href") === "#login";
    if (btn.hasAttribute("data-auth-open") || isLoginAnchor) {
      e.preventDefault();
      openAuthModal("login");
    }
  });
});

closeAuthBtns.forEach((btn) => {
  btn.addEventListener("click", closeAuthModal);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && authModal?.classList.contains("is-open")) {
    closeAuthModal();
  }
});

roleBtns.forEach((btn) => {
  btn.addEventListener("click", () => setRole(btn.dataset.role));
});

switchBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-auth-switch");
    setAuthView(target);
  });
});

// Front-end only submit handlers (placeholder)
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const role = loginRoleInput?.value || "student";
    // backend later
    alert(`Login submitted (${role}). Backend to be added.`);
    closeAuthModal();
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    // backend later
    alert("Register submitted (student). Backend to be added.");
    setAuthView("login");
  });
}

