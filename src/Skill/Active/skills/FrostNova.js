/**
 * FrostNova.js — 法师小技能：冰霜新星
 */

import BaseSkill from '../BaseSkill.js';
import { QUERY_BUF, rollDamage, emitShake, emitSfx } from '../helpers.js';

export class FrostNova extends BaseSkill {
  playCastFeedback() {}

  onCast() {
    const { player, effects, events, collision, enemySystem } = this.ctx;
    const params = this.def.params || {};
    const freezeDur = params.freezeDuration != null ? params.freezeDuration : 2;
    const range = this.def.range || 220;

    if (player.triggerAttack) player.triggerAttack(this.def.animation || 'cast');
    if (effects) {
      effects.telegraph(player.x, player.y, range, '#7ec8ff', 0.3);
      effects.explosion(player.x, player.y, range, '#8ed4ff');
      effects.ring(player.x, player.y, range * 0.85, '#b8e8ff');
      if (effects.particles) effects.particles(player.x, player.y, '#b8e8ff', 16, 160);
    }
    emitShake(events, 6, 0.18);
    emitSfx(events, this.id, 'skill_cast');

    const hits = collision.queryCircle(player.x, player.y, range, QUERY_BUF);
    for (let i = 0; i < hits.length; i++) {
      const e = hits[i];
      const { dmg, crit } = rollDamage(player, this.def.damage, {
        damageIsMul: !!params.damageIsMul,
      });
      enemySystem.damageEnemy(e, dmg, crit, 70, player.x, player.y);
      e.applySlow(0, freezeDur);
    }
    this.effect({ phase: 'nova', count: hits.length });
    return true;
  }

  effect(_payload) {}
}

export default FrostNova;
