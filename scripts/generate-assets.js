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
  // 概念设定板：德鲁伊 = 森林绿/褐；猎人 = 橄榄皮甲（非青蓝）；法师 = 深紫/金
  druid: [100, 150, 58, 255],
  druidDim: [42, 72, 32, 255],
  druidHi: [168, 214, 96, 255],
  druidBark: [92, 62, 36, 255],
  druidFur: [120, 96, 70, 255],
  hunter: [78, 104, 52, 255],
  hunterDim: [36, 42, 28, 255],
  hunterHi: [140, 168, 88, 255],
  hunterLeather: [92, 58, 36, 255],
  hunterMetal: [110, 108, 100, 255],
  mage: [132, 72, 196, 255],
  mageDim: [42, 22, 72, 255],
  mageHi: [210, 160, 255, 255],
  mageRobe: [58, 28, 96, 255],
  mageGold: [201, 164, 92, 255],
  ice: [140, 200, 230, 255],
  iceHi: [220, 245, 255, 255],
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

// ==================== 角色 96 帧表（对齐概念设定板） ====================
const CF = 96;
const ANIMS = ['idle', 'walk', 'attack', 'death'];

function drawDeadHero(png, cx, cy, robe, accent) {
  ell(png, cx, cy + 12, 28, 11, robe);
  circ(png, cx - 10, cy + 4, 10, accent);
  circ(png, cx + 12, cy + 8, 8, P.boneDim);
  for (let i = 0; i < 5; i++) circ(png, cx - 18 + i * 9, cy + 6, 2, P.blood);
}

/** 德鲁伊：鹿角老者 + 绿袍毛皮 + 藤杖绿核 + 侧伴狼影 */
function drawDruidHero(png, ox, oy, anim, frame) {
  const cx = ox + 48;
  const cy = oy + 50;
  const bob = anim === 'walk' ? Math.sin(frame * 1.4) * 3 : anim === 'idle' ? Math.sin(frame * 0.8) * 1.2 : 0;
  const atk = anim === 'attack';
  const dead = anim === 'death';
  ell(png, cx, oy + 86, 22, 7, P.shadow);
  if (dead && frame >= 2) {
    drawDeadHero(png, cx, cy, P.druidDim, P.druid);
    return;
  }
  const by = cy + bob;
  const lean = atk ? frame * 2.2 : 0;

  // 绿叶披风
  ell(png, cx + lean * 0.2, by + 16, 22, 26, P.druidDim);
  ell(png, cx + lean * 0.2, by + 12, 16, 20, P.druid);
  // 毛皮肩甲
  circ(png, cx - 14, by - 2, 9, P.druidFur);
  circ(png, cx + 14, by - 2, 9, P.druidFur);
  circ(png, cx - 14, by - 4, 4, P.boneDim);
  circ(png, cx + 14, by - 4, 4, P.boneDim);
  // 躯干皮甲
  circ(png, cx, by + 2, 14, P.druidBark);
  circ(png, cx - 2, by - 2, 6, P.druidHi);
  rect(png, cx - 11, by + 10, 22, 3, P.goldDim);

  // 头：胡须老者
  circ(png, cx, by - 18, 12, [210, 185, 155, 255]);
  circ(png, cx, by - 12, 7, [190, 170, 140, 255]); // 须
  rect(png, cx - 5, by - 20, 3, 2, P.ink);
  rect(png, cx + 3, by - 20, 3, 2, P.ink);
  // 巨角（肩上鹿角）
  line(png, cx - 10, by - 26, cx - 22, by - 46, P.boneDim, 4);
  line(png, cx - 22, by - 46, cx - 14, by - 52, P.bone, 3);
  line(png, cx - 18, by - 40, cx - 26, by - 44, P.bone, 2);
  line(png, cx + 10, by - 26, cx + 22, by - 46, P.boneDim, 4);
  line(png, cx + 22, by - 46, cx + 14, by - 52, P.bone, 3);
  line(png, cx + 18, by - 40, cx + 26, by - 44, P.bone, 2);
  // 叶冠
  circ(png, cx - 8, by - 28, 3, P.druid);
  circ(png, cx + 8, by - 28, 3, P.druidHi);

  // 藤蔓法杖 + 绿核
  const sx = cx + 24 + (atk ? frame * 3 : 0);
  const staffTop = by - 40 - (atk ? frame * 2 : 0);
  line(png, sx, by + 24, sx - 3, staffTop, P.druidBark, 4);
  circ(png, sx - 3, staffTop - 4, 9, P.druidDim);
  circ(png, sx - 3, staffTop - 4, 5, P.druidHi);
  if (atk) circRing(png, sx - 3, staffTop - 4, 12 + frame * 2, P.druidHi, 1);
  // 地面绿纹（攻击）
  if (atk && frame >= 2) {
    circRing(png, cx, by + 28, 10 + frame * 4, [80, 180, 70, 120], 2);
  }

  // 侧伴狼影（idle/walk）
  if (!atk) {
    const wx = cx - 28;
    const wy = by + 18 + Math.sin(frame) * 1.5;
    ell(png, wx, wy, 12, 7, [90, 95, 105, 200]);
    circ(png, wx + 10, wy - 4, 6, [100, 105, 115, 200]);
    circ(png, wx + 12, wy - 5, 1, P.druidHi);
  }

  const step = anim === 'walk' ? Math.sin(frame * 1.6) * 5 : 0;
  rect(png, cx - 9, by + 20, 7, 14 + step, P.druidBark);
  rect(png, cx + 3, by + 20, 7, 14 - step, P.druidBark);
  rect(png, cx - 10, by + 32 + step, 9, 5, P.ink);
  rect(png, cx + 2, by + 32 - step, 9, 5, P.ink);
}

