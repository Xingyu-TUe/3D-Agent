/**
 * MainMenu.js
 * 主界面：标题 + 开始按钮 + 简介。暗黑哥特风格。
 */

import { roundRect, pointInRect } from './UIHelpers.js';

export class MainMenu {
  constructor() {
    this.w = 0;
    this.h = 0;
    this.startBtn = { x: 0, y: 0, w: 240, h: 64 };
    this.time = 0;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.startBtn.w = Math.min(280, w * 0.7);
    this.startBtn.x = (w - this.startBtn.w) / 2;
    this.startBtn.y = h * 0.62;
  }

  hitStart(x, y) {
    const b = this.startBtn;
    return pointInRect(x, y, b.x, b.y, b.w, b.h);
  }

  update(dt) {
    this.time += dt;
  }

  render(ctx) {
    const w = this.w;
    const h = this.h;

    // 背景渐变
    const grad = ctx.createRadialGradient(w / 2, h * 0.35, 40, w / 2, h * 0.35, h * 0.7);
    grad.addColorStop(0, '#2a0a0e');
    grad.addColorStop(0.5, '#12070a');
    grad.addColorStop(1, '#05060a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 背景裂隙光
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.2 * Math.sin(this.time * 2);
    ctx.strokeStyle = 'rgba(179,18,31,0.6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.1);
    ctx.lineTo(w * 0.5, h * 0.3);
    ctx.lineTo(w * 0.35, h * 0.45);
    ctx.lineTo(w * 0.7, h * 0.55);
    ctx.stroke();
    ctx.restore();

    // 标题
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#b3121f';
    ctx.font = `bold ${Math.min(64, w * 0.16)}px "Microsoft YaHei", serif`;
    ctx.shadowColor = 'rgba(255,60,40,0.6)';
    ctx.shadowBlur = 20;
    ctx.fillText('地狱裂隙', w / 2, h * 0.3);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#8b6b6b';
    ctx.font = `${Math.min(22, w * 0.055)}px serif`;
    ctx.fillText('H E L L   R I F T', w / 2, h * 0.3 + Math.min(52, w * 0.12));

    ctx.fillStyle = '#6b7280';
    ctx.font = '14px sans-serif';
    ctx.fillText('暗黑哥特 · 幸存者 · 5 分钟一局', w / 2, h * 0.45);

    // 开始按钮（脉动）
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 3);
    const b = this.startBtn;
    ctx.save();
    ctx.shadowColor = `rgba(179,18,31,${0.4 + pulse * 0.4})`;
    ctx.shadowBlur = 20;
    const bgrad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    bgrad.addColorStop(0, '#a01019');
    bgrad.addColorStop(1, '#5c0a0e');
    ctx.fillStyle = bgrad;
    roundRect(ctx, b.x, b.y, b.w, b.h, 12);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#ff5a4a';
    ctx.lineWidth = 2;
    roundRect(ctx, b.x, b.y, b.w, b.h, 12);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px "Microsoft YaHei", sans-serif';
    ctx.fillText('进 入 裂 隙', b.x + b.w / 2, b.y + b.h / 2);

    // 底部操作提示
    ctx.fillStyle = '#4b5563';
    ctx.font = '13px sans-serif';
    ctx.fillText('左手摇杆移动 · 自动攻击 · 升级三选一', w / 2, h * 0.86);
  }
}

export default MainMenu;
