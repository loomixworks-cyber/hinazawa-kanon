const fs = require('node:fs');
const assert = require('node:assert/strict');

const css = fs.readFileSync('styles.css', 'utf8');
const distCss = fs.readFileSync('dist/styles.css', 'utf8');
const script = fs.readFileSync('script.js', 'utf8');
const distScript = fs.readFileSync('dist/script.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const distHtml = fs.readFileSync('dist/index.html', 'utf8');

assert.equal(css, distCss, 'root and dist styles must match');
assert.equal(script, distScript, 'root and dist scripts must match');

const marker = '/* Desktop performance pass: preserve mobile, stop continuous GPU churn */';
assert.equal((css.match(/Desktop performance pass: preserve mobile, stop continuous GPU churn/g) || []).length, 1);

const start = css.indexOf(marker);
assert(start >= 0);
const perf = css.slice(start);
assert(perf.includes('@media (min-width: 821px) {'), 'desktop performance rules must be desktop-only');
assert(perf.includes('content-visibility: auto;'));
assert(perf.includes('contain-intrinsic-size: auto 900px;'));
assert(perf.includes('backdrop-filter: none !important;'));
assert(perf.includes('animation: none !important;'));
assert(perf.includes('will-change: auto !important;'));

assert(script.includes('const desktopPointerEffects = matchMedia("(min-width: 901px) and (hover: hover) and (pointer: fine)");'));
assert(script.includes('if (!desktopPointerEffects.matches ||'));
assert(script.includes('const x = (event.clientX / window.innerWidth - 0.5) * 12;'));
assert(script.includes('const y = (event.clientY / window.innerHeight - 0.5) * 8;'));
assert(script.includes('character.style.translate = "0 0";'));
assert(css.includes('.character {\n    transition: translate .11s ease-out;\n  }'));

assert(css.includes('/* Desktop header stays at the top of the homepage only */'));
assert(css.includes('body.desktop-header-hidden .site-header {'));
assert(css.includes('transform: translateY(calc(-100% - 28px));'));
assert(script.includes('const desktopHeaderVisibility = matchMedia("(min-width: 821px)");'));
assert(script.includes('body.classList.toggle("desktop-header-hidden", desktopHeaderVisibility.matches && isScrolled);'));
assert(css.includes('.site-header{position:fixed;'), 'base header positioning must stay available to mobile');
assert(!css.includes('.loaded .site-header{position:fixed;'), 'header base rule must not depend on the removed loaded class');

assert(!script.includes('desktopTiltEffects'), 'disabled card tilt code should be removed, not merely gated');
assert(!script.includes('getBoundingClientRect();'), 'dead card tilt layout reads must stay removed');
assert(!script.includes('cursorLight'), 'removed cursor-light element must not have JS references');
assert(!script.includes('#voiceButton'), 'listener for missing voice button must stay removed');
assert(!css.includes('.cursor-light'), 'hidden cursor light CSS must stay removed');
assert(!css.includes('.ambient-stage'), 'hidden ambient stage CSS must stay removed');
assert(!css.includes('@keyframes ambientFloat'), 'unused ambient animation must stay removed');
assert(!css.includes('.loader'), 'legacy loader CSS must stay removed');
assert(!html.includes('class="cursor-light"') && !distHtml.includes('class="cursor-light"'));
assert(!html.includes('class="ambient-stage"') && !distHtml.includes('class="ambient-stage"'));

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

{
  const marker = '/* Mobile performance pass: keep the design, stop decorative infinite work */';
  const start = css.indexOf(marker);
  assert(start >= 0, 'mobile performance block missing');
  const mobilePerf = css.slice(start);
  assert(mobilePerf.includes('@media (max-width: 820px) {'));
  assert(mobilePerf.includes('.hero::before,\n  .orbital i {\n    animation: none !important;\n  }'));
  assert(!mobilePerf.includes('.character {'), 'character float must remain enabled on mobile');
}

console.log('PASS: lightweight character parallax retained; proven dead runtime and decorative code removed');
