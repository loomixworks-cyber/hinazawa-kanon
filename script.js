const body = document.body;
const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-button");
const navLinks = [...document.querySelectorAll(".site-nav a")];
const cursorLight = document.querySelector(".cursor-light");
const character = document.querySelector(".character");
const contentScrollY = () => Math.max(0, window.scrollY - (window.kanonIntroDistance || 0));

window.addEventListener("load", () => {
  body.classList.add("loaded");
});

window.setTimeout(() => body.classList.add("loaded"), 1200);
const updateHeaderState = () => {
  const isScrolled = contentScrollY() > 24;
  header?.classList.toggle("is-scrolled", isScrolled);
  body.classList.toggle("mobile-header-visible", contentScrollY() > 120 || body.classList.contains("nav-open"));
};

window.addEventListener("scroll", updateHeaderState, { passive: true });
window.addEventListener("resize", updateHeaderState);
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
  cursorLight?.style.setProperty("transform", `translate3d(${event.clientX - 180}px, ${event.clientY - 180}px, 0)`);

  const richHero = document.querySelector(".hero");
  richHero?.style.setProperty("--rich-back-x", `${(event.clientX / window.innerWidth - .5) * -18}px`);
  richHero?.style.setProperty("--rich-back-y", `${(event.clientY / window.innerHeight - .5) * -14}px`);
  richHero?.style.setProperty("--rich-front-x", `${(event.clientX / window.innerWidth - .5) * 34}px`);
  richHero?.style.setProperty("--rich-front-y", `${(event.clientY / window.innerHeight - .5) * 26}px`);

  if (!character || window.matchMedia("(max-width: 900px)").matches) return;
  const x = (event.clientX / window.innerWidth - 0.5) * 18;
  const y = (event.clientY / window.innerHeight - 0.5) * 14;
  character.style.translate = `${x}px ${y}px`;
});

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

document.querySelector("#voiceButton")?.addEventListener("click", (event) => {
  const button = event.currentTarget;
  button.textContent = "Short MV!";
  button.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], {
    duration: 420,
    easing: "ease-out"
  });

  window.setTimeout(() => {
    button.textContent = "Kanon!";
  }, 1200);
});

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
const motionCards = [...document.querySelectorAll(".short-card, .long-video-card, .goods-card, .news-list a, .site-qr")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const updateScrollMotion = () => {
  const scrollMax = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollMax > 0 ? Math.min(1, window.scrollY / scrollMax) : 0;
  progressBar?.style.setProperty("--scroll-progress", `${progress * 100}%`);

  if (reduceMotion.matches || window.matchMedia("(max-width: 900px)").matches) return;
  const heroOffset = Math.min(1, contentScrollY() / Math.max(1, window.innerHeight));
  heroCopy?.style.setProperty("translate", `0 ${heroOffset * -16}px`);
  heroStage?.style.setProperty("translate", `0 ${heroOffset * 24}px`);
};

window.addEventListener("scroll", updateScrollMotion, { passive: true });
window.addEventListener("resize", updateScrollMotion);
updateScrollMotion();

if (!reduceMotion.matches) {
  motionCards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      if (window.matchMedia("(max-width: 900px)").matches) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty("--tilt-x", `${x * 5}deg`);
      card.style.setProperty("--tilt-y", `${y * -5}deg`);
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
    });
  });
}

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
