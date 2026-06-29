const body = document.body;
const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-button");
const navLinks = [...document.querySelectorAll(".site-nav a")];
const cursorLight = document.querySelector(".cursor-light");
const character = document.querySelector(".character");

window.addEventListener("load", () => {
  body.classList.add("loaded");
});

window.setTimeout(() => body.classList.add("loaded"), 1200);

menuButton?.addEventListener("click", () => {
  const isOpen = body.classList.toggle("nav-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    body.classList.remove("nav-open");
    menuButton?.setAttribute("aria-expanded", "false");
  });
});

window.addEventListener("scroll", () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 24);
});

window.addEventListener("pointermove", (event) => {
  cursorLight?.style.setProperty("transform", `translate3d(${event.clientX - 180}px, ${event.clientY - 180}px, 0)`);

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
