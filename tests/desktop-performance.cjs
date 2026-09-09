const fs = require('node:fs');
const assert = require('node:assert/strict');

const css = fs.readFileSync('styles.css', 'utf8');
const distCss = fs.readFileSync('dist/styles.css', 'utf8');
const script = fs.readFileSync('script.js', 'utf8');
const distScript = fs.readFileSync('dist/script.js', 'utf8');

assert.equal(css, distCss, 'root and dist styles must match');
assert.equal(script, distScript, 'root and dist scripts must match');

const marker = '/* Desktop performance pass: preserve mobile, stop continuous GPU churn */';
assert.equal((css.match(/Desktop performance pass: preserve mobile, stop continuous GPU churn/g) || []).length, 1);

const start = css.indexOf(marker);
assert(start >= 0);
const perf = css.slice(start);
assert(perf.includes('@media (min-width: 821px) {'), 'desktop performance rules must be desktop-only');
assert(perf.includes('.ambient-stage,\n  .cursor-light {\n    display: none !important;'));
assert(perf.includes('content-visibility: auto;'));
assert(perf.includes('contain-intrinsic-size: auto 900px;'));
assert(perf.includes('backdrop-filter: none !important;'));
assert(perf.includes('animation: none !important;'));
assert(perf.includes('will-change: auto !important;'));

assert(script.includes('const desktopPointerEffects = false;'));
assert(script.includes('const desktopTiltEffects = false;'));
assert(script.includes('if (!desktopPointerEffects ||'));
assert(script.includes('if (!reduceMotion.matches && desktopTiltEffects)'));

for (const mobileMarker of [
  'Mobile key visual composition',
  'Mobile key visual correction',
  'Mobile hero copy fit',
  'Compact mobile hero top spacing',
  'Keep mobile hero title to three lines',
  'Final mobile layout guard',
]) {
  assert(css.includes(`/* ${mobileMarker} */`), `mobile guard missing: ${mobileMarker}`);
}

console.log('PASS: desktop-only GPU reduction enabled; mobile layout guards retained');
