/**
 * Player.js
 * 玩家实体：流浪骑士。
 *   - 由摇杆驱动移动，人物朝移动方向移动
 *   - 生命 / 等级 / 经验
 *   - 吸血、回血、无敌帧
 *   - 持有装备栏（预留），属性由 Stats 汇总
 *
 * 攻击不在此处直接实现：技能（含普通攻击）由 SkillSystem 统一驱动，
 * 玩家只提供位置、朝向、属性。
 */

import Stats from './Stats.js';
import CLASS_DATA from '../Data/classes.js';
import GameConfig from '../Config/GameConfig.js';
import { clamp } from '../Utils/MathUtils.js';

export class Player {
  constructor(classId = GameConfig.player.startClass) {
    const cls = CLASS_DATA[classId];
    this.classId = classId;
    this.classData = cls;
    this.stats = new Stats(cls.base);

    this.x = GameConfig.player.spawnX;
    this.y = GameConfig.player.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.facing = -Math.PI / 2; // 朝向（弧度），默认朝上
    this.moving = false;

    this.hp = this.stats.final.maxHp;
    this.level = 1;
    this.exp = 0;
    this.expToNext = 0;

    this.invincible = 0;
    this.alive = true;

    // 命中闪烁
    this.hurtFlash = 0;
    // 走路摆动相位
    this.bob = 0;

    // 装备栏（预留）：slot -> item
    this.equipment = {};

    // 统计
    this.kills = 0;
  }

  get maxHp() {
    return this.stats.final.maxHp;
  }

  /** 从摇杆输入更新移动 */
  update(dt, joystick, world) {
    // 移动
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

    // 回血
    const regen = this.stats.final.regen;
    if (regen > 0 && this.alive) {
      this.hp = Math.min(this.maxHp, this.hp + regen * dt);
    }

    // 无敌帧
    if (this.invincible > 0) this.invincible -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
  }

  /** 受到伤害。返回是否真的受伤 */
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

  /** 造成伤害后触发吸血 */
  onDealDamage(damageDealt) {
    const ls = this.stats.final.lifesteal;
    if (ls > 0 && this.alive) {
      this.hp = Math.min(this.maxHp, this.hp + damageDealt * ls);
    }
  }

  addExp(amount) {
    this.exp += amount;
  }

  /** 应用被动加成（来自升级三选一的属性项） */
  applyPassive(passive) {
    this.stats.addStat(passive.stat, passive.add);
    // 增加最大生命时同步补满增量
    if (passive.stat === 'maxHpAdd') {
      this.hp = Math.min(this.maxHp, this.hp + passive.add);
    }
  }

  /** 装备一件装备（预留接口）：立即把词条转成属性修正 */
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

    ctx.save();
    ctx.translate(sx, sy + bobY);

    // 脚下阴影
    ctx.beginPath();
    ctx.ellipse(0, r * 0.9, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    // 无敌闪烁
    const flashing = this.hurtFlash > 0 && ((this.hurtFlash * 20) | 0) % 2 === 0;

    // 身体（披风骑士）
    ctx.rotate(this.facing + Math.PI / 2);
    // 披风
    ctx.beginPath();
    ctx.moveTo(0, r * 0.6);
    ctx.lineTo(-r * 0.8, r * 1.1);
    ctx.lineTo(r * 0.8, r * 1.1);
    ctx.closePath();
    ctx.fillStyle = flashing ? '#ffffff' : '#3a2c33';
    ctx.fill();

    // 躯干
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = flashing ? '#ffffff' : this.classData.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#20242e';
    ctx.stroke();

    // 头盔缝隙（发光眼）
    ctx.beginPath();
    ctx.arc(0, -r * 0.15, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = '#16181f';
    ctx.fill();
    ctx.fillStyle = '#ff5a3c';
    ctx.fillRect(-r * 0.16, -r * 0.22, r * 0.32, r * 0.1);

    // 剑（指向朝向前方）
    ctx.strokeStyle = '#dfe4ef';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.2);
    ctx.lineTo(r * 0.5, -r * 1.4);
    ctx.stroke();
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(r * 0.2, -r * 0.2);
    ctx.lineTo(r * 0.8, -r * 0.2);
    ctx.stroke();

    ctx.restore();
  }

  reset(classId = GameConfig.player.startClass) {
    const cls = CLASS_DATA[classId];
    this.classId = classId;
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
  }
}

export default Player;
