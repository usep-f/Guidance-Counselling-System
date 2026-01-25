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
