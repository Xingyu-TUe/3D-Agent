/**
 * EffectSystem.js
 * 瞬时视觉特效与伤害飘字的统一管理（对象池）。
 * 特效类型：slash(挥砍)、explosion(爆炸)、lightning(闪电弧)、
 *          ring(光环脉冲)、puff(死亡烟)、telegraph(Boss 预警圈)。
 *
 * 特效只是渲染，不参与伤害计算（伤害由各系统负责）。
 */

import ObjectPool from '../Utils/ObjectPool.js';
import DamageText from './DamageText.js';
import GameConfig from '../Config/GameConfig.js';

class Effect {
  constructor() {
    this.active = false;
    this.__pooled = true;
    this.type = '';
    this.x = 0; this.y = 0;
    this.x2 = 0; this.y2 = 0;
    this.radius = 0;
    this.angle = 0;
    this.arc = 0;
    this.life = 0;
    this.maxLife = 0;
    this.color = '#fff';
    this.chain = null; // 闪电链点集
  }
  reset() { this.active = false; this.chain = null; }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) this.active = false;
    return this.active;
  }
}

export class EffectSystem {
  constructor() {
    this.fxPool = new ObjectPool(() => new Effect(), (e) => e.reset(), 60);
    this.effects = [];
    this.textPool = new ObjectPool(() => new DamageText(), (t) => t.reset(), GameConfig.performance.poolDamageText);
    this.texts = [];
  }

  _spawn(type, cfg) {
    const e = this.fxPool.acquire();
    e.type = type;
    e.x = cfg.x || 0;
    e.y = cfg.y || 0;
    e.x2 = cfg.x2 || 0;
    e.y2 = cfg.y2 || 0;
    e.radius = cfg.radius || 0;
    e.angle = cfg.angle || 0;
    e.arc = cfg.arc || 0;
    e.color = cfg.color || '#fff';
    e.life = e.maxLife = cfg.life || 0.3;
    e.chain = cfg.chain || null;
    e.active = true;
    this.effects.push(e);
    return e;
  }

  slash(x, y, angle, range, arc, color) {
    this._spawn('slash', { x, y, angle, radius: range, arc, color: color || '#e8e8f0', life: 0.22 });
  }

  explosion(x, y, radius, color) {
    this._spawn('explosion', { x, y, radius, color: color || '#ff8a1e', life: 0.35 });
  }

  ring(x, y, radius, color) {
    this._spawn('ring', { x, y, radius, color: color || '#8fdcff', life: 0.3 });
  }

  lightning(points, color) {
    this._spawn('lightning', { chain: points, color: color || '#7cc4ff', life: 0.18 });
  }

  puff(x, y, color) {
    this._spawn('puff', { x, y, radius: 14, color: color || '#555', life: 0.3 });
  }

  telegraph(x, y, radius, color, life) {
    return this._spawn('telegraph', { x, y, radius, color: color || '#ff3b3b', life: life || 1 });
  }

  damageText(x, y, value, crit) {
    if (!GameConfig.display.showCombatNumbers) return;
    const t = this.textPool.acquire();
    t.spawn(x, y, value, crit, 'damage');
    this.texts.push(t);
  }

  /** 拾取经验飘字（受同一显示开关控制） */
  expText(x, y, value) {
    if (!GameConfig.display.showCombatNumbers) return;
    const t = this.textPool.acquire();
    t.spawn(x, y, value, false, 'exp');
    this.texts.push(t);
  }

  update(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      if (!e.update(dt)) {
        this.fxPool.release(e);
        this.effects.splice(i, 1);
      }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      if (!t.update(dt)) {
        this.textPool.release(t);
        this.texts.splice(i, 1);
      }
    }
  }

  render(ctx, camera) {
    for (let i = 0; i < this.effects.length; i++) {
      this._renderEffect(ctx, camera, this.effects[i]);
    }
  }

  renderTexts(ctx, camera) {
    for (let i = 0; i < this.texts.length; i++) {
      this.texts[i].render(ctx, camera);
    }
  }

  _renderEffect(ctx, camera, e) {
    const t = e.life / e.maxLife; // 1 -> 0
    const sx = camera.worldToScreenX(e.x);
    const sy = camera.worldToScreenY(e.y);

    switch (e.type) {
      case 'slash': {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(e.angle);
        ctx.globalAlpha = t;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 6 * t + 2;
        ctx.beginPath();
        const a0 = -e.arc / 2;
        const a1 = e.arc / 2;
        // 挥砍扫过：随生命推进角度
        const sweep = a0 + (a1 - a0) * (1 - t);
        ctx.arc(0, 0, e.radius, sweep - 0.4, sweep + 0.4);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'explosion': {
        const r = e.radius * (1.1 - t * 0.4);
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        grad.addColorStop(0, `rgba(255,240,180,${t})`);
        grad.addColorStop(0.5, `rgba(255,120,30,${t * 0.8})`);
        grad.addColorStop(1, 'rgba(120,20,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'ring': {
        ctx.save();
        ctx.globalAlpha = t;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 4 * t + 1;
        ctx.beginPath();
        ctx.arc(sx, sy, e.radius * (1.2 - t * 0.2), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'lightning': {
        if (!e.chain) break;
        ctx.save();
        ctx.globalAlpha = Math.min(1, t * 2);
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let i = 0; i < e.chain.length; i++) {
          const p = e.chain[i];
          const px = camera.worldToScreenX(p.x);
          const py = camera.worldToScreenY(p.y);
          if (i === 0) ctx.moveTo(px, py);
          else {
            // 折线加抖动
            const prev = e.chain[i - 1];
            const mx = camera.worldToScreenX((prev.x + p.x) / 2) + (Math.random() * 12 - 6);
            const my = camera.worldToScreenY((prev.y + p.y) / 2) + (Math.random() * 12 - 6);
            ctx.lineTo(mx, my);
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'puff': {
        ctx.save();
        ctx.globalAlpha = t * 0.6;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(sx, sy, e.radius * (1.5 - t), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'telegraph': {
        ctx.save();
        ctx.globalAlpha = 0.25 + (1 - t) * 0.4;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(sx, sy, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx, sy, e.radius * (1 - t), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        break;
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    for (let i = 0; i < this.effects.length; i++) this.fxPool.release(this.effects[i]);
    for (let i = 0; i < this.texts.length; i++) this.textPool.release(this.texts[i]);
    this.effects.length = 0;
    this.texts.length = 0;
  }
}

export default EffectSystem;
