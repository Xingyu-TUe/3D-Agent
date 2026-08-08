/**
 * Background.js
 * 无限滚动的暗黑地面渲染。程序化生成（无需美术素材）：
 *   - 灰色岩石地砖 + 明暗棋盘
 *   - 裂缝
 *   - 岩浆池（带脉动辉光）
 *   - 尸骨
 *   - 火焰（跳动）
 *
 * 使用确定性伪随机（基于 tile 坐标哈希），保证同一地块装饰稳定，
 * 摄像机移动时不会闪烁，且无限世界可复现。
 */

import GameConfig from '../Config/GameConfig.js';

// 稳定哈希：由整型 tile 坐标生成 0~1 伪随机
function hash2(ix, iy) {
  let h = ix * 374761393 + iy * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  // 转为 0~1
  return ((h >>> 0) % 100000) / 100000;
}

export class Background {
  constructor() {
    this.tile = GameConfig.world.tileSize;
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
  }

  render(ctx, camera) {
    const tile = this.tile;
    const view = camera.getViewBounds(tile);
    const startIX = Math.floor(view.left / tile);
    const endIX = Math.floor(view.right / tile);
    const startIY = Math.floor(view.top / tile);
    const endIY = Math.floor(view.bottom / tile);

    for (let iy = startIY; iy <= endIY; iy++) {
      for (let ix = startIX; ix <= endIX; ix++) {
        this._renderTile(ctx, camera, ix, iy);
      }
    }
  }

  _renderTile(ctx, camera, ix, iy) {
    const tile = this.tile;
    const wx = ix * tile;
    const wy = iy * tile;
    const sx = camera.worldToScreenX(wx);
    const sy = camera.worldToScreenY(wy);

    // 基础岩石棋盘明暗
    const checker = (ix + iy) & 1;
    const base = checker ? '#15161d' : '#111219';
    ctx.fillStyle = base;
    ctx.fillRect(sx, sy, tile + 1, tile + 1);

    const r = hash2(ix, iy);
    const cx = sx + tile * 0.5;
    const cy = sy + tile * 0.5;

    // 岩石纹理点（暗灰）
    ctx.fillStyle = 'rgba(60,62,72,0.25)';
    const nrocks = 2;
    for (let i = 0; i < nrocks; i++) {
      const rr = hash2(ix * 7 + i, iy * 13 + i);
      const rx = sx + rr * tile;
      const ry = sy + hash2(ix * 3 + i, iy * 5 + i) * tile;
      ctx.fillRect(rx, ry, 6 + rr * 8, 4 + rr * 6);
    }

    // 装饰：依据阈值分布不同元素
    if (r < 0.08) {
      this._drawLava(ctx, cx, cy, tile * 0.34, r);
    } else if (r < 0.16) {
      this._drawCrack(ctx, sx, sy, tile, ix, iy);
    } else if (r < 0.22) {
      this._drawBones(ctx, cx, cy, r);
    } else if (r < 0.26) {
      this._drawFlame(ctx, cx, cy, r);
    }
  }

  _drawLava(ctx, cx, cy, radius, seed) {
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 2 + seed * 6.28);
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
    grad.addColorStop(0, `rgba(255,${120 + pulse * 90 | 0},30,0.95)`);
    grad.addColorStop(0.5, 'rgba(200,50,10,0.75)');
    grad.addColorStop(1, 'rgba(60,10,5,0.1)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius, radius * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    // 熔岩裂纹
    ctx.strokeStyle = `rgba(255,180,60,${0.4 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.6, cy);
    ctx.lineTo(cx + radius * 0.5, cy - radius * 0.15);
    ctx.stroke();
  }

  _drawCrack(ctx, sx, sy, tile, ix, iy) {
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    let x = sx + hash2(ix, iy * 2) * tile;
    let y = sy;
    ctx.moveTo(x, y);
    for (let s = 1; s <= 4; s++) {
      x += (hash2(ix + s, iy) - 0.5) * tile * 0.5;
      y = sy + (s / 4) * tile;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    // 裂缝内的微光
    ctx.strokeStyle = 'rgba(150,40,20,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  _drawBones(ctx, cx, cy, seed) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(seed * 6.28);
    ctx.strokeStyle = 'rgba(200,195,175,0.5)';
    ctx.lineWidth = 3;
    // 一根骨头
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(14, 0);
    ctx.stroke();
    ctx.fillStyle = 'rgba(210,205,185,0.5)';
    ctx.beginPath();
    ctx.arc(-14, -3, 3, 0, Math.PI * 2);
    ctx.arc(-14, 3, 3, 0, Math.PI * 2);
    ctx.arc(14, -3, 3, 0, Math.PI * 2);
    ctx.arc(14, 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawFlame(ctx, cx, cy, seed) {
    const flick = 0.7 + 0.3 * Math.sin(this.time * 8 + seed * 10);
    const h = 22 * flick;
    const grad = ctx.createLinearGradient(cx, cy + 6, cx, cy - h);
    grad.addColorStop(0, 'rgba(120,20,0,0.0)');
    grad.addColorStop(0.4, 'rgba(255,90,20,0.7)');
    grad.addColorStop(1, 'rgba(255,210,90,0.9)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 6);
    ctx.quadraticCurveTo(cx - 4, cy - h * 0.4, cx, cy - h);
    ctx.quadraticCurveTo(cx + 4, cy - h * 0.4, cx + 8, cy + 6);
    ctx.closePath();
    ctx.fill();
  }
}

export default Background;
