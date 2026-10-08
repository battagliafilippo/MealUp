const sharp = require('C:/Users/Ramona/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');

async function analyze(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const seen = new Uint8Array(info.width * info.height);
  const components = [];
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const start = y * info.width + x;
      if (seen[start] || data[start * 4 + 3] < 128) continue;
      const stack = [start];
      seen[start] = 1;
      let count = 0, minX = x, maxX = x, minY = y, maxY = y;
      while (stack.length) {
        const p = stack.pop();
        const px = p % info.width;
        const py = Math.floor(p / info.width);
        count++;
        minX = Math.min(minX, px); maxX = Math.max(maxX, px);
        minY = Math.min(minY, py); maxY = Math.max(maxY, py);
        for (const [nx, ny] of [[px-1,py],[px+1,py],[px,py-1],[px,py+1]]) {
          if (nx < 0 || ny < 0 || nx >= info.width || ny >= info.height) continue;
          const np = ny * info.width + nx;
          if (!seen[np] && data[np * 4 + 3] >= 128) { seen[np] = 1; stack.push(np); }
        }
      }
      if (count > 4) components.push({ count, box: [minX,minY,maxX,maxY] });
    }
  }
  console.log(file, components.sort((a,b) => b.count-a.count));
}

Promise.all(process.argv.slice(2).map(analyze)).catch(e => { console.error(e); process.exit(1); });
