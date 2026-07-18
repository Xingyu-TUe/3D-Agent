/**
 * EnemyRenderer.js
 * 怪物程序化绘制（无需美术素材，全部用 Canvas 图元）。
 * 按 shape 分派：skeleton / ghoul / hound / mage / knight / boss。
 * 支持受击白闪、精英金边、减速蓝晕。
 */

export function drawEnemy(ctx, e, camera, time) {
  const sx = camera.worldToScreenX(e.x);
  const sy = camera.worldToScreenY(e.y);
  const r = e.radius;
  const wob = Math.sin(time * 6 + e.phase) * (r * 0.06);

  ctx.save();
  ctx.translate(sx, sy);

  // 阴影
  ctx.beginPath();
  ctx.ellipse(0, r * 0.85, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();

  // 减速蓝晕
  if (e.slowT > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(120,200,255,0.18)';
    ctx.fill();
  }

  const flash = e.hitFlash > 0;
  const body = flash ? '#ffffff' : e.color;

  switch (e.shape) {
    case 'skeleton': drawSkeleton(ctx, r, body, wob); break;
    case 'ghoul': drawGhoul(ctx, r, body, wob); break;
    case 'hound': drawHound(ctx, r, body, wob); break;
    case 'mage': drawMage(ctx, r, body, time, e.phase); break;
    case 'knight': drawKnight(ctx, r, body); break;
    case 'boss': drawBoss(ctx, r, body, time, e); break;
    default: drawSkeleton(ctx, r, body, wob);
  }

  // 精英金边
  if (e.isElite && e.eliteTint) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2);
    ctx.strokeStyle = e.eliteTint;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.restore();

  // 精英 / Boss 头顶小血条（Boss 在 UI 单独画大血条）
  if (e.isElite && !e.isBoss) {
    drawMiniHpBar(ctx, sx, sy - r - 10, r * 2, e.hp / e.maxHp);
  }
}

function drawMiniHpBar(ctx, x, y, w, pct) {
  const h = 4;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - w / 2, y, w, h);
  ctx.fillStyle = '#ff4a4a';
  ctx.fillRect(x - w / 2, y, w * Math.max(0, pct), h);
}

function drawSkeleton(ctx, r, color, wob) {
  // 头
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -r * 0.3 + wob, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  // 眼窝
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-r * 0.2, -r * 0.35 + wob, r * 0.12, 0, Math.PI * 2);
  ctx.arc(r * 0.2, -r * 0.35 + wob, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  // 肋骨身体
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.18;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.1);
  ctx.lineTo(0, r * 0.7);
  ctx.stroke();
  ctx.lineWidth = r * 0.1;
  for (let i = 0; i < 3; i++) {
    const yy = r * 0.2 + i * r * 0.18;
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, yy);
    ctx.lineTo(r * 0.35, yy);
    ctx.stroke();
  }
}

function drawGhoul(ctx, r, color, wob) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, wob, r * 0.8, r * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  // 驼背轮廓
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(r * 0.2, -r * 0.3 + wob, r * 0.35, r * 0.4, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // 红眼
  ctx.fillStyle = '#ffdd33';
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.15 + wob, r * 0.12, 0, Math.PI * 2);
  ctx.arc(r * 0.15, -r * 0.15 + wob, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  // 利爪嘴
  ctx.strokeStyle = '#3a1a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, r * 0.35 + wob);
  ctx.lineTo(r * 0.3, r * 0.35 + wob);
  ctx.stroke();
}

function drawHound(ctx, r, color, wob) {
  // 四足冲刺兽形，横向体
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, wob, r * 0.95, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // 头
  ctx.beginPath();
  ctx.arc(r * 0.7, -r * 0.1 + wob, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
  // 火眼
  ctx.fillStyle = '#ffcf33';
  ctx.beginPath();
  ctx.arc(r * 0.85, -r * 0.2 + wob, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  // 背火
  ctx.fillStyle = 'rgba(255,120,30,0.8)';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * r * 0.35, -r * 0.5 + wob);
    ctx.lineTo(i * r * 0.35 - r * 0.12, -r * 0.9 + wob);
    ctx.lineTo(i * r * 0.35 + r * 0.12, -r * 0.5 + wob);
    ctx.closePath();
    ctx.fill();
  }
}

function drawMage(ctx, r, color, time, phase) {
  // 漂浮长袍法师
  const float = Math.sin(time * 3 + phase) * r * 0.12;
  // 袍
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.6 + float);
  ctx.lineTo(-r * 0.7, r * 0.8 + float);
  ctx.lineTo(r * 0.7, r * 0.8 + float);
  ctx.closePath();
  ctx.fill();
  // 兜帽
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.arc(0, -r * 0.4 + float, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  // 法球
  const gx = r * 0.6;
  const gy = r * 0.2 + float;
  const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 0.35);
  grad.addColorStop(0, '#e0b3ff');
  grad.addColorStop(1, 'rgba(138,79,208,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(gx, gy, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawKnight(ctx, r, color) {
  // 重甲堕落骑士
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.5);
  ctx.lineTo(r * 0.7, -r * 0.5);
  ctx.lineTo(r * 0.6, r * 0.8);
  ctx.lineTo(-r * 0.6, r * 0.8);
  ctx.closePath();
  ctx.fill();
  // 头盔
  ctx.fillStyle = '#2c3444';
  ctx.beginPath();
  ctx.arc(0, -r * 0.55, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
  // 眼缝
  ctx.fillStyle = '#ff3b3b';
  ctx.fillRect(-r * 0.25, -r * 0.6, r * 0.5, r * 0.1);
  // 破损肩甲
  ctx.strokeStyle = '#1a1f28';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.3);
  ctx.lineTo(r * 0.7, -r * 0.3);
  ctx.stroke();
  // 大剑
  ctx.strokeStyle = '#c7ccd8';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(r * 0.7, r * 0.6);
  ctx.lineTo(r * 1.3, -r * 0.6);
  ctx.stroke();
}

function drawBoss(ctx, r, color, time, e) {
  // 裂隙领主：巨型恶魔，双角，胸口裂隙发光
  const pulse = 0.6 + 0.4 * Math.sin(time * 3);

  // 外层裂隙光环
  const halo = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.5);
  halo.addColorStop(0, 'rgba(179,18,31,0.5)');
  halo.addColorStop(1, 'rgba(179,18,31,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // 身体
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a0808';
  ctx.lineWidth = 4;
  ctx.stroke();

  // 双角
  ctx.fillStyle = '#1a1010';
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.6);
  ctx.lineTo(-r * 0.9, -r * 1.3);
  ctx.lineTo(-r * 0.3, -r * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 0.5, -r * 0.6);
  ctx.lineTo(r * 0.9, -r * 1.3);
  ctx.lineTo(r * 0.3, -r * 0.8);
  ctx.closePath();
  ctx.fill();

  // 胸口裂隙
  ctx.save();
  ctx.globalAlpha = pulse;
  const crack = ctx.createLinearGradient(0, -r * 0.4, 0, r * 0.5);
  crack.addColorStop(0, '#ffcf5c');
  crack.addColorStop(0.5, '#ff5a1e');
  crack.addColorStop(1, '#7a0808');
  ctx.fillStyle = crack;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.4);
  ctx.lineTo(r * 0.18, -r * 0.1);
  ctx.lineTo(r * 0.05, r * 0.5);
  ctx.lineTo(-r * 0.18, r * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 双眼
  ctx.fillStyle = '#ffe14a';
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.25, r * 0.12, 0, Math.PI * 2);
  ctx.arc(r * 0.3, -r * 0.25, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

export default drawEnemy;
