/**
 * EnemySystem.js
 * 怪物系统：刷怪曲线、AI、精英、Boss、难度缩放、接触伤害、死亡掉落。
 *
 * 刷怪：按时间插值目标存活数量（第 1 分钟 ~80，第 5 分钟 ~1000），
 * 在相机外环形位置成批补充，超出上限则停。
 *
 * 性能：对象池复用 Enemy；AI 为 O(n) 简单追击；接触伤害只对玩家单点判定。
 */

import ObjectPool from '../Utils/ObjectPool.js';
import Enemy from './Enemy.js';
import BossController from './Boss.js';
import { drawEnemy } from './EnemyRenderer.js';
import ENEMY_DATA, { ELITE_MODIFIER, DIFFICULTY_SCALE } from '../Data/enemies.js';
import GameConfig from '../Config/GameConfig.js';
import { sampleCurve, randRange, dist2, TWO_PI } from '../Utils/MathUtils.js';

export class EnemySystem {
  constructor(player, events, effects) {
    this.player = player;
    this.events = events;
    this.effects = effects;
    this.pool = new ObjectPool(() => new Enemy(), (e) => e.reset(), GameConfig.performance.poolEnemy);
    this.enemies = [];

    this.spawnTimer = 0;
    this.eliteTimer = GameConfig.spawn.eliteInterval;
    this.elapsed = 0;

    // 普通怪刷怪池（按 minTime 解锁）
    this._normalPool = Object.values(ENEMY_DATA).filter((d) => d.tier === 'normal');

    this.boss = null;       // 当前 Boss 敌人引用
    this.bossSpawned = false;

    // Boss 技能回调 API
    this._bossApi = {
      telegraph: (x, y, r, c, life) => this.effects.telegraph(x, y, r, c, life),
      explosion: (x, y, r, c) => this.effects.explosion(x, y, r, c),
      shake: (m, d) => this.events.emit('shake', { magnitude: m, duration: d }),
      dealAoe: (x, y, r, dmg) => this._bossAoeDamage(x, y, r, dmg),
      summon: (x, y, count, enemyId) => this._bossSummon(x, y, count, enemyId),
    };
  }

  get count() {
    return this.enemies.length;
  }

  _difficulty() {
    return {
      hp: sampleCurve(DIFFICULTY_SCALE.hp, this.elapsed),
      damage: sampleCurve(DIFFICULTY_SCALE.damage, this.elapsed),
    };
  }

  _targetAlive() {
    return Math.min(
      GameConfig.spawn.maxAlive,
      Math.round(sampleCurve(GameConfig.spawn.curve, this.elapsed)),
    );
  }

  _randomNormalData() {
    // 只从已解锁的怪中按权重取
    const unlocked = this._normalPool.filter((d) => this.elapsed >= d.minTime);
    if (unlocked.length === 0) return ENEMY_DATA.skeleton;
    let total = 0;
    for (const d of unlocked) total += d.weight;
    let roll = Math.random() * total;
    for (const d of unlocked) {
      roll -= d.weight;
      if (roll <= 0) return d;
    }
    return unlocked[0];
  }

  _spawnPositionRing() {
    const angle = Math.random() * TWO_PI;
    const radius = randRange(GameConfig.spawn.ringMin, GameConfig.spawn.ringMax);
    return {
      x: this.player.x + Math.cos(angle) * radius,
      y: this.player.y + Math.sin(angle) * radius,
    };
  }

  spawnOne(data, x, y, elite) {
    const e = this.pool.acquire();
    e.spawn(data, x, y, this._difficulty(), elite, ELITE_MODIFIER);
    this.enemies.push(e);
    return e;
  }

  spawnElite() {
    const pos = this._spawnPositionRing();
    const base = this._randomNormalData();
    const e = this.spawnOne(base, pos.x, pos.y, true);
    this.events.emit('elite', { enemy: e });
    return e;
  }

  spawnBoss() {
    if (this.bossSpawned) return;
    this.bossSpawned = true;
    const pos = this._spawnPositionRing();
    const data = ENEMY_DATA.riftLord;
    const e = this.spawnOne(data, pos.x, pos.y, false);
    e.boss = new BossController(e, data);
    this.boss = e;
    this.events.emit('bossSpawn', { enemy: e });
  }

