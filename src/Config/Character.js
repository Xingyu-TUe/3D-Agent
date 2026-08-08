/**
 * Character.js
 * 职业配置加载与运行时转换。
 * 数据源镜像：Config/Character.json（新增职业改 JSON 后同步此处，或直接改本文件）。
 * 为兼容微信打包与 Node 运行时，此处以 JS 对象承载，避免 JSON import attribute 差异。
 */

import GameConfig from './GameConfig.js';
import raw from './characterRaw.js';

const MOVE_SCALE = raw.moveSpeedScale || 1.85;

/** 将配置表 attributes 转为 Player/Stats 使用的 base */
export function attributesToBase(attrs) {
  return {
    maxHp: attrs.hp,
    damage: attrs.atk,
    moveSpeed: attrs.moveSpeed * MOVE_SCALE,
    critRate: attrs.crit,
    critDmg: 1.5,
    lifesteal: 0,
    regen: 0,
    atkSpeed: attrs.atkSpeed || 1,
    pickupRadius: GameConfig.player.pickupRadius,
    radius: 20,
  };
}

export const CHARACTER_DATA = {};
for (const c of raw.characters) {
  CHARACTER_DATA[c.id] = {
    ...c,
    desc: c.description,
    base: attributesToBase(c.attributes),
    startSkills: c.skills.start.slice(),
    skillPool: c.skills.pool.slice(),
    ultimate: c.skills.ultimate,
  };
}

export const CHARACTER_LIST = raw.characters.map((c) => CHARACTER_DATA[c.id]);
export const COMMON_PASSIVES = raw.commonPassives.slice();
export const RESERVED_CLASSES = raw.reservedClasses.slice();

export function getCharacter(id) {
  return CHARACTER_DATA[id] || CHARACTER_LIST[0];
}

export function getDefaultCharacterId() {
  return CHARACTER_LIST[0] ? CHARACTER_LIST[0].id : 'druid';
}

export const CLASS_DATA = { ...CHARACTER_DATA };
export default CHARACTER_DATA;