/** 猎人：兜帽面罩 + 橄榄皮甲 + 反曲弓 + 箭袋 */
function drawHunterHero(png, ox, oy, anim, frame) {
  const cx = ox + 48;
  const cy = oy + 50;
  const bob = anim === 'walk' ? Math.sin(frame * 1.5) * 2.5 : anim === 'idle' ? Math.sin(frame * 0.7) * 1 : 0;
  const atk = anim === 'attack';
  const dead = anim === 'death';
  ell(png, cx, oy + 86, 20, 7, P.shadow);
  if (dead && frame >= 2) {
    drawDeadHero(png, cx, cy, P.hunterDim, P.hunterLeather);
    return;
  }
  const by = cy + bob;

  // 深色斗篷
  ell(png, cx - 2, by + 14, 18, 24, P.hunterDim);
  ell(png, cx, by + 10, 13, 18, P.hunter);
  // 皮甲躯干 + 金属扣
  circ(png, cx, by, 13, P.hunterLeather);
  circ(png, cx - 3, by - 4, 5, P.hunterHi);
  rect(png, cx - 10, by + 8, 20, 3, P.hunterMetal);
  put(png, cx, by + 9, P.goldDim);
  // 肩甲金属片
  circ(png, cx - 13, by - 4, 6, P.hunterMetal);
  circ(png, cx + 11, by - 4, 6, P.hunterMetal);

  // 兜帽 + 面罩
  circ(png, cx, by - 20, 13, P.hunterDim);
  circ(png, cx, by - 17, 9, [40, 36, 32, 255]);
  rect(png, cx - 7, by - 19, 14, 3, P.ink); // 眼缝
  rect(png, cx - 5, by - 19, 4, 2, P.hunterHi);
  rect(png, cx + 2, by - 19, 4, 2, P.hunterHi);
  // 兜帽尖
  line(png, cx - 10, by - 28, cx, by - 38, P.hunterDim, 3);
  line(png, cx + 10, by - 28, cx, by - 38, P.hunterDim, 3);

  // 箭袋
  rect(png, cx - 20, by + 2, 7, 16, P.hunterLeather);
  line(png, cx - 18, by + 2, cx - 18, by - 6, P.hunterHi, 1);
  line(png, cx - 16, by + 2, cx - 16, by - 8, P.goldDim, 1);

  // 反曲弓
  const bx0 = cx + 18 + (atk ? -frame * 2 : 0);
  line(png, bx0, by - 28, bx0 + 2, by + 20, P.hunterLeather, 3);
  line(png, bx0, by - 28, bx0 + 14, by - 2, P.hunterMetal, 2);
  line(png, bx0 + 2, by + 20, bx0 + 14, by - 2, P.hunterMetal, 2);
  line(png, bx0 + 2, by - 2, bx0 + 12, by - 2, P.bone, 1);
  if (atk) {
    const ax = bx0 + 16 + frame * 10;
    const ay = by - 4 - frame * 2;
    line(png, bx0 + 8, by - 2, ax, ay, P.hunterHi, 2);
    circ(png, ax, ay, 3, P.gold);
    // 羽
    line(png, bx0 + 10, by - 2, bx0 + 6, by - 6, P.druid, 1);
  }

  const step = anim === 'walk' ? Math.sin(frame * 1.7) * 5 : 0;
  rect(png, cx - 8, by + 18, 6, 14 + step, P.hunterDim);
  rect(png, cx + 3, by + 18, 6, 14 - step, P.hunterDim);
  rect(png, cx - 9, by + 30 + step, 8, 4, P.ink);
  rect(png, cx + 2, by + 30 - step, 8, 4, P.ink);
}