  _bossSummon(x, y, count, enemyId) {
    const data = ENEMY_DATA[enemyId] || ENEMY_DATA.skeleton;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TWO_PI;
      this.spawnOne(data, x + Math.cos(a) * 80, y + Math.sin(a) * 80, false);
    }
  }

  _bossAoeDamage(x, y, radius, dmg) {
    const r2 = radius * radius;
    if (dist2(this.player.x, this.player.y, x, y) <= r2) {
      this.player.takeDamage(dmg);
      if (!this.player.alive) this.events.emit('playerDead');
    }
  }

  update(dt, camera) {
    this.elapsed += dt;

    // Boss 出现
    if (!this.bossSpawned && this.elapsed >= GameConfig.spawn.bossTime) {
      this.spawnBoss();
    }

    // 刷怪（Boss 出现后减缓普通刷怪，但仍保持压力）
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = GameConfig.spawn.interval;
      this._doSpawnWave();
    }

    // 精英
    if (!this.bossSpawned) {
      this.eliteTimer -= dt;
      if (this.eliteTimer <= 0) {
        this.eliteTimer = GameConfig.spawn.eliteInterval;
        this.spawnElite();
      }
    }

    this._updateAI(dt, camera);
  }

  _doSpawnWave() {
    const target = this._targetAlive();
    let deficit = target - this.enemies.length;
    if (deficit <= 0) return;
    const batch = Math.min(deficit, GameConfig.spawn.batchMax);
    for (let i = 0; i < batch; i++) {
      const pos = this._spawnPositionRing();
      const data = this._randomNormalData();
      this.spawnOne(data, pos.x, pos.y, false);
    }
  }

  _updateAI(dt, camera) {
    const p = this.player;
    const px = p.x;
    const py = p.y;
    const playerR = p.stats.final.radius;

    // 远离玩家过远（超出刷怪环 2 倍）的怪回收，避免无效计算
    const cullDist2 = (GameConfig.spawn.ringMax * 2.2) * (GameConfig.spawn.ringMax * 2.2);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // 减速衰减
      if (e.slowT > 0) {
        e.slowT -= dt;
        if (e.slowT <= 0) e.slowFactor = 1;
      }

      // 命中闪烁衰减
      if (e.hitFlash > 0) e.hitFlash -= dt;

      let bossSelfMove = false;
      if (e.boss) {
        bossSelfMove = e.boss.update(dt, p, this._bossApi);
        e.speedMulPhase = e.boss.speedMul;
      }

      const dx = px - e.x;
      const dy = py - e.y;
      const d2 = dist2(px, py, e.x, e.y);
      const d = Math.sqrt(d2) || 1;

      // 追击移动（Boss 冲锋时由 Boss 控制，不再追）
      if (!bossSelfMove) {
        let spd = e.speed * e.slowFactor;
        if (e.speedMulPhase) spd *= e.speedMulPhase;
        e.x += (dx / d) * spd * dt;
        e.y += (dy / d) * spd * dt;
      }
      e.faceLeft = dx < 0;

      // 击退位移衰减
      if (e.knockX !== 0 || e.knockY !== 0) {
        e.x += e.knockX * dt;
        e.y += e.knockY * dt;
        e.knockX *= 0.82;
        e.knockY *= 0.82;
        if (Math.abs(e.knockX) < 1) e.knockX = 0;
        if (Math.abs(e.knockY) < 1) e.knockY = 0;
      }

      // 接触伤害
      if (e.attackCd > 0) e.attackCd -= dt;
      const touch = e.radius + playerR;
      if (d2 <= touch * touch && e.attackCd <= 0) {
        e.attackCd = 0.6;
        p.takeDamage(e.damage);
        if (!p.alive) this.events.emit('playerDead');
      }

      // 远距离剔除（不回收 Boss / 精英）
      if (!e.isBoss && !e.isElite && d2 > cullDist2) {
        this._remove(i);
      }
    }
  }

  /**
   * 对怪物造成伤害的统一入口（供技能/子弹调用）。
   * @returns { dead, dealt }
   */
  damageEnemy(e, amount, crit, knockback, fromX, fromY) {
    if (!e.active) return { dead: false, dealt: 0 };
    const dead = e.takeDamage(amount);
    this.effects.damageText(e.x, e.y - e.radius, amount, crit);
    this.player.onDealDamage(amount);

    if (knockback && !e.isBoss) {
      e.applyKnockback(e.x - fromX, e.y - fromY, knockback);
    }

    if (dead) {
      this._onEnemyDeath(e);
    }
    return { dead, dealt: amount };
  }

  _onEnemyDeath(e) {
    e.active = false;
    this.player.kills++;
    this.effects.puff(e.x, e.y, e.isBoss ? '#b3121f' : 'rgba(80,80,90,0.8)');
    this.events.emit('enemyDeath', {
      x: e.x, y: e.y, exp: e.exp, isBoss: e.isBoss, isElite: e.isElite, enemy: e,
    });
    if (e.isBoss) {
      this.boss = null;
      this.events.emit('bossDead', { x: e.x, y: e.y });
    }
    // 从列表移除（延迟到遍历安全处；这里直接标记，渲染/AI 会跳过）
    const idx = this.enemies.indexOf(e);
    if (idx !== -1) this._remove(idx);
  }

  _remove(index) {
    const e = this.enemies[index];
    this.pool.release(e);
    // swap-remove 保持 O(1)
    const last = this.enemies.pop();
    if (last !== e) this.enemies[index] = last;
  }

  render(ctx, camera, time) {
    // 只画可视范围内的怪
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.active) continue;
      if (camera.isVisible(e.x, e.y, e.radius + 20)) {
        drawEnemy(ctx, e, camera, time);
      }
    }
  }

  clear() {
    for (let i = 0; i < this.enemies.length; i++) this.pool.release(this.enemies[i]);
    this.enemies.length = 0;
    this.boss = null;
    this.bossSpawned = false;
    this.elapsed = 0;
    this.spawnTimer = 0;
    this.eliteTimer = GameConfig.spawn.eliteInterval;
  }
}

export default EnemySystem;
