/**
 * ExpOrb.js
 * 经验球实体（对象池管理）。怪物死亡掉落，玩家靠近自动吸附。
 */

export class ExpOrb {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.value = 1;
    this.radius = 7;
    this.active = false;
    this.__pooled = true;
    // 吸附动画
    this.magnet = false;
    this.vx = 0;
    this.vy = 0;
    this.phase = Math.random() * 6.28;
  }

  spawn(x, y, value) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.active = true;
    this.magnet = false;
    this.vx = 0;
    this.vy = 0;
    // 稍微散开的掉落
    const a = Math.random() * Math.PI * 2;
    const s = 40 + Math.random() * 60;
    this.vx = Math.cos(a) * s;
    this.vy = Math.sin(a) * s;
    this.scatter = 0.3;
    this.radius = value >= 50 ? 12 : (value >= 10 ? 9 : 7);
    return this;
  }

  reset() {
    this.active = false;
    this.magnet = false;
  }

  render(ctx, camera, time) {
    const sx = camera.worldToScreenX(this.x);
    const sy = camera.worldToScreenY(this.y);
    const pulse = 0.7 + 0.3 * Math.sin(time * 4 + this.phase);
    const r = this.radius * pulse;
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2);
    grad.addColorStop(0, 'rgba(120,230,120,0.95)');
    grad.addColorStop(0.5, 'rgba(60,180,80,0.6)');
    grad.addColorStop(1, 'rgba(20,80,30,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d6ffd0';
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default ExpOrb;
