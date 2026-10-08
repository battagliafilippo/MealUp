const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let passed = 0;
function ok(value, message) { if (!value) throw new Error(message); passed += 1; }
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/mealup-render-v125.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

ok(html.includes('mealup-render-v125.css'), 'render stylesheet is not linked');
ok(html.includes('class="home-dimmi"'), 'Dimmi tu visual heading is missing');
ok(css.includes('#view-home.active'), 'Home render scope is missing');
ok(css.includes('#view-fridge.active'), 'Scorte orange stage is missing');
ok(css.includes('#view-search'), 'Recipes render scope is missing');
ok(css.includes('#view-spesa'), 'Shopping render scope is missing');
ok(css.includes('.diary-card-v124'), 'Diary dark surface is missing');
ok(css.includes('#cook-mode'), 'Kitchen Mode render scope is missing');
ok(css.includes('#modal-codice'), 'Scanner render scope is missing');
ok(css.includes('.mealup-tab-bar'), 'Bottom navigation render scope is missing');
ok(sw.includes('./assets/mealup-render-v125.css'), 'render stylesheet is absent from PWA shell');
for (const file of ['index.html','sw.js','assets/mealup-render-v125.css']) {
  ok(fs.readFileSync(path.join(root,file)).equals(fs.readFileSync(path.join(root,'dist',file))), `${file} differs from dist copy`);
}
console.log(`Render board smoke: ${passed} passed, 0 failed.`);
