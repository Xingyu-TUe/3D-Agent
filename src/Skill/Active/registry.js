/**
 * registry.js
 * 主动技能类注册表（与 SkillManager 分离，避免循环依赖）。
 */

/** @type {Record<string, Function>} */
export const ACTIVE_SKILL_REGISTRY = Object.create(null);

export function registerActiveSkill(id, SkillClass) {
  ACTIVE_SKILL_REGISTRY[id] = SkillClass;
}

export function getActiveSkillClass(id) {
  return ACTIVE_SKILL_REGISTRY[id] || null;
}
