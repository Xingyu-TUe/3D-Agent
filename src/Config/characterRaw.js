/** Auto-synced from Character.json — 职业原始配置 */
export default {
  "version": 1,
  "moveSpeedScale": 1.85,
  "characters": [
    {
      "id": "druid",
      "name": "德鲁伊",
      "nameEn": "Druid",
      "description": "近战 + 召唤 + 持续输出。拥有最高生命，召唤自然生物协同作战，后期成长极强。",
      "tagline": "自然之怒，群狼环伺",
      "model": "druid",
      "icon": "德",
      "color": "#6a9a3a",
      "accent": "#3a5a28",
      "recommend": 4,
      "difficulty": 2,
      "playstyle": "召唤物流派 · 坦度最高 · 挂机体验最好",
      "unlockCondition": {
        "type": "default"
      },
      "attributes": {
        "hp": 150,
        "atk": 20,
        "crit": 0.05,
        "atkSpeed": 1,
        "moveSpeed": 100
      },
      "skills": {
        "start": [
          "wolfSummon"
        ],
        "pool": [
          "wolfSummon",
          "bearSummon",
          "vineBind",
          "natureStorm",
          "thornsArmor",
          "poisonVines",
          "ancientNature"
        ],
        "ultimate": "ancientNature"
      },
      "growth": {
        "focus": "summon_tank",
        "notes": "优先提升召唤数量与狼攻击，再补坦度与范围持续伤害。"
      }
    },
    {
      "id": "hunter",
      "name": "猎人",
      "nameEn": "Hunter",
      "description": "远程高攻速高暴击，风筝输出。移速最快、暴击最高、射程最远，但血量最低。",
      "tagline": "疾风箭影，百步穿杨",
      "model": "hunter",
      "icon": "猎",
      "color": "#6b8f3c",
      "accent": "#3d2a1c",
      "recommend": 5,
      "difficulty": 3,
      "playstyle": "极致割草 · Build变化最多 · 追求爽感",
      "unlockCondition": {
        "type": "default"
      },
      "attributes": {
        "hp": 100,
        "atk": 28,
        "crit": 0.15,
        "atkSpeed": 1.3,
        "moveSpeed": 120
      },
      "skills": {
        "start": [
          "pierceArrow"
        ],
        "pool": [
          "pierceArrow",
          "multiShot",
          "explodeArrow",
          "frostArrow",
          "homingArrow",
          "chainArrow",
          "arrowStorm"
        ],
        "ultimate": "arrowStorm"
      },
      "growth": {
        "focus": "crit_ranged",
        "notes": "优先箭数量与穿透，再叠暴击与爆炸/追踪流派。"
      }
    },
    {
      "id": "mage",
      "name": "法师",
      "nameEn": "Mage",
      "description": "范围爆发 AOE 元素法术。技能最多、AOE 最大、爆发最高，生命最低。",
      "tagline": "元素共鸣，末日天启",
      "model": "mage",
      "icon": "法",
      "color": "#9b5ce0",
      "accent": "#3a1858",
      "recommend": 5,
      "difficulty": 3,
      "playstyle": "清屏最快 · Build最华丽 · 后期成长最高",
      "unlockCondition": {
        "type": "default"
      },
      "attributes": {
        "hp": 90,
        "atk": 30,
        "crit": 0.1,
        "atkSpeed": 0.9,
        "moveSpeed": 105
      },
      "skills": {
        "start": [
          "mageFireball"
        ],
        "pool": [
          "mageFireball",
          "frostRing",
          "chainLightning",
          "arcaneMissile",
          "meteor",
          "blackHole",
          "apocalypse"
        ],
        "ultimate": "apocalypse"
      },
      "growth": {
        "focus": "aoe_burst",
        "notes": "优先火球与范围技能，再叠法术数量与冷却。"
      }
    }
  ],
  "commonPassives": [
    "atkUp",
    "atkSpeedUp",
    "critRateUp",
    "maxHpUp",
    "lifestealUp",
    "moveUp"
  ],
  "reservedClasses": [
    "paladin",
    "necromancer",
    "assassin",
    "berserker",
    "engineer",
    "bard"
  ]
};
