/**
 * SkillSystem.js
 * 技能系统：驱动玩家已获得的所有技能（含普通攻击），执行各类行为，
 * 处理 Build 组合加成，并管理地面持续区域（毒云）。
 *
 * 行为分派：
 *   melee_swing  近战扇形挥砍（普通攻击）
 *   whirlwind    环绕自身持续伤害
 *   projectile   直线弹（火球/飞剑）
 *   chain        闪电链
 *   aura_ring    冰环（减速 + 伤害）
 *   ground_aoe   毒云
 *
 * 伤害/暴击统一由 _rollDamage 计算，读取玩家最终属性。
 */

import Skill from './Skill.js';
import GroundZone from './GroundZone.js';
import ObjectPool from '../Utils/ObjectPool.js';
import SKILL_DATA, { BUILD_SYNERGIES } from '../Data/skills.js';
import { chance, angleTo, dist2, TWO_PI } from '../Utils/MathUtils.js';

export class SkillSystem {
  constructor(player, enemySystem, bulletSystem, collision, effects, events) {
    this.player = player;
    this.enemySystem = enemySystem;
    this.bulletSystem = bulletSystem;
    this.collision = collision;
    this.effects = effects;
    this.events = events;

    this.skills = new Map();     // id -> Skill
    this.zonePool = new ObjectPool(() => new GroundZone(), (z) => z.reset(), 24);
    this.zones = [];

    this.activeSynergies = [];   // 已激活的 Build 组合
    this._queryBuf = [];
  }

  hasSkill(id) {
    return this.skills.has(id);
  }

  getSkill(id) {
    return this.skills.get(id);
  }

  get skillCount() {
    return this.skills.size;
  }

  /** 获得新技能或升级已有技能 */
  acquire(id) {
    if (this.skills.has(id)) {
      this.skills.get(id).upgrade();
    } else {
      const def = SKILL_DATA[id];
      if (!def) return;
      this.skills.set(id, new Skill(def));
    }
    this._recomputeSynergies();
  }

  /** 检测并应用 Build 组合加成 */
  _recomputeSynergies() {
    // 重置技能上的组合加成
    for (const skill of this.skills.values()) {
      skill.damageMul = 1;
      skill.canCritOverride = null;
    }
    this.activeSynergies.length = 0;

    for (const syn of BUILD_SYNERGIES) {
      const ok = syn.require.every((req) => {
        // require 可以是技能 id，也可以是被动 id（此处只判技能；被动组合另行处理）
        return this.skills.has(req) || this.player._passiveIds?.has(req);
      });
      if (!ok) continue;
      this.activeSynergies.push(syn);
      const eff = syn.effect;
      const target = this.skills.get(eff.skill);
      if (target) {
        if (eff.damageMul) target.damageMul *= eff.damageMul;
        if (eff.canCrit) target.canCritOverride = true;
      }
    }
  }

  _rollDamage(baseDamage, skill, forceCrit) {
    const s = this.player.stats.final;
    let dmg = baseDamage * s.damageMul * (skill ? skill.damageMul : 1);
    let crit = false;
    const canCrit = skill && skill.canCritOverride ? true : (skill ? skill.type !== 'aura_ring' : true);
    if ((forceCrit || (canCrit && chance(s.critRate)))) {
      dmg *= s.critDmg;
      crit = true;
    }
    return { dmg, crit };
  }

  update(dt, camera) {
    const atkSpeed = this.player.stats.final.atkSpeedMul;

    for (const skill of this.skills.values()) {
      skill.cooldownTimer -= dt;
      if (skill.cooldownTimer <= 0) {
        const fired = this._execute(skill);
        // 只有成功释放才重置 CD（找不到目标的攻击不空转 CD，保持手感）
        if (fired) {
          skill.cooldownTimer = skill.effectiveCooldown(atkSpeed);
        } else {
          skill.cooldownTimer = 0.1; // 稍后重试
        }
      }
    }

    this._updateZones(dt);
  }

  _execute(skill) {
    switch (skill.type) {
      case 'melee_swing': return this._doMelee(skill);
      case 'whirlwind': return this._doWhirlwind(skill);
      case 'projectile': return this._doProjectile(skill);
      case 'chain': return this._doChain(skill);
      case 'aura_ring': return this._doAura(skill);
      case 'ground_aoe': return this._doGroundAoe(skill);
      default: return false;
    }
  }

  _nearest(range, exclude) {
    return this.collision.nearest(this.player.x, this.player.y, range, exclude);
  }

  // ============ 普通攻击：扇形挥砍最近敌人 ============
  _doMelee(skill) {
    const st = skill.stats;
    const target = this._nearest(st.range);
    if (!target) return false;

    const p = this.player;
    const baseAngle = angleTo(p.x, p.y, target.x, target.y);
    p.facing = baseAngle;

    this.effects.slash(p.x, p.y, baseAngle, st.range, st.arc, skill.def.color);

    // 命中该扇形范围内所有敌人
    const hits = this.collision.queryCircle(p.x, p.y, st.range, this._queryBuf);
    const halfArc = st.arc / 2;
    for (let i = 0; i < hits.length; i++) {
      const e = hits[i];
      const a = angleTo(p.x, p.y, e.x, e.y);
      let diff = Math.abs(this._angleDiff(a, baseAngle));
      if (diff <= halfArc) {
        const { dmg, crit } = this._rollDamage(st.damage, skill);
        this.enemySystem.damageEnemy(e, dmg, crit, st.knockback, p.x, p.y);
      }
    }
    return true;
  }

