/**
 * BulletSystem.js
 * 投射物系统：对象池管理 + 更新 + 与怪物碰撞（借助 CollisionSystem 四叉树）。
 */

import ObjectPool from '../Utils/ObjectPool.js';
import Bullet from './Bullet.js';
import GameConfig from '../Config/GameConfig.js';
import { chance } from '../Utils/MathUtils.js';

export class BulletSystem {
  constructor(player, enemySystem, collision, effects, events) {
    this.player = player;
    this.enemySystem = enemySystem;
    this.collision = collision;
    this.effects = effects;
    this.events = events;
    this.pool = new ObjectPool(() => new Bullet(), (b) => b.reset(), GameConfig.performance.poolBullet);
    this.bullets = [];
    this._hitBuf = [];
  }

  fire(cfg) {
    const b = this.pool.acquire();
    b.spawn(cfg);
    this.bullets.push(b);
    return b;
  }

  _rollDamage(baseDamage, canCrit) {
    const s = this.player.stats.final;
    const atkCoef = (s.attack || 20) / 20;
    let dmg = baseDamage * atkCoef * s.damageMul;
    let crit = false;
    if (canCrit && chance(s.critRate)) {
      dmg *= s.critDmg;
      crit = true;
    }
    return { dmg, crit };
  }

  update(dt, camera) {
    const nearestFn = (x, y) => this.collision.nearest(x, y, 500, null);

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b.update(dt, b.homing ? nearestFn : null)) {
        this._release(i);
        continue;
      }

      if (!camera.isVisible(b.x, b.y, 200)) {
        this._release(i);
        continue;
      }

      const hits = this.collision.queryCircle(b.x, b.y, b.radius, this._hitBuf);
      for (let j = 0; j < hits.length; j++) {
        const e = hits[j];
        if (b.hitSet.has(e)) continue;
        b.hitSet.add(e);

        if (b.explode) {
          this._doExplode(b);
          b.active = false;
          break;
        } else {
          const { dmg, crit } = this._rollDamage(b.damage, b.canCrit);
          this.enemySystem.damageEnemy(e, dmg, crit, 40, b.x, b.y);
          if (b.slow > 0) e.applySlow(1 - b.slow, b.slowDuration || 1);
          if (b.pierce > 0) {
            b.pierce--;
          } else {
            b.active = false;
            break;
          }
        }
      }

      if (!b.active) this._release(i);
    }
  }

  _doExplode(b) {
    this.effects.explosion(b.x, b.y, b.explodeRadius, b.color);
    this.events.emit('shake', { magnitude: 3, duration: 0.12 });
    const affected = this.collision.queryCircle(b.x, b.y, b.explodeRadius, []);
    for (let k = 0; k < affected.length; k++) {
      const e = affected[k];
      const { dmg, crit } = this._rollDamage(b.damage, b.canCrit);
      this.enemySystem.damageEnemy(e, dmg, crit, 30, b.x, b.y);
    }
  }

  _release(index) {
    const b = this.bullets[index];
    this.pool.release(b);
    const last = this.bullets.pop();
    if (last !== b) this.bullets[index] = last;
  }

  render(ctx, camera) {
    for (let i = 0; i < this.bullets.length; i++) {
      this.bullets[i].render(ctx, camera);
    }
  }

  clear() {
    for (let i = 0; i < this.bullets.length; i++) this.pool.release(this.bullets[i]);
    this.bullets.length = 0;
  }

  get count() {
    return this.bullets.length;
  }
}

export default BulletSystem;
