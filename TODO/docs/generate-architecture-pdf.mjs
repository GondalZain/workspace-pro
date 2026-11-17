/**
 * Regenerate PDF from architecture-routing-map.html using installed Google Chrome.
 * Run from TODO/: node docs/generate-architecture-pdf.mjs
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, 'architecture-routing-map.html');
const pdfPath = join(__dirname, 'TODO-Routing-Architecture.pdf');

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
].filter(Boolean);

const chrome = chromeCandidates.find((p) => existsSync(p));

if (!existsSync(htmlPath)) {
  console.error('Missing', htmlPath);
  process.exit(1);
}

if (!chrome) {
  console.error('Google Chrome not found. Open docs/architecture-routing-map.html → Print → Save as PDF');
  process.exit(1);
}

const fileUrl = pathToFileURL(htmlPath).href;
const result = spawnSync(
  chrome,
  ['--headless', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`, fileUrl],
  { stdio: 'inherit' }
);

if (result.status !== 0 || !existsSync(pdfPath)) {
  console.error('PDF generation failed.');
  process.exit(1);
}

console.log('Wrote', pdfPath);
