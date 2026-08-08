/**
 * registerSkills.js
 * 注册全部职业主动技能实现。
 */

import { registerActiveSkill } from './registry.js';
import ThornField from './skills/ThornField.js';
import AncientBear from './skills/AncientBear.js';
import ShadowDash from './skills/ShadowDash.js';
import DeathRain from './skills/DeathRain.js';
import FrostNova from './skills/FrostNova.js';
import MeteorApocalypse from './skills/MeteorApocalypse.js';

let registered = false;

export function registerAllActiveSkills() {
  if (registered) return;
  registerActiveSkill('thorn_field', ThornField);
  registerActiveSkill('ancient_bear', AncientBear);
  registerActiveSkill('shadow_dash', ShadowDash);
  registerActiveSkill('death_rain', DeathRain);
  registerActiveSkill('frost_nova', FrostNova);
  registerActiveSkill('meteor_apocalypse', MeteorApocalypse);
  registered = true;
}

export default registerAllActiveSkills;
