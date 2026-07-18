/**
 * generate-assets.js
 * 《地狱裂隙》暗黑哥特原创素材包生成器
 * 俯视角 · 透明背景 PNG · 微信小游戏友好尺寸
 *
 * node scripts/generate-assets.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'src', 'Assets');

const P = {
  ink: [12, 10, 14, 255],
  ash: [55, 52, 62, 255],
  stone: [88, 86, 98, 255],
  stoneHi: [130, 128, 140, 255],
  bone: [220, 210, 190, 255],
  boneDim: [150, 140, 120, 255],
  blood: [179, 18, 31, 255],
  bloodHi: [255, 70, 55, 255],
  lava: [255, 120, 30, 255],
  lavaCore: [255, 220, 100, 255],
  gold: [255, 205, 70, 255],
  goldDim: [170, 120, 35, 255],
  druid: [100, 180, 70, 255],
  druidDim: [40, 90, 38, 255],
  druidHi: [160, 230, 110, 255],
  hunter: [80, 170, 240, 255],
  hunterDim: [25, 60, 110, 255],
  hunterHi: [160, 220, 255, 255],
  mage: [180, 100, 240, 255],
  mageDim: [70, 25, 120, 255],
  mageHi: [230, 180, 255, 255],
  ghoul: [110, 160, 90, 255],
  hound: [180, 55, 40, 255],
  dem: [120, 60, 190, 255],
  knight: [60, 75, 100, 255],
  eye: [255, 210, 70, 255],
  white: [240, 235, 230, 255],
  shadow: [0, 0, 0, 100],
};

function create(w, h) {
  const png = new PNG({ width: w, height: h, colorType: 6, filterType: -1 });
  png.data.fill(0);
  return png;
}

function put(png, x, y, c) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * y + x) << 2;
  const d = png.data;
  if (c[3] >= 200 || d[i + 3] === 0) {
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3];
  }
}

function circ(png, cx, cy, r, c) {
  r = Math.max(0, r | 0);
  const r2 = r * r, w = png.width, h = png.height, d = png.data;
  const x0 = Math.max(0, cx - r | 0), x1 = Math.min(w - 1, cx + r | 0);
  const y0 = Math.max(0, cy - r | 0), y1 = Math.min(h - 1, cy + r | 0);
  for (let y = y0; y <= y1; y++) {
    const dy = y - cy;
    for (let x = x0; x <= x1; x++) {
      if ((x - cx) * (x - cx) + dy * dy <= r2) {
        const i = (w * y + x) << 2;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3];
      }
    }
  }
}

function circRing(png, cx, cy, r, c, thick = 2) {
  for (let t = 0; t < thick; t++) {
    const rr = r - t;
    if (rr < 1) continue;
    for (let a = 0; a < 360; a++) {
      const rad = (a * Math.PI) / 180;
      put(png, cx + Math.cos(rad) * rr, cy + Math.sin(rad) * rr, c);
    }
  }
}

function ell(png, cx, cy, rx, ry, c) {
  rx = Math.max(1, rx | 0); ry = Math.max(1, ry | 0);
  const w = png.width, h = png.height, d = png.data;
  const x0 = Math.max(0, cx - rx | 0), x1 = Math.min(w - 1, cx + rx | 0);
  const y0 = Math.max(0, cy - ry | 0), y1 = Math.min(h - 1, cy + ry | 0);
  const rx2 = rx * rx, ry2 = ry * ry;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (((x - cx) * (x - cx)) / rx2 + ((y - cy) * (y - cy)) / ry2 <= 1) {
        const i = (w * y + x) << 2;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3];
      }
    }
  }
}

function rect(png, x, y, w, h, c) {
  const W = png.width, H = png.height, d = png.data;
  const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0);
  const x1 = Math.min(W, (x + w) | 0), y1 = Math.min(H, (y + h) | 0);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (W * yy + xx) << 2;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3];
    }
  }
}

function line(png, x0, y0, x1, y1, c, thick = 1) {
  x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  const t = Math.max(0, ((thick - 1) / 2) | 0);
  for (;;) {
    if (t <= 0) put(png, x, y, c);
    else circ(png, x, y, t, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

function save(png, rel) {
  const fp = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, PNG.sync.write(png));
}

function blit(src, dx, dy, dst) {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const si = (src.width * y + x) << 2;
      if (src.data[si + 3] === 0) continue;
      const tx = dx + x, ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= dst.width || ty >= dst.height) continue;
      const di = (dst.width * ty + tx) << 2;
      dst.data[di] = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
  }
}

// ==================== 角色 96 帧表 ====================
const CF = 96;
const ANIMS = ['idle', 'walk', 'attack', 'death'];

function drawHero(png, ox, oy, cls, anim, frame) {
  const cx = ox + 48;
  const cy = oy + 50;
  const bob = anim === 'walk' ? Math.sin(frame * 1.4) * 3 : anim === 'idle' ? Math.sin(frame * 0.8) * 1.2 : 0;
  const atk = anim === 'attack';
  const dead = anim === 'death';

  const pal = {
    druid: { m: P.druid, d: P.druidDim, h: P.druidHi },
    hunter: { m: P.hunter, d: P.hunterDim, h: P.hunterHi },
    mage: { m: P.mage, d: P.mageDim, h: P.mageHi },
  }[cls];

  // 脚底阴影
  ell(png, cx, oy + 86, 20, 7, P.shadow);

  if (dead && frame >= 2) {
    ell(png, cx, cy + 12, 26, 10, pal.d);
    circ(png, cx - 8, cy + 6, 9, pal.m);
    circ(png, cx + 10, cy + 8, 7, P.boneDim);
    if (frame >= 3) {
      for (let i = 0; i < 6; i++) circ(png, cx - 20 + i * 8, cy + 4, 2, P.blood);
    }
    return;
  }

  const by = cy + bob;
  const lean = atk ? frame * 2 : 0;

  // 披风（哥特多层）
  ell(png, cx + lean * 0.3, by + 14, 20, 24, pal.d);
  ell(png, cx + lean * 0.3, by + 10, 15, 18, [pal.d[0] + 15, pal.d[1] + 10, pal.d[2] + 15, 255]);
  // 肩甲
  circ(png, cx - 12, by - 2, 7, P.ash);
  circ(png, cx + 12, by - 2, 7, P.ash);
  circ(png, cx - 12, by - 2, 4, P.stoneHi);
  circ(png, cx + 12, by - 2, 4, P.stoneHi);
  // 躯干
  circ(png, cx, by, 13, pal.m);
  circ(png, cx - 3, by - 3, 5, pal.h);
  // 腰带
  rect(png, cx - 10, by + 8, 20, 3, P.goldDim);
  put(png, cx, by + 9, P.gold);

  // 头 / 兜帽
  circ(png, cx, by - 20, 12, P.bone);
  circ(png, cx, by - 22, 13, pal.d); // 兜帽
  circ(png, cx, by - 18, 9, P.bone);
  // 发光眼缝
  rect(png, cx - 6, by - 20, 5, 2, P.eye);
  rect(png, cx + 2, by - 20, 5, 2, P.eye);
  // 血红面纹
  line(png, cx - 3, by - 14, cx + 3, by - 14, P.blood, 1);

  if (cls === 'druid') {
    // 骨角
    line(png, cx - 7, by - 28, cx - 16, by - 42, P.boneDim, 3);
    line(png, cx - 16, by - 42, cx - 10, by - 46, P.bone, 2);
    line(png, cx + 7, by - 28, cx + 16, by - 42, P.boneDim, 3);
    line(png, cx + 16, by - 42, cx + 10, by - 46, P.bone, 2);
    // 藤蔓法杖
    const sx = cx + 22 + (atk ? frame * 4 : 0);
    line(png, sx, by + 22, sx - 2, by - 34, P.boneDim, 3);
    circ(png, sx - 2, by - 38, 7, pal.d);
    circ(png, sx - 2, by - 38, 4, pal.h);
    // 绿叶装饰
    circ(png, sx + 4, by - 32, 3, pal.m);
  } else if (cls === 'hunter') {
    // 斗篷尖角
    line(png, cx - 16, by + 8, cx - 22, by + 28, pal.d, 3);
    // 长弓
    const bx0 = cx + 20 + (atk ? -frame : 0);
    line(png, bx0, by - 30, bx0, by + 22, P.boneDim, 2);
    line(png, bx0, by - 30, bx0 + 12, by - 4, pal.h, 2);
    line(png, bx0, by + 22, bx0 + 12, by - 4, pal.h, 2);
    line(png, bx0 + 1, by - 4, bx0 + 10, by - 4, P.bone, 1);
    if (atk) {
      line(png, bx0 + 8, by - 4, bx0 + 28 + frame * 8, by - 4 - frame, pal.m, 2);
      circ(png, bx0 + 28 + frame * 8, by - 4 - frame, 2, P.gold);
    }
    // 箭袋
    rect(png, cx - 18, by + 4, 6, 14, P.ash);
  } else {
    // 尖顶兜帽
    line(png, cx - 10, by - 28, cx, by - 44, pal.d, 4);
    line(png, cx + 10, by - 28, cx, by - 44, pal.d, 4);
    circ(png, cx, by - 44, 3, pal.m);
    // 法杖
    const sx = cx + 20 + (atk ? frame * 2 : 0);
    line(png, sx, by + 24, sx + 2, by - 36, pal.m, 3);
    const orb = 6 + (atk ? frame * 2 : 0);
    circ(png, sx + 2, by - 42, orb + 2, P.lava);
    circ(png, sx + 2, by - 42, orb, P.lavaCore);
    if (atk && frame >= 2) {
      circ(png, sx + 18, by - 20, 5, P.lava);
    }
  }

  // 腿
  const step = anim === 'walk' ? Math.sin(frame * 1.6) * 5 : 0;
  rect(png, cx - 9, by + 20, 6, 14 + step, pal.d);
  rect(png, cx + 3, by + 20, 6, 14 - step, pal.d);
  // 靴
  rect(png, cx - 10, by + 32 + step, 8, 4, P.ink);
  rect(png, cx + 2, by + 32 - step, 8, 4, P.ink);
}

function genCharacters() {
  const meta = {};
  for (const cls of ['druid', 'hunter', 'mage']) {
    const sheet = create(CF * 4, CF * 4);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) drawHero(sheet, c * CF, r * CF, cls, ANIMS[r], c);
    }
    save(sheet, `characters/${cls}.png`);
    meta[cls] = {
      file: `characters/${cls}.png`,
      frameWidth: CF,
      frameHeight: CF,
      animations: {
        idle: { row: 0, frames: 4, fps: 6 },
        walk: { row: 1, frames: 4, fps: 10 },
        attack: { row: 2, frames: 4, fps: 12 },
        death: { row: 3, frames: 4, fps: 8 },
      },
    };
  }
  return meta;
}

// ==================== 怪物 ====================
function genMob(id, draw) {
  const S = 64;
  const p = create(S, S);
  draw(p, 32, 34, 0);
  save(p, `enemies/${id}.png`);
  const strip = create(S * 4, S);
  for (let f = 0; f < 4; f++) {
    const t = create(S, S);
    draw(t, 32, 34, f);
    blit(t, f * S, 0, strip);
  }
  save(strip, `enemies/${id}_walk.png`);
  return { file: `enemies/${id}.png`, walk: `enemies/${id}_walk.png`, size: S };
}

function dSkeleton(p, cx, cy, f) {
  ell(p, cx, cy + 22, 14, 5, P.shadow);
  const b = Math.sin(f) * 2;
  circ(p, cx, cy - 12 + b, 11, P.bone);
  circ(p, cx - 4, cy - 13 + b, 2, P.ink);
  circ(p, cx + 4, cy - 13 + b, 2, P.ink);
  rect(p, cx - 2, cy - 2 + b, 4, 14, P.bone);
  for (let i = 0; i < 3; i++) line(p, cx - 9, cy + 2 + i * 4 + b, cx + 9, cy + 2 + i * 4 + b, P.boneDim, 2);
  // 臂骨持锈剑
  line(p, cx + 8, cy + b, cx + 20, cy - 14 + b, P.boneDim, 2);
  line(p, cx + 20, cy - 14 + b, cx + 22, cy - 28 + b, P.stoneHi, 2);
  rect(p, cx - 8, cy + 12 + b, 4, 10 + (f % 2), P.bone);
  rect(p, cx + 4, cy + 12 + b, 4, 10 - (f % 2), P.bone);
}

function dGhoul(p, cx, cy, f) {
  ell(p, cx, cy + 22, 16, 5, P.shadow);
  const b = Math.sin(f * 1.2) * 2;
  ell(p, cx, cy + 2 + b, 16, 18, P.ghoul);
  circ(p, cx + 6, cy - 8 + b, 9, [70, 110, 55, 255]);
  circ(p, cx - 5, cy - 2 + b, 3, P.eye);
  circ(p, cx + 5, cy - 2 + b, 3, P.eye);
  // 利爪
  line(p, cx - 14, cy + 8 + b, cx - 22, cy + 16 + b, P.bone, 2);
  line(p, cx + 14, cy + 8 + b, cx + 22, cy + 16 + b, P.bone, 2);
  line(p, cx - 6, cy + 10 + b, cx + 6, cy + 10 + b, P.blood, 2);
}

function dHound(p, cx, cy, f) {
  ell(p, cx, cy + 20, 18, 5, P.shadow);
  const s = Math.sin(f) * 3;
  ell(p, cx + s, cy + 2, 20, 11, P.hound);
  circ(p, cx + 16 + s, cy - 2, 9, P.hound);
  circ(p, cx + 20 + s, cy - 4, 2, P.eye);
  // 背焰
  circ(p, cx - 2 + s, cy - 12, 5, P.lava);
  circ(p, cx + 6 + s, cy - 14, 4, P.lavaCore);
  // 腿
  rect(p, cx - 10 + s, cy + 10, 4, 8, [120, 40, 30, 255]);
  rect(p, cx + 6 + s, cy + 10, 4, 8, [120, 40, 30, 255]);
}

function dDemonMage(p, cx, cy, f) {
  ell(p, cx, cy + 22, 14, 5, P.shadow);
  const fl = Math.sin(f) * 3;
  // 袍
  ell(p, cx, cy + 6 + fl, 13, 18, P.dem);
  circ(p, cx, cy - 12 + fl, 10, P.ink);
  // 角
  line(p, cx - 6, cy - 18 + fl, cx - 12, cy - 30 + fl, P.ink, 3);
  line(p, cx + 6, cy - 18 + fl, cx + 12, cy - 30 + fl, P.ink, 3);
  circ(p, cx + 16, cy + fl, 8, P.mage);
  circ(p, cx + 16, cy + fl, 4, P.mageHi);
  rect(p, cx - 4, cy - 14 + fl, 8, 2, P.eye);
}

function dKnight(p, cx, cy, f) {
  ell(p, cx, cy + 22, 16, 5, P.shadow);
  rect(p, cx - 13, cy - 6, 26, 28, P.knight);
  // 肩甲
  circ(p, cx - 14, cy - 4, 6, P.ash);
  circ(p, cx + 14, cy - 4, 6, P.ash);
  circ(p, cx, cy - 18, 11, P.ink);
  rect(p, cx - 7, cy - 20, 14, 3, P.bloodHi);
  // 大剑
  line(p, cx + 14, cy + 16, cx + 26, cy - 20, P.bone, 4);
  line(p, cx + 10, cy + 12, cx + 18, cy + 12, P.goldDim, 2);
}

function genBoss() {
  const S = 128;
  const draw = (p, f) => {
    const cx = 64, cy = 68;
    ell(p, cx, cy + 42, 36, 10, P.shadow);
    const pulse = 0.65 + 0.35 * Math.sin(f);
    circ(p, cx, cy, 38, P.blood);
    circ(p, cx, cy, 30, [70, 8, 12, 255]);
    // 盔甲裂纹
    line(p, cx - 20, cy - 10, cx - 5, cy + 20, P.ink, 2);
    line(p, cx + 10, cy - 15, cx + 22, cy + 10, P.ink, 2);
    // 双角
    line(p, cx - 16, cy - 28, cx - 34, cy - 52, P.ink, 6);
    line(p, cx - 34, cy - 52, cx - 24, cy - 56, P.ash, 3);
    line(p, cx + 16, cy - 28, cx + 34, cy - 52, P.ink, 6);
    line(p, cx + 34, cy - 52, cx + 24, cy - 56, P.ash, 3);
    // 胸口裂隙
    ell(p, cx, cy + 2, 7, 16, [255, Math.round(100 + 80 * pulse), 40, 255]);
    circ(p, cx, cy - 4, 4, P.lavaCore);
    // 眼
    circ(p, cx - 12, cy - 12, 5, P.ink);
    circ(p, cx + 12, cy - 12, 5, P.ink);
    circ(p, cx - 12, cy - 12, 2, P.eye);
    circ(p, cx + 12, cy - 12, 2, P.eye);
    // 肩甲尖刺
    line(p, cx - 30, cy - 5, cx - 42, cy - 18, P.ash, 4);
    line(p, cx + 30, cy - 5, cx + 42, cy - 18, P.ash, 4);
  };
  const portrait = create(S, S);
  draw(portrait, 0);
  save(portrait, 'enemies/riftLord.png');
  const strip = create(S * 4, S);
  for (let f = 0; f < 4; f++) {
    const t = create(S, S);
    draw(t, f);
    blit(t, f * S, 0, strip);
  }
  save(strip, 'enemies/riftLord_idle.png');
  return { file: 'enemies/riftLord.png', idle: 'enemies/riftLord_idle.png', size: S };
}

// ==================== 技能图标 ====================
function genIcons() {
  const list = [];
  const specs = [
    ['wolfSummon', (p) => {
      ell(p, 36, 38, 15, 9, P.boneDim);
      circ(p, 46, 30, 9, P.bone);
      circ(p, 49, 28, 2, P.druidHi);
      circ(p, 42, 28, 2, P.ink);
      // 月牙
      circRing(p, 20, 20, 8, P.druid, 2);
    }],
    ['pierceArrow', (p) => {
      line(p, 12, 50, 50, 14, P.hunter, 3);
      circ(p, 50, 14, 4, P.gold);
      line(p, 14, 48, 8, 54, P.bone, 2);
      line(p, 14, 48, 8, 42, P.bone, 2);
    }],
    ['mageFireball', (p) => {
      circ(p, 32, 32, 16, P.lava);
      circ(p, 32, 32, 10, P.lavaCore);
      circ(p, 28, 28, 4, P.white);
      for (let i = 0; i < 5; i++) {
        const a = i * 1.1;
        circ(p, 32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20, 3, P.lava);
      }
    }],
    ['frostRing', (p) => {
      circRing(p, 32, 32, 18, P.hunterHi, 3);
      circRing(p, 32, 32, 12, P.hunter, 2);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        circ(p, 32 + Math.cos(a) * 18, 32 + Math.sin(a) * 18, 3, P.white);
      }
    }],
    ['chainLightning', (p) => {
      line(p, 12, 16, 28, 30, P.hunterHi, 3);
      line(p, 28, 30, 20, 40, P.hunter, 3);
      line(p, 20, 40, 40, 36, P.white, 2);
      line(p, 40, 36, 52, 50, P.hunterHi, 3);
      circ(p, 28, 30, 3, P.gold);
    }],
    ['meteor', (p) => {
      circ(p, 40, 18, 11, P.lava);
      circ(p, 40, 18, 5, P.lavaCore);
      line(p, 40, 28, 28, 50, P.bloodHi, 3);
      ell(p, 28, 52, 16, 6, P.blood);
    }],
    ['blackHole', (p) => {
      circ(p, 32, 32, 18, P.mageDim);
      circ(p, 32, 32, 11, P.ink);
      circRing(p, 32, 32, 18, P.mage, 2);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        line(p, 32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20, 32 + Math.cos(a) * 12, 32 + Math.sin(a) * 12, P.mageHi, 1);
      }
    }],
    ['arrowStorm', (p) => {
      for (let i = 0; i < 6; i++) {
        line(p, 12 + i * 8, 14, 16 + i * 8, 50, P.hunter, 2);
        circ(p, 16 + i * 8, 50, 2, P.gold);
      }
    }],
    ['ancientNature', (p) => {
      rect(p, 28, 30, 8, 20, P.boneDim);
      circ(p, 32, 22, 14, P.druidDim);
      circ(p, 32, 22, 8, P.druid);
      circ(p, 24, 18, 5, P.druidHi);
      circ(p, 40, 18, 5, P.druidHi);
      // 眼
      circ(p, 28, 36, 2, P.eye);
      circ(p, 36, 36, 2, P.eye);
    }],
    ['apocalypse', (p) => {
      circ(p, 32, 26, 14, P.bloodHi);
      circ(p, 32, 26, 7, P.lavaCore);
      ell(p, 32, 50, 22, 8, P.lava);
      for (let i = 0; i < 4; i++) circ(p, 16 + i * 10, 48, 3, P.gold);
    }],
  ];

  for (const [id, draw] of specs) {
    const p = create(64, 64);
    // 哥特圆底板
    circ(p, 32, 32, 30, [16, 12, 18, 245]);
    circRing(p, 32, 32, 30, P.blood, 2);
    circRing(p, 32, 32, 27, P.goldDim, 1);
    draw(p);
    save(p, `skills/icons/${id}.png`);
    list.push({ id, file: `skills/icons/${id}.png`, size: 64 });
  }
  return list;
}

// ==================== 技能特效 ====================
function genFX() {
  const F = 128, N = 4;
  const defs = [
    ['slash', (p, f) => {
      const t = f / 3;
      for (let i = 0; i < 40; i++) {
        const a = -1.0 + t * 2.4 + i * 0.015;
        const r = 28 + i * 1.4;
        put(p, 64 + Math.cos(a) * r, 64 + Math.sin(a) * r, P.bone);
        put(p, 64 + Math.cos(a) * (r + 2), 64 + Math.sin(a) * (r + 2), P.bloodHi);
      }
    }],
    ['explosion', (p, f) => {
      const r = 18 + f * 16;
      circ(p, 64, 64, r, [255, 120, 30, 200 - f * 35]);
      circ(p, 64, 64, (r * 0.55) | 0, [255, 220, 100, 220 - f * 40]);
      circ(p, 64, 64, (r * 0.25) | 0, P.white);
    }],
    ['lightning', (p, f) => {
      let x = 24, y = 16;
      for (let i = 0; i < 10; i++) {
        const nx = x + 8 + ((i + f) % 4) * 3 - 4;
        const ny = y + 10;
        line(p, x, y, nx, ny, P.hunterHi, 3);
        line(p, x, y, nx, ny, P.white, 1);
        x = nx; y = ny;
      }
    }],
    ['frost', (p, f) => {
      const r = 28 + f * 12;
      circRing(p, 64, 64, r, P.hunterHi, 3);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + f * 0.2;
        circ(p, 64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 4, P.white);
      }
    }],
    ['poison', (p, f) => {
      circ(p, 64, 64, 36 + f * 6, [90, 160, 50, 90]);
      for (let i = 0; i < 8; i++) {
        const a = f * 0.5 + i;
        circ(p, 64 + Math.cos(a) * (20 + f * 4), 64 + Math.sin(a) * (16 + f * 3), 4 + (i % 3), [150, 220, 80, 180]);
      }
    }],
    ['summonBurst', (p, f) => {
      circ(p, 64, 64, 12 + f * 14, [100, 180, 70, 130]);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        line(p, 64, 64, 64 + Math.cos(a) * (18 + f * 16), 64 + Math.sin(a) * (18 + f * 16), P.druidHi, 2);
      }
    }],
    ['meteorImpact', (p, f) => {
      circ(p, 64, 36 - f * 4, 14, P.lava);
      circ(p, 64, 36 - f * 4, 6, P.lavaCore);
      ell(p, 64, 88, 18 + f * 12, 10 + f * 4, [255, 80, 30, 190]);
      if (f > 0) circ(p, 64, 78, 20 + f * 8, [255, 140, 40, 110]);
    }],
    ['arrowRain', (p, f) => {
      for (let i = 0; i < 14; i++) {
        const x = 10 + (i * 17 + f * 11) % 110;
        const y = 8 + (i * 23 + f * 19) % 100;
        line(p, x, y, x + 3, y + 16, P.hunter, 2);
        put(p, x + 3, y + 16, P.gold);
      }
    }],
  ];

  const list = [];
  for (const [id, draw] of defs) {
    const strip = create(F * N, F);
    for (let f = 0; f < N; f++) {
      const t = create(F, F);
      draw(t, f);
      blit(t, f * F, 0, strip);
    }
    save(strip, `skills/fx/${id}.png`);
    list.push({ id, file: `skills/fx/${id}.png`, frameWidth: F, frames: N, fps: 12 });
  }
  return list;
}

// ==================== 地图 Tile ====================
function genTiles() {
  const T = 128;
  const tiles = [];

  // 石地
  {
    const p = create(T, T);
    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        const n = (x * 13 + y * 29 + (x ^ y)) & 31;
        const base = ((x >> 4) + (y >> 4)) & 1 ? [18, 17, 24, 255] : [14, 13, 20, 255];
        put(p, x, y, n > 26 ? P.ash : base);
      }
    }
    for (let i = 0; i < 14; i++) {
      ell(p, 12 + (i * 41) % 104, 12 + (i * 57) % 104, 6 + i % 6, 4 + i % 4, P.ash);
      circRing(p, 20 + (i * 33) % 90, 20 + (i * 47) % 90, 3 + i % 3, P.stone, 1);
    }
    // 哥特地砖缝
    for (let i = 0; i < T; i += 32) {
      line(p, i, 0, i, T, [8, 8, 12, 180], 1);
      line(p, 0, i, T, i, [8, 8, 12, 180], 1);
    }
    save(p, 'tiles/stone.png');
    tiles.push({ id: 'stone', file: 'tiles/stone.png', size: T });
  }

  // 岩浆
  {
    const p = create(T, T);
    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        const d = Math.hypot(x - 64, y - 60);
        const t = Math.max(0, 1 - d / 72);
        const wave = 0.5 + 0.5 * Math.sin(x * 0.15 + y * 0.1);
        put(p, x, y, [
          Math.round(60 + t * 195 * wave),
          Math.round(15 + t * 90),
          8,
          Math.round(50 + t * 205),
        ]);
      }
    }
    line(p, 28, 55, 95, 70, P.lavaCore, 2);
    line(p, 50, 35, 72, 100, P.lava, 2);
    circ(p, 64, 64, 8, P.lavaCore);
    save(p, 'tiles/lava.png');
    tiles.push({ id: 'lava', file: 'tiles/lava.png', size: T });
  }

  // 裂缝
  {
    const p = create(T, T);
    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        put(p, x, y, ((x + y) & 16) ? [16, 15, 22, 255] : [12, 11, 16, 255]);
      }
    }
    let x = 36;
    for (let y = 0; y < T; y += 3) {
      x += ((y * 5) % 9) - 4;
      line(p, x, y, x + 3, y + 3, [0, 0, 0, 230], 4);
      line(p, x + 1, y, x + 2, y + 3, [160, 40, 25, 160], 1);
    }
    // 支缝
    line(p, 50, 40, 80, 55, [0, 0, 0, 200], 2);
    line(p, 60, 80, 40, 100, [0, 0, 0, 200], 2);
    save(p, 'tiles/crack.png');
    tiles.push({ id: 'crack', file: 'tiles/crack.png', size: T });
  }

  // 骨堆
  {
    const p = create(T, T);
    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) put(p, x, y, [12, 11, 16, 255]);
    }
    for (let i = 0; i < 16; i++) {
      const bx = 18 + (i * 27) % 92;
      const by = 28 + (i * 39) % 72;
      const ang = i * 0.9;
      const x2 = bx + Math.cos(ang) * 20;
      const y2 = by + Math.sin(ang) * 12;
      line(p, bx, by, x2, y2, P.bone, 3);
      circ(p, bx, by, 3, P.boneDim);
      circ(p, x2, y2, 3, P.boneDim);
    }
    // 头骨
    circ(p, 64, 52, 16, P.bone);
    circ(p, 64, 54, 12, P.boneDim);
    circ(p, 58, 50, 3, P.ink);
    circ(p, 70, 50, 3, P.ink);
    ell(p, 64, 60, 5, 3, P.ink);
    // 血渍
    circ(p, 48, 70, 4, P.blood);
    circ(p, 80, 62, 3, P.blood);
    save(p, 'tiles/bones.png');
    tiles.push({ id: 'bones', file: 'tiles/bones.png', size: T });
  }
  return tiles;
}

// ==================== UI ====================
function genUI() {
  const S = 48;
  const icons = [];
  function one(id, draw) {
    const p = create(S, S);
    draw(p);
    save(p, `ui/${id}.png`);
    icons.push({ id, file: `ui/${id}.png`, size: S });
  }
  one('hp', (p) => {
    circ(p, 15, 18, 10, P.blood);
    circ(p, 33, 18, 10, P.blood);
    ell(p, 24, 28, 18, 14, P.blood);
    circ(p, 24, 22, 4, P.bloodHi);
  });
  one('exp', (p) => {
    circ(p, 24, 24, 18, P.druidDim);
    circ(p, 24, 24, 12, P.druid);
    circ(p, 24, 24, 5, P.white);
    circRing(p, 24, 24, 18, P.goldDim, 1);
  });
  one('gold', (p) => {
    circ(p, 24, 24, 17, P.goldDim);
    circ(p, 24, 24, 13, P.gold);
    rect(p, 21, 13, 6, 22, P.goldDim);
    circ(p, 24, 18, 2, P.white);
  });
  one('pause', (p) => {
    circ(p, 24, 24, 20, [18, 14, 20, 230]);
    circRing(p, 24, 24, 20, P.blood, 2);
    rect(p, 15, 12, 6, 24, P.white);
    rect(p, 27, 12, 6, 24, P.white);
  });
  one('settings', (p) => {
    circ(p, 24, 24, 18, [18, 14, 20, 230]);
    circRing(p, 24, 24, 18, P.stoneHi, 2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      circ(p, 24 + Math.cos(a) * 13, 24 + Math.sin(a) * 13, 4, P.stone);
    }
    circ(p, 24, 24, 6, P.ash);
    circ(p, 24, 24, 3, P.ink);
  });
  return icons;
}

function main() {
  console.log('[Assets] 生成暗黑哥特素材包…');
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const manifest = {
    name: 'Hell Rift Asset Pack',
    version: '1.1.0',
    style: 'dark-gothic-topdown-original',
    note: '原创程序化像素/矢量拼接素材，无第三方版权。俯视角、透明背景。',
    palette: {
      blood: '#b3121f', ash: '#37343e', bone: '#dcd2be', lava: '#ff781e',
      gold: '#ffcd46', druid: '#64b446', hunter: '#50aaf0', mage: '#b464f0',
    },
    characters: genCharacters(),
    enemies: {
      skeleton: genMob('skeleton', dSkeleton),
      ghoul: genMob('ghoul', dGhoul),
      hellhound: genMob('hellhound', dHound),
      demonMage: genMob('demonMage', dDemonMage),
      fallenKnight: genMob('fallenKnight', dKnight),
      riftLord: genBoss(),
    },
    skillIcons: genIcons(),
    skillFX: genFX(),
    tiles: genTiles(),
    ui: genUI(),
  };

  console.log('  characters: 3 sheets (idle/walk/attack/death)');
  console.log('  enemies: 5 + boss');
  console.log('  skill icons:', manifest.skillIcons.length);
  console.log('  skill fx:', manifest.skillFX.length);
  console.log('  tiles:', manifest.tiles.length);
  console.log('  ui:', manifest.ui.length);

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(OUT, 'README.md'), `# 地狱裂隙 · 原创暗黑哥特素材包

统一风格：**暗黑哥特 / 俯视角 / 透明背景 PNG**，无暴雪等第三方版权素材。

## 内容清单

| 分类 | 内容 | 尺寸 |
|------|------|------|
| 职业 | 德鲁伊 / 猎人 / 法师，各含 Idle·Walk·Attack·Death（4×4 精灵表） | 帧 96×96 |
| 怪物 | 骷髅、食尸鬼、地狱犬、恶魔法师、堕落骑士 + walk 条带 | 64×64 |
| Boss | 裂隙领主 + idle 条带 | 128×128 |
| 技能图标 | 10 个（狼灵/穿透箭/火球/冰环/闪电/陨石/黑洞/箭雨/远古自然/末日） | 64×64 |
| 技能特效 | 8 个条带（斩击/爆炸/闪电/冰霜/毒素/召唤爆发/陨石撞击/箭雨） | 帧 128×128×4 |
| 地图 Tile | 石地、岩浆、裂缝、骨堆 | 128×128 |
| UI | 生命、经验、金币、暂停、设置 | 48×48 |

详细帧配置见 \`manifest.json\`。

## 重新生成

\`\`\`bash
npm run generate:assets
# 或
node scripts/generate-assets.js
\`\`\`

## 下载

仓库内打包：\`dist/HellRift-Assets.zip\`
`);

  let n = 0;
  (function walk(d) {
    for (const name of fs.readdirSync(d)) {
      const f = path.join(d, name);
      if (fs.statSync(f).isDirectory()) walk(f);
      else n++;
    }
  })(OUT);
  console.log(`[Assets] 完成：${n} 个文件 → ${OUT}`);
}

main();
