/**
 * UpgradeManager.js
 * 升级三选一选项生成。混合「技能获取/升级」与「被动属性」两类选项，
 * 随机抽取 3 个不重复项。技能已满级则不再作为选项。
 *
 * 返回的每个 option 结构统一：
 *   { kind: 'skill'|'passive', id, name, desc, color, level?, isNew? }
 */

import SKILL_DATA, { PASSIVE_DATA } from '../Data/skills.js';
import { randInt } from '../Utils/MathUtils.js';

export class UpgradeManager {
  constructor(skillSystem, player) {
    this.skillSystem = skillSystem;
    this.player = player;
    // 记录被动堆叠层数
    this.passiveStacks = {};
    // 允许同时持有的最大主动技能数（含普通攻击）
    this.maxActiveSkills = 6;
  }

  _skillOptions() {
    const out = [];
    for (const id in SKILL_DATA) {
      const def = SKILL_DATA[id];
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
        // 若主动技能已满槽，则不再提供「新技能」（普通攻击不占额外槽）
        if (def.isBasic) continue;
        if (this.skillSystem.skillCount >= this.maxActiveSkills) continue;
        out.push({
          kind: 'skill',
          id,
          name: def.name,
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
    for (const id in PASSIVE_DATA) {
      const def = PASSIVE_DATA[id];
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

  /** 生成 count 个不重复选项 */
  roll(count = 3) {
    const pool = this._skillOptions().concat(this._passiveOptions());
    // 洗牌抽取
    const chosen = [];
    const copy = pool.slice();
    while (chosen.length < count && copy.length > 0) {
      const idx = randInt(0, copy.length - 1);
      chosen.push(copy.splice(idx, 1)[0]);
    }
    // 兜底：至少给一个「回复生命」的保底项
    if (chosen.length === 0) {
      chosen.push({ kind: 'heal', id: 'heal', name: '治疗', desc: '恢复 30% 生命', color: '#7affb0' });
    }
    return chosen;
  }

  /** 应用玩家选择 */
  apply(option) {
    if (option.kind === 'skill') {
      this.skillSystem.acquire(option.id);
    } else if (option.kind === 'passive') {
      const def = PASSIVE_DATA[option.id];
      this.player.applyPassive(def);
      this.passiveStacks[option.id] = (this.passiveStacks[option.id] || 0) + 1;
    } else if (option.kind === 'heal') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.3);
    }
  }

  reset() {
    this.passiveStacks = {};
  }
}

export default UpgradeManager;
