/**
 * skills.js
 * 技能数据表（数据驱动）。第一版：普通攻击(挥剑) / 旋风 / 火球 / 闪电链 / 冰环 / 毒云 / 飞剑。
 *
 * 每个技能 1~5 级，levels 数组给出每级数值。
 * 升级带来：伤害↑、范围↑、数量↑、CD↓。
 *
 * type: 决定技能行为逻辑（由 SkillSystem 分发到对应行为函数）。
 *   melee_swing  近战挥砍扇形（普通攻击）
 *   whirlwind    环绕自身持续伤害（旋风）
 *   projectile   直线飞行弹（火球 / 飞剑）
 *   chain        闪电链（跳跃打击）
 *   aura_ring    冰环（环绕光环减速+伤害）
 *   ground_aoe   毒云（地面持续区域）
 */

export const SKILL_DATA = {
  // ============ 普通攻击：自动挥剑，攻击最近敌人 ============
  basicSlash: {
    id: 'basicSlash',
    name: '流浪之剑',
    type: 'melee_swing',
    desc: '自动挥剑，攻击面前最近的敌人。',
    color: '#e8e8f0',
    isBasic: true, // 出生自带
    levels: [
      { damage: 10, cooldown: 0.9, range: 120, arc: 1.4, knockback: 60 },
      { damage: 15, cooldown: 0.85, range: 130, arc: 1.5, knockback: 70 },
      { damage: 22, cooldown: 0.78, range: 140, arc: 1.6, knockback: 80 },
      { damage: 30, cooldown: 0.7, range: 150, arc: 1.8, knockback: 90 },
      { damage: 42, cooldown: 0.6, range: 165, arc: 2.0, knockback: 110 },
    ],
  },

  // ============ 旋风：环绕自身持续伤害 ============
  whirlwind: {
    id: 'whirlwind',
    name: '血怒旋风',
    type: 'whirlwind',
    desc: '环绕自身旋转的刀刃，对靠近的敌人持续造成伤害。',
    color: '#ff5a3c',
    levels: [
      { damage: 6, cooldown: 0.35, radius: 90, tickRate: 0.3 },
      { damage: 8, cooldown: 0.35, radius: 100, tickRate: 0.28 },
      { damage: 11, cooldown: 0.3, radius: 115, tickRate: 0.25 },
      { damage: 15, cooldown: 0.3, radius: 128, tickRate: 0.22 },
      { damage: 20, cooldown: 0.25, radius: 145, tickRate: 0.2 },
    ],
  },

  // ============ 火球：直线飞行，命中爆炸 ============
  fireball: {
    id: 'fireball',
    name: '业火之球',
    type: 'projectile',
    desc: '发射火球，命中后爆炸造成范围火焰伤害。',
    color: '#ff8a1e',
    projectile: { speed: 420, radius: 14, life: 2.2, explode: true, explodeRadius: 70, pierce: 0 },
    levels: [
      { damage: 24, cooldown: 1.6, count: 1, explodeRadius: 70 },
      { damage: 32, cooldown: 1.5, count: 1, explodeRadius: 80 },
      { damage: 42, cooldown: 1.35, count: 2, explodeRadius: 90 },
      { damage: 55, cooldown: 1.2, count: 2, explodeRadius: 105 },
      { damage: 72, cooldown: 1.05, count: 3, explodeRadius: 120 },
    ],
  },

  // ============ 飞剑：高速穿透直线弹 ============
  flyingSword: {
    id: 'flyingSword',
    name: '追魂飞剑',
    type: 'projectile',
    desc: '射出高速飞剑，可穿透多个敌人。',
    color: '#9fe6ff',
    projectile: { speed: 620, radius: 10, life: 1.6, explode: false, pierce: 3 },
    levels: [
      { damage: 14, cooldown: 1.1, count: 1, pierce: 3 },
      { damage: 18, cooldown: 1.0, count: 2, pierce: 3 },
      { damage: 24, cooldown: 0.9, count: 2, pierce: 4 },
      { damage: 31, cooldown: 0.8, count: 3, pierce: 5 },
      { damage: 40, cooldown: 0.7, count: 4, pierce: 6 },
    ],
  },

  // ============ 闪电链：跳跃打击多个敌人 ============
  chainLightning: {
    id: 'chainLightning',
    name: '雷霆链',
    type: 'chain',
    desc: '释放闪电，在敌人之间跳跃传导。',
    color: '#7cc4ff',
    levels: [
      { damage: 18, cooldown: 1.8, jumps: 3, range: 220, falloff: 0.85 },
      { damage: 24, cooldown: 1.65, jumps: 4, range: 240, falloff: 0.85 },
      { damage: 32, cooldown: 1.5, jumps: 5, range: 260, falloff: 0.9 },
      { damage: 42, cooldown: 1.3, jumps: 6, range: 280, falloff: 0.9 },
      { damage: 56, cooldown: 1.1, jumps: 8, range: 300, falloff: 0.92 },
    ],
  },

  // ============ 冰环：环绕光环，减速+伤害 ============
  frostRing: {
    id: 'frostRing',
    name: '寒霜之环',
    type: 'aura_ring',
    desc: '围绕自身的寒冰光环，减速并伤害范围内敌人。',
    color: '#8fdcff',
    levels: [
      { damage: 4, cooldown: 0.5, radius: 110, slow: 0.3, tickRate: 0.4 },
      { damage: 6, cooldown: 0.5, radius: 125, slow: 0.35, tickRate: 0.38 },
      { damage: 8, cooldown: 0.45, radius: 140, slow: 0.4, tickRate: 0.35 },
      { damage: 11, cooldown: 0.45, radius: 158, slow: 0.45, tickRate: 0.32 },
      { damage: 15, cooldown: 0.4, radius: 180, slow: 0.55, tickRate: 0.3 },
    ],
  },

  // ============ 毒云：地面持续区域伤害 ============
  poisonCloud: {
    id: 'poisonCloud',
    name: '瘟疫毒云',
    type: 'ground_aoe',
    desc: '在最近敌群处释放毒云，持续造成毒素伤害。',
    color: '#8ad04f',
    levels: [
      { damage: 5, cooldown: 2.2, radius: 90, duration: 3.5, tickRate: 0.5, count: 1 },
      { damage: 7, cooldown: 2.0, radius: 100, duration: 4.0, tickRate: 0.5, count: 1 },
      { damage: 9, cooldown: 1.8, radius: 115, duration: 4.5, tickRate: 0.45, count: 2 },
      { damage: 12, cooldown: 1.6, radius: 130, duration: 5.0, tickRate: 0.4, count: 2 },
      { damage: 16, cooldown: 1.4, radius: 150, duration: 6.0, tickRate: 0.35, count: 3 },
    ],
  },
};

