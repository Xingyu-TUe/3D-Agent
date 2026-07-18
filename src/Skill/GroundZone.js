/**
 * GroundZone.js
 * 地面持续区域（毒云等 ground_aoe）。对象池管理，按 tickRate 周期性对范围内敌人造成伤害。
 */

export class GroundZone {
  constructor() {
    this.active = false;
    this.__pooled = true;
    this.x = 0;
    this.y = 0;
    this.radius = 0;
    this.damage = 0;
    this.duration = 0;
    this.tickRate = 0.5;
    this.tickTimer = 0;
    this.color = '#8ad04f';
    this.canCrit = false;
    this.phase = 0;
  }

  spawn(cfg) {
    this.x = cfg.x;
    this.y = cfg.y;
    this.radius = cfg.radius;
    this.damage = cfg.damage;
    this.duration = cfg.duration;
    this.tickRate = cfg.tickRate;
    this.tickTimer = 0;
    this.color = cfg.color || '#8ad04f';
    this.canCrit = !!cfg.canCrit;
    this.phase = Math.random() * 6.28;
    this.active = true;
    return this;
  }

  reset() {
    this.active = false;
  }

  render(ctx, camera, time) {
    const sx = camera.worldToScreenX(this.x);
    const sy = camera.worldToScreenY(this.y);
    const pulse = 0.85 + 0.15 * Math.sin(time * 3 + this.phase);
    const r = this.radius * pulse;
    const grad = ctx.createRadialGradient(sx, sy, r * 0.2, sx, sy, r);
    grad.addColorStop(0, 'rgba(140,210,80,0.35)');
    grad.addColorStop(0.7, 'rgba(90,160,50,0.22)');
    grad.addColorStop(1, 'rgba(40,80,20,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    // 毒泡
    ctx.fillStyle = 'rgba(160,230,90,0.4)';
    for (let i = 0; i < 3; i++) {
      const a = time * 1.5 + this.phase + i * 2.1;
      const bx = sx + Math.cos(a) * r * 0.5;
      const by = sy + Math.sin(a) * r * 0.4;
      ctx.beginPath();
      ctx.arc(bx, by, 4 + (i % 2) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export default GroundZone;
