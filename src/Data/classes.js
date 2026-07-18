/**
 * classes.js
 * 职业数据表。第一版仅「流浪骑士」，结构预留以便扩展多职业。
 */

export const CLASS_DATA = {
  wanderKnight: {
    id: 'wanderKnight',
    name: '流浪骑士',
    desc: '手持长剑的落魄骑士，攻守均衡，自动挥剑迎敌。',
    color: '#c9d3e0',
    // 基础属性
    base: {
      maxHp: 120,
      damage: 10,        // 基础攻击（作为技能伤害的加成基数参考）
      moveSpeed: 190,    // 像素/秒
      critRate: 0.05,    // 5%
      critDmg: 1.5,      // 暴击 150% 伤害
      lifesteal: 0,      // 吸血
      regen: 0,          // 每秒回血
      pickupRadius: 90,
      radius: 20,
    },
    startSkills: ['basicSlash'],
  },
};

export default CLASS_DATA;
