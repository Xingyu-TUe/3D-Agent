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

  // ============================================================
  // 德鲁伊专属
  // ============================================================
  wolfSummon: {
    id: 'wolfSummon',
    name: '狼灵召唤',
    type: 'summon',
    desc: '周期性召唤幽影狼，自动追击最近敌人。',
    color: '#8ad04f',
    isBasic: true,
    summon: { kind: 'wolf', lifetime: 18 },
    levels: [
      { damage: 8, cooldown: 3.0, maxCount: 3, summonHp: 40, summonSpeed: 210, summonRadius: 14 },
      { damage: 11, cooldown: 2.8, maxCount: 3, summonHp: 50, summonSpeed: 220, summonRadius: 14 },
      { damage: 15, cooldown: 2.5, maxCount: 4, summonHp: 65, summonSpeed: 230, summonRadius: 15 },
      { damage: 20, cooldown: 2.2, maxCount: 5, summonHp: 80, summonSpeed: 240, summonRadius: 16 },
      { damage: 28, cooldown: 1.9, maxCount: 6, summonHp: 100, summonSpeed: 250, summonRadius: 17 },
    ],
  },
  bearSummon: {
    id: 'bearSummon',
    name: '熊灵召唤',
    type: 'summon',
    desc: '召唤厚皮熊灵，高血量近战压制。',
    color: '#c49a4a',
    summon: { kind: 'bear', lifetime: 22 },
    levels: [
      { damage: 16, cooldown: 6.0, maxCount: 1, summonHp: 160, summonSpeed: 140, summonRadius: 22 },
      { damage: 22, cooldown: 5.5, maxCount: 1, summonHp: 200, summonSpeed: 145, summonRadius: 23 },
      { damage: 30, cooldown: 5.0, maxCount: 2, summonHp: 250, summonSpeed: 150, summonRadius: 24 },
      { damage: 40, cooldown: 4.5, maxCount: 2, summonHp: 320, summonSpeed: 155, summonRadius: 26 },
      { damage: 55, cooldown: 4.0, maxCount: 3, summonHp: 400, summonSpeed: 160, summonRadius: 28 },
    ],
  },
  vineBind: {
    id: 'vineBind',
    name: '毒藤缠绕',
    type: 'ground_aoe',
    desc: '在敌群处生长毒藤，持续伤害并减速。',
    color: '#4a9a3a',
    levels: [
      { damage: 6, cooldown: 2.4, radius: 95, duration: 3.2, tickRate: 0.45, count: 1, slow: 0.35 },
      { damage: 8, cooldown: 2.2, radius: 105, duration: 3.6, tickRate: 0.42, count: 1, slow: 0.4 },
      { damage: 11, cooldown: 2.0, radius: 120, duration: 4.0, tickRate: 0.4, count: 2, slow: 0.45 },
      { damage: 15, cooldown: 1.8, radius: 135, duration: 4.5, tickRate: 0.38, count: 2, slow: 0.5 },
      { damage: 20, cooldown: 1.5, radius: 155, duration: 5.0, tickRate: 0.35, count: 3, slow: 0.55 },
    ],
  },
  poisonVines: {
    id: 'poisonVines',
    name: '荆棘毒蔓',
    type: 'ground_aoe',
    desc: '释放蔓延毒蔓，大范围持续腐蚀。',
    color: '#6bcf3a',
    levels: [
      { damage: 7, cooldown: 2.6, radius: 110, duration: 3.5, tickRate: 0.4, count: 1 },
      { damage: 10, cooldown: 2.3, radius: 125, duration: 4.0, tickRate: 0.38, count: 1 },
      { damage: 14, cooldown: 2.0, radius: 140, duration: 4.5, tickRate: 0.35, count: 2 },
      { damage: 19, cooldown: 1.8, radius: 155, duration: 5.0, tickRate: 0.32, count: 2 },
      { damage: 26, cooldown: 1.5, radius: 175, duration: 5.5, tickRate: 0.3, count: 3 },
    ],
  },
  thornsArmor: {
    id: 'thornsArmor',
    name: '荆棘护甲',
    type: 'aura_ring',
    desc: '自然荆棘环绕周身，反伤并伤害靠近的敌人。',
    color: '#8fbf5a',
    levels: [
      { damage: 5, cooldown: 0.45, radius: 85, slow: 0.1, tickRate: 0.35 },
      { damage: 7, cooldown: 0.42, radius: 95, slow: 0.12, tickRate: 0.32 },
      { damage: 10, cooldown: 0.38, radius: 110, slow: 0.15, tickRate: 0.3 },
      { damage: 14, cooldown: 0.35, radius: 125, slow: 0.18, tickRate: 0.28 },
      { damage: 19, cooldown: 0.3, radius: 145, slow: 0.22, tickRate: 0.25 },
    ],
  },
  natureStorm: {
    id: 'natureStorm',
    name: '自然风暴',
    type: 'nova',
    desc: '释放自然风暴，对周围敌人造成范围伤害。',
    color: '#5fd080',
    levels: [
      { damage: 28, cooldown: 3.2, radius: 180 },
      { damage: 38, cooldown: 2.9, radius: 200 },
      { damage: 52, cooldown: 2.6, radius: 220 },
      { damage: 70, cooldown: 2.3, radius: 250 },
      { damage: 95, cooldown: 2.0, radius: 280 },
    ],
  },
  ancientNature: {
    id: 'ancientNature',
    name: '远古自然降临',
    type: 'summon',
    desc: '终极：召唤巨大树人，持续攻击周围敌人。',
    color: '#3d8a2a',
    isUltimate: true,
    summon: { kind: 'treant', lifetime: 25 },
    levels: [
      { damage: 22, cooldown: 18, maxCount: 1, summonHp: 600, summonSpeed: 90, summonRadius: 40 },
      { damage: 30, cooldown: 16, maxCount: 1, summonHp: 800, summonSpeed: 95, summonRadius: 42 },
      { damage: 40, cooldown: 14, maxCount: 1, summonHp: 1000, summonSpeed: 100, summonRadius: 45 },
      { damage: 55, cooldown: 12, maxCount: 1, summonHp: 1300, summonSpeed: 105, summonRadius: 48 },
      { damage: 75, cooldown: 10, maxCount: 1, summonHp: 1700, summonSpeed: 110, summonRadius: 52 },
    ],
  },

  // ============================================================
  // 猎人专属
  // ============================================================
  pierceArrow: {
    id: 'pierceArrow',
    name: '穿透箭',
    type: 'projectile',
    desc: '自动射出可穿透多个敌人的箭矢。',
    color: '#5cb8ff',
    isBasic: true,
    projectile: { speed: 680, radius: 8, life: 1.5, explode: false, pierce: 3 },
    levels: [
      { damage: 14, cooldown: 0.55, count: 1, pierce: 3 },
      { damage: 18, cooldown: 0.5, count: 1, pierce: 4 },
      { damage: 24, cooldown: 0.45, count: 2, pierce: 4 },
      { damage: 32, cooldown: 0.4, count: 2, pierce: 5 },
      { damage: 42, cooldown: 0.35, count: 3, pierce: 6 },
    ],
  },
  multiShot: {
    id: 'multiShot',
    name: '多重射击',
    type: 'projectile',
    desc: '同时射出多支箭矢覆盖扇形区域。',
    color: '#7ad0ff',
    projectile: { speed: 640, radius: 7, life: 1.4, explode: false, pierce: 1 },
    levels: [
      { damage: 10, cooldown: 1.0, count: 3, pierce: 1 },
      { damage: 13, cooldown: 0.9, count: 4, pierce: 1 },
      { damage: 17, cooldown: 0.8, count: 5, pierce: 2 },
      { damage: 22, cooldown: 0.7, count: 6, pierce: 2 },
      { damage: 30, cooldown: 0.6, count: 8, pierce: 2 },
    ],
  },
  explodeArrow: {
    id: 'explodeArrow',
    name: '爆炸箭',
    type: 'projectile',
    desc: '命中后爆炸，造成范围伤害。',
    color: '#ff8a4a',
    projectile: { speed: 560, radius: 10, life: 1.8, explode: true, explodeRadius: 70, pierce: 0 },
    levels: [
      { damage: 22, cooldown: 1.4, count: 1, explodeRadius: 70 },
      { damage: 30, cooldown: 1.25, count: 1, explodeRadius: 85 },
      { damage: 40, cooldown: 1.1, count: 2, explodeRadius: 95 },
      { damage: 52, cooldown: 0.95, count: 2, explodeRadius: 110 },
      { damage: 70, cooldown: 0.8, count: 3, explodeRadius: 125 },
    ],
  },
  frostArrow: {
    id: 'frostArrow',
    name: '冰冻箭',
    type: 'projectile',
    desc: '射出冰箭，命中减速敌人。',
    color: '#9fe8ff',
    projectile: { speed: 600, radius: 8, life: 1.5, explode: false, pierce: 2, slow: 0.45, slowDuration: 1.2 },
    levels: [
      { damage: 12, cooldown: 1.1, count: 1, pierce: 2 },
      { damage: 16, cooldown: 1.0, count: 1, pierce: 2 },
      { damage: 22, cooldown: 0.9, count: 2, pierce: 3 },
      { damage: 28, cooldown: 0.8, count: 2, pierce: 3 },
      { damage: 38, cooldown: 0.7, count: 3, pierce: 4 },
    ],
  },
  homingArrow: {
    id: 'homingArrow',
    name: '追踪箭',
    type: 'homing',
    desc: '自动锁定并追踪最近敌人的魔箭。',
    color: '#ffd24a',
    projectile: { speed: 420, radius: 9, life: 2.0, turnRate: 8 },
    levels: [
      { damage: 16, cooldown: 1.2, count: 1 },
      { damage: 22, cooldown: 1.05, count: 2 },
      { damage: 30, cooldown: 0.9, count: 2 },
      { damage: 40, cooldown: 0.8, count: 3 },
      { damage: 55, cooldown: 0.7, count: 4 },
    ],
  },
  chainArrow: {
    id: 'chainArrow',
    name: '连锁箭',
    type: 'chain',
    desc: '箭矢在敌人之间弹跳传导。',
    color: '#6ad0ff',
    levels: [
      { damage: 16, cooldown: 1.6, jumps: 3, range: 200, falloff: 0.88 },
      { damage: 22, cooldown: 1.45, jumps: 4, range: 220, falloff: 0.88 },
      { damage: 30, cooldown: 1.3, jumps: 5, range: 240, falloff: 0.9 },
      { damage: 40, cooldown: 1.15, jumps: 6, range: 260, falloff: 0.9 },
      { damage: 54, cooldown: 1.0, jumps: 8, range: 280, falloff: 0.92 },
    ],
  },
  arrowStorm: {
    id: 'arrowStorm',
    name: '暴风箭雨',
    type: 'screen_barrage',
    desc: '终极：全屏降下无数箭矢，清扫战场。',
    color: '#3aa0ff',
    isUltimate: true,
    levels: [
      { damage: 18, cooldown: 16, waves: 4, countPerWave: 12, radius: 420 },
      { damage: 24, cooldown: 14, waves: 5, countPerWave: 14, radius: 460 },
      { damage: 32, cooldown: 12, waves: 6, countPerWave: 16, radius: 500 },
      { damage: 42, cooldown: 11, waves: 7, countPerWave: 18, radius: 540 },
      { damage: 56, cooldown: 9, waves: 8, countPerWave: 22, radius: 600 },
    ],
  },

  // ============================================================
  // 法师专属
  // ============================================================
  mageFireball: {
    id: 'mageFireball',
    name: '火球术',
    type: 'projectile',
    desc: '自动释放火球，命中产生爆炸。',
    color: '#ff8a1e',
    isBasic: true,
    projectile: { speed: 400, radius: 15, life: 2.4, explode: true, explodeRadius: 80, pierce: 0 },
    levels: [
      { damage: 26, cooldown: 1.4, count: 1, explodeRadius: 80 },
      { damage: 34, cooldown: 1.25, count: 1, explodeRadius: 95 },
      { damage: 46, cooldown: 1.1, count: 2, explodeRadius: 110 },
      { damage: 60, cooldown: 0.95, count: 2, explodeRadius: 125 },
      { damage: 80, cooldown: 0.8, count: 3, explodeRadius: 145 },
    ],
  },
  arcaneMissile: {
    id: 'arcaneMissile',
    name: '奥术飞弹',
    type: 'homing',
    desc: '连续发射自动追踪的奥术飞弹。',
    color: '#d0a0ff',
    projectile: { speed: 480, radius: 8, life: 1.8, turnRate: 10 },
    levels: [
      { damage: 10, cooldown: 0.9, count: 3 },
      { damage: 13, cooldown: 0.8, count: 4 },
      { damage: 17, cooldown: 0.7, count: 5 },
      { damage: 22, cooldown: 0.6, count: 6 },
      { damage: 30, cooldown: 0.5, count: 8 },
    ],
  },
  meteor: {
    id: 'meteor',
    name: '陨石',
    type: 'meteor',
    desc: '在敌群上空召唤陨石砸落，造成巨大范围伤害。',
    color: '#ff5a2a',
    levels: [
      { damage: 55, cooldown: 4.5, radius: 140, count: 1, delay: 0.55 },
      { damage: 75, cooldown: 4.0, radius: 155, count: 1, delay: 0.5 },
      { damage: 100, cooldown: 3.5, radius: 170, count: 2, delay: 0.48 },
      { damage: 130, cooldown: 3.0, radius: 190, count: 2, delay: 0.45 },
      { damage: 175, cooldown: 2.5, radius: 210, count: 3, delay: 0.4 },
    ],
  },
  blackHole: {
    id: 'blackHole',
    name: '黑洞',
    type: 'blackhole',
    desc: '制造引力黑洞，牵引并伤害范围内敌人。',
    color: '#7a4aff',
    levels: [
      { damage: 8, cooldown: 5.5, radius: 150, duration: 2.5, tickRate: 0.35, pull: 180 },
      { damage: 11, cooldown: 5.0, radius: 165, duration: 2.8, tickRate: 0.32, pull: 200 },
      { damage: 15, cooldown: 4.5, radius: 180, duration: 3.2, tickRate: 0.3, pull: 230 },
      { damage: 20, cooldown: 4.0, radius: 200, duration: 3.6, tickRate: 0.28, pull: 260 },
      { damage: 28, cooldown: 3.5, radius: 230, duration: 4.0, tickRate: 0.25, pull: 300 },
    ],
  },
  apocalypse: {
    id: 'apocalypse',
    name: '末日天启',
    type: 'screen_barrage',
    desc: '终极：召唤巨大陨石雨覆盖整个屏幕。',
    color: '#ff2a4a',
    isUltimate: true,
    levels: [
      { damage: 40, cooldown: 18, waves: 3, countPerWave: 6, radius: 480, meteor: true },
      { damage: 55, cooldown: 16, waves: 4, countPerWave: 7, radius: 520, meteor: true },
      { damage: 75, cooldown: 14, waves: 5, countPerWave: 8, radius: 560, meteor: true },
      { damage: 100, cooldown: 12, waves: 6, countPerWave: 9, radius: 600, meteor: true },
      { damage: 140, cooldown: 10, waves: 7, countPerWave: 10, radius: 650, meteor: true },
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
    id: 'packLeader',
    name: '狼群领袖',
    require: ['wolfSummon', 'bearSummon'],
    desc: '狼灵与熊灵协同，召唤物伤害 +25%。',
    effect: { skill: 'wolfSummon', damageMul: 1.25 },
  },
  {
    id: 'stormFrost',
    name: '极地风暴',
    require: ['frostRing', 'chainLightning'],
    desc: '冰环与闪电共鸣，闪电链伤害 +25%。',
    effect: { skill: 'chainLightning', damageMul: 1.25 },
  },
  {
    id: 'explosiveVolley',
    name: '爆裂齐射',
    require: ['multiShot', 'explodeArrow'],
    desc: '多重射击附带爆炸矢感，爆炸箭伤害 +20%。',
    effect: { skill: 'explodeArrow', damageMul: 1.2 },
  },
  {
    id: 'arcaneInferno',
    name: '奥术炼狱',
    require: ['mageFireball', 'meteor'],
    desc: '火球引燃陨石，陨石伤害 +30%。',
    effect: { skill: 'meteor', damageMul: 1.3 },
  },
];

export default SKILL_DATA;
