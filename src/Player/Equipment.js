/**
 * Equipment.js
 * 装备系统（预留接口）。提供随机生成（品质 + 词条）与本地存档能力，
 * 第一版不进入核心战斗数值平衡，但已可用于「长期装备成长」扩展。
 *
 * 用法：
 *   const item = EquipmentFactory.roll('weapon');          // 随机品质
 *   const item = EquipmentFactory.roll('ring', 'legendary'); // 指定品质
 *   player.equip(item);
 */

import { EQUIP_SLOTS, SLOT_NAMES, QUALITIES, AFFIX_POOL } from '../Data/equipment.js';
import { randRange, randInt, pick } from '../Utils/MathUtils.js';
import Platform from '../Utils/Platform.js';

const STORAGE_KEY = 'hellrift_inventory';

function rollQuality() {
  const list = Object.values(QUALITIES);
  let total = 0;
  for (const q of list) total += q.weight;
  let roll = Math.random() * total;
  for (const q of list) {
    roll -= q.weight;
    if (roll <= 0) return q;
  }
  return list[0];
}

function rollAffixes(quality) {
  const count = randInt(quality.affixMin, quality.affixMax);
  const pool = AFFIX_POOL.slice();
  const out = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = randInt(0, pool.length - 1);
    const def = pool.splice(idx, 1)[0];
    let value = randRange(def.min, def.max) * quality.mul;
    // 百分比类保留两位，数值类取整
    value = def.isPercent ? Math.round(value * 100) / 100 : Math.round(value);
    out.push({
      id: def.id,
      name: def.name,
      stat: def.stat,
      value,
      isPercent: def.isPercent,
    });
  }
  return out;
}

let _uid = 1;

export const EquipmentFactory = {
  roll(slot = pick(EQUIP_SLOTS), qualityId = null) {
    const quality = qualityId ? QUALITIES[qualityId] : rollQuality();
    const affixes = rollAffixes(quality);
    return {
      uid: _uid++,
      slot,
      slotName: SLOT_NAMES[slot],
      quality: quality.id,
      qualityName: quality.name,
      color: quality.color,
      name: `${quality.name}${SLOT_NAMES[slot]}`,
      affixes,
    };
  },
};

/**
 * 简单背包 / 存档管理（预留）。
 */
export const Inventory = {
  load() {
    return Platform.getStorage(STORAGE_KEY, { items: [], equipped: {} });
  },
  save(data) {
    Platform.setStorage(STORAGE_KEY, data);
  },
  add(item) {
    const data = this.load();
    data.items.push(item);
    this.save(data);
    return data;
  },
};

export default EquipmentFactory;
