/**
 * UpgradeManager.js
 * 升级三选一：混合「职业专属技能」与「公共被动」。
 * 技能池由当前职业的 Character.skills.pool 决定。
 */

import SKILL_DATA, { PASSIVE_DATA } from '../Data/skills.js';
import { COMMON_PASSIVES } from '../Config/Character.js';
import { randInt } from '../Utils/MathUtils.js';

export class UpgradeManager {
  constructor(skillSystem, player) {
    this.skillSystem = skillSystem;
    this.player = player;
    this.passiveStacks = {};
    this.maxActiveSkills = 7;
    this.skillPool = []; // 当前职业技能池
  }

  /** 设置职业技能池（开局时调用） */
  setSkillPool(poolIds) {
    this.skillPool = poolIds ? poolIds.slice() : [];
  }

  _skillOptions() {
    const out = [];
    const pool = this.skillPool.length ? this.skillPool : Object.keys(SKILL_DATA);
    const activeCount = this.skillSystem.skillCount;

    for (const id of pool) {
      const def = SKILL_DATA[id];
      if (!def) continue;
      const owned = this.skillSystem.getSkill(id);
      if (owned) {
        if (!owned.isMax) {
          out.push({
            kind: 'skill',
            id,
            name: def.name,
            desc: `${def.desc}（Lv.${owned.level} → ${owned.level + 1}）`,
            color: def.color,
            level: owned.level + 1,
            isNew: false,
          });
        }
      } else {
        if (def.isBasic) continue;
        // 终极技能：至少拥有 2 个主动技能后才出现
        if (def.isUltimate && activeCount < 3) continue;
        if (activeCount >= this.maxActiveSkills) continue;
        out.push({
          kind: 'skill',
          id,
          name: def.name + (def.isUltimate ? '「终极」' : ''),
          desc: `${def.desc}（新获得）`,
          color: def.color,
          level: 1,
          isNew: true,
        });
      }
    }
    return out;
  }

  _passiveOptions() {
    const out = [];
    const list = COMMON_PASSIVES.length ? COMMON_PASSIVES : Object.keys(PASSIVE_DATA);
    for (const id of list) {
      const def = PASSIVE_DATA[id];
      if (!def) continue;
      const stack = this.passiveStacks[id] || 0;
      if (stack >= def.maxStack) continue;
      out.push({
        kind: 'passive',
        id,
        name: def.name,
        desc: def.desc + (stack > 0 ? `（已强化 ${stack} 次）` : ''),
        color: def.color,
      });
    }
    return out;
  }

  roll(count = 3) {
    // 技能与被动混合，技能略加权
    const skills = this._skillOptions();
    const passives = this._passiveOptions();
    const pool = skills.concat(skills).concat(passives); // 技能双倍权重
    const chosen = [];
    const used = new Set();
    const copy = pool.slice();
    while (chosen.length < count && copy.length > 0) {
      const idx = randInt(0, copy.length - 1);
      const opt = copy.splice(idx, 1)[0];
      const key = opt.kind + ':' + opt.id;
      if (used.has(key)) continue;
      used.add(key);
      chosen.push(opt);
    }
    if (chosen.length === 0) {
      chosen.push({ kind: 'heal', id: 'heal', name: '治疗', desc: '恢复 30% 生命', color: '#7affb0' });
    }
    return chosen;
  }

  apply(option) {
    if (option.kind === 'skill') {
      this.skillSystem.acquire(option.id);
    } else if (option.kind === 'passive') {
      const def = PASSIVE_DATA[option.id];
      this.player.applyPassive(def);
      this.passiveStacks[option.id] = (this.passiveStacks[option.id] || 0) + 1;
      if (!this.player._passiveIds) this.player._passiveIds = new Set();
      this.player._passiveIds.add(option.id);
    } else if (option.kind === 'heal') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.3);
    }
  }

  reset() {
    this.passiveStacks = {};
  }
}

export default UpgradeManager;
