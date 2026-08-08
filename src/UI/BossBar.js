/**
 * BossBar.js
 * Boss 血条（屏幕顶部横条）+ 阶段名 + 出现横幅动画。
 */

import { roundRect } from './UIHelpers.js';

export class BossBar {
  constructor() {
    this.w = 0;
    this.h = 0;
    this.bannerTime = 0;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
  }

  triggerBanner() {
    this.bannerTime = 2.2;
  }

  update(dt) {
    if (this.bannerTime > 0) this.bannerTime -= dt;
  }

  render(ctx, boss, safeTop) {
    if (!boss || !boss.active) return;
    const w = this.w;
    const barW = w * 0.82;
    const barH = 20;
    const x = (w - barW) / 2;
    const y = (safeTop || 0) + 96;

    // 名称 + 阶段
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
    const phase = boss.boss ? `  [${boss.boss.getPhaseName()}]` : '';
    ctx.fillText(boss.name + phase, w / 2, y - 6);

    // 血条
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, x - 2, y - 2, barW + 4, barH + 4, 4);
    ctx.fill();
    ctx.fillStyle = '#2a0608';
    roundRect(ctx, x, y, barW, barH, 3);
    ctx.fill();
    const pct = Math.max(0, boss.hp / boss.maxHp);
    if (pct > 0) {
      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, '#ff5a4a');
      grad.addColorStop(1, '#a0101a');
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, barW * pct, barH, 3);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.ceil(boss.hp)} / ${Math.round(boss.maxHp)}`, w / 2, y + barH / 2);

    this._renderBanner(ctx);
  }

  _renderBanner(ctx) {
    if (this.bannerTime <= 0) return;
    const w = this.w;
    const h = this.h;
    const t = this.bannerTime;
    const alpha = Math.min(1, t) * Math.min(1, (2.2 - t) * 3);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(120,10,15,0.5)';
    ctx.fillRect(0, h * 0.4, w, 90);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffdede';
    ctx.font = 'bold 40px "Microsoft YaHei", serif';
    ctx.shadowColor = '#ff2a2a';
    ctx.shadowBlur = 20;
    ctx.fillText('裂 隙 领 主 降 临', w / 2, h * 0.4 + 45);
    ctx.restore();
  }
}

export default BossBar;
