/**
 * ExpSystem.js
 * 经验系统：
 *   - 管理经验球对象池（掉落 / 更新 / 吸附 / 拾取）
 *   - 升级判定（线性增长曲线），升级时通过回调通知（触发三选一）
 *   - 拾取时按 GameConfig.exp.gainMul 缩放实际获得量
 *
 * 性能：只对可视 + 拾取范围附近的球做吸附与拾取判定。
 */

import ObjectPool from '../Utils/ObjectPool.js';
import ExpOrb from './ExpOrb.js';
import GameConfig from '../Config/GameConfig.js';
import { dist2 } from '../Utils/MathUtils.js';

export class ExpSystem {
  constructor(player, events, effects) {
    this.player = player;
    this.events = events;
    this.effects = effects || null;
    this.pool = new ObjectPool(() => new ExpOrb(), (o) => o.reset(), GameConfig.performance.poolOrb);
    this.orbs = [];
    this.player.expToNext = this.expNeeded(this.player.level);
  }

  /** 升级所需经验：线性 need = base + (level-1) * perLevel */
  expNeeded(level) {
    const lv = Math.max(1, level | 0);
    const { base, perLevel } = GameConfig.exp;
    return Math.max(1, Math.floor(base + (lv - 1) * perLevel));
  }

  dropOrb(x, y, value) {
    const orb = this.pool.acquire();
    orb.spawn(x, y, value);
    this.orbs.push(orb);
  }

  update(dt, camera) {
    const p = this.player;
    const pickup = p.stats.final.pickupRadius;
    const pickup2 = pickup * pickup;
    const magnetSpeed = GameConfig.exp.magnetSpeed;
    const eatDist2 = (p.stats.final.radius + 6) * (p.stats.final.radius + 6);

    let gained = 0;
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];

      // 初始散射减速
      if (orb.scatter > 0) {
        orb.scatter -= dt;
        orb.x += orb.vx * dt;
        orb.y += orb.vy * dt;
        orb.vx *= 0.86;
        orb.vy *= 0.86;
      }

      const d2 = dist2(orb.x, orb.y, p.x, p.y);

      if (!orb.magnet && d2 <= pickup2) orb.magnet = true;

      if (orb.magnet) {
        const dx = p.x - orb.x;
        const dy = p.y - orb.y;
        const d = Math.sqrt(d2) || 1;
        orb.x += (dx / d) * magnetSpeed * dt;
        orb.y += (dy / d) * magnetSpeed * dt;

        if (d2 <= eatDist2) {
          gained += orb.value;
          this.pool.release(orb);
          this.orbs.splice(i, 1);
        }
      }
    }

    if (gained > 0) {
      const mul = GameConfig.exp.gainMul != null ? GameConfig.exp.gainMul : 1;
      const actual = Math.max(0.1, gained * mul);
      p.addExp(actual);
      if (this.effects && GameConfig.display.showCombatNumbers) {
        this.effects.expText(p.x, p.y - (p.stats.final.radius || 20) - 8, actual);
      }
      this._checkLevelUp();
    }
  }

  _checkLevelUp() {
    const p = this.player;
    let leveled = 0;
    while (p.exp >= p.expToNext) {
      p.exp -= p.expToNext;
      p.level++;
      leveled++;
      p.expToNext = this.expNeeded(p.level);
    }
    if (leveled > 0) {
      this.events.emit('levelup', { level: p.level, times: leveled });
    }
  }

  render(ctx, camera, time) {
    for (let i = 0; i < this.orbs.length; i++) {
      const orb = this.orbs[i];
      if (camera.isVisible(orb.x, orb.y, 20)) {
        orb.render(ctx, camera, time);
      }
    }
  }

  clear() {
    for (let i = 0; i < this.orbs.length; i++) this.pool.release(this.orbs[i]);
    this.orbs.length = 0;
  }

  get count() {
    return this.orbs.length;
  }
}

export default ExpSystem;
