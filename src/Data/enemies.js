/**
 * enemies.js
 * 怪物数据表（数据驱动）。第一版：骷髅 / 食尸鬼 / 地狱犬 / 恶魔法师 / 堕落骑士 / Boss 裂隙领主。
 *
 * 以纯数据 JSON 形式描述，新增怪物只需在此追加，无需改代码。
 * 字段说明：
 *   id        唯一标识
 *   name      中文名
 *   hp        基础生命
 *   speed     移动速度（像素/秒）
 *   damage    接触伤害
 *   radius    碰撞/绘制半径
 *   exp       死亡掉落经验值
 *   color     主体颜色（程序化绘制，无需美术素材）
 *   shape     绘制形状：skeleton/ghoul/hound/mage/knight/boss
 *   attackType contact（接触伤害）/ ranged（远程，预留）
 *   tier      normal / elite / boss
 *   weight    在刷怪池中的随机权重
 *   minTime   该怪物开始出现的时间（秒）
 */

export const ENEMY_DATA = {
  skeleton: {
    id: 'skeleton',
    name: '骷髅',
    hp: 12,
    speed: 62,
    damage: 6,
    radius: 16,
    exp: 3,
    color: '#d8d2c2',
    shape: 'skeleton',
    attackType: 'contact',
    tier: 'normal',
    weight: 60,
    minTime: 0,
  },
  ghoul: {
    id: 'ghoul',
    name: '食尸鬼',
    hp: 26,
    speed: 78,
    damage: 9,
    radius: 18,
    exp: 5,
    color: '#7fae6b',
    shape: 'ghoul',
    attackType: 'contact',
    tier: 'normal',
    weight: 45,
    minTime: 30,
  },
  hellhound: {
    id: 'hellhound',
    name: '地狱犬',
    hp: 20,
    speed: 132,
    damage: 8,
    radius: 17,
    exp: 6,
    color: '#c0492f',
    shape: 'hound',
    attackType: 'contact',
    tier: 'normal',
    weight: 35,
    minTime: 60,
  },
  demonMage: {
    id: 'demonMage',
    name: '恶魔法师',
    hp: 40,
    speed: 58,
    damage: 12,
    radius: 19,
    exp: 10,
    color: '#8a4fd0',
    shape: 'mage',
    attackType: 'contact',
    tier: 'normal',
    weight: 22,
    minTime: 90,
  },
  fallenKnight: {
    id: 'fallenKnight',
    name: '堕落骑士',
    hp: 90,
    speed: 66,
    damage: 16,
    radius: 22,
    exp: 18,
    color: '#4a5a78',
    shape: 'knight',
    attackType: 'contact',
    tier: 'normal',
    weight: 16,
    minTime: 130,
  },

  // 精英：由普通怪强化而来（运行时套用 eliteModifier），此处提供独立精英模板
  elite_ghoulLord: {
    id: 'elite_ghoulLord',
    name: '食尸鬼领主',
    hp: 420,
    speed: 74,
    damage: 22,
    radius: 30,
    exp: 90,
    color: '#4e8a3c',
    shape: 'ghoul',
    attackType: 'contact',
    tier: 'elite',
    weight: 0,
    minTime: 9999,
  },

  // Boss：裂隙领主
  riftLord: {
    id: 'riftLord',
    name: '裂隙领主',
    hp: 8000,
    speed: 52,
    damage: 30,
    radius: 64,
    exp: 800,
    color: '#b3121f',
    shape: 'boss',
    attackType: 'contact',
    tier: 'boss',
    weight: 0,
    minTime: 9999,
    // Boss 多阶段：阈值为剩余血量百分比
    phases: [
      { hpPct: 1.0, name: '苏醒', speedMul: 1.0, skills: ['charge', 'summon'] },
      { hpPct: 0.6, name: '狂暴', speedMul: 1.25, skills: ['charge', 'summon', 'novaAoe'] },
      { hpPct: 0.3, name: '崩坏', speedMul: 1.5, skills: ['charge', 'novaAoe', 'summon'] },
    ],
    bossSkills: {
      charge: { cooldown: 6, telegraph: 0.9, chargeSpeed: 620, damage: 45 },
      summon: { cooldown: 10, count: 6, enemyId: 'skeleton' },
      novaAoe: { cooldown: 8, telegraph: 1.1, radius: 260, damage: 60 },
    },
  },
};

// 精英化修正：对普通怪临时套用，形成精英
export const ELITE_MODIFIER = {
  hpMul: 14,
  damageMul: 2.2,
  radiusMul: 1.7,
  speedMul: 0.95,
  expMul: 12,
  tint: '#ffcf5c', // 精英描边金色
};

// 随时间对怪物基础属性的整体缩放（防止后期太软）
export const DIFFICULTY_SCALE = {
  hp: [
    { time: 0, value: 1.0 },
    { time: 60, value: 1.4 },
    { time: 120, value: 2.0 },
    { time: 180, value: 2.8 },
  ],
  damage: [
    { time: 0, value: 1.0 },
    { time: 90, value: 1.35 },
    { time: 180, value: 1.7 },
  ],
};

/** 小 Boss 模板（每 30 秒轮换），相对普通怪大幅强化 */
export const MINI_BOSS_POOL = ['hellhound', 'demonMage', 'fallenKnight', 'ghoul'];

export default ENEMY_DATA;
