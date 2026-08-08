/**
 * ThornField.js — 德鲁伊小技能：荆棘领域
 * 在施法点生成 AOE：减速 50% + 持续伤害。
 */

import BaseSkill from '../BaseSkill.js';
import { QUERY_BUF, rollDamage, emitShake, emitSfx } from '../helpers.js';

export class ThornField extends BaseSkill {
  constructor(def, ctx) {
    super(def, ctx);
    this.zx = 0;
    this.zy = 0;
    this.tickTimer = 0;
    this._pulse = 0;
  }

  playCastFeedback() {
    // 自定义表现，避免基类默认短 telegraph
  }

  onCast() {
    const { player, effects, events } = this.ctx;
    this.zx = player.x;
    this.zy = player.y;
    this.tickTimer = 0;
    this._pulse = 0;

    if (player.triggerAttack) player.triggerAttack(this.def.animation || 'cast');
    if (effects) {
      effects.telegraph(this.zx, this.zy, this.def.range, '#5aad3a', 0.45);
      effects.ring(this.zx, this.zy, this.def.range, '#6bcf4a');
      effects.puff(this.zx, this.zy, '#4a8f2a');
    }
    emitShake(events, 5, 0.18);
    emitSfx(events, this.id, 'skill_cast');
    this.effect({ phase: 'spawn' });
    return true;
  }

  onUpdate(dt) {
    const { effects, collision, enemySystem, player } = this.ctx;
    const params = this.def.params || {};
    const tickRate = params.tickRate || 0.4;
    const slowFactor = params.slowFactor != null ? params.slowFactor : 0.5;

    this._pulse += dt;
    if (effects && this._pulse >= 0.35) {
      this._pulse = 0;
      effects.ring(this.zx, this.zy, this.def.range * 0.92, '#5aad3a');
    }

    this.tickTimer -= dt;
    if (this.tickTimer > 0) return;
    this.tickTimer = tickRate;

    const hits = collision.queryCircle(this.zx, this.zy, this.def.range, QUERY_BUF);
    for (let i = 0; i < hits.length; i++) {
      const e = hits[i];
      const { dmg, crit } = rollDamage(player, this.def.damage);
      enemySystem.damageEnemy(e, dmg, crit, 8, this.zx, this.zy);
      // slowFactor 0.5 = 速度变为 50%
      e.applySlow(slowFactor, tickRate + 0.15);
    }
    this.effect({ phase: 'tick', count: hits.length });
  }

  effect(_payload) {}
}

export default ThornField;
