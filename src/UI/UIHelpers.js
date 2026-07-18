/**
 * UIHelpers.js
 * UI 公共绘制/工具函数。
 */

export function formatTime(seconds) {
  seconds = Math.max(0, Math.floor(seconds));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function pointInRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

/** 技能图标用的首字（无美术素材时用文字符号占位） */
export const SKILL_ICONS = {
  basicSlash: '剑',
  whirlwind: '旋',
  fireball: '火',
  flyingSword: '飞',
  chainLightning: '雷',
  frostRing: '冰',
  poisonCloud: '毒',
};

export default { formatTime, roundRect, pointInRect, SKILL_ICONS };
