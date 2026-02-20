import "./site-auth-ui.js";

import {
  loginWithEmail,
  registerStudent,
  getLandingPageForUser,
  isAdminUser,
  logout,
  watchAuthState
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

let isAuthProcessing = false;

/**
 * Name: closeAuthModal
 * Description: Closes the authentication modal and resets relevant UI states.
 */
function closeAuthModal() {
  if (!authModal || isAuthProcessing) return;

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
  if (isAuthProcessing) return;
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
  if (isAuthProcessing) return;
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
  if (e.key === "Escape" && authModal?.classList.contains("is-open") && !isAuthProcessing) {
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
 * Validates the redirect to ensure role-appropriate destination.
 */
function goAfterAuth(defaultUrl, isAdmin) {
  const redirect = sessionStorage.getItem("postAuthRedirect");
  if (redirect) {
    sessionStorage.removeItem("postAuthRedirect");

    // VALIDATION: Prevent Admins from going to student pages (and vice-versa)
    const isTargetingAdmin = redirect.includes("admin-dashboard.html");
    const isTargetingStudent = redirect.includes("student-dashboard.html");

    if (isAdmin && isTargetingStudent) {
      // Admin should not go to student dashboard
      window.location.href = defaultUrl;
      return;
    }
    if (!isAdmin && isTargetingAdmin) {
      // Student should not go to admin dashboard
      window.location.href = defaultUrl;
      return;
    }

    window.location.href = redirect;
    return;
  }
  window.location.href = defaultUrl;
}

// Login submit (role-enforced)
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    clearAuthError();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    // Loading state
    isAuthProcessing = true;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `Verifying... <span class="btn__spinner"></span>`;

    // Disable inputs and close buttons to prevent user interference
    const inputs = loginForm.querySelectorAll('input, button');
    inputs.forEach(el => el.disabled = true);
    closeAuthBtns.forEach(btn => btn.disabled = true);

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

        // Restore form state
        isAuthProcessing = false;
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        inputs.forEach(el => el.disabled = false);
        closeAuthBtns.forEach(btn => btn.disabled = false);
        return; // keep modal open
      }

      const landing = await getLandingPageForUser(user);
      isAuthProcessing = false;
      closeAuthModal();
      goAfterAuth(landing, realIsAdmin);
    } catch (err) {
      showAuthError(err.message);
      // Restore form state
      isAuthProcessing = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      inputs.forEach(el => el.disabled = false);
      closeAuthBtns.forEach(btn => btn.disabled = false);
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

    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    isAuthProcessing = true;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `Creating Account... <span class="btn__spinner"></span>`;

    const inputs = registerForm.querySelectorAll('input, button, select');
    inputs.forEach(el => el.disabled = true);
    closeAuthBtns.forEach(btn => btn.disabled = true);

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
        isAuthProcessing = false;
        closeAuthModal();
        goAfterAuth(landing, false);
      }, 900);
    } catch (err) {
      showAuthError(err.message);
      isAuthProcessing = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      inputs.forEach(el => el.disabled = false);
      closeAuthBtns.forEach(btn => btn.disabled = false);
    }
  });
}

// Auto-open modal when arriving from other pages (index.html#login)
watchAuthState((user) => {
  if (user) return; // Don't open if already logged in

  if (window.location.hash === "#login") {
    openAuthModal("login");
  }
});
