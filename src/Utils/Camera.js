/**
 * Camera.js
 * 2D 摄像机：始终平滑跟随玩家，提供世界坐标 <-> 屏幕坐标转换。
 * 世界是无限的，摄像机没有边界限制。
 */

import { lerp } from './MathUtils.js';
import GameConfig from '../Config/GameConfig.js';

export class Camera {
  constructor(viewWidth, viewHeight) {
    this.x = 0; // 摄像机中心（世界坐标）
    this.y = 0;
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.lerp = GameConfig.camera.lerp;
    this.shakeTime = 0;
    this.shakeMag = 0;
    this._shakeX = 0;
    this._shakeY = 0;
  }

  resize(w, h) {
    this.viewWidth = w;
    this.viewHeight = h;
  }

  snapTo(x, y) {
    this.x = x;
    this.y = y;
  }

  follow(targetX, targetY, dt) {
    const t = 1 - Math.pow(1 - this.lerp, dt * 60);
    this.x = lerp(this.x, targetX, t);
    this.y = lerp(this.y, targetY, t);

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const mag = this.shakeMag * (this.shakeTime > 0 ? 1 : 0);
      this._shakeX = (Math.random() * 2 - 1) * mag;
      this._shakeY = (Math.random() * 2 - 1) * mag;
    } else {
      this._shakeX = 0;
      this._shakeY = 0;
    }
  }

  shake(magnitude, duration) {
    // 取较强的一次
    if (magnitude > this.shakeMag || this.shakeTime <= 0) {
      this.shakeMag = magnitude;
    }
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  /** 世界坐标 -> 屏幕坐标 */
  worldToScreenX(wx) {
    return wx - this.x + this.viewWidth / 2 + this._shakeX;
  }

  worldToScreenY(wy) {
    return wy - this.y + this.viewHeight / 2 + this._shakeY;
  }

  /** 屏幕坐标 -> 世界坐标 */
  screenToWorldX(sx) {
    return sx + this.x - this.viewWidth / 2;
  }

  screenToWorldY(sy) {
    return sy + this.y - this.viewHeight / 2;
  }

  /** 可视区域（世界坐标），带 margin 用于剔除 */
  getViewBounds(margin = 0) {
    return {
      left: this.x - this.viewWidth / 2 - margin,
      top: this.y - this.viewHeight / 2 - margin,
      right: this.x + this.viewWidth / 2 + margin,
      bottom: this.y + this.viewHeight / 2 + margin,
    };
  }

  /** 判断某点（带半径）是否在可视范围内 */
  isVisible(wx, wy, r = 0) {
    const hw = this.viewWidth / 2 + r;
    const hh = this.viewHeight / 2 + r;
    return Math.abs(wx - this.x) <= hw && Math.abs(wy - this.y) <= hh;
  }
}

export default Camera;
