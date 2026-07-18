/**
 * check-syntax.js
 * 递归对 src/ 下所有 .js 做语法检查（node --check），快速发现语法错误。
 *   npm run check
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = walk(path.join(root, 'src'), []);
files.push(path.join(root, 'game.js'));
files.push(path.join(root, 'src', 'main.js'));

let failed = 0;
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    failed++;
    console.error('SYNTAX ERROR in', path.relative(root, f));
    console.error(e.stderr ? e.stderr.toString() : e.message);
  }
}

if (failed === 0) {
  console.log(`[HellRift] 语法检查通过：${files.length} 个文件`);
} else {
  console.error(`[HellRift] ${failed} 个文件存在语法错误`);
  process.exit(1);
}
