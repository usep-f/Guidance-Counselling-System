/**
 * Hero Slideshow
 * — Crossfades 5 images in the hero card
 * — Simultaneously fades the matching ambient-blur layer behind the hero
 * — Dot indicators follow the current slide and support manual navigation
 * — Auto-advances every 5 s; pauses on hover
 */

const INTERVAL_MS  = 5000;   // time between auto-advances
const TOTAL_SLIDES = 5;

function initHeroSlideshow() {
  const cardImgs   = document.querySelectorAll('.hero-card__img');
  const ambientImg = document.querySelectorAll('.hero__ambient-img');
  const dots       = document.querySelectorAll('.hero-dot');
  const card       = document.querySelector('.hero-card');

  if (!cardImgs.length || !ambientImg.length) return;

  let current  = 0;
  let timer    = null;
  let paused   = false;

  /** Transition to a specific slide index */
  function goTo(next) {
    if (next === current) return;

    // Deactivate current
    cardImgs[current].classList.remove('is-active');
    ambientImg[current].classList.remove('is-active');
    dots[current]?.classList.remove('is-active');

    // Activate next
    current = next;
    cardImgs[current].classList.add('is-active');
    ambientImg[current].classList.add('is-active');
    dots[current]?.classList.add('is-active');
  }

  /** Advance to the next slide (wraps around) */
  function advance() {
    goTo((current + 1) % TOTAL_SLIDES);
  }

  /** Start the auto-advance timer */
  function startTimer() {
    clearInterval(timer);
    timer = setInterval(advance, INTERVAL_MS);
  }

  // Wire dot buttons for manual navigation
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.index, 10);
      goTo(idx);
      // Reset the timer so a manual click doesn't immediately auto-advance
      if (!paused) startTimer();
    });
  });

  // Pause auto-advance on hover so users can study a image
  card?.addEventListener('mouseenter', () => {
    paused = true;
    clearInterval(timer);
  });
  card?.addEventListener('mouseleave', () => {
    paused = false;
    startTimer();
  });

  // Respect prefers-reduced-motion — disable auto-advance
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!prefersReduced.matches) {
    startTimer();
  }
}

// Wait for the DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeroSlideshow);
} else {
  initHeroSlideshow();
}
