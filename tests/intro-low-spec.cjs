const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

function element() {
  const classes = new Set();
  return {
    classList: {
      contains: x => classes.has(x),
      add: (...xs) => xs.forEach(x => classes.add(x)),
      remove: (...xs) => xs.forEach(x => classes.delete(x)),
      toggle: (x, yes) => yes ? classes.add(x) : classes.delete(x),
    },
    style: { setProperty() {}, removeProperty() {} },
    setAttribute() {}, removeAttribute() {}, append() {}, before() {}, prepend() {},
    remove() {}, replaceWith() {}, contains: () => false, addEventListener() {}, offsetHeight: 800,
  };
}

(() => {
  const frames = [];
  const root = element(), overlay = element(), hero = element();
  const loading = element(), label = element(), hint = element();
  root.classList.add('intro-pending');
  overlay.querySelector = s => s.endsWith('loading') ? loading : s.endsWith('label') ? label : hint;

  let videoCreated = false;
  let fetchCalled = false;
  const ctx = {
    AbortController, Blob,
    navigator: {
      deviceMemory: 4,
      hardwareConcurrency: 8,
      connection: { effectiveType: '4g', saveData: false },
    },
    innerHeight: 800, innerWidth: 390, scrollY: 0,
    matchMedia: query => ({
      matches: query.includes('max-width: 820px'),
      addEventListener() {},
    }),
    setTimeout: () => 1, clearTimeout() {},
    requestAnimationFrame: f => (frames.push(f), frames.length), cancelAnimationFrame() {},
    ResizeObserver: class { observe() {} disconnect() {} },
    Event: class {},
    scrollTo() { throw new Error('Unexpected automatic scroll'); },
    addEventListener() {}, dispatchEvent() {},
    URL: { createObjectURL() { throw new Error('Unexpected blob URL'); }, revokeObjectURL() {} },
    fetch: async () => {
      fetchCalled = true;
      throw new Error('Low-spec mode must not fetch video');
    },
    document: {
      documentElement: root,
      hidden: false,
      querySelector: s => s === '.kanon-intro' ? overlay : hero,
      querySelectorAll: () => [],
      addEventListener() {},
      createElement(tag) {
        if (tag === 'video') videoCreated = true;
        return element();
      },
    },
  };
  ctx.window = ctx;
  const flush = () => { while (frames.length) frames.shift()(); };

  vm.runInNewContext(fs.readFileSync('intro.js', 'utf8'), ctx);
  flush();

  assert(root.classList.contains('intro-lite'), 'Constrained mobile should use lite intro');
  assert(!root.classList.contains('intro-loading'), 'Lite intro must never lock on video loading');
  assert(loading.hidden, 'Loading UI should be hidden in lite mode');
  assert(overlay.classList.contains('is-lite'));
  assert.equal(ctx.kanonIntroMode, 'lite');
  assert.equal(videoCreated, false, 'Lite mode must not create a video element');
  assert.equal(fetchCalled, false, 'Lite mode must not download the intro video');
  console.log('PASS: low-spec mobile uses poster + reveal without video download');
})();
