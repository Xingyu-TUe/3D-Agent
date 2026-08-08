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
  // 德鲁伊
  wolfSummon: '狼',
  bearSummon: '熊',
  vineBind: '藤',
  poisonVines: '蔓',
  thornsArmor: '荆',
  natureStorm: '风',
  ancientNature: '树',
  // 猎人
  pierceArrow: '箭',
  multiShot: '散',
  explodeArrow: '爆',
  frostArrow: '冻',
  homingArrow: '追',
  chainArrow: '链',
  arrowStorm: '雨',
  // 法师
  mageFireball: '火',
  arcaneMissile: '奥',
  meteor: '陨',
  blackHole: '洞',
  apocalypse: '启',
  // 主动技能 id 回退
  thorn_field: '荆',
  ancient_bear: '熊',
  shadow_dash: '影',
  death_rain: '雨',
  frost_nova: '霜',
  meteor_apocalypse: '陨',
};

export default { formatTime, roundRect, pointInRect, SKILL_ICONS };
