/**
 * Stats.js
 * 玩家属性容器与最终属性计算。
 *
 * 设计：base（职业基础） + 修正来源（被动升级 / 装备 / Build）
 *   - 加法类：maxHpAdd, regenAdd, critRate, critDmg, lifesteal
 *   - 乘法类：damageMul, moveSpeedMul, atkSpeedMul, pickupMul
 *
 * 通过 addModifier / removeModifier 累积，recompute() 得到 final。
 */

export class Stats {
  constructor(base) {
    this.base = base;
    // 修正累加器
    this.mods = {
      maxHpAdd: 0,
      regenAdd: 0,
      critRate: 0,
      critDmg: 0,
      lifesteal: 0,
      damageMul: 0,       // 以 0 为基准，final = base * (1 + damageMul)
      moveSpeedMul: 0,
      atkSpeedMul: 0,
      pickupMul: 0,
    };
    this.final = {};
    this.recompute();
  }

  addStat(stat, amount) {
    if (this.mods[stat] === undefined) {
      // 支持直接对 base 生效的少数键（如未来扩展）
      this.mods[stat] = 0;
    }
    this.mods[stat] += amount;
    this.recompute();
  }

  recompute() {
    const b = this.base;
    const m = this.mods;
    const f = this.final;
    f.maxHp = b.maxHp + m.maxHpAdd;
    f.regen = b.regen + m.regenAdd;
    f.critRate = Math.min(0.95, b.critRate + m.critRate);
    f.critDmg = b.critDmg + m.critDmg;
    f.lifesteal = b.lifesteal + m.lifesteal;
    f.damageMul = 1 + m.damageMul;
    f.moveSpeed = b.moveSpeed * (1 + m.moveSpeedMul);
    f.atkSpeedMul = 1 + m.atkSpeedMul;   // 用于降低技能 CD
    f.pickupRadius = b.pickupRadius * (1 + m.pickupMul);
    f.radius = b.radius;
    return f;
  }
}

export default Stats;
