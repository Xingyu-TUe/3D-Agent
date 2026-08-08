/**
 * EffectManager.js
 * 技能/战斗特效统一管理（对象池）。
 * 在 EffectSystem 能力之上扩展：持续区域、粒子团、陨石坠落等。
 * 主动技能应通过本管理器生成表现，避免业务侧大量 new。
 */

import ObjectPool from '../Utils/ObjectPool.js';
import DamageText from './DamageText.js';
import GameConfig from '../Config/GameConfig.js';
import { TWO_PI } from '../Utils/MathUtils.js';

class Effect {
  constructor() {
    this.active = false;
    this.__pooled = true;
    this.type = '';
    this.x = 0;
    this.y = 0;
    this.x2 = 0;
    this.y2 = 0;
    this.radius = 0;
    this.angle = 0;
    this.arc = 0;
    this.life = 0;
    this.maxLife = 0;
    this.color = '#fff';
    this.chain = null;
    this.vx = 0;
    this.vy = 0;
    this.size = 0;
  }

  reset() {
    this.active = false;
    this.chain = null;
    this.vx = 0;
    this.vy = 0;
    this.size = 0;
  }

  update(dt) {
    if (this.vx || this.vy) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
    this.life -= dt;
    if (this.life <= 0) this.active = false;
    return this.active;
  }
}

export class EffectManager {
  constructor() {
    const fxCap = GameConfig.performance.poolFx || 220;
    const textCap = GameConfig.performance.poolDamageText || 60;
    this.fxPool = new ObjectPool(() => new Effect(), (e) => e.reset(), fxCap);
    this.effects = [];
    this.textPool = new ObjectPool(() => new DamageText(), (t) => t.reset(), textCap);
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
    e.vx = cfg.vx || 0;
    e.vy = cfg.vy || 0;
    e.size = cfg.size || 0;
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

  /** 持续 AOE 地面区域（荆棘领域等） */
  zone(x, y, radius, color, life) {
    return this._spawn('zone', {
      x, y, radius,
      color: color || '#5aad3a',
      life: life || 3,
    });
  }

  /** 对象池粒子团（无额外 new） */
  particles(x, y, color, count = 8, speed = 120) {
    const n = Math.min(24, count | 0);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TWO_PI;
      const sp = speed * (0.45 + Math.random() * 0.8);
      this._spawn('spark', {
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        radius: 3 + Math.random() * 4,
        color: color || '#ffd24a',
        life: 0.25 + Math.random() * 0.25,
      });
    }
  }

  /** 陨石坠落拖尾 + 冲击预备 */
  meteorFall(x, y, radius, color, life = 0.45) {
    this._spawn('meteor', {
      x, y, radius: radius || 80,
      color: color || '#ff6a2a',
      life,
    });
    this.particles(x, y - 40, color || '#ff8a3a', 10, 160);
  }

  damageText(x, y, value, crit) {
    if (!GameConfig.display.showCombatNumbers) return;
    const t = this.textPool.acquire();
    t.spawn(x, y, value, crit, 'damage');
    this.texts.push(t);
  }

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
        const last = this.effects.pop();
        if (last !== e) this.effects[i] = last;
      }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      if (!t.update(dt)) {
        this.textPool.release(t);
        const last = this.texts.pop();
        if (last !== t) this.texts[i] = last;
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
    const t = e.maxLife > 0 ? e.life / e.maxLife : 0;
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
        ctx.beginPath();
        for (let i = 0; i < e.chain.length; i++) {
          const p = e.chain[i];
          const px = camera.worldToScreenX(p.x);
          const py = camera.worldToScreenY(p.y);
          if (i === 0) ctx.moveTo(px, py);
          else {
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
      case 'spark': {
        ctx.save();
        ctx.globalAlpha = t * 0.9;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1, e.radius * t), 0, Math.PI * 2);
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
        ctx.arc(sx, sy, e.radius * (1 - t * 0.15), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'zone': {
        const pulse = 0.82 + 0.18 * Math.sin((1 - t) * 14);
        const r = e.radius * pulse;
        ctx.save();
        const grad = ctx.createRadialGradient(sx, sy, r * 0.15, sx, sy, r);
        grad.addColorStop(0, 'rgba(120,200,70,0.28)');
        grad.addColorStop(0.65, 'rgba(70,140,40,0.18)');
        grad.addColorStop(1, 'rgba(30,60,15,0)');
        ctx.globalAlpha = 0.55 + 0.35 * t;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.35 + 0.4 * t;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'meteor': {
        ctx.save();
        // 坠落拖尾（从上往下落点）
        const fall = 1 - t;
        const trailY = sy - (1 - fall) * 180;
        const grad = ctx.createLinearGradient(sx, trailY, sx, sy);
        grad.addColorStop(0, 'rgba(255,200,80,0)');
        grad.addColorStop(0.6, `rgba(255,120,40,${0.55 * t})`);
        grad.addColorStop(1, `rgba(255,60,20,${0.85 * t})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 10 * t + 2;
        ctx.beginPath();
        ctx.moveTo(sx + 30, trailY);
        ctx.lineTo(sx, sy);
        ctx.stroke();
        const r = e.radius * (0.35 + fall * 0.75);
        const g2 = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        g2.addColorStop(0, `rgba(255,230,160,${t})`);
        g2.addColorStop(0.5, `rgba(255,100,30,${0.7 * t})`);
        g2.addColorStop(1, 'rgba(80,10,0,0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
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

  /** 池占用（调试/测试） */
  get stats() {
    return {
      fxActive: this.effects.length,
      textActive: this.texts.length,
      fxFree: this.fxPool.freeCount,
    };
  }
}

export default EffectManager;
