/**
 * SkillButtons.js
 * 右下角主动技能双按钮：小技能 + 大招。
 * 显示 Icon、CD 倒计时；冷却完成高亮；点击释放。
 */

import Assets from '../Utils/AssetLoader.js';
import { drawIcon } from '../Utils/SpriteUtil.js';
import { SKILL_ICONS, roundRect } from './UIHelpers.js';

const SLOT_ORDER = ['small', 'ultimate'];

export class SkillButtons {
  constructor() {
    this.w = 0;
    this.h = 0;
    this.safeBottom = 0;
    /** @type {{ slot: string, x: number, y: number, r: number }[]} */
    this.buttons = [];
    /** 按下高亮反馈剩余时间 */
    this._flash = { small: 0, ultimate: 0 };
    this.visible = true;
  }

  resize(w, h, safeBottom = 0) {
    this.w = w;
    this.h = h;
    this.safeBottom = safeBottom || 0;

    const marginR = 28;
    const marginB = 36 + this.safeBottom;
    const rSmall = 34;
    const rUlt = 42;
    const gap = 14;

    const ultX = w - marginR - rUlt;
    const ultY = h - marginB - rUlt;
    const smallX = ultX - gap - rSmall - rUlt;
    const smallY = ultY + (rUlt - rSmall);

    this.buttons = [
      { slot: 'small', x: smallX, y: smallY, r: rSmall },
      { slot: 'ultimate', x: ultX, y: ultY, r: rUlt },
    ];
  }

  update(dt) {
    for (const k of SLOT_ORDER) {
      if (this._flash[k] > 0) this._flash[k] = Math.max(0, this._flash[k] - dt);
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {'small'|'ultimate'|null}
   */
  hitTest(x, y) {
    if (!this.visible) return null;
    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const b = this.buttons[i];
      const dx = x - b.x;
      const dy = y - b.y;
      const pad = 8;
      if (dx * dx + dy * dy <= (b.r + pad) * (b.r + pad)) return b.slot;
    }
    return null;
  }

  /** 释放成功时的按钮闪一下 */
  flash(slot) {
    if (slot) this._flash[slot] = 0.18;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {{ small: object|null, ultimate: object|null }} uiState from SkillManager.getUiState()
   */
  render(ctx, uiState) {
    if (!this.visible || !uiState) return;
    for (const b of this.buttons) {
      this._drawButton(ctx, b, uiState[b.slot]);
    }
  }

  _drawButton(ctx, b, state) {
    const ready = !!(state && state.ready);
    const running = !!(state && state.running);
    const flash = this._flash[b.slot] > 0;
    const isUlt = b.slot === 'ultimate';

    // 外圈底
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,10,16,0.72)';
    ctx.fill();

    // 主体
    const base = ready
      ? (isUlt ? 'rgba(90,28,22,0.92)' : 'rgba(22,36,28,0.92)')
      : 'rgba(18,20,28,0.88)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = flash ? 'rgba(255,210,74,0.35)' : base;
    ctx.fill();

    // 边框：就绪高亮 / 冷却暗色 / 释放中强调
    let stroke = '#3a4254';
    let lineW = 2;
    if (running) {
      stroke = '#ffd24a';
      lineW = 3;
    } else if (ready) {
      stroke = isUlt ? '#e85a3a' : '#5ecf7a';
      lineW = 3;
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineW;
    ctx.stroke();

    // Icon
    const iconKey = state ? (state.icon || state.id) : null;
    const iconImg = iconKey ? Assets.skillIcon(iconKey) : null;
    const iconSize = b.r * 1.35;
    if (iconImg) {
      ctx.save();
      if (!ready && !running) ctx.globalAlpha = 0.45;
      drawIcon(ctx, iconImg, b.x, b.y - 2, iconSize);
      ctx.restore();
    } else {
      const glyph = (iconKey && SKILL_ICONS[iconKey])
        || (state && state.name ? state.name[0] : '?');
      ctx.fillStyle = ready ? '#e6edf3' : '#6a7385';
      ctx.font = `bold ${Math.round(b.r * 0.7)}px "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(glyph, b.x, b.y - 1);
    }

    // CD 扇形遮罩 + 数字
    if (state && !ready && state.cooldown > 0) {
      const ratio = Math.max(0, Math.min(1, state.cooldownRatio));
      if (ratio > 0) {
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.arc(b.x, b.y, b.r - 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fill();
      }
      const sec = Math.ceil(state.cooldownLeft);
      if (sec > 0) {
        ctx.fillStyle = '#e6edf3';
        ctx.font = `bold ${Math.round(b.r * 0.55)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(sec), b.x, b.y + 1);
      }
    }

    // 就绪时中心微亮点（非发光特效，仅状态标识）
    if (ready && !running) {
      ctx.beginPath();
      ctx.arc(b.x, b.y + b.r * 0.55, 3, 0, Math.PI * 2);
      ctx.fillStyle = isUlt ? '#ff8a5a' : '#7dff9a';
      ctx.fill();
    }

    // 槽位短标签
    if (state && state.name) {
      const label = isUlt ? '大招' : '技能';
      const tw = Math.max(36, label.length * 12 + 10);
      const lx = b.x - tw / 2;
      const ly = b.y + b.r + 6;
      ctx.fillStyle = 'rgba(10,12,18,0.65)';
      roundRect(ctx, lx, ly, tw, 16, 4);
      ctx.fill();
      ctx.fillStyle = ready ? '#e6edf3' : '#8b9cb3';
      ctx.font = 'bold 10px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, b.x, ly + 8);
    }
  }
}

export default SkillButtons;
