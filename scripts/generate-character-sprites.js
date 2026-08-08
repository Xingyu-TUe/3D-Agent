/**
 * generate-character-sprites.js
 * 概念图 → 可运行角色素材（Dark Fantasy / Top-Down 45°）
 *
 * 输出：
 *   src/Assets/characters/{druid|hunter|mage}/
 *     idle.png + idle.json
 *     walk / run / attack01 / attack02 / cast|shoot / hit / death / victory
 *     shadow.png + shadow.json
 *     portrait.png
 *
 * 帧尺寸默认 128（微信小游戏可玩体积）。
 * 可用 FRAME=256 node scripts/generate-character-sprites.js 提高清晰度。
 * 完整 512×512×8向×全动画远超微信主包限制，故生产包使用 128/256。
 *
 * 布局：行 = 8 方向 (N NE E SE S SW W NW)，列 = 帧
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'src', 'Assets', 'characters');
const FRAME = Math.max(64, Math.min(512, parseInt(process.env.FRAME || '128', 10) || 128));
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const ANIMS = {
  idle: { frames: 8, fps: 8, loop: true },
  walk: { frames: 8, fps: 10, loop: true },
  run: { frames: 8, fps: 14, loop: true },
  attack01: { frames: 8, fps: 12, loop: false },
  attack02: { frames: 10, fps: 12, loop: false },
  cast: { frames: 10, fps: 10, loop: false }, // druid/mage
  shoot: { frames: 10, fps: 12, loop: false }, // hunter
  hit: { frames: 4, fps: 12, loop: false },
  death: { frames: 10, fps: 8, loop: false },
  victory: { frames: 8, fps: 8, loop: false },
};

// —— 概念板严格配色 ——
const PAL = {
  druid: {
    skin: [210, 185, 155, 255],
    skinSh: [160, 130, 105, 255],
    beard: [230, 225, 215, 255],
    antler: [200, 185, 155, 255],
    antlerSh: [140, 120, 90, 255],
    fur: [90, 85, 80, 255],
    furHi: [130, 120, 110, 255],
    leather: [90, 62, 40, 255],
    leatherHi: [130, 90, 55, 255],
    moss: [58, 90, 45, 255],
    cloak: [50, 78, 42, 255],
    cloakHi: [90, 130, 60, 255],
    staff: [80, 55, 35, 255],
    orb: [120, 220, 80, 255],
    orbCore: [200, 255, 140, 255],
    fx: [100, 210, 70, 200],
    wolf: [110, 115, 120, 255],
    wolfEye: [180, 230, 90, 255],
  },
  hunter: {
    skin: [180, 150, 125, 255],
    hood: [40, 48, 34, 255],
    cloak: [45, 58, 38, 255],
    cloakHi: [70, 90, 55, 255],
    leather: [92, 62, 42, 255],
    leatherHi: [130, 90, 55, 255],
    metal: [120, 115, 105, 255],
    metalHi: [170, 160, 140, 255],
    strap: [60, 40, 28, 255],
    bow: [100, 70, 40, 255],
    bowHi: [160, 120, 60, 255],
    string: [210, 200, 180, 255],
    arrow: [140, 160, 90, 255],
    arrowTip: [200, 180, 80, 255],
    eye: [220, 200, 80, 255],
    fxG: [140, 210, 90, 200],
    fxGold: [255, 200, 80, 200],
    fxFire: [255, 120, 40, 200],
    fxPurple: [160, 80, 220, 200],
  },
  mage: {
    skin: [215, 185, 170, 255],
    skinSh: [170, 140, 130, 255],
    hair: [28, 20, 40, 255],
    hairHi: [55, 40, 75, 255],
    robe: [48, 28, 78, 255],
    robeHi: [90, 50, 140, 255],
    robeDeep: [22, 12, 40, 255],
    gold: [180, 140, 70, 255],
    goldHi: [230, 190, 110, 255],
    staff: [35, 30, 45, 255],
    crystal: [160, 90, 230, 255],
    crystalHi: [230, 180, 255, 255],
    orb: [140, 70, 210, 220],
    orbCore: [220, 170, 255, 255],
    eye: [190, 140, 255, 255],
    fx: [170, 100, 255, 180],
    ice: [140, 200, 240, 200],
    fire: [255, 100, 50, 200],
  },
  shadow: [0, 0, 0, 90],
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
  const a = c[3];
  if (a >= 250) {
    png.data[i] = c[0]; png.data[i + 1] = c[1]; png.data[i + 2] = c[2]; png.data[i + 3] = a;
    return;
  }
  const da = png.data[i + 3] / 255;
  const sa = a / 255;
  const out = sa + da * (1 - sa);
  if (out <= 0) return;
  png.data[i] = Math.round((c[0] * sa + png.data[i] * da * (1 - sa)) / out);
  png.data[i + 1] = Math.round((c[1] * sa + png.data[i + 1] * da * (1 - sa)) / out);
  png.data[i + 2] = Math.round((c[2] * sa + png.data[i + 2] * da * (1 - sa)) / out);
  png.data[i + 3] = Math.round(out * 255);
}

function circ(png, cx, cy, r, c) {
  r = Math.max(0, r);
  const r2 = r * r;
  const x0 = Math.max(0, (cx - r) | 0), x1 = Math.min(png.width - 1, (cx + r) | 0);
  const y0 = Math.max(0, (cy - r) | 0), y1 = Math.min(png.height - 1, (cy + r) | 0);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d <= r2) {
        let col = c;
        if (d > r2 * 0.72 && c[3] > 40) {
          const edge = 1 - (Math.sqrt(d) - r * 0.85) / (r * 0.15);
          col = [c[0], c[1], c[2], Math.max(0, Math.min(255, (c[3] * Math.max(0, edge)) | 0))];
        }
        put(png, x, y, col);
      }
    }
  }
}

function ell(png, cx, cy, rx, ry, c) {
  rx = Math.max(1, rx); ry = Math.max(1, ry);
  const x0 = Math.max(0, (cx - rx) | 0), x1 = Math.min(png.width - 1, (cx + rx) | 0);
  const y0 = Math.max(0, (cy - ry) | 0), y1 = Math.min(png.height - 1, (cy + ry) | 0);
  const rx2 = rx * rx, ry2 = ry * ry;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (((x - cx) * (x - cx)) / rx2 + ((y - cy) * (y - cy)) / ry2 <= 1) put(png, x, y, c);
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

function save(png, fp) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, PNG.sync.write(png, { colorType: 6 }));
}

function blit(src, dx, dy, dst) {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const si = (src.width * y + x) << 2;
      if (src.data[si + 3] < 8) continue;
      put(dst, dx + x, dy + y, [src.data[si], src.data[si + 1], src.data[si + 2], src.data[si + 3]]);
    }
  }
}

/** 方向 → 水平翻转与前后层偏置（俯视 45°） */
function dirMeta(dir) {
  const i = DIRS.indexOf(dir);
  // 面向：E/NE/SE 偏右；W/NW/SW 翻转；N 背对；S 正对
  const flip = dir === 'W' || dir === 'NW' || dir === 'SW';
  const back = dir === 'N' || dir === 'NE' || dir === 'NW';
  const side = dir === 'E' || dir === 'W' || dir === 'NE' || dir === 'NW' || dir === 'SE' || dir === 'SW';
  const ang = (i / 8) * Math.PI * 2; // N=0
  return { i, flip, back, side, ang };
}

