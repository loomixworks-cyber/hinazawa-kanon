const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

function element() {
  const classes = new Set();
  return {
    classList: {
      contains: x => classes.has(x), add: x => classes.add(x),
      remove: x => classes.delete(x),
      toggle: (x, yes) => yes ? classes.add(x) : classes.delete(x),
    },
    style: { setProperty() {}, removeProperty() {} },
    setAttribute() {}, removeAttribute() {}, append() {}, before() {}, prepend() {},
    remove() {}, replaceWith() {}, contains: () => false, addEventListener() {}, offsetHeight: 800,
  };
}

(async () => {
  const frames = [], listeners = {}, windowListeners = {}, timers = [];
  let scrollCalls = 0;
  const root = element(), overlay = element(), hero = element();
  const loading = element(), label = element(), hint = element();
  root.classList.add('intro-pending');
  overlay.querySelector = s => s.endsWith('loading') ? loading : s.endsWith('label') ? label : hint;
  let video, finishDownload, revoked = false, fetchCount = 0, videoCount = 0;
  const ctx = {
    AbortController, Blob, navigator: {}, innerHeight: 800, innerWidth: 1200, scrollY: 0,
    matchMedia: query => ({ matches: query.includes('min-width: 821px'), addEventListener() {} }),
    setTimeout: f => (timers.push(f), timers.length), clearTimeout() {},
    requestAnimationFrame: f => (frames.push(f), frames.length), cancelAnimationFrame() {},
    ResizeObserver: class { observe() {} disconnect() {} }, Event: class {},
    scrollTo({ top }) { scrollCalls++; ctx.scrollY = top; },
    addEventListener(name, handler) { windowListeners[name] = handler; }, dispatchEvent() {},
    URL: { createObjectURL: () => 'blob:complete-video', revokeObjectURL() { revoked = true; } },
    fetch: async () => (fetchCount++, { ok: true, headers: { get: () => '8' }, body: { getReader() {
      let step = 0;
      return { read: () => ++step === 1
        ? Promise.resolve({ done: false, value: new Uint8Array(4) })
        : step === 2
          ? new Promise(resolve => { finishDownload = () => resolve({ done: false, value: new Uint8Array(4) }); })
          : Promise.resolve({ done: true }) };
    } } }),
    document: {
      documentElement: root, hidden: false,
      querySelector: s => s === '.kanon-intro' ? overlay : hero,
      querySelectorAll: () => [], addEventListener() {},
      createElement(tag) {
        const e = element();
        if (tag === 'video') {
          videoCount++;
          video = e;
          Object.assign(e, { readyState: 0, duration: 6, currentTime: 0, seeking: false,
            pause() {}, load() {}, play() { throw new Error('Autoplay'); },
            addEventListener: (name, f) => { listeners[name] = f; } });
        }
        return e;
      },
    },
  };
  ctx.window = ctx;
  const flush = () => { while (frames.length) frames.shift()(); };
  vm.runInNewContext(fs.readFileSync('motion.js', 'utf8'), ctx);
  vm.runInNewContext(fs.readFileSync('intro.js', 'utf8'), ctx);
  flush();
  assert.equal(scrollCalls, 0, 'Initialization must not scroll automatically');
  await new Promise(setImmediate);
  assert(root.classList.contains('intro-loading'));
  assert.equal(video.src, undefined, 'Partial response must never reach video');
  video.readyState = 2;
  listeners.loadeddata(); flush();
  assert(!overlay.classList.contains('is-ready'), 'Decoded event cannot bypass download gate');
  finishDownload();
  await new Promise(setImmediate);
  assert.equal(video.src, 'blob:complete-video');
  video.readyState = 1; listeners.loadedmetadata(); flush();
  assert(root.classList.contains('intro-loading'), 'Metadata alone is not ready');
  video.readyState = 2; listeners.loadeddata(); flush();
  assert(overlay.classList.contains('is-ready'));
  assert(!root.classList.contains('intro-loading'));
  assert(loading.hidden);
  ctx.scrollY = 1000; listeners.seeked(); flush();
  const forward = video.currentTime;
  assert(forward > 0);
  ctx.scrollY = 500; listeners.seeked(); flush();
  assert(video.currentTime < forward);

  // Crossing from the intro into the homepage should pause on the completed hero.
  ctx.scrollY = 3000;
  let prevented = 0;
  windowListeners.wheel({ deltaY: 1000, deltaMode: 0, ctrlKey: false, preventDefault() { prevented++; } });
  assert.equal(prevented, 1, 'Forward crossing gesture must pause at the homepage top');
  assert.equal(ctx.scrollY, 3200, 'Forward crossing must land on the intro boundary');
  windowListeners.wheel({ deltaY: 900, deltaMode: 0, ctrlKey: false, preventDefault() { prevented++; } });
  assert.equal(ctx.scrollY, 3200, 'Forward momentum from the same gesture must be absorbed');
  timers[timers.length - 1]();
  windowListeners.wheel({ deltaY: 900, deltaMode: 0, ctrlKey: false, preventDefault() { prevented++; } });
  assert.equal(ctx.scrollY, 3340, 'Next distinct downward gesture should enter the homepage gently');
  flush();

  // Crossing into the homepage must keep the completed Blob/video alive.
  const lastVisibleTime = video.currentTime;
  ctx.scrollY = 4000; listeners.seeked(); flush();
  assert.equal(video.currentTime, lastVisibleTime, 'Hidden intro must not seek');
  ctx.scrollY = 4500; listeners.seeked(); flush();
  assert.equal(video.currentTime, lastVisibleTime, 'Scrolling below intro must not seek');
  assert.equal(revoked, false, 'Leaving the intro must retain the Blob for reverse scrolling');
  assert.equal(fetchCount, 1, 'Leaving the intro must not trigger another download');
  assert.equal(videoCount, 1, 'Leaving the intro must keep the same video element');

  // A fast upward wheel gesture must stop at the homepage before reverse playback.
  ctx.scrollY = 4000;
  windowListeners.wheel({ deltaY: -1000, deltaMode: 0, ctrlKey: false, preventDefault() { prevented++; } });
  assert.equal(prevented, 1, 'Crossing gesture must be absorbed at the homepage top');
  assert.equal(ctx.scrollY, 3200, 'Crossing gesture must snap to the intro boundary');
  windowListeners.wheel({ deltaY: -900, deltaMode: 0, ctrlKey: false, preventDefault() { prevented++; } });
  assert.equal(ctx.scrollY, 3200, 'Momentum from the same gesture must stay on the homepage');
  timers[timers.length - 1]();
  windowListeners.wheel({ deltaY: -900, deltaMode: 0, ctrlKey: false, preventDefault() { prevented++; } });
  assert.equal(ctx.scrollY, 3060, 'Next distinct upward gesture should enter reverse intro gently');
  flush();

  // Returning upward should reuse the same video immediately.
  ctx.scrollY = 300; listeners.seeked(); flush();
  assert.equal(fetchCount, 1, 'Returning to intro must reuse the existing download');
  assert.equal(videoCount, 1, 'Returning to intro must reuse the existing video element');
  assert(video.currentTime < lastVisibleTime, 'Returning to intro must resume seeking');

  let updates = 0;
  const unsubscribe = ctx.kanonMotion.add(() => updates++);
  for (let i = 0; i < 30; i++) ctx.kanonMotion.request();
  assert.equal(frames.length, 1, 'Scroll/media/pointer requests share one frame');
  flush();
  assert.equal(updates, 1);
  unsubscribe();
  ctx.kanonMotion.request(); flush();
  assert.equal(updates, 1, 'Disposed handlers must stop');

  listeners.error();
  assert(revoked, 'Release blob memory on failure');
  assert(!root.classList.contains('intro-loading'), 'Failure must unlock scrolling');
  console.log('PASS: complete-download gate, decoded-frame gate, bidirectional homepage wheel gate, retained reverse scroll, cleanup, no autoplay');
})().catch(error => { console.error(error); process.exitCode = 1; });
