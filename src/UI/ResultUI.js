/**
 * ResultUI.js
 * 结算页面：胜利 / 失败，展示等级、击杀、存活时间、掉落宝箱，返回大厅按钮。
 */

import { roundRect, pointInRect, formatTime } from './UIHelpers.js';

export class ResultUI {
  constructor() {
    this.w = 0;
    this.h = 0;
    this.backBtn = { x: 0, y: 0, w: 240, h: 60 };
    this.data = null;
    this.time = 0;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.backBtn.w = Math.min(280, w * 0.7);
    this.backBtn.x = (w - this.backBtn.w) / 2;
    this.backBtn.y = h * 0.74;
  }

  setData(data) {
    this.data = data;
    this.time = 0;
  }

  hitBack(x, y) {
    const b = this.backBtn;
    return pointInRect(x, y, b.x, b.y, b.w, b.h);
  }

  update(dt) {
    this.time += dt;
  }

  render(ctx) {
    const w = this.w;
    const h = this.h;
    const d = this.data || {};

    ctx.fillStyle = 'rgba(5,6,10,0.9)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const win = d.victory;
    ctx.fillStyle = win ? '#ffd24a' : '#b3121f';
    ctx.font = 'bold 46px "Microsoft YaHei", serif';
    ctx.shadowColor = win ? 'rgba(255,200,60,0.6)' : 'rgba(255,40,40,0.6)';
    ctx.shadowBlur = 18;
    ctx.fillText(win ? '裂隙已封印' : '你已陨落', w / 2, h * 0.22);
    ctx.shadowBlur = 0;

    // 宝箱（胜利时）
    if (win) {
      this._drawChest(ctx, w / 2, h * 0.36);
    }

    // 统计
    const stats = [
      ['存活时间', formatTime(d.survived || 0)],
      ['达到等级', 'Lv.' + (d.level || 1)],
      ['击杀总数', String(d.kills || 0)],
    ];
    let sy = h * 0.5;
    ctx.font = '18px "Microsoft YaHei", sans-serif';
    for (let i = 0; i < stats.length; i++) {
      const reveal = this.time * 2 - i * 0.3;
      if (reveal <= 0) continue;
      ctx.save();
      ctx.globalAlpha = Math.min(1, reveal);
      ctx.fillStyle = '#8b9cb3';
      ctx.textAlign = 'right';
      ctx.fillText(stats[i][0], w / 2 - 12, sy);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
      ctx.fillText(stats[i][1], w / 2 + 12, sy);
      ctx.font = '18px "Microsoft YaHei", sans-serif';
      ctx.restore();
      sy += 34;
    }

    // 返回按钮
    const b = this.backBtn;
    const bgrad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    bgrad.addColorStop(0, '#2b3346');
    bgrad.addColorStop(1, '#1a2130');
    ctx.fillStyle = bgrad;
    roundRect(ctx, b.x, b.y, b.w, b.h, 12);
    ctx.fill();
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('返回大厅', b.x + b.w / 2, b.y + b.h / 2);
  }

  _drawChest(ctx, cx, cy) {
    const bob = Math.sin(this.time * 3) * 4;
    cy += bob;
    ctx.save();
    ctx.translate(cx, cy);
    // 光晕
    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 70);
    glow.addColorStop(0, 'rgba(255,210,90,0.4)');
    glow.addColorStop(1, 'rgba(255,210,90,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.fill();
    // 箱体
    ctx.fillStyle = '#6b4423';
    roundRect(ctx, -40, -10, 80, 44, 6);
    ctx.fill();
    ctx.fillStyle = '#4a2f18';
    roundRect(ctx, -40, -30, 80, 26, 8);
    ctx.fill();
    // 金锁
    ctx.fillStyle = '#ffd24a';
    ctx.fillRect(-8, -12, 16, 16);
    ctx.restore();
  }
}

export default ResultUI;
