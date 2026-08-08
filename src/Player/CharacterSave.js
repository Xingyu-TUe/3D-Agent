/**
 * CharacterSave.js
 * 角色存档：按职业记录等级、秘境、Boss 击杀、金币、游戏时间、皮肤、技能解锁等。
 * 使用 Platform 本地存储，方便后续成长系统扩展。
 */

import Platform from '../Utils/Platform.js';
import { CHARACTER_LIST, getDefaultCharacterId } from '../Config/Character.js';

const STORAGE_KEY = 'hellrift_character_save_v1';

function emptyClassSave() {
  return {
    level: 1,
    highestRift: 0,
    bossKills: 0,
    gold: 0,
    playTime: 0,
    unlockedSkins: ['default'],
    unlockedSkills: [],
    runs: 0,
    wins: 0,
  };
}

function defaultSave() {
  const classes = {};
  for (const c of CHARACTER_LIST) {
    classes[c.id] = emptyClassSave();
  }
  return {
    version: 1,
    selectedClassId: getDefaultCharacterId(),
    classes,
    totalGold: 0,
    totalPlayTime: 0,
  };
}

export const CharacterSave = {
  load() {
    const data = Platform.getStorage(STORAGE_KEY, null);
    if (!data || typeof data !== 'object') return defaultSave();
    // 合并新增职业
    const base = defaultSave();
    for (const id in base.classes) {
      if (!data.classes || !data.classes[id]) {
        if (!data.classes) data.classes = {};
        data.classes[id] = emptyClassSave();
      } else {
        data.classes[id] = { ...emptyClassSave(), ...data.classes[id] };
      }
    }
    data.selectedClassId = data.selectedClassId || base.selectedClassId;
    return data;
  },

  save(data) {
    Platform.setStorage(STORAGE_KEY, data);
  },

  getSelectedClassId() {
    return this.load().selectedClassId;
  },

  setSelectedClassId(id) {
    const data = this.load();
    data.selectedClassId = id;
    this.save(data);
  },

  getClassSave(classId) {
    const data = this.load();
    return data.classes[classId] || emptyClassSave();
  },

  /**
   * 一局结束后回写存档。
   * @param {{ classId, survived, victory, kills, bossKilled, goldEarned }} result
   */
  recordRun(result) {
    const data = this.load();
    const cls = data.classes[result.classId] || emptyClassSave();
    cls.runs += 1;
    cls.playTime += result.survived || 0;
    cls.gold += result.goldEarned || 0;
    if (result.victory) cls.wins += 1;
    if (result.bossKilled) cls.bossKills += 1;
    // 简易等级：每胜利 +2，每局 +1，上限 99
    const gain = (result.victory ? 2 : 0) + 1;
    cls.level = Math.min(99, cls.level + gain);
    // 秘境层数预留：胜利时 +1
    if (result.victory) cls.highestRift = Math.max(cls.highestRift, cls.highestRift + 1);

    data.classes[result.classId] = cls;
    data.totalGold = (data.totalGold || 0) + (result.goldEarned || 0);
    data.totalPlayTime = (data.totalPlayTime || 0) + (result.survived || 0);
    this.save(data);
    return cls;
  },
};

export default CharacterSave;
