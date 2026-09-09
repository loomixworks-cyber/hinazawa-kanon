const fs = require('node:fs');
const assert = require('node:assert/strict');

const css = fs.readFileSync('styles.css', 'utf8');
const dist = fs.readFileSync('dist/styles.css', 'utf8');

assert.equal(css, dist, 'root and dist styles.css must stay identical');

const removed = [
  'PC hero balance: show full key visual',
  'PC hero visual size correction',
  'PC hero impact boost',
  'Keep desktop hero title to three lines',
];
for (const marker of removed) {
  assert(!css.includes(`/* ${marker} */`), `legacy desktop hero block remains: ${marker}`);
}
assert.equal((css.match(/\/\* Canonical desktop hero layout \*\//g) || []).length, 1);

for (const marker of [
  'Mobile key visual composition',
  'Mobile key visual correction',
  'Mobile hero copy fit',
  'Compact mobile hero top spacing',
  'Keep mobile hero title to three lines',
  'Final mobile layout guard',
]) {
  assert(css.includes(`/* ${marker} */`), `mobile guard missing: ${marker}`);
}

assert(css.includes('grid-template-columns: minmax(450px, 29vw) minmax(0, 1fr);'));
assert(css.includes('width: min(1420px, 73vw);'));
assert(css.includes('width: min(1500px, 74vw);'));
assert(css.includes('max-width: 10.8em;'));

let depth = 0;
for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
  if (ch === '{') depth++;
  if (ch === '}') depth--;
  assert(depth >= 0, 'CSS has an unexpected closing brace');
}
assert.equal(depth, 0, 'CSS braces are unbalanced');

console.log('PASS: desktop hero CSS consolidated; mobile guard blocks preserved');