function pivotY() {
  return Math.round(FRAME * 0.86);
}
function pivotX() {
  return Math.round(FRAME * 0.5);
}

// ==================== 角色绘制（严格概念：服装/武器/发型/披风） ====================

function drawDruid(png, anim, frame, nFrames, dir) {
  const p = PAL.druid;
  const { flip, back } = dirMeta(dir);
  const cx = pivotX();
  const foot = pivotY();
  const t = frame / Math.max(1, nFrames - 1);
  const breath = anim === 'idle' ? Math.sin(frame * 0.9) * 1.2 : 0;
  const bob = (anim === 'walk' || anim === 'run') ? Math.sin(frame * (anim === 'run' ? 1.6 : 1.2)) * (anim === 'run' ? 3.5 : 2.2) : breath;
  const lean = anim === 'run' ? 3 : (anim.startsWith('attack') || anim === 'cast' ? frame * 0.8 : 0);
  const die = anim === 'death' ? t : 0;
  const hit = anim === 'hit' ? Math.sin(frame * 2) * 3 : 0;

  let by = foot - Math.round(FRAME * 0.32) + bob + hit;
  let bodyS = 1;
  if (die > 0.35) {
    by += die * 18;
    bodyS = 1 - die * 0.15;
  }

  const sx = (x) => (flip ? cx - (x - cx) : x);
  const f = (x, y, r, c) => circ(png, sx(x), y, r * bodyS, c);
  const e = (x, y, rx, ry, c) => ell(png, sx(x), y, rx * bodyS, ry * bodyS, c);
  const l = (x0, y0, x1, y1, c, th) => line(png, sx(x0), y0, sx(x1), y1, c, th);

  // —— 狼灵（概念：身旁）——
  if (anim !== 'death' && !back) {
    const wx = cx - FRAME * 0.28;
    const wy = foot - 8 + Math.sin(frame * 0.8) * 1.5;
    const leap = anim === 'attack02' && frame >= 5 ? (frame - 5) * 4 : 0;
    e(wx + leap, wy, 14, 8, p.wolf);
    f(wx + 12 + leap, wy - 5, 7, p.wolf);
    f(wx + 14 + leap, wy - 6, 1.5, p.wolfEye);
    l(wx - 10 + leap, wy, wx - 18 + leap, wy - 4, p.fur, 2);
  }

  // 披风 / 狼皮披肩
  e(cx + lean * 0.2, by + 10, 22, 28, p.cloak);
  e(cx + lean * 0.2, by + 6, 16, 20, p.moss);
  // 狼皮肩
  f(cx - 16, by - 4, 11, p.fur);
  f(cx + 16, by - 4, 11, p.fur);
  f(cx - 16, by - 8, 5, p.furHi);
  f(cx + 16, by - 8, 5, p.furHi);

  // 皮革躯干
  f(cx, by + 2, 15, p.leather);
  f(cx - 3, by - 2, 6, p.leatherHi);
  // 腰带
  e(cx, by + 12, 12, 2.5, p.antlerSh);

  // 头 + 白须
  f(cx, by - 20, 12, p.skin);
  f(cx - 2, by - 22, 4, p.skinSh);
  e(cx, by - 12, 8, 7, p.beard);
  e(cx, by - 8, 6, 5, p.beard);
  // 眼
  put(png, sx(cx - 4) | 0, (by - 22) | 0, [40, 30, 25, 255]);
  put(png, sx(cx + 4) | 0, (by - 22) | 0, [40, 30, 25, 255]);

  // 巨角头饰（概念核心）
  l(cx - 8, by - 28, cx - 22, by - 52, p.antlerSh, 4);
  l(cx - 22, by - 52, cx - 12, by - 58, p.antler, 3);
  l(cx - 18, by - 44, cx - 28, by - 48, p.antler, 2);
  l(cx + 8, by - 28, cx + 22, by - 52, p.antlerSh, 4);
  l(cx + 22, by - 52, cx + 12, by - 58, p.antler, 3);
  l(cx + 18, by - 44, cx + 28, by - 48, p.antler, 2);
  f(cx - 6, by - 30, 3, p.cloakHi);
  f(cx + 6, by - 30, 3, p.orb);

  // 法杖（巨大自然法杖 + 绿核）
  const staffPhase = anim === 'attack01' ? t
    : anim === 'attack02' ? Math.min(1, t * 1.2)
      : anim === 'cast' ? t
        : anim === 'victory' ? 0.3 + Math.sin(frame) * 0.1
          : 0.15;
  const swing = Math.sin(staffPhase * Math.PI) * (anim.startsWith('attack') || anim === 'cast' ? 28 : 6);
  const raise = (anim === 'cast' ? t * 22 : 0) + (anim === 'attack02' && t < 0.4 ? t * 30 : 0);
  const stx = cx + 26 + lean;
  const sty0 = by + 28;
  const sty1 = by - 40 - raise + Math.sin(frame * 0.5) * 1.5;
  l(stx, sty0, stx - 4 + swing * 0.15, sty1, p.staff, 4);
  // 树根纹理环
  f(stx - 4 + swing * 0.15, sty1 - 2, 10, p.moss);
  f(stx - 4 + swing * 0.15, sty1 - 2, 6, p.orb);
  f(stx - 5 + swing * 0.15, sty1 - 4, 3, p.orbCore);

  // 施法 / 攻击 FX
  if (anim === 'cast' || anim === 'attack02') {
    const r = 8 + t * 20;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 3;
      put(png, sx(cx + Math.cos(a) * r) | 0, (by + 20 + Math.sin(a) * r * 0.4) | 0, p.fx);
    }
    if (t > 0.55) {
      // 树根爆发
      for (let i = 0; i < 5; i++) {
        l(cx, foot - 4, cx - 20 + i * 10, foot - 4 - t * 16, p.staff, 2);
        f(cx - 20 + i * 10, foot - 4 - t * 16, 3, p.orb);
      }
    }
  }
  if (anim === 'attack01' && t > 0.4) {
    const arc = (t - 0.4) * 40;
    for (let i = 0; i < 6; i++) {
      const a = -0.8 + i * 0.25 + swing * 0.02;
      put(png, sx(stx + Math.cos(a) * arc) | 0, (sty1 + Math.sin(a) * arc * 0.5) | 0, p.fx);
    }
  }

  // 腿 / 靴
  const step = (anim === 'walk' || anim === 'run') ? Math.sin(frame * (anim === 'run' ? 1.8 : 1.3)) * (anim === 'run' ? 6 : 4) : 0;
  if (die < 0.7) {
    e(cx - 8, by + 22 + step, 5, 10, p.leather);
    e(cx + 6, by + 22 - step, 5, 10, p.leather);
    e(cx - 8, foot - 2 + step * 0.3, 6, 3, [30, 25, 20, 255]);
    e(cx + 6, foot - 2 - step * 0.3, 6, 3, [30, 25, 20, 255]);
  }

  if (anim === 'victory' && frame > 3) {
    f(cx, by - 50, 4 + (frame % 3), p.orbCore);
  }
}

