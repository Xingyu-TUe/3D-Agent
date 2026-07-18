/**
 * LevelUpUI.js
 * 升级三选一界面。游戏暂停时弹出，展示 3 张技能/属性卡片供点击选择。
 */

import { roundRect, pointInRect, SKILL_ICONS } from './UIHelpers.js';

export class LevelUpUI {
  constructor() {
    this.w = 0;
    this.h = 0;
    this.options = [];
    this.cards = [];
    this.time = 0;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this._layout();
  }

  setOptions(options) {
    this.options = options;
    this.time = 0;
    this._layout();
  }

  _layout() {
    this.cards = [];
    const n = this.options.length;
    if (n === 0) return;
    const cardW = Math.min(this.w * 0.8, 420);
    const cardH = Math.min(92, this.h * 0.13);
    const gap = 18;
    const totalH = n * cardH + (n - 1) * gap;
    let y = (this.h - totalH) / 2 + 20;
    const x = (this.w - cardW) / 2;
    for (let i = 0; i < n; i++) {
      this.cards.push({ x, y, w: cardW, h: cardH, option: this.options[i] });
      y += cardH + gap;
    }
  }

  update(dt) {
    this.time += dt;
  }

  /** 返回被点击的 option 或 null */
  handleTap(x, y) {
    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i];
      if (pointInRect(x, y, c.x, c.y, c.w, c.h)) return c.option;
    }
    return null;
  }

  render(ctx) {
    const w = this.w;
    const h = this.h;
    // 半透明遮罩
    ctx.fillStyle = 'rgba(5,6,10,0.82)';
    ctx.fillRect(0, 0, w, h);

    // 标题
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd24a';
    ctx.font = 'bold 30px "Microsoft YaHei", sans-serif';
    ctx.shadowColor = 'rgba(255,180,40,0.5)';
    ctx.shadowBlur = 12;
    const titleY = this.cards.length ? this.cards[0].y - 46 : h * 0.3;
    ctx.fillText('等级提升！', w / 2, titleY);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#8b9cb3';
    ctx.font = '14px sans-serif';
    ctx.fillText('选择一项强化', w / 2, titleY + 26);

    // 卡片
    for (let i = 0; i < this.cards.length; i++) {
      this._renderCard(ctx, this.cards[i], i);
    }
  }

  _renderCard(ctx, card, index) {
    const { x, y, w, h, option } = card;
    const appear = Math.min(1, this.time * 4 - index * 0.12);
    if (appear <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, appear);

    // 卡片背景
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#1c2130');
    grad.addColorStop(1, '#12151f');
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = option.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 图标框
    const iconSize = h - 24;
    const ix = x + 14;
    const iy = y + 12;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, ix, iy, iconSize, iconSize, 8);
    ctx.fill();
    ctx.strokeStyle = option.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = option.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${iconSize * 0.5}px "Microsoft YaHei", sans-serif`;
    const icon = option.kind === 'skill' ? (SKILL_ICONS[option.id] || '技') : (option.kind === 'heal' ? '治' : '强');
    ctx.fillText(icon, ix + iconSize / 2, iy + iconSize / 2);

    // 文字
    const tx = ix + iconSize + 16;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 19px "Microsoft YaHei", sans-serif';
    let tag = '';
    if (option.kind === 'skill') tag = option.isNew ? '  [新]' : '';
    ctx.fillText(option.name + tag, tx, y + h * 0.36);

    ctx.fillStyle = '#9aa7b8';
    ctx.font = '13px "Microsoft YaHei", sans-serif';
    this._wrapText(ctx, option.desc, tx, y + h * 0.62, w - (tx - x) - 16, 16);

    ctx.restore();
  }

  _wrapText(ctx, text, x, y, maxW, lh) {
    const chars = text.split('');
    let line = '';
    let yy = y;
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i];
      if (ctx.measureText(test).width > maxW && line !== '') {
        ctx.fillText(line, x, yy);
        line = chars[i];
        yy += lh;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, yy);
  }
}

export default LevelUpUI;
