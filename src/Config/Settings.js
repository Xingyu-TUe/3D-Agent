/**
 * Settings.js
 * 玩家可调设置：读写本地存储并同步到 GameConfig.display。
 */

import Platform from '../Utils/Platform.js';
import GameConfig from './GameConfig.js';

const STORAGE_KEY = 'hellrift_settings_v1';

export function loadSettings() {
  const saved = Platform.getStorage(STORAGE_KEY, null);
  if (!saved || typeof saved !== 'object') return;
  if (typeof saved.showCombatNumbers === 'boolean') {
    GameConfig.display.showCombatNumbers = saved.showCombatNumbers;
  }
}

export function saveSettings() {
  Platform.setStorage(STORAGE_KEY, {
    showCombatNumbers: !!GameConfig.display.showCombatNumbers,
  });
}

/** @returns {boolean} 切换后的值 */
export function toggleCombatNumbers() {
  GameConfig.display.showCombatNumbers = !GameConfig.display.showCombatNumbers;
  saveSettings();
  return GameConfig.display.showCombatNumbers;
}

export function getShowCombatNumbers() {
  return !!GameConfig.display.showCombatNumbers;
}

export default {
  loadSettings,
  saveSettings,
  toggleCombatNumbers,
  getShowCombatNumbers,
};