function drawHunter(png, anim, frame, nFrames, dir) {
  const p = PAL.hunter;
  const { flip, back } = dirMeta(dir);
  const cx = pivotX();
  const foot = pivotY();
  const t = frame / Math.max(1, nFrames - 1);
  const breath = anim === 'idle' ? Math.sin(frame * 0.85) * 1 : 0;
  const bob = (anim === 'walk' || anim === 'run') ? Math.sin(frame * (anim === 'run' ? 1.7 : 1.3)) * (anim === 'run' ? 3 : 2) : breath;
  const die = anim === 'death' ? t : 0;
  const hit = anim === 'hit' ? Math.sin(frame * 2.2) * 3 : 0;
  let by = foot - Math.round(FRAME * 0.34) + bob + hit;
  if (die > 0.3) by += die * 20;

  const sx = (x) => (flip ? cx - (x - cx) : x);
  const f = (x, y, r, c) => circ(png, sx(x), y, r, c);
  const e = (x, y, rx, ry, c) => ell(png, sx(x), y, rx, ry, c);
  const l = (x0, y0, x1, y1, c, th) => line(png, sx(x0), y0, sx(x1), y1, c, th);

  // 绿披风摆动
  const cape = Math.sin(frame * 0.7 + (anim === 'run' ? frame : 0)) * (anim === 'run' ? 5 : 2);
  e(cx - 2 + cape, by + 12, 17, 26, p.cloak);
  e(cx + cape * 0.5, by + 8, 12, 18, p.cloakHi);

  // 箭袋（背）
  if (back) {
    e(cx + 2, by + 4, 5, 12, p.leather);
  } else {
    e(cx - 18, by + 4, 5, 14, p.leather);
    l(cx - 17, by + 2, cx - 17, by - 8, p.arrow, 1);
    l(cx - 15, by + 2, cx - 15, by - 10, p.arrowTip, 1);
  }

  // 轻甲躯干（修长）
  e(cx, by + 2, 11, 16, p.leather);
  f(cx - 2, by - 2, 4, p.leatherHi);
  // 金属护臂/护胫暗示
  f(cx - 12, by + 2, 4, p.metal);
  f(cx + 11, by + 2, 4, p.metal);
  e(cx, by + 12, 9, 2, p.metal);

  // 兜帽 + 面罩（概念：脸几乎被遮住）
  f(cx, by - 18, 12, p.hood);
  e(cx, by - 14, 9, 8, [28, 32, 24, 255]);
  e(cx, by - 18, 8, 2.5, [15, 15, 12, 255]); // 眼缝
  put(png, sx(cx - 3) | 0, (by - 18) | 0, p.eye);
  put(png, sx(cx + 3) | 0, (by - 18) | 0, p.eye);
  // 兜帽尖
  l(cx - 9, by - 26, cx, by - 36, p.hood, 3);
  l(cx + 9, by - 26, cx, by - 36, p.hood, 3);

  // 长弓 + 射箭流程
  const shooting = anim === 'shoot' || anim === 'attack01' || anim === 'attack02';
  let drawAmt = 0;
  if (anim === 'shoot') {
    if (t < 0.35) drawAmt = t / 0.35;
    else if (t < 0.55) drawAmt = 1;
    else drawAmt = Math.max(0, 1 - (t - 0.55) / 0.2);
  } else if (anim === 'attack01') drawAmt = Math.sin(t * Math.PI);
  else if (anim === 'attack02') drawAmt = t < 0.5 ? t * 2 : 1;

  const bx = cx + 18;
  const bowBend = 10 + drawAmt * 4;
  l(bx, by - 26, bx + 2, by + 18, p.bow, 3);
  l(bx, by - 26, bx + bowBend, by - 2, p.bowHi, 2);
  l(bx + 2, by + 18, bx + bowBend, by - 2, p.bowHi, 2);
  // 弓弦拉满
  const stringX = bx + 2 + drawAmt * 10;
  l(bx, by - 26, stringX, by - 2, p.string, 1);
  l(bx + 2, by + 18, stringX, by - 2, p.string, 1);

  if (shooting && drawAmt > 0.2) {
    const ax = stringX + (t > 0.55 && anim === 'shoot' ? (t - 0.55) * 80 : 8);
    const ay = by - 2 - (t > 0.55 && anim === 'shoot' ? (t - 0.55) * 10 : 0);
    if (!(anim === 'shoot' && t > 0.75)) {
      l(stringX - 6, by - 2, ax, ay, p.arrow, 2);
      f(ax, ay, 2.5, p.arrowTip);
    }
    // 拖尾
    if (anim === 'shoot' && t > 0.55) {
      const fx = anim === 'attack02' && frame > 6 ? p.fxFire : (frame % 3 === 0 ? p.fxGold : p.fxG);
      for (let i = 0; i < 4; i++) put(png, sx(ax - 6 - i * 5) | 0, (ay + i) | 0, fx);
    }
  }

  // attack02 紫印记
  if (anim === 'attack02' && t > 0.3) {
    const r = 6 + t * 14;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      put(png, sx(cx + Math.cos(a) * r) | 0, (foot - 6 + Math.sin(a) * r * 0.35) | 0, p.fxPurple);
    }
  }

  const step = (anim === 'walk' || anim === 'run') ? Math.sin(frame * (anim === 'run' ? 1.9 : 1.4)) * (anim === 'run' ? 6 : 4) : 0;
  if (die < 0.65) {
    e(cx - 6, by + 20 + step, 4, 11, p.cloak);
    e(cx + 4, by + 20 - step, 4, 11, p.cloak);
    f(cx - 6, foot - 2 + step * 0.2, 4, p.metal);
    f(cx + 4, foot - 2 - step * 0.2, 4, p.metal);
  }

  if (anim === 'victory') {
    l(bx, by - 30 - frame, bx, by + 10, p.bow, 3);
  }
}