  _angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= TWO_PI;
    while (d < -Math.PI) d += TWO_PI;
    return d;
  }

  // ============ 旋风：环绕自身持续伤害 ============
  _doWhirlwind(skill) {
    const st = skill.stats;
    const p = this.player;
    this.effects.ring(p.x, p.y, st.radius, skill.def.color);
    const hits = this.collision.queryCircle(p.x, p.y, st.radius, this._queryBuf);
    for (let i = 0; i < hits.length; i++) {
      const e = hits[i];
      const { dmg, crit } = this._rollDamage(st.damage, skill);
      this.enemySystem.damageEnemy(e, dmg, crit, 20, p.x, p.y);
    }
    return true; // 旋风持续释放（即使无敌人也保持节奏）
  }

  // ============ 投射物：火球 / 飞剑 ============
  _doProjectile(skill) {
    const st = skill.stats;
    const target = this._nearest(700);
    const p = this.player;
    let baseAngle;
    if (target) {
      baseAngle = angleTo(p.x, p.y, target.x, target.y);
    } else {
      baseAngle = p.facing;
    }

    const proj = skill.def.projectile;
    const count = st.count || 1;
    const spread = 0.18;
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spread;
      const a = baseAngle + offset;
      this.bulletSystem.fire({
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * proj.speed,
        vy: Math.sin(a) * proj.speed,
        radius: proj.radius,
        damage: st.damage * skill.damageMul,
        life: proj.life,
        pierce: st.pierce != null ? st.pierce : (proj.pierce || 0),
        explode: proj.explode,
        explodeRadius: st.explodeRadius || proj.explodeRadius || 0,
        color: skill.def.color,
        canCrit: true,
        skillId: skill.id,
      });
    }
    return true;
  }

  // ============ 闪电链 ============
  _doChain(skill) {
    const st = skill.stats;
    const p = this.player;
    const first = this._nearest(st.range);
    if (!first) return false;

    const hitSet = new Set();
    const points = [{ x: p.x, y: p.y }];
    let current = first;
    let dmg = st.damage;

    for (let j = 0; j < st.jumps && current; j++) {
      hitSet.add(current);
      points.push({ x: current.x, y: current.y });
      const { dmg: d, crit } = this._rollDamage(dmg, skill);
      this.enemySystem.damageEnemy(current, d, crit, 0, p.x, p.y);
      dmg *= st.falloff;
      // 找下一个：距离当前敌人最近且未命中
      current = this.collision.nearest(current.x, current.y, st.range, hitSet);
    }

    this.effects.lightning(points, skill.def.color);
    this.events.emit('shake', { magnitude: 2, duration: 0.1 });
    return true;
  }

  // ============ 冰环：减速 + 伤害 ============
  _doAura(skill) {
    const st = skill.stats;
    const p = this.player;
    this.effects.ring(p.x, p.y, st.radius, skill.def.color);
    const hits = this.collision.queryCircle(p.x, p.y, st.radius, this._queryBuf);
    for (let i = 0; i < hits.length; i++) {
      const e = hits[i];
      const { dmg, crit } = this._rollDamage(st.damage, skill);
      this.enemySystem.damageEnemy(e, dmg, crit, 0, p.x, p.y);
      e.applySlow(1 - st.slow, 0.6);
    }
    return true;
  }

  // ============ 毒云 ============
  _doGroundAoe(skill) {
    const st = skill.stats;
    const p = this.player;
    const count = st.count || 1;
    let anyPlaced = false;
    // 在最近的若干敌群附近放置
    const exclude = new Set();
    for (let i = 0; i < count; i++) {
      const target = this._nearest(600, exclude);
      let x, y;
      if (target) {
        x = target.x;
        y = target.y;
        exclude.add(target);
      } else if (i === 0) {
        // 没有敌人时放在玩家朝向前方
        x = p.x + Math.cos(p.facing) * 120;
        y = p.y + Math.sin(p.facing) * 120;
      } else {
        break;
      }
      const z = this.zonePool.acquire();
      z.spawn({
        x, y,
        radius: st.radius,
        damage: st.damage,
        duration: st.duration,
        tickRate: st.tickRate,
        color: skill.def.color,
      });
      z._skill = skill;
      this.zones.push(z);
      anyPlaced = true;
    }
    return anyPlaced;
  }

  _updateZones(dt) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.duration -= dt;
      z.tickTimer -= dt;
      if (z.tickTimer <= 0) {
        z.tickTimer = z.tickRate;
        const hits = this.collision.queryCircle(z.x, z.y, z.radius, this._queryBuf);
        for (let k = 0; k < hits.length; k++) {
          const e = hits[k];
          const { dmg, crit } = this._rollDamage(z.damage, z._skill);
          this.enemySystem.damageEnemy(e, dmg, crit, 0, z.x, z.y);
        }
      }
      if (z.duration <= 0) {
        this.zonePool.release(z);
        const last = this.zones.pop();
        if (last !== z) this.zones[i] = last;
      }
    }
  }

  renderZones(ctx, camera, time) {
    for (let i = 0; i < this.zones.length; i++) {
      this.zones[i].render(ctx, camera, time);
    }
  }

  /** 返回当前可升级/可获取的技能列表，用于升级三选一 */
  getUpgradeableSkillIds() {
    const out = [];
    for (const id in SKILL_DATA) {
      const def = SKILL_DATA[id];
      if (def.isBasic && !this.skills.has(id)) continue; // 普通攻击默认已有
      if (this.skills.has(id)) {
        if (!this.skills.get(id).isMax) out.push(id);
      } else {
        out.push(id);
      }
    }
    return out;
  }

  clear() {
    this.skills.clear();
    for (let i = 0; i < this.zones.length; i++) this.zonePool.release(this.zones[i]);
    this.zones.length = 0;
    this.activeSynergies.length = 0;
  }
}

export default SkillSystem;