/** 法师：紫黑金纹长袍 + 水晶法杖 + 手持奥术球 */
function drawMageHero(png, ox, oy, anim, frame) {
  const cx = ox + 48;
  const cy = oy + 50;
  const bob = anim === 'walk' ? Math.sin(frame * 1.2) * 2 : anim === 'idle' ? Math.sin(frame * 0.9) * 1.5 : 0;
  const atk = anim === 'attack';
  const dead = anim === 'death';
  ell(png, cx, oy + 86, 22, 7, P.shadow);
  if (dead && frame >= 2) {
    drawDeadHero(png, cx, cy, P.mageDim, P.mage);
    return;
  }
  const by = cy + bob - (atk ? 2 : 0);
  const floatY = atk ? -frame : 0;

  // 多层长袍
  ell(png, cx, by + 18 + floatY, 20, 28, P.mageDim);
  ell(png, cx, by + 12 + floatY, 15, 22, P.mageRobe);
  // 金纹肩饰
  line(png, cx - 12, by - 2 + floatY, cx - 18, by + 16 + floatY, P.mageGold, 2);
  line(png, cx + 12, by - 2 + floatY, cx + 18, by + 16 + floatY, P.mageGold, 2);
  circ(png, cx - 12, by - 4 + floatY, 6, P.mageGold);
  circ(png, cx + 12, by - 4 + floatY, 6, P.mageGold);
  // 胸前金饰
  circ(png, cx, by + 4 + floatY, 4, P.mageGold);
  circ(png, cx, by + 4 + floatY, 2, P.mageHi);

  // 长发 + 面容
  circ(png, cx, by - 16 + floatY, 11, [40, 28, 48, 255]);
  circ(png, cx, by - 18 + floatY, 9, [210, 175, 160, 255]);
  // 长发披落
  ell(png, cx - 10, by - 6 + floatY, 5, 14, [30, 20, 40, 255]);
  ell(png, cx + 10, by - 6 + floatY, 5, 14, [30, 20, 40, 255]);
  rect(png, cx - 4, by - 20 + floatY, 2, 2, P.mageHi);
  rect(png, cx + 3, by - 20 + floatY, 2, 2, P.mageHi);

  // 水晶法杖
  const sx = cx + 22 + (atk ? frame : 0);
  line(png, sx, by + 26 + floatY, sx + 1, by - 36 + floatY, P.mageGold, 3);
  const orb = 7 + (atk ? frame : 0);
  circ(png, sx + 1, by - 42 + floatY, orb + 2, P.mage);
  circ(png, sx + 1, by - 42 + floatY, orb, P.mageHi);
  circ(png, sx - 1, by - 44 + floatY, 3, P.white);

  // 左手奥术球
  const hx = cx - 18 - (atk ? frame * 2 : 0);
  const hy = by + 2 + floatY;
  circ(png, hx, hy, 8 + (atk ? frame : 0), [100, 50, 180, 180]);
  circ(png, hx, hy, 4, P.mageHi);
  if (atk && frame >= 2) {
    for (let i = 0; i < 4; i++) {
      const a = frame + i;
      circ(png, hx + Math.cos(a) * 14, hy + Math.sin(a) * 14, 2, P.mageHi);
    }
  }

  const step = anim === 'walk' ? Math.sin(frame * 1.4) * 3 : 0;
  // 袍摆遮腿，只露靴尖
  rect(png, cx - 8, by + 30 + step + floatY, 6, 4, P.ink);
  rect(png, cx + 3, by + 30 - step + floatY, 6, 4, P.ink);
}

