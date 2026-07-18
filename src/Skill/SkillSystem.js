/**
 * SkillSystem.js
 * 技能系统：驱动玩家已获得技能，按 type 分派行为，支持职业专属技能。
 *
 * type:
 *   melee_swing / whirlwind / projectile / chain / aura_ring / ground_aoe
 *   summon / nova / homing / meteor / blackhole / screen_barrage
 */

import Skill from './Skill.js';
import GroundZone from './GroundZone.js';
import ObjectPool from '../Utils/ObjectPool.js';
import SKILL_DATA, { BUILD_SYNERGIES } from '../Data/skills.js';
import { chance, angleTo, TWO_PI } from '../Utils/MathUtils.js';

export class SkillSystem {
  constructor(player, enemySystem, bulletSystem, collision, effects, events, summonSystem) {
    this.player = player;
    this.enemySystem = enemySystem;
    this.bulletSystem = bulletSystem;
    this.collision = collision;
    this.effects = effects;
    this.events = events;
    this.summonSystem = summonSystem;

    this.skills = new Map();
    this.zonePool = new ObjectPool(() => new GroundZone(), (z) => z.reset(), 24);
    this.zones = [];
    this.activeSynergies = [];
    this._queryBuf = [];
    this._pendingMeteors = [];
    this._barrages = [];
  }

  hasSkill(id) { return this.skills.has(id); }
  getSkill(id) { return this.skills.get(id); }
  get skillCount() { return this.skills.size; }

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

  _recomputeSynergies() {
    for (const skill of this.skills.values()) {
      skill.damageMul = 1;
      skill.canCritOverride = null;
    }
    this.activeSynergies.length = 0;
    for (const syn of BUILD_SYNERGIES) {
      const ok = syn.require.every((req) => this.skills.has(req) || this.player._passiveIds?.has(req));
      if (!ok) continue;
      this.activeSynergies.push(syn);
      const target = this.skills.get(syn.effect.skill);
      if (target) {
        if (syn.effect.damageMul) target.damageMul *= syn.effect.damageMul;
        if (syn.effect.canCrit) target.canCritOverride = true;
      }
    }
  }

