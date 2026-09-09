(() => {
  'use strict';
  const root = document.documentElement;
  const overlay = document.querySelector('.kanon-intro');
  if (!overlay) return;
  if (!root.classList.contains('intro-pending')) {
    overlay.remove();
    return;
  }

  const video = overlay.querySelector('video');
  const skip = overlay.querySelector('button');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const options = { signal: events.signal };
  const scrollPosition = { x: scrollX, y: scrollY };
  const oldOffset = document.body.style.getPropertyValue('--intro-scroll-offset');
  const oldPriority = document.body.style.getPropertyPriority('--intro-scroll-offset');
  const background = [...document.body.children].filter(el => el !== overlay && el.tagName !== 'SCRIPT');
  const inertState = background.map(el => [el, el.inert]);
  const previousFocus = document.activeElement;
  let phase = 'loading';
  let transitionTimer;
  let cleanupTimer;
  let stallTimer;
  let focusPosition = '';
  let restoreFocus = false;

  const releaseVideo = () => {
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.remove();
  };
  const finish = (immediate = false) => {
    if (phase === 'done') return;
    if (!immediate) { dissolve(); return; }
    phase = 'done';
    clearTimeout(window.kanonIntroWatchdog);
    clearTimeout(transitionTimer);
    clearTimeout(cleanupTimer);
    clearTimeout(stallTimer);
    events.abort();
    const returnFocus = restoreFocus || overlay.contains(document.activeElement);
    releaseVideo();
    overlay.remove();
    root.classList.remove('intro-pending', 'intro-revealing');
    document.body.classList.remove('intro-locked');
    if (oldOffset) document.body.style.setProperty('--intro-scroll-offset', oldOffset, oldPriority);
    else document.body.style.removeProperty('--intro-scroll-offset');
    inertState.forEach(([el, inert]) => { el.inert = inert; });
    // Avoid inherited smooth scrolling when restoring an anchored entry.
    window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: 'instant' });
    if (returnFocus) {
      const target = previousFocus !== document.body && previousFocus?.isConnected
        ? previousFocus : document.querySelector('.brand');
      target?.focus({ preventScroll: true });
    }
    delete window.kanonIntroFinish;
  };
  const reveal = () => {
    if (phase !== 'dissolving') return;
    phase = 'revealing';
    // The fully opaque mist conceals the last glass fragments before unloading.
    releaseVideo();
    root.classList.add('intro-revealing');
    overlay.classList.add('is-revealing');
    cleanupTimer = setTimeout(() => finish(true), 2050);
  };
  const dissolve = () => {
    if (phase === 'dissolving' || phase === 'revealing' || phase === 'done') return;
    restoreFocus = overlay.contains(document.activeElement);
    phase = 'dissolving';
    clearTimeout(stallTimer);
    overlay.classList.add('is-dissolving');
    transitionTimer = setTimeout(reveal, 650);
  };
  window.kanonIntroFinish = finish;
  document.body.style.setProperty('--intro-scroll-offset', `${-scrollPosition.y}px`);
  document.body.classList.add('intro-locked');
  inertState.forEach(([el]) => { el.inert = true; });

  const armStallTimeout = () => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(dissolve, 4500);
  };
  const updateTime = () => {
    if (phase !== 'playing' && phase !== 'loading') return;
    // Four gentle framing changes, calibrated from the six-second source.
    // Portrait screens retain the unshifted composition via CSS.
    const time = video.currentTime;
    const position = time < .8 ? '23%' : time < 2.4 ? '49%' : time < 3.2 ? '34%' : '27%';
    if (position !== focusPosition) {
      focusPosition = position;
      video.style.setProperty('--intro-focus', position);
    }
    if (Number.isFinite(video.duration) && video.duration - time <= .6) dissolve();
  };
  skip.addEventListener('click', dissolve, options);
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') dissolve();
  }, options);
  window.addEventListener('pagehide', () => finish(true), options);
  motion.addEventListener('change', () => { if (motion.matches) finish(true); }, options);
  video.addEventListener('loadeddata', () => overlay.classList.add('is-ready'), options);
  video.addEventListener('playing', () => {
    if (phase === 'loading') phase = 'playing';
    clearTimeout(stallTimer);
    overlay.classList.add('is-ready');
  }, options);
  video.addEventListener('waiting', armStallTimeout, options);
  video.addEventListener('stalled', armStallTimeout, options);
  video.addEventListener('timeupdate', updateTime, options);
  video.addEventListener('ended', dissolve, options);
  video.addEventListener('error', dissolve, options);
  video.muted = true;
  video.defaultMuted = true;
  video.src = 'assets/video/kanon-intro.mp4';
  video.preload = 'auto';
  armStallTimeout();
  try {
    const playback = video.play();
    playback?.catch(dissolve);
  } catch {
    dissolve();
  }
})();
