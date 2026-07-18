/**
 * DamageText.js
 * 伤害飘字（对象池）。暴击用不同颜色/尺寸。
 */

export class DamageText {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.text = '';
    this.life = 0;
    this.maxLife = 0.7;
    this.crit = false;
    this.active = false;
    this.__pooled = true;
    this.vy = -60;
    this.color = '#ffffff';
  }

  spawn(x, y, value, crit) {
    this.x = x + (Math.random() * 20 - 10);
    this.y = y;
    this.text = value >= 1 ? String(Math.round(value)) : value.toFixed(1);
    this.crit = crit;
    this.life = this.maxLife = crit ? 0.9 : 0.7;
    this.vy = crit ? -90 : -60;
    this.color = crit ? '#ffd24a' : '#ffffff';
    this.active = true;
    return this;
  }

  reset() {
    this.active = false;
  }

  update(dt) {
    this.life -= dt;
    this.y += this.vy * dt;
    this.vy *= 0.92;
    if (this.life <= 0) this.active = false;
    return this.active;
  }

  render(ctx, camera) {
    const sx = camera.worldToScreenX(this.x);
    const sy = camera.worldToScreenY(this.y);
    const t = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.6);
    ctx.font = this.crit ? 'bold 26px sans-serif' : 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(this.text, sx, sy);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, sx, sy);
    if (this.crit) {
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#ff9a3c';
      ctx.fillText('暴击!', sx, sy - 20);
    }
    ctx.restore();
  }
}

export default DamageText;
