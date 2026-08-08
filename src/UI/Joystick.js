/**
 * Joystick.js
 * 左手虚拟摇杆。支持浮动摇杆（触点即摇杆中心）与固定摇杆两种模式。
 * 输出归一化方向向量 (dx, dy) 与强度 mag(0~1)。
 *
 * 摇杆只响应屏幕左半区的触摸，避免与右侧 UI（暂停等）冲突。
 */

import GameConfig from '../Config/GameConfig.js';
import { clamp } from '../Utils/MathUtils.js';

export class Joystick {
  constructor() {
    this.active = false;
    this.touchId = null;
    this.baseX = 0;
    this.baseY = 0;
    this.knobX = 0;
    this.knobY = 0;
    this.dx = 0;
    this.dy = 0;
    this.mag = 0;
    this.radius = GameConfig.ui.joystickRadius;
    this.knobRadius = GameConfig.ui.joystickKnobRadius;
    this.floating = GameConfig.ui.floatingJoystick;
    // 固定摇杆默认位置（屏幕坐标），resize 时更新
    this.homeX = 0;
    this.homeY = 0;
    this.screenW = 0;
    this.screenH = 0;
  }

  resize(w, h) {
    this.screenW = w;
    this.screenH = h;
    this.homeX = 140;
    this.homeY = h - 160;
    if (!this.active && !this.floating) {
      this.baseX = this.homeX;
      this.baseY = this.homeY;
      this.knobX = this.homeX;
      this.knobY = this.homeY;
    }
  }

  /** 是否属于摇杆的触摸区域（左半屏） */
  _inZone(x) {
    return x < this.screenW * 0.55;
  }

  onTouchStart(id, x, y) {
    if (this.active) return false;
    if (!this._inZone(x)) return false;
    this.active = true;
    this.touchId = id;
    if (this.floating) {
      this.baseX = x;
      this.baseY = y;
    } else {
      this.baseX = this.homeX;
      this.baseY = this.homeY;
    }
    this.knobX = this.baseX;
    this.knobY = this.baseY;
    this._update(x, y);
    return true;
  }

  onTouchMove(id, x, y) {
    if (!this.active || id !== this.touchId) return;
    this._update(x, y);
  }

  onTouchEnd(id) {
    if (!this.active || id !== this.touchId) return;
    this.reset();
  }

  reset() {
    this.active = false;
    this.touchId = null;
    this.dx = 0;
    this.dy = 0;
    this.mag = 0;
    if (!this.floating) {
      this.knobX = this.homeX;
      this.knobY = this.homeY;
    }
  }

  _update(x, y) {
    let dx = x - this.baseX;
    let dy = y - this.baseY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0.0001) {
      const clampedLen = Math.min(len, this.radius);
      const nx = dx / len;
      const ny = dy / len;
      this.knobX = this.baseX + nx * clampedLen;
      this.knobY = this.baseY + ny * clampedLen;
      this.dx = nx;
      this.dy = ny;
      this.mag = clamp(clampedLen / this.radius, 0, 1);
    } else {
      this.knobX = this.baseX;
      this.knobY = this.baseY;
      this.dx = 0;
      this.dy = 0;
      this.mag = 0;
    }
  }

  render(ctx) {
    if (!this.active && this.floating) return;
    ctx.save();
    ctx.globalAlpha = this.active ? 0.55 : 0.28;
    // 底座
    ctx.beginPath();
    ctx.arc(this.baseX, this.baseY, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20,22,30,0.55)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(179,18,31,0.7)';
    ctx.stroke();
    // 摇杆帽
    ctx.beginPath();
    ctx.arc(this.knobX, this.knobY, this.knobRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(179,18,31,0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,180,150,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

export default Joystick;
