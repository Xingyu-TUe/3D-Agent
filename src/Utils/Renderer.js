/**
 * Renderer.js
 * 渲染基础层：负责 canvas 尺寸/高 DPI 适配、逻辑坐标缩放、清屏。
 *
 * 采用「设计分辨率 + 等比缩放」策略：
 *   - 物理像素 = CSS 像素 * devicePixelRatio
 *   - 逻辑绘制坐标使用屏幕 CSS 像素（viewWidth/viewHeight）
 *   - 通过 ctx.setTransform 统一缩放 DPI，业务代码只关心 CSS 像素坐标
 */

import Platform from './Platform.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 0;   // CSS 像素宽（逻辑绘制宽）
    this.height = 0;
    this.dpr = 1;
    this._onResize = [];
    this.resize();
  }

  onResize(cb) {
    this._onResize.push(cb);
  }

  resize() {
    const screen = Platform.getScreenSize();
    this.dpr = Math.min(screen.pixelRatio || 1, 3); // 限制最大 3 倍，兼顾性能
    this.width = screen.width;
    this.height = screen.height;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    // 浏览器下用 CSS 铺满
    if (!Platform.isWeChat && this.canvas.style) {
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
    }

    // 之后所有绘制都以 CSS 像素为单位
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;

    for (let i = 0; i < this._onResize.length; i++) {
      this._onResize[i](this.width, this.height);
    }
  }

  clear(color = '#0a0b10') {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.width, this.height);
  }
}

export default Renderer;
