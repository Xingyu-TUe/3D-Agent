/**
 * Bullet.js
 * 投射物实体（对象池）。用于火球、飞剑等 projectile 类技能。
 * 支持穿透 pierce、命中爆炸 explode。
 */

export class Bullet {
  constructor() {
    this.active = false;
    this.__pooled = true;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 8;
    this.damage = 0;
    this.life = 0;
    this.pierce = 0;
    this.explode = false;
    this.explodeRadius = 0;
    this.color = '#fff';
    this.canCrit = true;
    this.angle = 0;
    this.skillId = '';
    this.hitSet = null; // 已命中怪物集合（穿透去重）
    this.trail = 0;
  }

  spawn(cfg) {
    this.x = cfg.x;
    this.y = cfg.y;
    this.vx = cfg.vx;
    this.vy = cfg.vy;
    this.radius = cfg.radius;
    this.damage = cfg.damage;
    this.life = cfg.life;
    this.pierce = cfg.pierce || 0;
    this.explode = !!cfg.explode;
    this.explodeRadius = cfg.explodeRadius || 0;
    this.color = cfg.color || '#fff';
    this.canCrit = cfg.canCrit !== false;
    this.angle = Math.atan2(cfg.vy, cfg.vx);
    this.skillId = cfg.skillId || '';
    this.hitSet = new Set();
    this.active = true;
    this.trail = 0;
    return this;
  }

  reset() {
    this.active = false;
    this.hitSet = null;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.trail += dt;
    if (this.life <= 0) this.active = false;
    return this.active;
  }

  render(ctx, camera) {
    const sx = camera.worldToScreenX(this.x);
    const sy = camera.worldToScreenY(this.y);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.angle);

    if (this.explode) {
      // 火球：发光球 + 拖尾
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 1.6);
      grad.addColorStop(0, '#fff0c0');
      grad.addColorStop(0.4, this.color);
      grad.addColorStop(1, 'rgba(120,20,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 飞剑：细长发光刃
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(this.radius * 2, 0);
      ctx.lineTo(-this.radius, -this.radius * 0.6);
      ctx.lineTo(-this.radius, this.radius * 0.6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

export default Bullet;
