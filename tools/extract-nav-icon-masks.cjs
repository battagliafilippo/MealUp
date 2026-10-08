const sharp = require('C:/Users/Ramona/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const path = require('path');

const source = 'C:/Users/Ramona/Desktop/MealUp render/bottom .png';
const output = path.join(__dirname, '..', 'assets', 'brand');

async function extract(name, box, keep) {
  const { data, info } = await sharp(source)
    .extract(box)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const pixel = i / 4;
    const x = pixel % info.width;
    const y = Math.floor(pixel / info.width);
    const inside = x >= 10 && x < info.width - 10 && y >= 10 && y < info.height - 7;
    const alpha = inside && keep(data[i], data[i + 1], data[i + 2]) ? 255 : 0;
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = alpha;
  }

  await sharp(data, { raw: info })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(128, 128, { fit: 'contain' })
    .png()
    .toFile(path.join(output, name));
}

Promise.all([
  extract(
    'nav-recipes-render-mask-v4.png',
    { left: 475, top: 98, width: 110, height: 96 },
    (r, g, b) => r > 245 && g > 62 && g < 138 && b < 48 && r - g > 112,
  ),
  extract(
    'nav-stocks-render-mask-v4.png',
    { left: 955, top: 100, width: 100, height: 95 },
    (r, g, b) => r < 72 && g < 68 && b < 64 && Math.max(r, g, b) - Math.min(r, g, b) < 24,
  ),
]).catch((error) => {
  console.error(error);
  process.exit(1);
});
