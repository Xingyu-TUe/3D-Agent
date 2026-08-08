/**
 * SkillManager.js
 * 主动技能管理器（配置驱动）。
 *
 * 职责：
 *   - 按职业从 SkillConfig 加载小技能 / 大招
 *   - 维护冷却与持续状态
 *   - 提供 tryCast(slot) 供 UI 按钮调用
 *   - update(dt) 驱动所有主动技
 *
 * 具体技能效果由 BaseSkill 子类实现（后续模块注册到 REGISTRY）。
 */

import skillConfig from '../../Data/skillConfigRaw.js';
import BaseSkill from './BaseSkill.js';

/** @type {Record<string, typeof BaseSkill>} */
const REGISTRY = Object.create(null);

/**
 * 注册技能实现类（第三步起由各职业技能文件调用）
 * @param {string} id
 * @param {typeof BaseSkill} SkillClass
 */
export function registerActiveSkill(id, SkillClass) {
  REGISTRY[id] = SkillClass;
}

export class SkillManager {
  /**
   * @param {object} ctx { player, enemySystem, bulletSystem, collision, effects, events, camera }
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.config = skillConfig;
    /** @type {BaseSkill|null} */
    this.small = null;
    /** @type {BaseSkill|null} */
    this.ultimate = null;
    this.enabled = true;
  }

  /** 按当前玩家职业装配两个主动技能 */
  bindClass(classId) {
    this.destroyAll();
    const map = this.config.byClass[classId];
    if (!map) {
      console.warn('[SkillManager] 未知职业主动技配置:', classId);
      return;
    }
    this.small = this._create(map.small);
    this.ultimate = this._create(map.ultimate);
  }

  _create(skillId) {
    const def = this.config.skills[skillId];
    if (!def) {
      console.warn('[SkillManager] 缺少技能定义:', skillId);
      return null;
    }
    const Cls = REGISTRY[skillId] || BaseSkill;
    return new Cls(def, this.ctx);
  }

  getSlot(slot) {
    return slot === 'ultimate' ? this.ultimate : this.small;
  }

  /**
   * UI / 输入调用
   * @param {'small'|'ultimate'} slot
   * @returns {boolean}
   */
  tryCast(slot) {
    if (!this.enabled) return false;
    const skill = this.getSlot(slot);
    if (!skill) return false;
    return skill.cast();
  }

  update(dt) {
    if (this.small) this.small.update(dt);
    if (this.ultimate) this.ultimate.update(dt);
  }

  /** 供 HUD 读取按钮状态 */
  getUiState() {
    const pack = (skill) => {
      if (!skill) return null;
      return {
        id: skill.id,
        name: skill.name,
        slot: skill.slot,
        icon: skill.def.icon || skill.id,
        ready: skill.ready,
        cooldownLeft: skill.cooldownLeft,
        cooldown: skill.cooldown(),
        cooldownRatio: skill.cooldownRatio,
        running: skill.running,
      };
    };
    return {
      small: pack(this.small),
      ultimate: pack(this.ultimate),
    };
  }

  destroyAll() {
    if (this.small) this.small.destroy();
    if (this.ultimate) this.ultimate.destroy();
    this.small = null;
    this.ultimate = null;
  }

  clear() {
    this.destroyAll();
  }
}

export default SkillManager;
