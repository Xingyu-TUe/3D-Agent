/**
 * MeteorApocalypse.js — 法师大招：陨石天启
 */

import BaseSkill from '../BaseSkill.js';
import { QUERY_BUF, rollDamage, emitShake, emitSfx } from '../helpers.js';

export class MeteorApocalypse extends BaseSkill {
  constructor(def, ctx) {
    super(def, ctx);
    this.tx = 0;
    this.ty = 0;
    this._impacted = false;
    this._pulse = 0;
  }

  playCastFeedback() {}

  onCast() {
    const { player, effects, events, collision } = this.ctx;
    const range = this.def.range || 800;
    const charge = (this.def.params && this.def.params.chargeTime) || this.duration || 3;

    const nearest = collision.nearest(player.x, player.y, range, null);
    if (nearest) {
      this.tx = nearest.x;
      this.ty = nearest.y;
    } else {
      this.tx = player.x + Math.cos(player.facing) * 180;
      this.ty = player.y + Math.sin(player.facing) * 180;
    }
    this._impacted = false;
    this._pulse = 0;

    if (player.triggerAttack) player.triggerAttack(this.def.animation || 'cast');
    if (effects) {
      // 伤害范围提示（蓄力全程）
      effects.telegraph(this.tx, this.ty, Math.min(range * 0.4, 280), '#ff6a2a', charge);
      effects.ring(player.x, player.y, 80, '#ff9a4a');
      if (effects.particles) effects.particles(player.x, player.y, '#ff8a3a', 10, 100);
    }
    emitShake(events, 4, 0.15);
    emitSfx(events, this.id, 'skill_channel');
    this.effect({ phase: 'channel' });
    return true;
  }

  onUpdate(dt) {
    const { effects, player } = this.ctx;
    this._pulse += dt;
    if (effects && this._pulse >= 0.4) {
      this._pulse = 0;
      effects.ring(this.tx, this.ty, 60 + Math.random() * 40, '#ff8a3a');
      if (effects.particles) effects.particles(player.x, player.y, '#ff6a2a', 3, 60);
    }
  }

  onDestroy() {
    if (this._impacted) return;
    this._impacted = true;
    this._impact();
  }

  _impact() {
    const { player, effects, events, collision, enemySystem } = this.ctx;
    const params = this.def.params || {};
    const range = this.def.range || 800;

    if (effects) {
      if (effects.meteorFall) effects.meteorFall(this.tx, this.ty, Math.min(range * 0.35, 240), '#ff4a1a', 0.4);
      effects.explosion(this.tx, this.ty, Math.min(range * 0.45, 300), '#ff4a1a');
      effects.ring(this.tx, this.ty, range * 0.3, '#ffb06a');
      if (effects.particles) effects.particles(this.tx, this.ty, '#ff6a2a', 20, 220);
    }
    emitShake(events, 14, 0.45);
    emitSfx(events, this.id, 'skill_ultimate');

    const hits = collision.queryCircle(this.tx, this.ty, range, QUERY_BUF);
    for (let i = 0; i < hits.length; i++) {
      const { dmg, crit } = rollDamage(player, this.def.damage, {
        damageIsMul: !!params.damageIsMul,
      });
      enemySystem.damageEnemy(hits[i], dmg, crit, 90, this.tx, this.ty);
    }
    this.effect({ phase: 'impact', count: hits.length });
  }

  effect(_payload) {}
}

export default MeteorApocalypse;
