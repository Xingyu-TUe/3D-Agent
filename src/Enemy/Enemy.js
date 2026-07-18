/**
 * Enemy.js
 * 怪物实体（对象池管理）。数据驱动：由 ENEMY_DATA 模板初始化。
 * 支持普通 / 精英 / Boss（Boss 额外携带阶段与技能状态，逻辑在 EnemySystem/Boss 中驱动）。
 *
 * AI：始终朝玩家移动；进入接触距离造成伤害（带攻击间隔）。
 */

export class Enemy {
  constructor() {
    this.active = false;
    this.__pooled = true;

    this.id = '';
    this.name = '';
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.hp = 1;
    this.maxHp = 1;
    this.speed = 60;
    this.damage = 5;
    this.radius = 16;
    this.exp = 1;
    this.color = '#fff';
    this.shape = 'skeleton';
    this.tier = 'normal';

    this.isBoss = false;
    this.isElite = false;

    // 攻击节流
    this.attackCd = 0;

    // 受击表现
    this.hitFlash = 0;
    this.slowT = 0;      // 减速剩余时间
    this.slowFactor = 1; // 当前减速系数
    this.knockX = 0;
    this.knockY = 0;

    // 动画相位 / 朝向
    this.phase = 0;
    this.faceLeft = false;

    // 命中去重（用于穿透弹/光环 tick）：mapping skillInstanceId -> nextTickTime 由系统维护
    this.tickCd = null;

    // Boss 专用（由 Boss 模块填充）
    this.boss = null;
  }

  /**
   * 用数据模板初始化。
   * @param data ENEMY_DATA 条目
   * @param x,y 世界坐标
   * @param scale { hp, damage } 难度缩放
   * @param elite 是否精英，eliteMod 精英修正
   */
  spawn(data, x, y, scale, elite, eliteMod) {
    this.id = data.id;
    this.name = data.name;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.shape = data.shape;
    this.color = data.color;
    this.tier = data.tier;
    this.isBoss = data.tier === 'boss';
    this.isElite = !!elite;

    let hp = data.hp * (scale ? scale.hp : 1);
    let dmg = data.damage * (scale ? scale.damage : 1);
    let radius = data.radius;
    let speed = data.speed;
    let exp = data.exp;

    if (elite && eliteMod) {
      hp *= eliteMod.hpMul;
      dmg *= eliteMod.damageMul;
      radius *= eliteMod.radiusMul;
      speed *= eliteMod.speedMul;
      exp *= eliteMod.expMul;
      this.eliteTint = eliteMod.tint;
    } else {
      this.eliteTint = null;
    }

    this.hp = this.maxHp = hp;
    this.damage = dmg;
    this.radius = radius;
    this.speed = speed;
    this.exp = exp;

    this.active = true;
    this.attackCd = 0;
    this.hitFlash = 0;
    this.slowT = 0;
    this.slowFactor = 1;
    this.knockX = 0;
    this.knockY = 0;
    this.phase = Math.random() * 6.28;
    this.tickCd = null;
    this.boss = null;
    return this;
  }

  reset() {
    this.active = false;
    this.tickCd = null;
    this.boss = null;
  }

  applySlow(factor, duration) {
    // 取更强的减速
    if (factor < this.slowFactor || this.slowT <= 0) {
      this.slowFactor = factor;
    }
    this.slowT = Math.max(this.slowT, duration);
  }

  applyKnockback(dx, dy, force) {
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    this.knockX += (dx / d) * force;
    this.knockY += (dy / d) * force;
  }

  /**
   * @returns true 若死亡
   */
  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.12;
    return this.hp <= 0;
  }
}

export default Enemy;
