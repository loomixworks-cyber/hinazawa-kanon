const body = document.body;
const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-button");
const navLinks = [...document.querySelectorAll(".site-nav a")];
const character = document.querySelector(".character");
const richHero = document.querySelector(".hero");
const scheduler = window.kanonMotion;
const compactMotion = matchMedia("(max-width: 900px)");
const desktopPointerEffects = matchMedia("(min-width: 901px) and (hover: hover) and (pointer: fine)");
const desktopHeaderVisibility = matchMedia("(min-width: 821px)");
const pointerGlow = document.createElement("div");
pointerGlow.className = "pointer-glow";
pointerGlow.setAttribute("aria-hidden", "true");
body.append(pointerGlow);
let lastPageScroll = -1;
let latestPointer = null;
const contentScrollY = () => Math.max(0, window.scrollY - (window.kanonIntroDistance || 0));

const updateHeaderState = () => {
  const contentY = contentScrollY();
  const isScrolled = contentY > 24;
  header?.classList.toggle("is-scrolled", isScrolled);
  body.classList.toggle("desktop-header-hidden", desktopHeaderVisibility.matches && isScrolled);
  body.classList.toggle("mobile-header-visible", contentY > 120 || body.classList.contains("nav-open"));
};

updateHeaderState();

menuButton?.addEventListener("click", () => {
  const isOpen = body.classList.toggle("nav-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  updateHeaderState();
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    body.classList.remove("nav-open");
    menuButton?.setAttribute("aria-expanded", "false");
    updateHeaderState();
  });
});

window.addEventListener("pointermove", (event) => {
  if (!desktopPointerEffects.matches || document.documentElement.classList.contains("intro-active") || reduceMotion.matches || compactMotion.matches) return;
  latestPointer = { clientX: event.clientX, clientY: event.clientY };
  scheduler.request();
}, { passive: true });

function updatePointerMotion() {
  const event = latestPointer;
  latestPointer = null;
  if (!event || document.documentElement.classList.contains("intro-active")) return;

  // One lightweight composited gradient follows the pointer across desktop.
  // No blur/filter, layout reads, blend mode, or second animation loop.
  pointerGlow.style.translate = `${(event.clientX - 210).toFixed(1)}px ${(event.clientY - 210).toFixed(1)}px`;
  pointerGlow.classList.add("is-visible");

  if (!character || richHero?.classList.contains("motion-offscreen")) return;
  const x = (event.clientX / window.innerWidth - 0.5) * 12;
  const y = (event.clientY / window.innerHeight - 0.5) * 8;
  character.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

document.querySelectorAll("[data-reveal]").forEach((element) => revealObserver.observe(element));

const sections = [...document.querySelectorAll("main section[id]")];
const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);

sections.forEach((section) => navObserver.observe(section));

const progressBar = document.querySelector(".scroll-progress span");
const heroCopy = document.querySelector(".hero-copy");
const heroStage = document.querySelector(".hero-stage");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Visibility gates CSS animations, including pseudo-elements, without layout polling.
const animationObserver = new IntersectionObserver(entries => {
  for (const entry of entries) entry.target.classList.toggle('motion-offscreen', !entry.isIntersecting);
}, { threshold: 0 });
document.querySelectorAll('main > section, .hero, .site-footer').forEach(element => {
  element.classList.add('motion-offscreen');
  animationObserver.observe(element);
});

richHero?.addEventListener("pointerleave", () => {
  latestPointer = null;
  if (character) character.style.translate = "0 0";
}, { passive: true });

const updateScrollMotion = () => {
  const scrollMax = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollMax > 0 ? Math.min(1, window.scrollY / scrollMax) : 0;
  progressBar?.style.setProperty("--scroll-progress", `${progress * 100}%`);

  if (document.documentElement.classList.contains('intro-active') || richHero?.classList.contains('motion-offscreen') || reduceMotion.matches || compactMotion.matches) return;
  const heroOffset = Math.min(1, contentScrollY() / Math.max(1, window.innerHeight));
  heroCopy?.style.setProperty("translate", `0 ${heroOffset * -16}px`);
  heroStage?.style.setProperty("translate", `0 ${heroOffset * 24}px`);
};

window.addEventListener('resize', () => { lastPageScroll = -1; });
window.addEventListener('load', () => { lastPageScroll = -1; scheduler.request(); });
const pageSizeObserver = new ResizeObserver(() => { lastPageScroll = -1; scheduler.request(); });
pageSizeObserver.observe(body);
scheduler.add(() => {
  if (document.documentElement.classList.contains('intro-active')) {
    lastPageScroll = -1;
    latestPointer = null;
    pointerGlow.classList.remove("is-visible");
    return;
  }
  if (lastPageScroll !== scrollY) {
    lastPageScroll = scrollY;
    updateHeaderState();
    updateScrollMotion();
  }
  updatePointerMotion();
});
scheduler.request();

const gameWarningLink = document.querySelector("[data-mobile-game-warning]");
const gameWarningModal = document.querySelector(".game-warning-modal");
const gameWarningStart = document.querySelector(".game-warning-start");
const mobileGameWarningQuery = window.matchMedia("(max-width: 820px)");
let gameWarningReturnTarget = null;

const openGameWarning = (trigger) => {
  if (!gameWarningModal) return;
  gameWarningReturnTarget = trigger;
  gameWarningModal.classList.add("is-open");
  gameWarningModal.setAttribute("aria-hidden", "false");
  body.classList.add("game-warning-open");
  document.querySelector(".game-warning-close")?.focus();
};

const closeGameWarning = () => {
  if (!gameWarningModal) return;
  gameWarningModal.classList.remove("is-open");
  gameWarningModal.setAttribute("aria-hidden", "true");
  body.classList.remove("game-warning-open");
  gameWarningReturnTarget?.focus();
};

gameWarningLink?.addEventListener("click", (event) => {
  if (!mobileGameWarningQuery.matches) return;
  event.preventDefault();
  openGameWarning(event.currentTarget);
});

document.querySelectorAll("[data-game-warning-close]").forEach((control) => {
  control.addEventListener("click", closeGameWarning);
});

gameWarningStart?.addEventListener("click", closeGameWarning);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && gameWarningModal?.classList.contains("is-open")) {
    closeGameWarning();
  }
});

const gameSlideshow = document.querySelector("[data-game-slideshow]");
const gameSlideshowFrame = gameSlideshow?.closest(".game-tv");

const restartGameSlideshow = () => {
  if (!gameSlideshowFrame) return;
  gameSlideshowFrame.classList.remove("is-playing");
  void gameSlideshowFrame.offsetWidth;
  window.requestAnimationFrame(() => gameSlideshowFrame.classList.add("is-playing"));
};

const startGameSlideshow = () => {
  const firstSlideImage = gameSlideshow?.querySelector(".game-slide:first-child img");
  if (firstSlideImage && !firstSlideImage.complete) {
    firstSlideImage.addEventListener("load", restartGameSlideshow, { once: true });
    return;
  }
  restartGameSlideshow();
};

if (gameSlideshowFrame && !reduceMotion.matches) {
  if ("IntersectionObserver" in window) {
    const gameSlideshowObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startGameSlideshow();
          } else {
            gameSlideshowFrame.classList.remove("is-playing");
          }
        });
      },
      { threshold: 0.36, rootMargin: "0px 0px -8% 0px" }
    );
    gameSlideshowObserver.observe(gameSlideshowFrame);
  } else {
    startGameSlideshow();
  }
}