function drawMage(png, anim, frame, nFrames, dir) {
  const p = PAL.mage;
  const { flip, back } = dirMeta(dir);
  const cx = pivotX();
  const foot = pivotY();
  const t = frame / Math.max(1, nFrames - 1);
  const breath = anim === 'idle' ? Math.sin(frame * 0.8) * 1.4 : 0;
  const bob = (anim === 'walk' || anim === 'run') ? Math.sin(frame * 1.2) * 2 : breath;
  const floatY = (anim === 'cast' || anim === 'attack02') ? -t * 4 : (anim === 'idle' ? -Math.abs(Math.sin(frame * 0.5)) : 0);
  const die = anim === 'death' ? t : 0;
  const hit = anim === 'hit' ? Math.sin(frame * 2) * 3 : 0;
  let by = foot - Math.round(FRAME * 0.36) + bob + hit + floatY;
  if (die > 0.25) by += die * 22;

  const sx = (x) => (flip ? cx - (x - cx) : x);
  const f = (x, y, r, c) => circ(png, sx(x), y, r, c);
  const e = (x, y, rx, ry, c) => ell(png, sx(x), y, rx, ry, c);
  const l = (x0, y0, x1, y1, c, th) => line(png, sx(x0), y0, sx(x1), y1, c, th);

  // 紫黑长袍 + 披风飘动
  const flow = Math.sin(frame * 0.6) * (anim === 'cast' ? 6 : 2) + (anim === 'run' ? 4 : 0);
  e(cx + flow * 0.3, by + 16, 20, 30, p.robeDeep);
  e(cx, by + 10, 15, 24, p.robe);
  e(cx - 2, by + 4, 10, 14, p.robeHi);
  // 金纹胸甲 / 肩饰（概念）
  e(cx, by + 2, 8, 6, p.gold);
  f(cx, by + 2, 3, p.crystal);
  f(cx - 14, by - 4, 6, p.gold);
  f(cx + 14, by - 4, 6, p.gold);
  f(cx - 14, by - 5, 3, p.goldHi);
  f(cx + 14, by - 5, 3, p.goldHi);

  // 长发
  e(cx - 10, by - 8, 5, 16, p.hair);
  e(cx + 10, by - 8, 5, 16, p.hair);
  e(cx, by - 22, 11, 10, p.hair);
  // 面容
  f(cx, by - 18, 9, p.skin);
  f(cx - 2, by - 19, 3, p.skinSh);
  put(png, sx(cx - 3) | 0, (by - 19) | 0, p.eye);
  put(png, sx(cx + 3) | 0, (by - 19) | 0, p.eye);
  if (!back) e(cx, by - 28, 10, 4, p.hairHi);

  // 水晶法杖
  const raise = anim === 'cast' ? t * 24 : (anim === 'attack01' ? Math.sin(t * Math.PI) * 12 : (anim === 'attack02' ? t * 18 : 0));
  const stx = cx + 24;
  const sty = by - 38 - raise;
  l(stx, by + 26, stx + 1, sty, p.staff, 3);
  l(stx, by + 26, stx + 1, sty, p.gold, 1);
  const cr = 8 + (anim === 'cast' || anim === 'attack02' ? t * 4 : Math.sin(frame * 0.8));
  f(stx + 1, sty - 4, cr + 2, p.crystal);
  f(stx + 1, sty - 4, cr - 1, p.crystalHi);
  f(stx, sty - 6, 3, [255, 255, 255, 220]);

  // 左手奥术球旋转
  const orbA = frame * 0.7 + t * 4;
  const ox = cx - 16 + Math.cos(orbA) * (anim === 'cast' ? 4 : 2);
  const oy = by + 2 + Math.sin(orbA) * 3 - (anim === 'cast' ? t * 10 : 0);
  f(ox, oy, 7 + (anim === 'cast' ? t * 3 : 0), p.orb);
  f(ox, oy, 3, p.orbCore);

  // 施法法阵 / 粒子
  if (anim === 'cast' || anim === 'attack02') {
    const r = 10 + t * 22;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t * 4;
      put(png, sx(cx + Math.cos(a) * r) | 0, (by + 22 + Math.sin(a) * r * 0.35) | 0, p.fx);
    }
    if (t > 0.6) {
      const kind = frame % 3;
      const col = kind === 0 ? p.fx : kind === 1 ? p.ice : p.fire;
      for (let i = 0; i < 5; i++) f(cx + (i - 2) * 8, by - 10 - t * 20, 3, col);
    }
  }
  if (anim === 'attack01' && t > 0.35) {
    // 奥术飞弹
    for (let i = 0; i < 3; i++) {
      f(cx + 20 + t * 30 + i * 8, by - 8 - i * 4, 4, p.crystal);
      f(cx + 20 + t * 30 + i * 8, by - 8 - i * 4, 2, p.orbCore);
    }
  }

  if (die < 0.6) {
    e(cx - 5, foot - 3, 5, 2.5, [20, 15, 30, 255]);
    e(cx + 5, foot - 3, 5, 2.5, [20, 15, 30, 255]);
  }

  if (anim === 'victory') {
    f(stx + 1, sty - 10 - frame, 5 + frame % 3, p.crystalHi);
  }
}

