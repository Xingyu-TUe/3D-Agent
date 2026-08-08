/** Auto-synced from SkillConfig.json — 主动技能配置（供打包内联） */
export default {
  "version": 1,
  "byClass": {
    "druid": {
      "small": "thorn_field",
      "ultimate": "ancient_bear"
    },
    "hunter": {
      "small": "shadow_dash",
      "ultimate": "death_rain"
    },
    "mage": {
      "small": "frost_nova",
      "ultimate": "meteor_apocalypse"
    }
  },
  "skills": {
    "thorn_field": {
      "id": "thorn_field",
      "name": "荆棘领域",
      "classId": "druid",
      "slot": "small",
      "type": "aoe_zone",
      "cooldown": 18,
      "duration": 6,
      "damage": 12,
      "range": 300,
      "effect": "slow_dot",
      "animation": "cast",
      "icon": "vineBind",
      "params": { "slowFactor": 0.5, "tickRate": 0.4 }
    },
    "ancient_bear": {
      "id": "ancient_bear",
      "name": "远古熊灵",
      "classId": "druid",
      "slot": "ultimate",
      "type": "transform",
      "cooldown": 90,
      "duration": 12,
      "damage": 0,
      "range": 0,
      "effect": "buff_transform",
      "animation": "cast",
      "icon": "bearSummon",
      "params": { "attackMul": 4.0, "hpMul": 2.0, "rangeMul": 1.8 }
    },
    "shadow_dash": {
      "id": "shadow_dash",
      "name": "暗影突进",
      "classId": "hunter",
      "slot": "small",
      "type": "dash",
      "cooldown": 12,
      "duration": 0.35,
      "damage": 20,
      "range": 400,
      "effect": "dash_invincible",
      "animation": "attack01",
      "icon": "pierceArrow",
      "params": { "distance": 400, "shadowArrows": 5 }
    },
    "death_rain": {
      "id": "death_rain",
      "name": "死亡箭雨",
      "classId": "hunter",
      "slot": "ultimate",
      "type": "screen_barrage",
      "cooldown": 75,
      "duration": 5,
      "damage": 18,
      "range": 9999,
      "effect": "arrow_rain",
      "animation": "shoot",
      "icon": "arrowStorm",
      "params": { "rate": 12 }
    },
    "frost_nova": {
      "id": "frost_nova",
      "name": "冰霜新星",
      "classId": "mage",
      "slot": "small",
      "type": "nova",
      "cooldown": 15,
      "duration": 0.4,
      "damage": 2.5,
      "range": 220,
      "effect": "freeze",
      "animation": "cast",
      "icon": "frostRing",
      "params": { "freezeDuration": 2, "damageIsMul": true }
    },
    "meteor_apocalypse": {
      "id": "meteor_apocalypse",
      "name": "陨石天启",
      "classId": "mage",
      "slot": "ultimate",
      "type": "channel_meteor",
      "cooldown": 90,
      "duration": 3,
      "damage": 10,
      "range": 800,
      "effect": "meteor",
      "animation": "cast",
      "icon": "apocalypse",
      "params": { "chargeTime": 3, "damageIsMul": true }
    }
  }
};
