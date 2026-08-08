/**
 * HUD.js
 * 游戏内顶部信息栏 + 暂停/设置按钮 + 技能栏。
 *   顶部：生命条、经验条、等级、时间、击杀数
 *   右上：暂停 + 设置
 *   底部中：已获得技能图标
 */

import { formatTime } from './UIHelpers.js';
import Assets from '../Utils/AssetLoader.js';
import { drawIcon } from '../Utils/SpriteUtil.js';

export class HUD {
  constructor() {
    this.w = 0;
    this.h = 0;
    this.safeTop = 0;
    this.pauseBtn = { x: 0, y: 0, r: 26 };
    this.settingsBtn = { x: 0, y: 0, r: 26 };
    this.showFps = false;
  }

  resize(w, h, safeTop) {
    this.w = w;
    this.h = h;
    this.safeTop = safeTop || 0;
    this.pauseBtn.x = w - 42;
    this.pauseBtn.y = this.safeTop + 40;
    // 设置按钮在暂停下方，始终可见
    this.settingsBtn.x = w - 42;
    this.settingsBtn.y = this.pauseBtn.y + 58;
  }

  hitPause(x, y) {
    return this._hitCircle(x, y, this.pauseBtn);
  }

  hitSettings(x, y) {
    return this._hitCircle(x, y, this.settingsBtn);
  }

  _hitCircle(x, y, b) {
    const dx = x - b.x;
    const dy = y - b.y;
    return dx * dx + dy * dy <= (b.r + 10) * (b.r + 10);
  }

  render(ctx, state) {
    const { player, timeLeft, enemyCount, fps } = state;
    const top = this.safeTop + 10;
    const pad = 16;
    const barW = this.w - pad * 2 - 70;

    // 生命条（左侧可选生命图标贴图）
    const hpY = top;
    const hpIcon = Assets.ui('hp');
    const barPad = hpIcon ? pad + 28 : pad;
    const barWidth = hpIcon ? barW - 28 : barW;
    if (hpIcon) drawIcon(ctx, hpIcon, pad + 10, hpY + 9, 22);
    this._bar(ctx, barPad, hpY, barWidth, 18, player.hp / player.maxHp, '#3a0d10', '#e23b3b', '#ff7a6a');
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.ceil(player.hp)}/${Math.round(player.maxHp)}`, barPad + barWidth / 2, hpY + 9);

    // 经验条
    const expY = hpY + 24;
    const expPct = player.expToNext > 0 ? player.exp / player.expToNext : 0;
    const expIcon = Assets.ui('exp');
    const expPad = expIcon ? pad + 28 : pad;
    const expWidth = expIcon ? barW - 28 : barW;
    if (expIcon) drawIcon(ctx, expIcon, pad + 10, expY + 6, 20);
    this._bar(ctx, expPad, expY, expWidth, 12, expPct, '#0d2038', '#2b7fff', '#7cc4ff');

    // 等级徽章（略左移，避开右侧按钮）
    ctx.fillStyle = '#1a1d26';
    ctx.strokeStyle = '#b3121f';
    ctx.lineWidth = 2;
    const lvX = this.w - pad - 100;
    ctx.beginPath();
    ctx.arc(lvX + 20, expY + 4, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd24a';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(String(player.level), lvX + 20, expY + 4);
    ctx.fillStyle = '#8b9cb3';
    ctx.font = '9px sans-serif';
    ctx.fillText('LV', lvX + 20, expY - 12);

    // 时间 + 击杀
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(formatTime(timeLeft), this.w / 2, expY + 42);
    ctx.fillStyle = '#8b9cb3';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`击杀 ${player.kills}`, pad, expY + 40);
    ctx.textAlign = 'right';
    ctx.fillText(`怪物 ${enemyCount}`, this.w - pad - 56, expY + 40);

    if (this.showFps && fps != null) {
      ctx.fillStyle = fps >= 50 ? '#7affb0' : (fps >= 30 ? '#ffd24a' : '#ff6b6b');
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`FPS ${fps}`, pad, expY + 58);
    }

    this._circleButton(ctx, this.pauseBtn, 'pause', '||');
    this._circleButton(ctx, this.settingsBtn, 'settings', '设');

    this._skillBar(ctx, state.skills);
  }

  _circleButton(ctx, b, uiId, fallback) {
    const img = Assets.ui(uiId);
    if (img) {
      drawIcon(ctx, img, b.x, b.y, b.r * 2);
      return;
    }
    ctx.fillStyle = 'rgba(20,22,30,0.75)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(179,18,31,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (fallback === '||') {
      ctx.fillStyle = '#e6edf3';
      ctx.fillRect(b.x - 8, b.y - 9, 5, 18);
      ctx.fillRect(b.x + 3, b.y - 9, 5, 18);
    } else {
      ctx.fillStyle = '#e6edf3';
      ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fallback, b.x, b.y);
    }
  }

  _skillBar(ctx, skills) {
    if (!skills || skills.length === 0) return;
    const size = 34;
    const gap = 6;
    const totalW = skills.length * (size + gap) - gap;
    let x = (this.w - totalW) / 2;
    const y = this.h - size - 14;
    for (let i = 0; i < skills.length; i++) {
      const s = skills[i];
      ctx.fillStyle = 'rgba(15,17,24,0.75)';
      this._roundRect(ctx, x, y, size, size, 6);
      ctx.fill();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      const iconImg = s.id ? Assets.skillIcon(s.id) : null;
      if (iconImg) {
        drawIcon(ctx, iconImg, x + size / 2, y + size / 2 - 2, size - 8);
      } else {
        ctx.fillStyle = s.color;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.icon, x + size / 2, y + size / 2 - 2);
      }
      ctx.fillStyle = '#ffd24a';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Lv' + s.level, x + size / 2, y + size - 6);
      x += size + gap;
    }
  }

  _bar(ctx, x, y, w, h, pct, bg, c1, c2) {
    pct = Math.max(0, Math.min(1, pct));
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this._roundRect(ctx, x - 2, y - 2, w + 4, h + 4, 4);
    ctx.fill();
    ctx.fillStyle = bg;
    this._roundRect(ctx, x, y, w, h, 3);
    ctx.fill();
    if (pct > 0) {
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, c2);
      grad.addColorStop(1, c1);
      ctx.fillStyle = grad;
      this._roundRect(ctx, x, y, w * pct, h, 3);
      ctx.fill();
    }
  }

  _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

export default HUD;