function drawHero(png, ox, oy, cls, anim, frame) {
  if (cls === 'druid') drawDruidHero(png, ox, oy, anim, frame);
  else if (cls === 'hunter') drawHunterHero(png, ox, oy, anim, frame);
  else drawMageHero(png, ox, oy, anim, frame);
}

/** 选角用大立绘（对齐概念图全身像气质） */
function drawPortrait(cls) {
  const S = 160;
  const p = create(S, S);
  // 暗底光晕
  const glow = cls === 'druid' ? P.druid : cls === 'hunter' ? P.hunter : P.mage;
  for (let r = 70; r > 10; r -= 4) {
    const a = Math.max(20, 90 - r);
    circ(p, 80, 100, r, [glow[0], glow[1], glow[2], a]);
  }
  // 放大绘制一帧 idle
  const tmp = create(CF, CF);
  drawHero(tmp, 0, 0, cls, 'idle', 1);
  // 居中放大约 1.5x 手工 blit scale
  for (let y = 0; y < CF; y++) {
    for (let x = 0; x < CF; x++) {
      const si = (CF * y + x) << 2;
      if (tmp.data[si + 3] < 10) continue;
      const dx = 32 + ((x * 1.5) | 0);
      const dy = 20 + ((y * 1.5) | 0);
      for (let oy = 0; oy < 2; oy++) {
        for (let ox = 0; ox < 2; ox++) {
          put(p, dx + ox, dy + oy, [tmp.data[si], tmp.data[si + 1], tmp.data[si + 2], tmp.data[si + 3]]);
        }
      }
    }
  }
  // 职业色金边框角
  const edge = cls === 'mage' ? P.mageGold : P.goldDim;
  line(p, 8, 8, 28, 8, edge, 2);
  line(p, 8, 8, 8, 28, edge, 2);
  line(p, S - 8, 8, S - 28, 8, edge, 2);
  line(p, S - 8, 8, S - 8, 28, edge, 2);
  line(p, 8, S - 8, 28, S - 8, edge, 2);
  line(p, 8, S - 8, 8, S - 28, edge, 2);
  line(p, S - 8, S - 8, S - 28, S - 8, edge, 2);
  line(p, S - 8, S - 8, S - 8, S - 28, edge, 2);
  return p;
}

