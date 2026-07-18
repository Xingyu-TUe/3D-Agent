/**
 * Player.js
 * 玩家实体。优先使用 Assets 精灵表渲染（Idle/Walk/Attack/Death），
 * 贴图未就绪时回退程序化绘制。
 */

import Stats from './Stats.js';
import { getCharacter, getDefaultCharacterId } from '../Config/Character.js';
import GameConfig from '../Config/GameConfig.js';
import { clamp } from '../Utils/MathUtils.js';
import Assets from '../Utils/AssetLoader.js';
import { drawFrame } from '../Utils/SpriteUtil.js';

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

    // 动画
    this.anim = 'idle';
    this.animTime = 0;
    this.attackTimer = 0;
  }

  get maxHp() {
    return this.stats.final.maxHp;
  }

  /** 技能命中时触发攻击动画 */
  triggerAttack() {
    if (!this.alive) return;
    this.attackTimer = 0.32;
    this.anim = 'attack';
    this.animTime = 0;
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

    // 动画状态机
    if (!this.alive) {
      if (this.anim !== 'death') {
        this.anim = 'death';
        this.animTime = 0;
      }
    } else if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      this.anim = 'attack';
    } else if (this.moving) {
      this.anim = 'walk';
    } else {
      this.anim = 'idle';
    }
    this.animTime += dt;
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
      this.anim = 'death';
      this.animTime = 0;
    }
    return true;
  }

  onDealDamage(damageDealt) {
    const ls = this.stats.final.lifesteal;
    if (ls > 0 && this.alive) {
      this.hp = Math.min(this.maxHp, this.hp + damageDealt * ls);
    }
  }

  addExp(amount) { this.exp += amount; }

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
    const flashing = this.hurtFlash > 0 && ((this.hurtFlash * 20) | 0) % 2 === 0;

    // 优先贴图
    const sheet = Assets.character(this.classId);
    if (sheet && sheet.img) {
      const animDef = sheet.meta.animations[this.anim] || sheet.meta.animations.idle;
      let frame = Math.floor(this.animTime * animDef.fps) % animDef.frames;
      if (this.anim === 'death') {
        frame = Math.min(animDef.frames - 1, Math.floor(this.animTime * animDef.fps));
      }
      const flip = Math.cos(this.facing) < 0;
      const size = 56;
      if (flashing) ctx.globalAlpha = 0.55;
      drawFrame(
        ctx, sheet.img,
        sheet.meta.frameWidth, sheet.meta.frameHeight,
        frame, animDef.row,
        sx, sy, size, size, flip,
      );
      ctx.globalAlpha = 1;
      return;
    }

    // 回退：程序化绘制
    this._renderFallback(ctx, sx, sy, flashing);
  }

  _renderFallback(ctx, sx, sy, flashing) {
    const r = this.stats.final.radius;
    const bobY = this.moving ? Math.sin(this.bob) * 2 : 0;
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
    } else if (model === 'hunter') {
      ctx.fillStyle = flashing ? '#fff' : (this.classData.accent || '#3d2a1c');
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
    } else {
      ctx.fillStyle = flashing ? '#fff' : (this.classData.accent || '#3a1858');
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
    this.anim = 'idle';
    this.animTime = 0;
    this.attackTimer = 0;
  }
}

export default Player;
