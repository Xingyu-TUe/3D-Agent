/**
 * Player.js
 * 玩家实体。职业数据来自 Config/Character（德鲁伊 / 猎人 / 法师）。
 */

import Stats from './Stats.js';
import { getCharacter, getDefaultCharacterId } from '../Config/Character.js';
import GameConfig from '../Config/GameConfig.js';
import { clamp } from '../Utils/MathUtils.js';

export class Player {
  constructor(classId) {
    const id = classId || GameConfig.player.startClass || getDefaultCharacterId();
    const cls = getCharacter(id);
    this.classId = id;
    this.classData = cls;
    this.stats = new Stats(cls.base);

    this.x = GameConfig.player.spawnX;
    this.y = GameConfig.player.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.facing = -Math.PI / 2;
    this.moving = false;

    this.hp = this.stats.final.maxHp;
    this.level = 1;
    this.exp = 0;
    this.expToNext = 0;

    this.invincible = 0;
    this.alive = true;
    this.hurtFlash = 0;
    this.bob = 0;
    this.equipment = {};
    this.kills = 0;
    this._passiveIds = new Set();
  }

  get maxHp() {
    return this.stats.final.maxHp;
  }

  update(dt, joystick) {
    if (joystick.active && joystick.mag > 0.05) {
      const speed = this.stats.final.moveSpeed * joystick.mag;
      this.vx = joystick.dx * speed;
      this.vy = joystick.dy * speed;
      this.facing = Math.atan2(joystick.dy, joystick.dx);
      this.moving = true;
    } else {
      this.vx = 0;
      this.vy = 0;
      this.moving = false;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.moving) this.bob += dt * 10;

    const regen = this.stats.final.regen;
    if (regen > 0 && this.alive) {
      this.hp = Math.min(this.maxHp, this.hp + regen * dt);
    }
    if (this.invincible > 0) this.invincible -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
  }

  takeDamage(amount) {
    if (!this.alive) return false;
    if (this.invincible > 0) return false;
    if (GameConfig.debug.godMode) return false;
    this.hp -= amount;
    this.invincible = GameConfig.player.invincibleTime;
    this.hurtFlash = 0.25;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
    return true;
  }

  onDealDamage(damageDealt) {
    const ls = this.stats.final.lifesteal;
    if (ls > 0 && this.alive) {
      this.hp = Math.min(this.maxHp, this.hp + damageDealt * ls);
    }
  }

  addExp(amount) {
    this.exp += amount;
  }

  applyPassive(passive) {
    this.stats.addStat(passive.stat, passive.add);
    if (passive.stat === 'maxHpAdd') {
      this.hp = Math.min(this.maxHp, this.hp + passive.add);
    }
  }

  equip(item) {
    if (!item || !item.slot) return;
    const prev = this.equipment[item.slot];
    if (prev) this._removeItemStats(prev);
    this.equipment[item.slot] = item;
    this._applyItemStats(item);
    this.hp = clamp(this.hp, 0, this.maxHp);
  }

  _applyItemStats(item) {
    if (!item.affixes) return;
    for (const a of item.affixes) this.stats.addStat(a.stat, a.value);
  }

  _removeItemStats(item) {
    if (!item.affixes) return;
    for (const a of item.affixes) this.stats.addStat(a.stat, -a.value);
  }

  render(ctx, camera) {
    const sx = camera.worldToScreenX(this.x);
    const sy = camera.worldToScreenY(this.y);
    const r = this.stats.final.radius;
    const bobY = this.moving ? Math.sin(this.bob) * 2 : 0;
    const flashing = this.hurtFlash > 0 && ((this.hurtFlash * 20) | 0) % 2 === 0;
    const color = flashing ? '#ffffff' : this.classData.color;

    ctx.save();
    ctx.translate(sx, sy + bobY);

    ctx.beginPath();
    ctx.ellipse(0, r * 0.9, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    ctx.rotate(this.facing + Math.PI / 2);

    const model = this.classData.model || this.classId;
    if (model === 'druid') {
      ctx.fillStyle = flashing ? '#fff' : (this.classData.accent || '#2f6b28');
      ctx.beginPath();
      ctx.moveTo(0, r * 0.5);
      ctx.lineTo(-r * 0.85, r * 1.15);
      ctx.lineTo(r * 0.85, r * 1.15);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#2a3a18';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, -r * 0.55);
      ctx.lineTo(-r * 0.45, -r * 1.05);
      ctx.moveTo(r * 0.25, -r * 0.55);
      ctx.lineTo(r * 0.45, -r * 1.05);
      ctx.stroke();
    } else if (model === 'hunter') {
      ctx.fillStyle = flashing ? '#fff' : (this.classData.accent || '#1e4a78');
      ctx.beginPath();
      ctx.moveTo(0, r * 0.5);
      ctx.lineTo(-r * 0.75, r * 1.1);
      ctx.lineTo(r * 0.75, r * 1.1);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#dfefff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(r * 0.55, 0, r * 0.9, -1.0, 1.0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r * 0.55, -r * 0.85);
      ctx.lineTo(r * 0.55, r * 0.85);
      ctx.stroke();
    } else {
      // mage
      ctx.fillStyle = flashing ? '#fff' : (this.classData.accent || '#5a2088');
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.9);
      ctx.lineTo(-r * 0.8, r * 1.1);
      ctx.lineTo(r * 0.8, r * 1.1);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -r * 0.15, r * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#e0b3ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(r * 0.7, r * 0.8);
      ctx.lineTo(r * 0.85, -r * 1.2);
      ctx.stroke();
      ctx.fillStyle = '#ffb04a';
      ctx.beginPath();
      ctx.arc(r * 0.85, -r * 1.35, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  reset(classId) {
    const id = classId || this.classId || getDefaultCharacterId();
    const cls = getCharacter(id);
    this.classId = id;
    this.classData = cls;
    this.stats = new Stats(cls.base);
    this.x = GameConfig.player.spawnX;
    this.y = GameConfig.player.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.facing = -Math.PI / 2;
    this.moving = false;
    this.hp = this.stats.final.maxHp;
    this.level = 1;
    this.exp = 0;
    this.invincible = 0;
    this.alive = true;
    this.hurtFlash = 0;
    this.bob = 0;
    this.equipment = {};
    this.kills = 0;
    this._passiveIds = new Set();
  }
}

export default Player;
