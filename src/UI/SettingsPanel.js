/**
 * SettingsPanel.js
 * 游戏内设置面板（由 HUD 设置按钮打开）。
 */

import { roundRect, pointInRect } from './UIHelpers.js';
import { getShowCombatNumbers, toggleCombatNumbers } from '../Config/Settings.js';

export class SettingsPanel {
  constructor() {
    this.w = 0;
    this.h = 0;
    this.toggleBtn = { x: 0, y: 0, w: 0, h: 0 };
    this.closeBtn = { x: 0, y: 0, w: 0, h: 0 };
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this._layout();
  }

  _layout() {
    const panelW = Math.min(340, this.w * 0.86);
    const panelH = 220;
    const px = (this.w - panelW) / 2;
    const py = (this.h - panelH) / 2;
    this.panel = { x: px, y: py, w: panelW, h: panelH };

    const btnW = panelW - 40;
    const btnH = 48;
    this.toggleBtn = {
      x: px + 20,
      y: py + 88,
      w: btnW,
      h: btnH,
    };
    this.closeBtn = {
      x: px + 20,
      y: py + 88 + btnH + 16,
      w: btnW,
      h: btnH,
    };
  }

  /** @returns {'toggle'|'close'|null} */
  handleTap(x, y) {
    this._layout();
    if (pointInRect(x, y, this.toggleBtn.x, this.toggleBtn.y, this.toggleBtn.w, this.toggleBtn.h)) {
      toggleCombatNumbers();
      return 'toggle';
    }
    if (pointInRect(x, y, this.closeBtn.x, this.closeBtn.y, this.closeBtn.w, this.closeBtn.h)) {
      return 'close';
    }
    // 点面板外也关闭
    const p = this.panel;
    if (!pointInRect(x, y, p.x, p.y, p.w, p.h)) return 'close';
    return null;
  }

  render(ctx) {
    this._layout();
    const w = this.w;
    const h = this.h;
    const p = this.panel;

    ctx.fillStyle = 'rgba(5,6,10,0.72)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(18,16,24,0.96)';
    roundRect(ctx, p.x, p.y, p.w, p.h, 16);
    ctx.fill();
    ctx.strokeStyle = '#b3121f';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd24a';
    ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
    ctx.fillText('设置', w / 2, p.y + 36);
    ctx.fillStyle = '#8b9cb3';
    ctx.font = '13px sans-serif';
    ctx.fillText('战斗飘字显示', w / 2, p.y + 64);

    const on = getShowCombatNumbers();
    const t = this.toggleBtn;
    ctx.fillStyle = on ? 'rgba(40,90,60,0.95)' : 'rgba(55,28,32,0.95)';
    roundRect(ctx, t.x, t.y, t.w, t.h, 12);
    ctx.fill();
    ctx.strokeStyle = on ? '#6dbf4a' : '#b3121f';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px "Microsoft YaHei", sans-serif';
    ctx.fillText(
      on ? '伤害 / 经验数字：开' : '伤害 / 经验数字：关',
      w / 2,
      t.y + t.h / 2,
    );

    const c = this.closeBtn;
    ctx.fillStyle = 'rgba(30,40,70,0.95)';
    roundRect(ctx, c.x, c.y, c.w, c.h, 12);
    ctx.fill();
    ctx.strokeStyle = '#5cb8ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 17px "Microsoft YaHei", sans-serif';
    ctx.fillText('关闭', w / 2, c.y + c.h / 2);
  }
}

export default SettingsPanel;
