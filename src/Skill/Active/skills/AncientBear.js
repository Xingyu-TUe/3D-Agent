/**
 * AncientBear.js — 德鲁伊大招：远古熊灵
 * 变身 12 秒：攻击×4、生命×2、射程×1.8，并替换普通自动攻击为熊爪横扫。
 */

import BaseSkill from '../BaseSkill.js';
import { QUERY_BUF, rollDamage, emitShake, emitSfx } from '../helpers.js';
import { angleTo } from '../../../Utils/MathUtils.js';

export class AncientBear extends BaseSkill {
  constructor(def, ctx) {
    super(def, ctx);
    this._hpAdd = 0;
    this._dmgMulAdd = 0;
    this._clawCd = 0;
    this._applied = false;
  }

  playCastFeedback() {}

  onCast() {
    const { player, effects, events, skillSystem } = this.ctx;
    const params = this.def.params || {};
    const attackMul = params.attackMul || 4;
    const hpMul = params.hpMul || 2;
    const rangeMul = params.rangeMul || 1.8;

    // damageMul 修正：final = 1 + mods.damageMul → 目标倍率 attackMul
    this._dmgMulAdd = attackMul - 1;
    player.stats.addStat('damageMul', this._dmgMulAdd);

    // hp +100% → 最大生命翻倍，并补充等量当前生命
    this._hpAdd = player.maxHp * (hpMul - 1);
    player.stats.addStat('maxHpAdd', this._hpAdd);
    player.hp = Math.min(player.maxHp, player.hp + this._hpAdd);

    player.rangeMul = rangeMul;
    player.transformId = 'ancient_bear';
    this._applied = true;

    // 暂停被动自动技能，改由熊爪普攻
    if (skillSystem) skillSystem.autoEnabled = false;

    if (player.triggerAttack) player.triggerAttack('cast');
    if (effects) {
      effects.ring(player.x, player.y, 90, '#c49a3c');
      effects.explosion(player.x, player.y, 70, '#8b5a1a');
      effects.puff(player.x, player.y, '#6b3f12');
    }
    emitShake(events, 10, 0.28);
    emitSfx(events, this.id, 'skill_ultimate');
    this._clawCd = 0.15;
    this.effect({ phase: 'transform' });
    return true;
  }

  onUpdate(dt) {
    if (!this._applied) return;
    const { player, collision, enemySystem, effects } = this.ctx;
    const rangeMul = player.rangeMul || 1.8;
    const range = 150 * rangeMul;
    const atkSpeed = player.stats.final.atkSpeedMul || 1;

    this._clawCd -= dt;
    if (this._clawCd > 0) return;
    this._clawCd = 0.5 / atkSpeed;

    const hits = collision.queryCircle(player.x, player.y, range, QUERY_BUF);
    if (hits.length === 0) return;

    // 朝最近目标挥爪
    let nearest = hits[0];
    let best = Infinity;
    for (let i = 0; i < hits.length; i++) {
      const e = hits[i];
      const d = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
      if (d < best) { best = d; nearest = e; }
    }
    const ang = angleTo(player.x, player.y, nearest.x, nearest.y);
    player.facing = ang;
    if (player.triggerAttack) player.triggerAttack('attack01');
    if (effects) effects.slash(player.x, player.y, ang, range, 2.2, '#c49a3c');

    for (let i = 0; i < hits.length; i++) {
      const { dmg, crit } = rollDamage(player, 28);
      enemySystem.damageEnemy(hits[i], dmg, crit, 55, player.x, player.y);
    }
    this.effect({ phase: 'claw', count: hits.length });
  }

  onDestroy() {
    if (!this._applied) return;
    const { player, skillSystem, effects } = this.ctx;
    if (this._dmgMulAdd) player.stats.addStat('damageMul', -this._dmgMulAdd);
    if (this._hpAdd) {
      player.stats.addStat('maxHpAdd', -this._hpAdd);
      player.hp = Math.min(player.maxHp, player.hp);
    }
    player.rangeMul = 1;
    player.transformId = null;
    if (skillSystem) skillSystem.autoEnabled = true;
    this._applied = false;
    if (effects) effects.puff(player.x, player.y, '#8b5a1a');
    this.effect({ phase: 'end' });
  }

  effect(_payload) {}
}

export default AncientBear;
