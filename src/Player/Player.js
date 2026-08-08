/**
 * Player.js
 * 玩家实体。优先使用 8 向角色动画包（概念图还原素材），失败回退旧表/程序化。
 */

import Stats from './Stats.js';
import { getCharacter, getDefaultCharacterId } from '../Config/Character.js';
import GameConfig from '../Config/GameConfig.js';
import { clamp } from '../Utils/MathUtils.js';
import Assets from '../Utils/AssetLoader.js';
import { drawFrame, drawFramePivot, facingToDirIndex } from '../Utils/SpriteUtil.js';

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
    this.moveMag = 0;

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

    this.anim = 'idle';
    this.animTime = 0;
    this.attackTimer = 0;
    this.hitTimer = 0;
    this._atkToggle = false;
    this.lockAnim = false;

    /** 主动技能变身等临时状态 */
    this.rangeMul = 1;
    this.transformId = null;
  }

  get maxHp() {
    return this.stats.final.maxHp;
  }

  /** 技能释放：猎人 shoot，法系 cast / attack，交替 attack01/02 */
  triggerAttack(kind) {
    if (!this.alive) return;
    let anim = kind;
    if (!anim) {
      if (this.classId === 'hunter') anim = 'shoot';
      else if (this._atkToggle) anim = 'attack02';
      else anim = this.classId === 'mage' || this.classId === 'druid' ? 'cast' : 'attack01';
      // 交替
      if (anim === 'cast' || anim === 'attack02' || anim === 'attack01') {
        this._atkToggle = !this._atkToggle;
        if (this._atkToggle && anim === 'cast') anim = 'attack01';
      }
    }
    const pack = Assets.characterAnim(this.classId, anim)
      || Assets.characterAnim(this.classId, 'attack01');
    const dur = pack ? pack.frames / Math.max(1, pack.fps) : 0.35;
    this.attackTimer = dur;
    this.anim = pack ? anim : 'attack';
    this.animTime = 0;
    this.lockAnim = true;
  }

  update(dt, joystick) {
    if (joystick.active && joystick.mag > 0.05) {
      const speed = this.stats.final.moveSpeed * joystick.mag;
      this.vx = joystick.dx * speed;
      this.vy = joystick.dy * speed;
      this.facing = Math.atan2(joystick.dy, joystick.dx);
      this.moving = true;
      this.moveMag = joystick.mag;
    } else {
      this.vx = 0;
      this.vy = 0;
      this.moving = false;
      this.moveMag = 0;
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
    if (this.hitTimer > 0) this.hitTimer -= dt;

    // 动画状态机
    if (!this.alive) {
      if (this.anim !== 'death') {
        this.anim = 'death';
        this.animTime = 0;
        this.lockAnim = true;
      }
    } else if (this.hitTimer > 0 && !this.lockAnim) {
      this.anim = 'hit';
    } else if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.lockAnim = false;
        this.attackTimer = 0;
      }
    } else if (this.moving) {
      this.lockAnim = false;
      this.anim = this.moveMag > 0.72 ? 'run' : 'walk';
    } else {
      this.lockAnim = false;
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
    this.hitTimer = 0.22;
    if (!this.lockAnim) {
      this.anim = 'hit';
      this.animTime = 0;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.anim = 'death';
      this.animTime = 0;
      this.lockAnim = true;
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
    const dir = facingToDirIndex(this.facing);

    // 1) 新版 8 向动画包
    let animName = this.anim;
    let sheet = Assets.characterAnim(this.classId, animName);
    if (!sheet && animName === 'run') sheet = Assets.characterAnim(this.classId, 'walk');
    if (!sheet && (animName === 'cast' || animName === 'shoot' || animName === 'attack02')) {
      sheet = Assets.characterAnim(this.classId, 'attack01');
      animName = 'attack01';
    }
    if (!sheet && animName === 'hit') sheet = Assets.characterAnim(this.classId, 'idle');
    if (sheet) {
      let frame = Math.floor(this.animTime * sheet.fps);
      if (sheet.loop) frame %= sheet.frames;
      else frame = Math.min(sheet.frames - 1, frame);

      const shadow = Assets.characterShadow(this.classId);
      if (shadow) {
        drawFramePivot(
          ctx, shadow.img, shadow.frameW, shadow.frameH,
          0, 0, sx, sy,
          shadow.pivot.x, shadow.pivot.y,
          52, 52,
        );
      }

      const drawSize = 64;
      if (flashing) ctx.globalAlpha = 0.55;
      drawFramePivot(
        ctx, sheet.img, sheet.frameW, sheet.frameH,
        frame, dir, sx, sy,
        sheet.pivot.x, sheet.pivot.y,
        drawSize, drawSize,
      );
      ctx.globalAlpha = 1;
      return;
    }

    // 2) 旧版单表回退
    const legacy = Assets.character(this.classId);
    if (legacy && legacy.img) {
      const map = {
        idle: 'idle', walk: 'walk', run: 'walk',
        attack: 'attack', attack01: 'attack', attack02: 'attack',
        cast: 'attack', shoot: 'attack', hit: 'idle', death: 'death', victory: 'idle',
      };
      const key = map[this.anim] || 'idle';
      const animDef = legacy.meta.animations[key] || legacy.meta.animations.idle;
      let frame = Math.floor(this.animTime * animDef.fps) % animDef.frames;
      if (this.anim === 'death') {
        frame = Math.min(animDef.frames - 1, Math.floor(this.animTime * animDef.fps));
      }
      if (flashing) ctx.globalAlpha = 0.55;
      drawFrame(
        ctx, legacy.img,
        legacy.meta.frameWidth, legacy.meta.frameHeight,
        frame, animDef.row,
        sx, sy, 56, 56, Math.cos(this.facing) < 0,
      );
      ctx.globalAlpha = 1;
      return;
    }

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
      ctx.fillStyle = flashing ? '#fff' : (this.classData.accent || '#3a5a28');
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
    this.moveMag = 0;
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
    this.hitTimer = 0;
    this.lockAnim = false;
    this.rangeMul = 1;
    this.transformId = null;
  }
}

export default Player;