  _rollDamage(baseDamage, skill) {
    const s = this.player.stats.final;
    const atkCoef = (s.attack || 20) / 20;
    let dmg = baseDamage * atkCoef * s.damageMul * (skill ? skill.damageMul : 1);
    let crit = false;
    const canCrit = skill && skill.canCritOverride ? true : true;
    if (canCrit && chance(s.critRate)) {
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
        if (fired) skill.cooldownTimer = skill.effectiveCooldown(atkSpeed);
        else skill.cooldownTimer = 0.1;
      }
    }
    this._updateZones(dt);
    this._updateMeteors(dt);
    this._updateBarrages(dt);
  }

  _execute(skill) {
    switch (skill.type) {
      case 'melee_swing': return this._doMelee(skill);
      case 'whirlwind': return this._doWhirlwind(skill);
      case 'projectile': return this._doProjectile(skill);
      case 'chain': return this._doChain(skill);
      case 'aura_ring': return this._doAura(skill);
      case 'ground_aoe': return this._doGroundAoe(skill);
      case 'summon': return this._doSummon(skill);
      case 'nova': return this._doNova(skill);
      case 'homing': return this._doHoming(skill);
      case 'meteor': return this._doMeteor(skill);
      case 'blackhole': return this._doBlackHole(skill);
      case 'screen_barrage': return this._doBarrage(skill);
      default: return false;
    }
  }

  _nearest(range, exclude) {
    return this.collision.nearest(this.player.x, this.player.y, range, exclude);
  }

  _angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= TWO_PI;
    while (d < -Math.PI) d += TWO_PI;
    return d;
  }

  // ---- 近战扇形 ----
  _doMelee(skill) {
    const st = skill.stats;
    const target = this._nearest(st.range);
    if (!target) return false;
    const p = this.player;
    const baseAngle = angleTo(p.x, p.y, target.x, target.y);
    p.facing = baseAngle;
    this.effects.slash(p.x, p.y, baseAngle, st.range, st.arc, skill.def.color);
    const hits = this.collision.queryCircle(p.x, p.y, st.range, this._queryBuf);
    const halfArc = st.arc / 2;
    for (let i = 0; i < hits.length; i++) {
      const e = hits[i];
      if (Math.abs(this._angleDiff(angleTo(p.x, p.y, e.x, e.y), baseAngle)) <= halfArc) {
        const { dmg, crit } = this._rollDamage(st.damage, skill);
        this.enemySystem.damageEnemy(e, dmg, crit, st.knockback, p.x, p.y);
      }
    }
    return true;
  }

  _doWhirlwind(skill) {
    const st = skill.stats;
    const p = this.player;
    this.effects.ring(p.x, p.y, st.radius, skill.def.color);
    const hits = this.collision.queryCircle(p.x, p.y, st.radius, this._queryBuf);
    for (let i = 0; i < hits.length; i++) {
      const { dmg, crit } = this._rollDamage(st.damage, skill);
      this.enemySystem.damageEnemy(hits[i], dmg, crit, 20, p.x, p.y);
    }
    return true;
  }

  _doProjectile(skill) {
    const st = skill.stats;
    const target = this._nearest(700);
    const p = this.player;
    const baseAngle = target ? angleTo(p.x, p.y, target.x, target.y) : p.facing;
    const proj = skill.def.projectile;
    const count = st.count || 1;
    const spread = count > 3 ? 0.14 : 0.18;
    for (let i = 0; i < count; i++) {
      const a = baseAngle + (i - (count - 1) / 2) * spread;
      this.bulletSystem.fire({
        x: p.x, y: p.y,
        vx: Math.cos(a) * proj.speed,
        vy: Math.sin(a) * proj.speed,
        radius: proj.radius,
        damage: st.damage * skill.damageMul,
        life: proj.life,
        pierce: st.pierce != null ? st.pierce : (proj.pierce || 0),
        explode: proj.explode,
        explodeRadius: st.explodeRadius || proj.explodeRadius || 0,
        color: skill.def.color,
        skillId: skill.id,
        slow: proj.slow || 0,
        slowDuration: proj.slowDuration || 0,
        speed: proj.speed,
      });
    }
    return true;
  }

  _doHoming(skill) {
    const st = skill.stats;
    const p = this.player;
    const proj = skill.def.projectile;
    const count = st.count || 1;
    for (let i = 0; i < count; i++) {
      const a = p.facing + (i - (count - 1) / 2) * 0.35;
      this.bulletSystem.fire({
        x: p.x, y: p.y,
        vx: Math.cos(a) * proj.speed,
        vy: Math.sin(a) * proj.speed,
        radius: proj.radius,
        damage: st.damage * skill.damageMul,
        life: proj.life,
        pierce: 0,
        explode: false,
        color: skill.def.color,
        skillId: skill.id,
        homing: true,
        turnRate: proj.turnRate || 8,
        speed: proj.speed,
      });
    }
    return true;
  }

  _doChain(skill) {
    const st = skill.stats;
    const p = this.player;
    const first = this._nearest(st.range);
    if (!first) return false;
    const hitSet = new Set();
    const points = [{ x: p.x, y: p.y }];
    let current = first;
    let dmgBase = st.damage;
    for (let j = 0; j < st.jumps && current; j++) {
      hitSet.add(current);
      points.push({ x: current.x, y: current.y });
      const { dmg, crit } = this._rollDamage(dmgBase, skill);
      this.enemySystem.damageEnemy(current, dmg, crit, 0, p.x, p.y);
      dmgBase *= st.falloff;
      current = this.collision.nearest(current.x, current.y, st.range, hitSet);
    }
    this.effects.lightning(points, skill.def.color);
    this.events.emit('shake', { magnitude: 2, duration: 0.1 });
    return true;
  }

  _doAura(skill) {
    const st = skill.stats;
    const p = this.player;
    this.effects.ring(p.x, p.y, st.radius, skill.def.color);
    const hits = this.collision.queryCircle(p.x, p.y, st.radius, this._queryBuf);
    for (let i = 0; i < hits.length; i++) {
      const e = hits[i];
      const { dmg, crit } = this._rollDamage(st.damage, skill);
      this.enemySystem.damageEnemy(e, dmg, crit, 0, p.x, p.y);
      if (st.slow) e.applySlow(1 - st.slow, 0.6);
    }
    return true;
  }

  _doGroundAoe(skill) {
    const st = skill.stats;
    const p = this.player;
    const count = st.count || 1;
    let any = false;
    const exclude = new Set();
    for (let i = 0; i < count; i++) {
      const target = this._nearest(600, exclude);
      let x; let y;
      if (target) { x = target.x; y = target.y; exclude.add(target); }
      else if (i === 0) { x = p.x + Math.cos(p.facing) * 120; y = p.y + Math.sin(p.facing) * 120; }
      else break;
      const z = this.zonePool.acquire();
      z.spawn({
        x, y, radius: st.radius, damage: st.damage, duration: st.duration,
        tickRate: st.tickRate, color: skill.def.color,
      });
      z._skill = skill;
      z._slow = st.slow || 0;
      this.zones.push(z);
      any = true;
    }
    return any;
  }

  _doSummon(skill) {
    if (!this.summonSystem) return false;
    const st = skill.stats;
    const def = skill.def.summon;
    const kind = def.kind;
    if (this.summonSystem.countByKind(kind) >= st.maxCount) return true; // 已满，视为成功占 CD
    const p = this.player;
    const a = Math.random() * TWO_PI;
    this.summonSystem.spawn({
      kind,
      x: p.x + Math.cos(a) * 40,
      y: p.y + Math.sin(a) * 40,
      hp: st.summonHp,
      damage: st.damage * skill.damageMul,
      speed: st.summonSpeed,
      radius: st.summonRadius,
      lifetime: def.lifetime,
      skillId: skill.id,
    });
    return true;
  }

  _doNova(skill) {
    const st = skill.stats;
    const p = this.player;
    this.effects.explosion(p.x, p.y, st.radius, skill.def.color);
    this.events.emit('shake', { magnitude: 5, duration: 0.15 });
    const hits = this.collision.queryCircle(p.x, p.y, st.radius, this._queryBuf);
    for (let i = 0; i < hits.length; i++) {
      const { dmg, crit } = this._rollDamage(st.damage, skill);
      this.enemySystem.damageEnemy(hits[i], dmg, crit, 80, p.x, p.y);
    }
    return true;
  }

  _doMeteor(skill) {
    const st = skill.stats;
    const count = st.count || 1;
    const exclude = new Set();
    let any = false;
    for (let i = 0; i < count; i++) {
      const t = this._nearest(650, exclude);
      const p = this.player;
      const x = t ? t.x : p.x + Math.cos(p.facing) * 160;
      const y = t ? t.y : p.y + Math.sin(p.facing) * 160;
      if (t) exclude.add(t);
      this.effects.telegraph(x, y, st.radius, skill.def.color, st.delay);
      this._pendingMeteors.push({
        x, y, radius: st.radius, damage: st.damage, skill,
        timer: st.delay, color: skill.def.color,
      });
      any = true;
    }
    return any;
  }

  _updateMeteors(dt) {
    for (let i = this._pendingMeteors.length - 1; i >= 0; i--) {
      const m = this._pendingMeteors[i];
      m.timer -= dt;
      if (m.timer > 0) continue;
      this.effects.explosion(m.x, m.y, m.radius, m.color);
      this.events.emit('shake', { magnitude: 8, duration: 0.25 });
      const hits = this.collision.queryCircle(m.x, m.y, m.radius, this._queryBuf);
      for (let k = 0; k < hits.length; k++) {
        const { dmg, crit } = this._rollDamage(m.damage, m.skill);
        this.enemySystem.damageEnemy(hits[k], dmg, crit, 60, m.x, m.y);
      }
      this._pendingMeteors.splice(i, 1);
    }
  }

  _doBlackHole(skill) {
    const st = skill.stats;
    const t = this._nearest(550);
    const p = this.player;
    const x = t ? t.x : p.x + Math.cos(p.facing) * 140;
    const y = t ? t.y : p.y + Math.sin(p.facing) * 140;
    const z = this.zonePool.acquire();
    z.spawn({
      x, y, radius: st.radius, damage: st.damage, duration: st.duration,
      tickRate: st.tickRate, color: skill.def.color,
    });
    z._skill = skill;
    z._pull = st.pull || 0;
    this.zones.push(z);
    return true;
  }

  _doBarrage(skill) {
    const st = skill.stats;
    this._barrages.push({
      skill, damage: st.damage, wavesLeft: st.waves,
      countPerWave: st.countPerWave, radius: st.radius,
      meteor: !!st.meteor, timer: 0, interval: 0.35,
      color: skill.def.color,
    });
    this.events.emit('shake', { magnitude: 10, duration: 0.4 });
    return true;
  }

  _updateBarrages(dt) {
    const p = this.player;
    for (let i = this._barrages.length - 1; i >= 0; i--) {
      const b = this._barrages[i];
      b.timer -= dt;
      if (b.timer > 0) continue;
      b.timer = b.interval;
      b.wavesLeft--;
      for (let k = 0; k < b.countPerWave; k++) {
        const a = Math.random() * TWO_PI;
        const r = Math.random() * b.radius;
        const x = p.x + Math.cos(a) * r;
        const y = p.y + Math.sin(a) * r;
        if (b.meteor) {
          this.effects.explosion(x, y, 55 + Math.random() * 40, b.color);
          const hits = this.collision.queryCircle(x, y, 70, this._queryBuf);
          for (let h = 0; h < hits.length; h++) {
            const { dmg, crit } = this._rollDamage(b.damage, b.skill);
            this.enemySystem.damageEnemy(hits[h], dmg, crit, 40, x, y);
          }
        } else {
          // 箭雨：点杀
          this.effects.slash(x, y, -Math.PI / 2, 30, 0.6, b.color);
          const hits = this.collision.queryCircle(x, y, 36, this._queryBuf);
          for (let h = 0; h < hits.length; h++) {
            const { dmg, crit } = this._rollDamage(b.damage, b.skill);
            this.enemySystem.damageEnemy(hits[h], dmg, crit, 20, x, y);
          }
        }
      }
      if (b.wavesLeft <= 0) this._barrages.splice(i, 1);
    }
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
          if (z._slow) e.applySlow(1 - z._slow, 0.5);
          if (z._pull) {
            const dx = z.x - e.x;
            const dy = z.y - e.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            e.x += (dx / d) * z._pull * z.tickRate * 0.5;
            e.y += (dy / d) * z._pull * z.tickRate * 0.5;
          }
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

  /** 返回当前职业可升级/可获取的技能 id（由 UpgradeManager 传入 pool） */
  getUpgradeableFromPool(poolIds) {
    const out = [];
    for (const id of poolIds) {
      const def = SKILL_DATA[id];
      if (!def) continue;
      const owned = this.skills.get(id);
      if (owned) {
        if (!owned.isMax) out.push(id);
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
    this._pendingMeteors.length = 0;
    this._barrages.length = 0;
  }
}

export default SkillSystem;