function genCharacters() {
  // 完整 8 向动画包由 generate-character-sprites.js 输出到 characters/{id}/
  // 此处仅保留旧版单表作为回退（兼容）
  const meta = {};
  for (const cls of ['druid', 'hunter', 'mage']) {
    const sheet = create(CF * 4, CF * 4);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) drawHero(sheet, c * CF, r * CF, cls, ANIMS[r], c);
    }
    save(sheet, `characters/${cls}.png`);
    const portrait = drawPortrait(cls);
    save(portrait, `characters/${cls}_portrait.png`);
    meta[cls] = {
      file: `characters/${cls}.png`,
      portrait: `characters/${cls}_portrait.png`,
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

// ==================== 技能图标（对齐概念板：爪印/藤蔓/熊/古树 · 箭矢/散射/印记 · 奥术/冰/雷/陨/洞） ====================
function iconPlate(p, accent) {
  circ(p, 32, 32, 30, [14, 10, 16, 250]);
  circRing(p, 32, 32, 30, accent || P.blood, 2);
  circRing(p, 32, 32, 27, P.goldDim, 1);
}

function genIcons() {
  const list = [];
  const specs = [
    // —— 德鲁伊 ——
    ['wolfSummon', (p) => { // 狼爪印
      circ(p, 32, 34, 10, P.druidDim);
      circ(p, 32, 36, 6, P.druid);
      for (const [x, y] of [[22, 22], [28, 16], [36, 16], [42, 22]]) {
        ell(p, x, y, 4, 5, P.druidHi);
      }
    }, P.druid],
    ['natureStorm', (p) => { // 自然漩涡
      for (let i = 0; i < 3; i++) circRing(p, 32, 32, 10 + i * 6, i % 2 ? P.druidHi : P.druid, 2);
      circ(p, 32, 32, 5, P.druidHi);
    }, P.druid],
    ['vineBind', (p) => { // 荆棘根须
      for (let i = 0; i < 5; i++) {
        const x = 14 + i * 9;
        line(p, x, 52, x + (i % 2 ? 4 : -4), 16, P.druidBark, 3);
        circ(p, x + (i % 2 ? 4 : -4), 14, 3, P.druid);
      }
    }, P.druid],
    ['poisonVines', (p) => {
      line(p, 16, 48, 32, 18, P.druid, 3);
      line(p, 32, 18, 48, 48, P.druidDim, 3);
      circ(p, 32, 20, 6, P.druidHi);
      circ(p, 24, 36, 3, [120, 220, 80, 255]);
      circ(p, 40, 36, 3, [120, 220, 80, 255]);
    }, P.druid],
    ['bearSummon', (p) => { // 熊首
      ell(p, 32, 34, 16, 14, P.druidBark);
      circ(p, 18, 22, 7, P.druidFur);
      circ(p, 46, 22, 7, P.druidFur);
      circ(p, 26, 32, 3, P.ink);
      circ(p, 38, 32, 3, P.ink);
      ell(p, 32, 42, 6, 4, P.ink);
    }, P.druid],
    ['thornsArmor', (p) => {
      circ(p, 32, 34, 14, P.druidDim);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        line(p, 32 + Math.cos(a) * 12, 34 + Math.sin(a) * 12, 32 + Math.cos(a) * 22, 34 + Math.sin(a) * 22, P.druidHi, 2);
      }
    }, P.druid],
    ['ancientNature', (p) => { // 远古绿树
      rect(p, 28, 34, 8, 18, P.druidBark);
      circ(p, 32, 24, 16, P.druidDim);
      circ(p, 32, 22, 10, P.druid);
      circ(p, 22, 20, 6, P.druidHi);
      circ(p, 42, 18, 7, P.druidHi);
      circ(p, 32, 14, 5, [200, 240, 120, 255]);
    }, P.druid],
    // —— 猎人 ——
    ['pierceArrow', (p) => { // 青绿穿风箭
      line(p, 12, 48, 50, 16, P.hunterHi, 3);
      circ(p, 50, 16, 4, P.gold);
      line(p, 14, 46, 8, 52, P.druid, 2);
      line(p, 14, 46, 8, 40, P.druid, 2);
      circRing(p, 36, 28, 8, [120, 200, 100, 100], 1);
    }, P.hunter],
    ['multiShot', (p) => { // 金色散矢
      for (let i = -2; i <= 2; i++) {
        line(p, 14, 40 + i * 2, 50, 20 + i * 6, P.gold, 2);
        circ(p, 50, 20 + i * 6, 2, P.gold);
      }
    }, P.hunter],
    ['homingArrow', (p) => { // 紫色追踪印记
      circRing(p, 32, 32, 16, P.mage, 2);
      circRing(p, 32, 32, 10, P.mageHi, 1);
      line(p, 32, 12, 32, 52, P.mageHi, 2);
      line(p, 12, 32, 52, 32, P.mageHi, 2);
      circ(p, 32, 32, 4, P.mage);
    }, P.mage],
    ['explodeArrow', (p) => { // 焰矢
      line(p, 14, 46, 44, 18, P.hunterLeather, 3);
      circ(p, 46, 16, 8, P.lava);
      circ(p, 46, 16, 4, P.lavaCore);
      circ(p, 40, 22, 3, P.bloodHi);
    }, P.lava],
    ['frostArrow', (p) => {
      line(p, 14, 48, 48, 18, P.ice, 3);
      circ(p, 48, 18, 5, P.iceHi);
      for (let i = 0; i < 4; i++) {
        const a = i * 1.2;
        line(p, 48, 18, 48 + Math.cos(a) * 10, 18 + Math.sin(a) * 10, P.iceHi, 1);
      }
    }, P.ice],
    ['chainArrow', (p) => {
      line(p, 10, 40, 28, 24, P.hunterHi, 2);
      line(p, 28, 24, 40, 36, P.gold, 2);
      line(p, 40, 36, 54, 18, P.hunterHi, 2);
      circ(p, 28, 24, 3, P.gold);
      circ(p, 40, 36, 3, P.gold);
    }, P.hunter],
    ['arrowStorm', (p) => {
      for (let i = 0; i < 7; i++) {
        line(p, 10 + i * 7, 12, 14 + i * 7, 52, i % 2 ? P.gold : P.hunterHi, 2);
        circ(p, 14 + i * 7, 52, 2, P.lava);
      }
    }, P.hunter],
    // —— 法师 ——
    ['mageFireball', (p) => { // 奥术紫核（概念板首图标）
      circ(p, 32, 32, 16, P.mage);
      circ(p, 32, 32, 10, P.mageHi);
      circ(p, 28, 28, 4, P.white);
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05;
        circ(p, 32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20, 3, P.mageDim);
      }
    }, P.mage],
    ['arcaneMissile', (p) => {
      for (let i = 0; i < 3; i++) {
        circ(p, 18 + i * 14, 36 - i * 4, 7, P.mage);
        circ(p, 18 + i * 14, 36 - i * 4, 3, P.mageHi);
      }
    }, P.mage],
    ['frostRing', (p) => { // 冰晶法阵
      circRing(p, 32, 38, 16, P.ice, 2);
      for (let i = 0; i < 5; i++) {
        const a = -0.4 + i * 0.5;
        const x = 32 + Math.cos(a) * 10;
        const y = 28 + Math.sin(a) * 8 - i;
        line(p, 32, 42, x, y - 8, P.iceHi, 2);
        circ(p, x, y - 8, 3, P.white);
      }
    }, P.ice],
    ['chainLightning', (p) => { // 紫电
      line(p, 12, 14, 28, 28, P.mageHi, 3);
      line(p, 28, 28, 18, 40, P.mage, 3);
      line(p, 18, 40, 38, 36, P.white, 2);
      line(p, 38, 36, 52, 52, P.mageHi, 3);
      circ(p, 28, 28, 3, P.gold);
    }, P.mage],
    ['meteor', (p) => {
      circ(p, 40, 16, 12, P.mage);
      circ(p, 40, 16, 6, P.lavaCore);
      line(p, 36, 26, 22, 52, P.bloodHi, 4);
      ell(p, 22, 54, 16, 6, P.lava);
      circ(p, 40, 14, 3, P.mageHi);
    }, P.mage],
    ['blackHole', (p) => {
      circ(p, 32, 32, 18, P.mageDim);
      circ(p, 32, 32, 11, P.ink);
      circRing(p, 32, 32, 18, P.mage, 2);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        line(p, 32 + Math.cos(a) * 22, 32 + Math.sin(a) * 22, 32 + Math.cos(a) * 12, 32 + Math.sin(a) * 12, P.mageHi, 1);
      }
    }, P.mage],
    ['apocalypse', (p) => {
      circ(p, 32, 26, 14, P.bloodHi);
      circ(p, 32, 26, 7, P.mageHi);
      ell(p, 32, 50, 22, 8, P.lava);
      for (let i = 0; i < 4; i++) circ(p, 16 + i * 10, 48, 3, P.mageGold);
    }, P.mage],
  ];

  for (const [id, draw, accent] of specs) {
    const p = create(64, 64);
    iconPlate(p, accent);
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

  console.log('  characters: 3 sheets + 3 portraits (concept-aligned)');
  console.log('  enemies: 5 + boss');
  console.log('  skill icons:', manifest.skillIcons.length);
  console.log('  skill fx:', manifest.skillFX.length);
  console.log('  tiles:', manifest.tiles.length);
  console.log('  ui:', manifest.ui.length);

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  // 供打包内联（微信无 fetch JSON）；与 manifest.json 同步
  fs.writeFileSync(
    path.join(OUT, 'manifestData.js'),
    '/** Auto from manifest.json — do not edit by hand */\nexport default '
      + JSON.stringify(manifest, null, 2)
      + ';\n',
  );
  fs.writeFileSync(path.join(OUT, 'README.md'), `# 地狱裂隙 · 原创暗黑哥特素材包

统一风格：**暗黑哥特 / 俯视角 / 透明背景 PNG**，无暴雪等第三方版权素材。

## 内容清单

| 分类 | 内容 | 尺寸 |
|------|------|------|
| 职业 | 德鲁伊 / 猎人 / 法师：Idle·Walk·Attack·Death 精灵表 + 选角立绘（对齐概念设定板） | 帧 96×96 / 立绘 160×160 |
| 怪物 | 骷髅、食尸鬼、地狱犬、恶魔法师、堕落骑士 + walk 条带 | 64×64 |
| Boss | 裂隙领主 + idle 条带 | 128×128 |
| 技能图标 | 职业向图标（爪印/藤蔓/熊/古树 · 穿箭/散射/印记/焰矢 · 奥术/冰/雷/陨/洞 等） | 64×64 |
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
