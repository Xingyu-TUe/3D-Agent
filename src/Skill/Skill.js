/**
 * Skill.js
 * 技能实例：包装一个技能定义 + 当前等级 + 冷却计时。
 * 数值全部从 SKILL_DATA 的 levels[level-1] 读取。
 */

export class Skill {
  constructor(def) {
    this.def = def;
    this.id = def.id;
    this.type = def.type;
    this.level = 1;
    this.cooldownTimer = 0;
    // 组合加成（由 SkillSystem 根据 Build 注入）
    this.damageMul = 1;
    this.canCritOverride = null;
  }

  get maxLevel() {
    return this.def.levels.length;
  }

  get stats() {
    return this.def.levels[this.level - 1];
  }

  get isMax() {
    return this.level >= this.maxLevel;
  }

  upgrade() {
    if (this.level < this.maxLevel) this.level++;
  }

  /** 结合玩家攻速的实际冷却 */
  effectiveCooldown(atkSpeedMul) {
    return this.stats.cooldown / atkSpeedMul;
  }
}

export default Skill;
