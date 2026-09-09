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
  const frames = [], listeners = {}, timers = [];
  const root = element(), overlay = element(), hero = element();
  const loading = element(), label = element(), hint = element();
  root.classList.add('intro-pending');
  overlay.querySelector = s => s.endsWith('loading') ? loading : s.endsWith('label') ? label : hint;
  let video, finishDownload, revoked = false, fetchCount = 0, videoCount = 0;
  const ctx = {
    AbortController, Blob, navigator: {}, innerHeight: 800, innerWidth: 1200, scrollY: 0,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    setTimeout: f => (timers.push(f), timers.length), clearTimeout() {},
    requestAnimationFrame: f => (frames.push(f), frames.length), cancelAnimationFrame() {},
    ResizeObserver: class { observe() {} disconnect() {} }, Event: class {},
    scrollTo() { throw new Error('Unexpected automatic scroll'); },
    addEventListener() {}, dispatchEvent() {},
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
          videoCount++;\n          video = e;
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
  vm.runInNewContext(fs.readFileSync('intro.js', 'utf8'), ctx);
  flush();
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

  // Crossing into the homepage must keep the completed Blob/video alive.
  ctx.scrollY = 4000; listeners.seeked(); flush();
  assert.equal(revoked, false, 'Leaving the intro must retain the Blob for reverse scrolling');
  assert.equal(fetchCount, 1, 'Leaving the intro must not trigger another download');
  assert.equal(videoCount, 1, 'Leaving the intro must keep the same video element');

  // Returning upward should reuse the same video immediately.
  ctx.scrollY = 300; listeners.seeked(); flush();
  assert.equal(fetchCount, 1, 'Returning to intro must reuse the existing download');
  assert.equal(videoCount, 1, 'Returning to intro must reuse the existing video element');

  listeners.error();
  assert(revoked, 'Release blob memory on failure');
  assert(!root.classList.contains('intro-loading'), 'Failure must unlock scrolling');
  console.log('PASS: complete-download gate, decoded-frame gate, retained reverse scroll, cleanup, no autoplay');
})().catch(error => { console.error(error); process.exitCode = 1; });
