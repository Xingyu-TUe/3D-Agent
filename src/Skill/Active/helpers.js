/**
 * helpers.js
 * 主动技能共用工具：伤害结算、查询缓冲、音效/震动快捷方式。
 */

import { chance } from '../../Utils/MathUtils.js';

/** 模块级复用，避免技能每帧 new 数组 */
export const QUERY_BUF = [];

/**
 * @param {object} player
 * @param {number} baseDamage SkillConfig.damage
 * @param {{ damageIsMul?: boolean, canCrit?: boolean }} [opts]
 */
export function rollDamage(player, baseDamage, opts = {}) {
  const s = player.stats.final;
  const atk = s.attack || 20;
  let dmg;
  if (opts.damageIsMul) {
    // damage 视为攻击力倍率（如 2.5 = 250%）
    dmg = atk * baseDamage * s.damageMul;
  } else {
    dmg = baseDamage * (atk / 20) * s.damageMul;
  }
  let crit = false;
  if (opts.canCrit !== false && chance(s.critRate)) {
    dmg *= s.critDmg;
    crit = true;
  }
  return { dmg, crit };
}

export function emitSfx(events, id, kind = 'skill_cast') {
  if (events) events.emit('sfx', { id, kind });
}

export function emitShake(events, magnitude, duration) {
  if (events) events.emit('shake', { magnitude, duration });
}
