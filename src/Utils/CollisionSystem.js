/**
 * CollisionSystem.js
 * 碰撞加速系统。每帧用四叉树对「当前存活怪物」建立空间索引，
 * 供技能/子弹进行高效范围查询与最近敌人查询，避免 O(n) 全量遍历。
 *
 * 索引区域以玩家为中心的一个大方块（覆盖刷怪半径），足够容纳同屏怪物。
 */

import QuadTree from './QuadTree.js';
import GameConfig from '../Config/GameConfig.js';
import { dist2 } from './MathUtils.js';

export class CollisionSystem {
  constructor() {
    this.tree = new QuadTree(
      { x: 0, y: 0, w: 1, h: 1 },
      GameConfig.performance.quadMaxObjects,
      GameConfig.performance.quadMaxLevels,
    );
    this._queryBuffer = [];
  }

  /** 每帧重建：以玩家为中心的区域 */
  rebuild(player, enemies) {
    const span = GameConfig.spawn.ringMax * 3;
    this.tree.reset({
      x: player.x - span,
      y: player.y - span,
      w: span * 2,
      h: span * 2,
    });
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.active) this.tree.insert(e);
    }
  }

  /**
   * 查询圆形范围内的敌人，结果写入 out 数组（清空后填充）。
   */
  queryCircle(cx, cy, radius, out) {
    out.length = 0;
    this._queryBuffer.length = 0;
    this.tree.retrieve(cx, cy, radius, this._queryBuffer);
    for (let i = 0; i < this._queryBuffer.length; i++) {
      const e = this._queryBuffer[i];
      if (!e.active) continue;
      const rr = radius + e.radius;
      if (dist2(cx, cy, e.x, e.y) <= rr * rr) {
        out.push(e);
      }
    }
    return out;
  }

  /**
   * 查询距离 (cx,cy) 最近的敌人（在 maxRange 内）。可传 exclude Set 排除。
   */
  nearest(cx, cy, maxRange, exclude) {
    this._queryBuffer.length = 0;
    this.tree.retrieve(cx, cy, maxRange, this._queryBuffer);
    let best = null;
    let bestD2 = maxRange * maxRange;
    for (let i = 0; i < this._queryBuffer.length; i++) {
      const e = this._queryBuffer[i];
      if (!e.active) continue;
      if (exclude && exclude.has(e)) continue;
      const d2 = dist2(cx, cy, e.x, e.y);
      if (d2 < bestD2) {
        bestD2 = d2;
        best = e;
      }
    }
    return best;
  }

  /** 调试：可视化四叉树 */
  debugRender(ctx, camera) {
    const bounds = this.tree.collectBounds([]);
    ctx.save();
    ctx.strokeStyle = 'rgba(80,200,255,0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < bounds.length; i++) {
      const b = bounds[i];
      ctx.strokeRect(
        camera.worldToScreenX(b.x),
        camera.worldToScreenY(b.y),
        b.w, b.h,
      );
    }
    ctx.restore();
  }
}

export default CollisionSystem;
