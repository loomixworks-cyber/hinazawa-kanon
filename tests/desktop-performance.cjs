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

assert(script.includes('const desktopPointerEffects = matchMedia("(min-width: 901px) and (hover: hover) and (pointer: fine)");'));
assert(script.includes('const desktopTiltEffects = false;'));
assert(script.includes('if (!desktopPointerEffects.matches ||'));
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

assert(script.includes('const x = (event.clientX / window.innerWidth - 0.5) * 12;'));
assert(script.includes('const y = (event.clientY / window.innerHeight - 0.5) * 8;'));
assert(script.includes('character.style.translate = "0 0";'));
assert(!script.includes('cursorLight?.style.setProperty("transform"'), 'heavy cursor light tracking must stay disabled');
assert(!script.includes('richHero?.style.setProperty("--rich-back-x"'), 'rich background pointer parallax must stay disabled');
assert(!script.includes('getBoundingClientRect();') || script.includes('desktopTiltEffects = false'), 'card tilt must stay disabled');
assert(css.includes('.character {\n    transition: translate .11s ease-out;\n  }'));

console.log('PASS: lightweight character parallax enabled; heavy desktop effects remain disabled');


{
  const marker = '/* Mobile performance pass: keep the design, stop decorative infinite work */';
  const start = css.indexOf(marker);
  assert(start >= 0, 'mobile performance block missing');
  const mobilePerf = css.slice(start);
  assert(mobilePerf.includes('@media (max-width: 820px) {'));
  assert(mobilePerf.includes('.ambient-stage {\n    display: none !important;\n  }'));
  assert(mobilePerf.includes('.hero::before,\n  .orbital i {\n    animation: none !important;\n  }'));
  assert(!mobilePerf.includes('.character {'), 'character float must remain enabled on mobile');
}
