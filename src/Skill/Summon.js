/**
 * Summon.js
 * 召唤物实体（狼灵 / 熊灵 / 树人）。对象池管理，自动追击最近敌人并攻击。
 */

export class Summon {
  constructor() {
    this.active = false;
    this.__pooled = true;
    this.kind = 'wolf';
    this.x = 0;
    this.y = 0;
    this.hp = 1;
    this.maxHp = 1;
    this.damage = 5;
    this.speed = 180;
    this.radius = 14;
    this.life = 0;
    this.attackCd = 0;
    this.phase = 0;
    this.skillId = '';
  }

  spawn(cfg) {
    this.kind = cfg.kind || 'wolf';
    this.x = cfg.x;
    this.y = cfg.y;
    this.maxHp = this.hp = cfg.hp;
    this.damage = cfg.damage;
    this.speed = cfg.speed;
    this.radius = cfg.radius;
    this.life = cfg.lifetime;
    this.attackCd = 0;
    this.phase = Math.random() * 6.28;
    this.skillId = cfg.skillId || '';
    this.active = true;
    return this;
  }

  reset() {
    this.active = false;
  }
}

export default Summon;