function drawClass(cls, png, anim, frame, nFrames, dir) {
  if (cls === 'druid') drawDruid(png, anim, frame, nFrames, dir);
  else if (cls === 'hunter') drawHunter(png, anim, frame, nFrames, dir);
  else drawMage(png, anim, frame, nFrames, dir);
}

function drawShadowOnly(png) {
  const cx = pivotX();
  const foot = pivotY();
  ell(png, cx, foot - 2, FRAME * 0.22, FRAME * 0.07, PAL.shadow);
}

function makeSheet(cls, animName, def) {
  const cols = def.frames;
  const rows = DIRS.length;
  const sheet = create(FRAME * cols, FRAME * rows);
  const shadowSheet = create(FRAME * cols, FRAME * rows);

  for (let di = 0; di < rows; di++) {
    for (let fi = 0; fi < cols; fi++) {
      const cell = create(FRAME, FRAME);
      const sh = create(FRAME, FRAME);
      drawShadowOnly(sh);
      drawClass(cls, cell, animName, fi, cols, DIRS[di]);
      blit(sh, fi * FRAME, di * FRAME, shadowSheet);
      blit(cell, fi * FRAME, di * FRAME, sheet);
    }
  }
  return { sheet, shadowSheet };
}

function writeAnim(cls, animName, def) {
  const dir = path.join(OUT, cls);
  const { sheet, shadowSheet } = makeSheet(cls, animName, def);
  const pngPath = path.join(dir, `${animName}.png`);
  const jsonPath = path.join(dir, `${animName}.json`);
  save(sheet, pngPath);

  // 阴影仅输出一份共用（idle 时写 shadow.png），避免膨胀
  if (animName === 'idle') {
    const sh = create(FRAME, FRAME);
    drawShadowOnly(sh);
    save(sh, path.join(dir, 'shadow.png'));
    fs.writeFileSync(path.join(dir, 'shadow.json'), JSON.stringify({
      classId: cls,
      type: 'shadow',
      frameWidth: FRAME,
      frameHeight: FRAME,
      pivot: { x: pivotX(), y: pivotY() },
      note: '单独阴影，游戏内脚底实时绘制或贴此图',
    }, null, 2));
  }

  const meta = {
    classId: cls,
    animation: animName,
    frameWidth: FRAME,
    frameHeight: FRAME,
    frames: def.frames,
    directions: DIRS.slice(),
    layout: { columns: 'frames', rows: 'directions', rowOrder: DIRS.slice() },
    fps: def.fps,
    loop: def.loop,
    pivot: { x: pivotX(), y: pivotY() },
    style: 'dark-fantasy-topdown-45-concept-faithful',
    artTargetFrame: 512,
    runtimeFrame: FRAME,
    note: '运行时帧为微信可玩尺寸；pivot/布局与 512 管线一致，可替换高清贴图无需改代码',
  };
  fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 2));
  // shadow sheet 不单独存全动画（体积），仅 meta 声明
  void shadowSheet;
  return meta;
}

