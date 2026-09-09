(() => {
  'use strict';
  const root = document.documentElement;
  const overlay = document.querySelector('.kanon-intro');
  const hero = document.querySelector('.hero');
  if (!overlay || !hero) return;
  if (!root.classList.contains('intro-pending')) { overlay.remove(); return; }
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const options = { signal: events.signal };
  const journey = document.createElement('div');
  const stage = document.createElement('div');
  journey.className = 'kanon-journey';
  stage.className = 'kanon-stage';
  hero.before(journey);
  journey.append(stage);
  stage.append(hero);
  const inertState = [...document.querySelectorAll('main, .site-header, .site-footer')].map(el => [el, el.inert]);
  const clamp = value => Math.min(1, Math.max(0, value));
  const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const fps = 24;
  const connection = navigator.connection;
  const lightweight = matchMedia('(max-width: 820px)').matches || connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '');
  const videoSource = `assets/video/kanon-intro-${lightweight ? 'mobile' : 'desktop'}.mp4`;
  let distance = Math.max(2400, innerHeight * 4);
  let viewportWidth = innerWidth;
  let progress = 0;
  let frame = 0;
  let video = null;
  let loadingTimer, seekTimer;
  let videoUnavailable = false;
  let disposed = false;
  let active = null;

  function releaseVideo() {
    clearTimeout(loadingTimer);
    clearTimeout(seekTimer);
    if (!video) return;
    const old = video;
    video = null;
    old.pause();
    old.removeAttribute('src');
    old.load();
    old.remove();
    overlay.classList.remove('is-ready');
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    const y = Math.max(0, scrollY - distance);
    const returnFocus = overlay.contains(document.activeElement);
    events.abort();
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    clearTimeout(window.kanonIntroWatchdog);
    releaseVideo();
    journey.replaceWith(hero);
    overlay.remove();
    root.classList.remove('intro-pending', 'intro-enabled', 'intro-active');
    root.style.removeProperty('--intro-reveal');
    inertState.forEach(([el, inert]) => { el.inert = inert; });
    delete window.kanonIntroDistance;
    delete window.kanonIntroFinish;
    scrollTo({ top: y, behavior: 'instant' });
    if (returnFocus) document.querySelector('.brand')?.focus({ preventScroll: true });
    window.dispatchEvent(new Event('scroll'));
  }
  function requestFrame() {
    if (!disposed && !frame && !document.hidden) frame = requestAnimationFrame(render);
  }
  function seek() {
    const v = video;
    if (!v || v.readyState < 2 || !Number.isFinite(v.duration)) return;
    // Seek once per encoded frame, coalescing rapid scroll input while decoding.
    const lastFrame = Math.max(0, Math.round(v.duration * fps) - 1);
    const target = Math.round(clamp(progress / .82) * lastFrame) / fps;
    if (v.seeking) return; // Coalesce input; seeked renders only the latest target.
    if (Math.abs(v.currentTime - target) < 1 / 48) {
      overlay.classList.add('is-ready');
      clearTimeout(loadingTimer);
      return;
    }
    try {
      v.currentTime = target;
      clearTimeout(seekTimer);
      seekTimer = setTimeout(usePoster, 8000);
    } catch { /* Data events retry; the loading timeout remains armed. */ }
  }
  function usePoster() {
    // A failed download must never advance the page without a scroll gesture.
    videoUnavailable = true;
    releaseVideo();
  }
  function loadVideo() {
    if (video || disposed || videoUnavailable) return;
    const v = document.createElement('video');
    video = v;
    v.className = 'kanon-intro-video';
    v.muted = v.defaultMuted = true;
    v.playsInline = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('aria-hidden', 'true');
    v.tabIndex = -1;
    v.disablePictureInPicture = true;
    v.preload = 'auto';
    v.addEventListener('error', () => { if (video === v) usePoster(); }, { once: true });
    v.addEventListener('play', () => v.pause());
    for (const event of ['loadeddata', 'canplay', 'seeked']) {
      v.addEventListener(event, () => {
        if (video !== v) return;
        if (event === 'seeked') clearTimeout(seekTimer);
        requestFrame();
      });
    }
    overlay.prepend(v);
    loadingTimer = setTimeout(usePoster, 12000);
    v.src = videoSource;
    v.load(); // Decode while paused; currentTime is driven exclusively by scroll.
  }
  function measure() {
    if (disposed) return;
    // Ignore mobile address-bar height changes when measuring scroll distance.
    if (Math.abs(innerWidth - viewportWidth) > 80) {
      viewportWidth = innerWidth;
      const before = distance;
      distance = Math.max(2400, innerHeight * 4);
      if (scrollY > 0) scrollTo({ top: scrollY < before ? scrollY / before * distance : scrollY + distance - before, behavior: 'instant' });
    }
    journey.style.height = `${stage.offsetHeight + distance}px`;
    window.kanonIntroDistance = distance;
    requestFrame();
  }
  function render() {
    frame = 0;
    progress = clamp(scrollY / distance);
    const isActive = progress < 1;
    if (active !== isActive) {
      active = isActive;
      const returnFocus = overlay.contains(document.activeElement);
      root.classList.toggle('intro-active', active);
      overlay.inert = !active;
      overlay.setAttribute('aria-hidden', String(!active));
      inertState.forEach(([el, inert]) => { el.inert = active || inert; });
      if (!active && returnFocus) document.querySelector('.brand')?.focus({ preventScroll: true });
    }
    const mist = ease((progress - .738) / .082);
    const reveal = ease((progress - .84) / .16);
    overlay.style.setProperty('--intro-mist', mist.toFixed(4));
    overlay.style.setProperty('--intro-opacity', (1 - reveal).toFixed(4));
    overlay.style.setProperty('--intro-hint', (1 - ease(progress / .12)).toFixed(4));
    root.style.setProperty('--intro-reveal', reveal.toFixed(4));
    if (!active) { releaseVideo(); return; }
    loadVideo();
    if (!video) return;
    const t = clamp(progress / .82) * 6;
    const points = [[0, 23], [.7, 23], [1.3, 45], [2.1, 45], [2.9, 30], [3.6, 27], [6, 27]];
    let i = 1;
    while (i < points.length - 1 && t > points[i][0]) i++;
    const [a, b] = [points[i - 1], points[i]];
    const focus = a[1] + (b[1] - a[1]) * ease((t - a[0]) / (b[0] - a[0]));
    overlay.style.setProperty('--intro-focus', `${focus.toFixed(2)}%`);
    seek();
  }
  const resizeObserver = new ResizeObserver(measure);
  window.kanonIntroFinish = dispose;
  clearTimeout(window.kanonIntroWatchdog);
  root.classList.add('intro-enabled', 'intro-active');
  root.classList.remove('intro-pending');
  window.addEventListener('scroll', requestFrame, { ...options, passive: true });
  window.addEventListener('resize', measure, options);
  document.addEventListener('visibilitychange', requestFrame, options);
  window.addEventListener('pagehide', releaseVideo, options);
  window.addEventListener('pageshow', requestFrame, options);
  motion.addEventListener('change', () => { if (motion.matches) dispose(); }, options);
  resizeObserver.observe(stage);
  measure();
  requestFrame();
})();
