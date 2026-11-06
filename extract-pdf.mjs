import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

GlobalWorkerOptions.workerSrc = join(dirname(fileURLToPath(import.meta.url)), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');

const files = [
  'productos/Pedido -Adriana.PDF',
  'productos/factura-104399.pdf',
];

const base = 'C:\\Users\\Juanjo\\Documents\\shaden';

for (const rel of files) {
  const path = join(base, rel);
  const data = new Uint8Array(readFileSync(path));
  const doc = await getDocument({ data, isEvalSupported: false, useSystemFonts: true }).promise;
  console.log('\n========================================');
  console.log('FILE:', rel);
  console.log('PAGES:', doc.numPages);
  console.log('========================================');
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    console.log(`\n----- PAGE ${p} (w=${viewport.width.toFixed(1)} h=${viewport.height.toFixed(1)}) -----`);
    // Group items by line using y coordinate (rounded), then sort by x
    const lines = new Map();
    for (const item of content.items) {
      if (!item.str || item.str.trim() === '') continue;
      // transform = [a,b,c,d,e,f]; e=x, f=y (top-left origin in PDF is bottom-left, but pdfjs gives top? actually f is from bottom)
      const t = item.transform;
      const x = t[4];
      const y = t[5];
      // round y to bucket lines
      const key = Math.round(y);
      if (!lines.has(key)) lines.set(key, []);
      lines.get(key).push({ x, y, str: item.str, w: item.width });
    }
    // sort lines by y descending (top of page = higher y in pdfjs? Actually pdfjs y increases upward)
    const sortedY = [...lines.keys()].sort((a, b) => b - a);
    for (const yk of sortedY) {
      const items = lines.get(yk).sort((a, b) => a.x - b.x);
      const line = items.map(i => i.str).join(' | ');
      console.log(`y=${yk} :: ${line}`);
    }
  }
  await doc.destroy();
}
