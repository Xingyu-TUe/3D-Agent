/**
 * DeathRain.js — 猎人大招：死亡箭雨
 */

import BaseSkill from '../BaseSkill.js';
import { QUERY_BUF, rollDamage, emitShake, emitSfx } from '../helpers.js';
import { TWO_PI } from '../../../Utils/MathUtils.js';

export class DeathRain extends BaseSkill {
  constructor(def, ctx) {
    super(def, ctx);
    this.acc = 0;
  }

  playCastFeedback() {}

  onCast() {
    const { player, effects, events, camera } = this.ctx;
    this.acc = 0;
    if (player.triggerAttack) player.triggerAttack(this.def.animation || 'attack02');
    if (effects) {
      const r = this._coverRadius(camera);
      effects.telegraph(player.x, player.y, Math.min(r, 420), '#8a6cff', 0.5);
      effects.ring(player.x, player.y, 120, '#6b4cff');
      if (effects.particles) effects.particles(player.x, player.y, '#9b7cff', 18, 200);
    }
    emitShake(events, 10, 0.35);
    emitSfx(events, this.id, 'skill_ultimate');
    this.effect({ phase: 'start' });
    return true;
  }

  _coverRadius(camera) {
    if (!camera) return 520;
    const hw = (camera.viewWidth || 720) * 0.55;
    const hh = (camera.viewHeight || 1280) * 0.55;
    return Math.sqrt(hw * hw + hh * hh);
  }

  onUpdate(dt) {
    const { player, effects, collision, enemySystem, events, camera } = this.ctx;
    const rate = (this.def.params && this.def.params.rate) || 12;
    this.acc += dt * rate;
    const cover = this._coverRadius(camera);

    while (this.acc >= 1) {
      this.acc -= 1;
      const a = Math.random() * TWO_PI;
      const r = Math.random() * cover;
      const x = player.x + Math.cos(a) * r;
      const y = player.y + Math.sin(a) * r;

      if (effects) {
        effects.slash(x, y, -Math.PI / 2, 34, 0.55, '#9b7cff');
        if (Math.random() < 0.2 && effects.particles) {
          effects.particles(x, y, '#7b5cff', 3, 70);
        }
      }

      const hits = collision.queryCircle(x, y, 40, QUERY_BUF);
      for (let i = 0; i < hits.length; i++) {
        const { dmg, crit } = rollDamage(player, this.def.damage);
        enemySystem.damageEnemy(hits[i], dmg, crit, 18, x, y);
      }
    }

    if (Math.random() < dt * 2) emitShake(events, 2, 0.06);
    this.effect({ phase: 'tick' });
  }

  onDestroy() {
    const { effects, player } = this.ctx;
    if (effects) effects.ring(player.x, player.y, 160, '#6b4cff');
    this.effect({ phase: 'end' });
  }

  effect(_payload) {}
}

export default DeathRain;
