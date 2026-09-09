// One frame queue for intro, page scroll and pointer effects.
(() => {
  const tasks = new Set();
  let frame = 0;
  function request() {
    if (frame || document.hidden) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      tasks.forEach(task => task());
    });
  }
  window.kanonMotion = {
    request,
    add(task) { tasks.add(task); return () => tasks.delete(task); },
  };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
  window.addEventListener('pageshow', request);
  document.addEventListener('visibilitychange', () => {
    document.documentElement.classList.toggle('motion-suspended', document.hidden);
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else request();
  });
})();