function makePortrait(cls) {
  const S = 256;
  const p = create(S, S);
  // 无阴影立绘氛围光（选角用，非战斗帧）
  const glow = cls === 'druid' ? PAL.druid.orb : cls === 'hunter' ? PAL.hunter.cloakHi : PAL.mage.crystal;
  for (let r = 90; r > 20; r -= 5) {
    circ(p, S / 2, S * 0.62, r, [glow[0], glow[1], glow[2], Math.max(15, 70 - r)]);
  }
  const cell = create(FRAME, FRAME);
  drawClass(cls, cell, 'idle', 2, 8, 'S');
  // 放大贴到立绘
  const scale = S / FRAME;
  for (let y = 0; y < FRAME; y++) {
    for (let x = 0; x < FRAME; x++) {
      const si = (FRAME * y + x) << 2;
      if (cell.data[si + 3] < 10) continue;
      const c = [cell.data[si], cell.data[si + 1], cell.data[si + 2], cell.data[si + 3]];
      for (let oy = 0; oy < scale; oy++) {
        for (let ox = 0; ox < scale; ox++) {
          put(p, (x * scale + ox) | 0, (y * scale + oy - 8) | 0, c);
        }
      }
    }
  }
  save(p, path.join(OUT, cls, 'portrait.png'));
}

