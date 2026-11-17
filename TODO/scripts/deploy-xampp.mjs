import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const distBrowser = join(process.cwd(), 'dist', 'TODO', 'browser');
const xamppTodo = 'E:\\database xampp\\htdocs\\todo';
const xamppRoot = 'E:\\database xampp\\htdocs';

function copyDirRecursive(src, dest) {
  if (!existsSync(src)) return;
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  for (const item of readdirSync(src)) {
    const srcPath = join(src, item);
    const destPath = join(dest, item);
    if (statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

try {
  if (existsSync(distBrowser)) {
    copyDirRecursive(distBrowser, xamppTodo);
    console.log('Synced dist/TODO/browser to ' + xamppTodo);
  }

  const htaccess = join(process.cwd(), 'public', '.htaccess');
  if (existsSync(htaccess)) {
    copyFileSync(htaccess, join(xamppTodo, '.htaccess'));
    console.log('Synced .htaccess to ' + xamppTodo);
  }

  const robots = join(process.cwd(), 'public', 'robots.txt');
  const sitemap = join(process.cwd(), 'public', 'sitemap.xml');
  if (existsSync(robots) && existsSync(xamppRoot)) {
    copyFileSync(robots, join(xamppRoot, 'robots.txt'));
    copyFileSync(sitemap, join(xamppRoot, 'sitemap.xml'));
    console.log('Synced robots.txt & sitemap.xml to ' + xamppRoot);
  }
} catch (e) {
  console.warn('Deploy sync warning:', e.message);
}
