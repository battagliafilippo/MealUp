const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let passed = 0;
function check(condition, message) { if (!condition) throw new Error(message); passed += 1; }
function read(name) { return fs.readFileSync(path.join(root, name), 'utf8'); }
function pngSize(name) { const b = fs.readFileSync(path.join(root, name)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; }

const html = read('index.html');
const manifest = JSON.parse(read('manifest.webmanifest'));
const sw = read('sw.js');
const required = ['assets/brand/mealup-logo.svg','assets/brand/mealup-symbol.svg','assets/brand/mealup-symbol-small.svg','assets/brand/mealup-app-icon.svg'];
required.forEach(file => check(fs.existsSync(path.join(root, file)), `${file} missing`));
check(html.includes('class="home-brand"'), 'Home brand hook missing');
check(html.includes('mealup-logo.svg?v=proposta-b2'), 'Home does not use approved full logo');
check(!read('assets/brand/mealup-logo.svg').includes('kcal'), 'Logo must not contain kcal');
check(!read('assets/brand/mealup-symbol.svg').includes('kcal'), 'Symbol must not contain kcal');
check(manifest.icons.some(i => i.src === 'icon-180.png' && i.sizes === '180x180'), '180 icon not registered');
check(manifest.icons.some(i => i.src === 'icon-192.png' && i.purpose === 'any'), '192 icon not registered');
check(manifest.icons.some(i => i.src === 'icon-512.png' && i.purpose === 'any'), '512 icon not registered');
check(manifest.icons.some(i => i.src === 'icon-maskable.png' && i.purpose === 'maskable'), 'maskable icon not registered');
for (const [name, size] of [['icon-180.png',180],['icon-192.png',192],['icon-512.png',512],['icon-maskable.png',512]]) check(pngSize(name).every(v => v === size), `${name} has wrong dimensions`);
required.forEach(file => check(sw.includes(`./${file}`), `${file} missing from service-worker shell`));
for (const file of ['index.html','manifest.webmanifest','sw.js','assets/mealup-v124.css',...required]) check(fs.readFileSync(path.join(root,file)).equals(fs.readFileSync(path.join(root,'dist',file))), `${file} differs from dist copy`);
console.log(`Brand B smoke: ${passed} passed, 0 failed.`);
