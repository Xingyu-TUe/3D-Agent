/**
 * SummonSystem.js
 * 召唤物管理：生成、AI 追击、接触伤害、生命周期、绘制。
 */

import ObjectPool from '../Utils/ObjectPool.js';
import Summon from './Summon.js';
import { dist2 } from '../Utils/MathUtils.js';
import { chance } from '../Utils/MathUtils.js';

export class SummonSystem {
  constructor(player, enemySystem, collision, effects) {
    this.player = player;
    this.enemySystem = enemySystem;
    this.collision = collision;
    this.effects = effects;
    this.pool = new ObjectPool(() => new Summon(), (s) => s.reset(), 40);
    this.summons = [];
  }

  countByKind(kind) {
    let n = 0;
    for (let i = 0; i < this.summons.length; i++) {
      if (this.summons[i].active && this.summons[i].kind === kind) n++;
    }
    return n;
  }

  spawn(cfg) {
    const s = this.pool.acquire();
    s.spawn(cfg);
    this.summons.push(s);
    this.effects.puff(cfg.x, cfg.y, '#6dbf4a');
    return s;
  }

  update(dt) {
    const p = this.player;
    for (let i = this.summons.length - 1; i >= 0; i--) {
      const s = this.summons[i];
      s.life -= dt;
      if (s.life <= 0 || s.hp <= 0) {
        this.effects.puff(s.x, s.y, '#4a6a3a');
        this._release(i);
        continue;
      }

      // 找最近敌人
      const target = this.collision.nearest(s.x, s.y, 700, null);
      if (target) {
        const dx = target.x - s.x;
        const dy = target.y - s.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        s.x += (dx / d) * s.speed * dt;
        s.y += (dy / d) * s.speed * dt;

        if (s.attackCd > 0) s.attackCd -= dt;
        const touch = s.radius + target.radius;
        if (d <= touch && s.attackCd <= 0) {
          s.attackCd = s.kind === 'treant' ? 0.55 : (s.kind === 'bear' ? 0.7 : 0.45);
          let dmg = s.damage * p.stats.final.damageMul;
          let crit = false;
          if (chance(p.stats.final.critRate)) {
            dmg *= p.stats.final.critDmg;
            crit = true;
          }
          this.enemySystem.damageEnemy(target, dmg, crit, 20, s.x, s.y);
          p.onDealDamage(dmg);
        }
      } else {
        // 无敌人时跟随玩家
        const dx = p.x - s.x;
        const dy = p.y - s.y;
        const d2 = dist2(p.x, p.y, s.x, s.y);
        if (d2 > 90 * 90) {
          const d = Math.sqrt(d2) || 1;
          s.x += (dx / d) * s.speed * 0.7 * dt;
          s.y += (dy / d) * s.speed * 0.7 * dt;
        }
      }
    }
  }

  _release(index) {
    const s = this.summons[index];
    this.pool.release(s);
    const last = this.summons.pop();
    if (last !== s) this.summons[index] = last;
  }

  render(ctx, camera, time) {
    for (let i = 0; i < this.summons.length; i++) {
      const s = this.summons[i];
      if (!camera.isVisible(s.x, s.y, s.radius + 20)) continue;
      this._draw(ctx, camera, s, time);
    }
  }

  _draw(ctx, camera, s, time) {
    const sx = camera.worldToScreenX(s.x);
    const sy = camera.worldToScreenY(s.y);
    const r = s.radius;
    const bob = Math.sin(time * 8 + s.phase) * 2;
    ctx.save();
    ctx.translate(sx, sy + bob);

    if (s.kind === 'wolf') {
      ctx.fillStyle = '#9aa8b8';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.1, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cfe0f0';
      ctx.beginPath();
      ctx.arc(r * 0.7, -r * 0.15, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7affb0';
      ctx.beginPath();
      ctx.arc(r * 0.9, -r * 0.25, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.kind === 'bear') {
      ctx.fillStyle = '#8a6230';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.0, r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a3a18';
      ctx.beginPath();
      ctx.arc(-r * 0.5, -r * 0.7, r * 0.28, 0, Math.PI * 2);
      ctx.arc(r * 0.5, -r * 0.7, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffcf5c';
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.1, r * 0.12, 0, Math.PI * 2);
      ctx.arc(r * 0.25, -r * 0.1, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // treant
      ctx.fillStyle = '#3d6a28';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.2, r * 0.9, r * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2a4a18';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r * 0.8);
      ctx.lineTo(-r * 0.8, -r * 1.4);
      ctx.moveTo(r * 0.3, -r * 0.8);
      ctx.lineTo(r * 0.8, -r * 1.4);
      ctx.stroke();
      ctx.fillStyle = '#ff5a3c';
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.1, r * 0.15, 0, Math.PI * 2);
      ctx.arc(r * 0.25, -r * 0.1, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // 小血条
    const pct = s.hp / s.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-r, -r - 10, r * 2, 3);
    ctx.fillStyle = '#7affb0';
    ctx.fillRect(-r, -r - 10, r * 2 * pct, 3);
    ctx.restore();
  }

  clear() {
    for (let i = 0; i < this.summons.length; i++) this.pool.release(this.summons[i]);
    this.summons.length = 0;
  }

  get count() {
    return this.summons.length;
  }
}

export default SummonSystem;
