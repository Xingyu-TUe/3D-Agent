/**
 * equipment.js
 * 装备系统数据（预留接口）。第一版不参与核心战斗循环，
 * 但提供完整的部位 / 品质 / 词条定义，方便后续接入「长期装备成长」。
 *
 * 使用方式（后续扩展）：
 *   import { EquipmentFactory } from '../Player/Equipment.js';
 *   const item = EquipmentFactory.roll('weapon', 'epic');
 */

// 装备部位
export const EQUIP_SLOTS = ['weapon', 'helmet', 'armor', 'boots', 'ring', 'amulet'];

export const SLOT_NAMES = {
  weapon: '武器',
  helmet: '头盔',
  armor: '护甲',
  boots: '鞋子',
  ring: '戒指',
  amulet: '项链',
};

// 品质：权重 + 词条数量范围 + 数值倍率 + 颜色
export const QUALITIES = {
  common: { id: 'common', name: '普通', color: '#b5b5b5', weight: 50, affixMin: 1, affixMax: 1, mul: 1.0 },
  rare: { id: 'rare', name: '稀有', color: '#4aa3ff', weight: 30, affixMin: 2, affixMax: 2, mul: 1.3 },
  epic: { id: 'epic', name: '史诗', color: '#a05cff', weight: 14, affixMin: 3, affixMax: 3, mul: 1.7 },
  legendary: { id: 'legendary', name: '传说', color: '#ff9a1e', weight: 5, affixMin: 4, affixMax: 4, mul: 2.4 },
  mythic: { id: 'mythic', name: '神话', color: '#ff3b6b', weight: 1, affixMin: 5, affixMax: 5, mul: 3.5 },
};

// 词条池：对玩家最终属性生效的修正（与 PASSIVE_DATA 的 stat 命名对齐）
export const AFFIX_POOL = [
  { id: 'aff_dmg', name: '攻击强化', stat: 'damageMul', min: 0.04, max: 0.18, isPercent: true },
  { id: 'aff_hp', name: '生命强化', stat: 'maxHpAdd', min: 10, max: 60, isPercent: false },
  { id: 'aff_crit', name: '暴击率', stat: 'critRate', min: 0.02, max: 0.1, isPercent: true },
  { id: 'aff_critdmg', name: '暴击伤害', stat: 'critDmg', min: 0.1, max: 0.5, isPercent: true },
  { id: 'aff_move', name: '移动速度', stat: 'moveSpeedMul', min: 0.03, max: 0.12, isPercent: true },
  { id: 'aff_aspd', name: '攻击速度', stat: 'atkSpeedMul', min: 0.04, max: 0.15, isPercent: true },
  { id: 'aff_ls', name: '吸血', stat: 'lifesteal', min: 0.01, max: 0.05, isPercent: true },
  { id: 'aff_regen', name: '生命回复', stat: 'regenAdd', min: 1, max: 4, isPercent: false },
  { id: 'aff_pickup', name: '拾取范围', stat: 'pickupMul', min: 0.05, max: 0.25, isPercent: true },
];

export default {
  EQUIP_SLOTS,
  SLOT_NAMES,
  QUALITIES,
  AFFIX_POOL,
};
