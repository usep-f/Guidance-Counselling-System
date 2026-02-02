import "./site-auth-ui.js";

import {
  loginWithEmail,
  registerStudent,
  getLandingPageForUser,
  isAdminUser,
  logout
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

const authError = document.getElementById("authError");
const authSuccess = document.getElementById("authSuccess");

/**
 * Name: showAuthError
 * Description: Displays an error message in the authentication modal.
 */
function showAuthError(msg) {
  if (!authError) return;
  authError.textContent = msg;
  authError.classList.add("is-active");
}

/**
 * Name: showAuthSuccess
 * Description: Displays a success message in the authentication modal.
 */
function showAuthSuccess(msg) {
  if (!authSuccess) return;
  authSuccess.textContent = msg;
  authSuccess.classList.add("is-active");
}

/**
 * Name: clearAuthError
 * Description: Removes any active error messages from the authentication modal.
 */
function clearAuthError() {
  if (!authError) return;
  authError.textContent = "";
  authError.classList.remove("is-active");
}

/**
 * Name: clearAuthSuccess
 * Description: Removes any active success messages from the authentication modal.
 */
function clearAuthSuccess() {
  if (!authSuccess) return;
  authSuccess.textContent = "";
  authSuccess.classList.remove("is-active");
}

/**
 * Name: openAuthModal
 * Description: Opens the login/register modal and initializes the view.
 */
function openAuthModal(defaultView = "login") {
  if (!authModal) return;

  authModal.classList.add("is-open");
  authModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-modal-open");

  setAuthView(defaultView);
  clearAuthError();
  clearAuthSuccess();

  const firstInput = authModal.querySelector(".auth-view.is-active .auth-input");
  if (firstInput) firstInput.focus();
}

/**
 * Name: closeAuthModal
 * Description: Closes the authentication modal and resets relevant UI states.
 */
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

/**
 * Name: setAuthView
 * Description: Switches between the 'login' and 'register' views within the auth modal.
 */
function setAuthView(viewName) {
  clearAuthError();
  clearAuthSuccess();

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

/**
 * Name: setRole
 * Description: Updates the selected role (Student/Admin) for the login process.
 */
function setRole(role) {
  roleBtns.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.role === role));
  if (loginRoleInput) loginRoleInput.value = role;
  clearAuthError();
  clearAuthSuccess();
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

/**
 * Name: goAfterAuth
 * Description: Redirects the user to their landing page or a previously requested protected route.
 */
function goAfterAuth(defaultUrl) {
  const redirect = sessionStorage.getItem("postAuthRedirect");
  if (redirect) sessionStorage.removeItem("postAuthRedirect");
  window.location.href = redirect || defaultUrl;
}

// Login submit (role-enforced)
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    clearAuthError();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
      const user = await loginWithEmail(email, password);

      // Selected role from the toggle (hidden input)
      const selectedRole = (document.getElementById("loginRole")?.value || "student").toLowerCase();
      const selectedIsAdmin = selectedRole === "admin";

      // Real role from claims
      const realIsAdmin = await isAdminUser(user);

      // Block mismatches between selected login portal and real account role
      if (selectedIsAdmin !== realIsAdmin) {
        await logout();

        if (selectedIsAdmin) {
          showAuthError("This account is not an admin. Please switch to Student login.");
        } else {
          showAuthError("This account is an admin. Please switch to Admin login.");
        }

        return; // keep modal open
      }

      const landing = await getLandingPageForUser(user);
      closeAuthModal();
      goAfterAuth(landing);
    } catch (err) {
      showAuthError(err.message);
    }
  });
}

// Register submit (student only)
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    clearAuthError();

    const email = document.getElementById("regEmail").value.trim();
    const name = document.getElementById("regName").value.trim();
    const studentNo = document.getElementById("regStudentNo").value.trim();
    const gradeLevel = document.getElementById("regYearLevel").value.trim();
    const program = document.getElementById("regProgram").value.trim();
    const password = document.getElementById("regPassword").value;

    try {
      const user = await registerStudent({
        email,
        password,
        name,
        studentNo,
        gradeLevel,
        program
      });
      const landing = await getLandingPageForUser(user);

      showAuthSuccess("Registration successful. Redirecting to your dashboard...");

      setTimeout(() => {
        closeAuthModal();
        goAfterAuth(landing);
      }, 900);
    } catch (err) {
      showAuthError(err.message);
    }
  });
}

// Auto-open modal when arriving from other pages (index.html#login)
window.addEventListener("load", () => {
  if (window.location.hash === "#login") {
    openAuthModal("login");
  }
});