function classManifest(cls, anims) {
  return {
    id: cls,
    frameWidth: FRAME,
    frameHeight: FRAME,
    pivot: { x: pivotX(), y: pivotY() },
    directions: DIRS.slice(),
    animations: anims,
    shadow: 'shadow.png',
    portrait: 'portrait.png',
  };
}

function main() {
  console.log(`[CharSprites] FRAME=${FRAME} → ${OUT}`);
  const rootManifest = { version: 2, frameSize: FRAME, artTarget: 512, directions: DIRS.slice(), characters: {} };

  for (const cls of ['druid', 'hunter', 'mage']) {
    console.log(`  · ${cls}`);
    const animList = {};
    for (const [name, def] of Object.entries(ANIMS)) {
      if (name === 'cast' && cls === 'hunter') continue;
      if (name === 'shoot' && cls !== 'hunter') continue;
      process.stdout.write(`      ${name}...`);
      writeAnim(cls, name, def);
      animList[name] = { file: `${name}.png`, meta: `${name}.json`, frames: def.frames, fps: def.fps, loop: def.loop };
      console.log(' ok');
    }
    makePortrait(cls);
    const cm = classManifest(cls, animList);
    fs.writeFileSync(path.join(OUT, cls, 'character.json'), JSON.stringify(cm, null, 2));
    rootManifest.characters[cls] = { path: cls, ...cm };
  }

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(rootManifest, null, 2));
  // 供微信打包内联
  fs.writeFileSync(
    path.join(OUT, 'packData.js'),
    '/** Auto — character sprite pack */\nexport default '
      + JSON.stringify(rootManifest, null, 2)
      + ';\n',
  );
  fs.writeFileSync(path.join(OUT, 'README.md'), `# 角色精灵素材（概念图还原 → 游戏资产）

## 规格
- 方向：N NE E SE S SW W NW（行）
- 帧：动画帧（列）
- 运行时帧尺寸：**${FRAME}×${FRAME}**（微信可玩）
- 美术目标管线：512×512（可整包替换 PNG，JSON pivot/布局不变）
- 阴影：\`shadow.png\` 单独输出，角色帧无脚下阴影

## 动画
| 动画 | 帧数 | 职业 |
|------|------|------|
| idle | 8 | 全 |
| walk / run | 8 | 全 |
| attack01 | 8 | 全 |
| attack02 | 10 | 全 |
| cast | 10 | 德鲁伊/法师 |
| shoot | 10 | 猎人 |
| hit | 4 | 全 |
| death | 10 | 全 |
| victory | 8 | 全 |

## 还原要点
- 德鲁伊：白须老人、鹿角、狼皮披肩、巨大绿核法杖、狼灵
- 猎人：绿披风兜帽、长弓箭袋、轻甲修长、拉弓射箭拖尾
- 法师：紫黑金纹法袍、水晶杖、奥术球、法阵粒子

重新生成：\`npm run generate:characters\`
高清预览：\`FRAME=256 npm run generate:characters\`
`);
  console.log('[CharSprites] 完成');
}

main();