/**
 * 被动升级项（三选一里的属性类选项）。
 * apply 描述对玩家属性的乘/加修正。
 */
export const PASSIVE_DATA = {
  atkUp: { id: 'atkUp', name: '狂怒', desc: '攻击力 +20%', color: '#ff6b4a', stat: 'damageMul', add: 0.2, maxStack: 8 },
  critRateUp: { id: 'critRateUp', name: '致命', desc: '暴击率 +8%', color: '#ffd24a', stat: 'critRate', add: 0.08, maxStack: 8 },
  critDmgUp: { id: 'critDmgUp', name: '暴虐', desc: '暴击伤害 +25%', color: '#ff9a3c', stat: 'critDmg', add: 0.25, maxStack: 8 },
  moveUp: { id: 'moveUp', name: '疾风', desc: '移动速度 +10%', color: '#8fe0ff', stat: 'moveSpeedMul', add: 0.1, maxStack: 6 },
  atkSpeedUp: { id: 'atkSpeedUp', name: '迅捷', desc: '攻击速度 +12%', color: '#c8ff8f', stat: 'atkSpeedMul', add: 0.12, maxStack: 8 },
  maxHpUp: { id: 'maxHpUp', name: '坚韧', desc: '最大生命 +25', color: '#ff5a7a', stat: 'maxHpAdd', add: 25, maxStack: 10 },
  lifestealUp: { id: 'lifestealUp', name: '嗜血', desc: '吸血 +3%', color: '#c0392f', stat: 'lifesteal', add: 0.03, maxStack: 6 },
  pickupUp: { id: 'pickupUp', name: '贪婪', desc: '拾取范围 +25%', color: '#b0ff8f', stat: 'pickupMul', add: 0.25, maxStack: 5 },
  regenUp: { id: 'regenUp', name: '回春', desc: '每秒回血 +1', color: '#7affb0', stat: 'regenAdd', add: 1, maxStack: 6 },
};

/**
 * Build 组合定义（预留扩展）：当同时拥有指定技能时，触发额外增益。
 * 由 SkillSystem 在获取技能后检测并给出提示 / 加成。
 */
export const BUILD_SYNERGIES = [
  {
    id: 'infernalPlague',
    name: '炼狱瘟疫',
    require: ['fireball', 'poisonCloud'],
    desc: '火球点燃毒云，毒云伤害 +30%。',
    effect: { skill: 'poisonCloud', damageMul: 1.3 },
  },
  {
    id: 'stormFrost',
    name: '极地风暴',
    require: ['frostRing', 'chainLightning'],
    desc: '被冰环减速的敌人受到闪电链额外 +25% 伤害。',
    effect: { skill: 'chainLightning', damageMul: 1.25 },
  },
  {
    id: 'bladeStorm',
    name: '剑刃风暴',
    require: ['whirlwind', 'critRateUp'],
    desc: '旋风附带暴击，暴击率享受被动加成。',
    effect: { skill: 'whirlwind', canCrit: true },
  },
];

export default SKILL_DATA;
