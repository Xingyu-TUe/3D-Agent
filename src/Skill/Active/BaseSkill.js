/**
 * BaseSkill.js
 * 主动技能基类。所有职业主动技继承此类。
 *
 * 生命周期：cast() → update() 循环 → destroy()
 * 约定接口：cast / update / cooldown / effect / destroy
 */

export class BaseSkill {
  /**
   * @param {object} def SkillConfig 中的技能定义
   * @param {object} ctx { player, enemySystem, bulletSystem, skillSystem, collision, effects, events, camera }
   */
  constructor(def, ctx) {
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.type = def.type;
    this.slot = def.slot; // 'small' | 'ultimate'
    this.ctx = ctx;

    this.cooldownMax = def.cooldown || 1;
    this.cooldownLeft = 0;
    this.duration = def.duration || 0;
    this.activeTime = 0;
    this.running = false;
    /** 额外冷却倍率（物品/被动可改，默认 1） */
    this.cooldownMul = 1;
  }

  get ready() {
    return this.cooldownLeft <= 0 && !this.running;
  }

  get cooldownRatio() {
    const cd = this.cooldown();
    if (cd <= 0) return 0;
    return Math.max(0, Math.min(1, this.cooldownLeft / cd));
  }

  /**
   * 有效冷却（秒）= 配置冷却 × 技能倍率 × 玩家 CDR
   * player.stats.final.skillCdr ∈ [0, 0.5]
   */
  cooldown() {
    const p = this.ctx && this.ctx.player;
    const cdr = p && p.stats && p.stats.final ? (p.stats.final.skillCdr || 0) : 0;
    const mul = Math.max(0.05, this.cooldownMul) * (1 - Math.min(0.5, Math.max(0, cdr)));
    return Math.max(0.35, this.cooldownMax * mul);
  }

  /** 缩短剩余冷却 */
  reduceCooldown(seconds) {
    if (!(seconds > 0)) return;
    this.cooldownLeft = Math.max(0, this.cooldownLeft - seconds);
  }

  /** 立即冷却（调试 / 特殊效果） */
  forceReady() {
    this.cooldownLeft = 0;
  }

  setCooldownLeft(seconds) {
    this.cooldownLeft = Math.max(0, seconds);
  }

  /** 尝试释放；成功返回 true */
  cast() {
    if (!this.ready) return false;
    const ok = this.onCast();
    if (!ok) return false;
    this.running = true;
    this.activeTime = this.duration;
    this.cooldownLeft = this.cooldown();
    this.playCastFeedback();
    return true;
  }

  /** 子类覆盖：真正释放逻辑，返回是否成功 */
  onCast() {
    this.effect();
    return true;
  }

  /** 每帧推进持续效果与冷却 */
  update(dt) {
    if (this.cooldownLeft > 0) {
      this.cooldownLeft = Math.max(0, this.cooldownLeft - dt);
    }
    if (!this.running) return;
    this.activeTime -= dt;
    this.onUpdate(dt);
    if (this.activeTime <= 0) {
      this.destroy();
    }
  }

  onUpdate(_dt) {}

  effect(_payload) {}

  /** 结束持续效果并清理（不清冷却） */
  destroy() {
    if (!this.running) return;
    this.running = false;
    this.activeTime = 0;
    this.onDestroy();
  }

  onDestroy() {}

  /** 统一表现接口：动画 / 范围提示 / 震动 / 音效 */
  playCastFeedback() {
    const { player, effects, events } = this.ctx;
    if (player && player.triggerAttack) {
      player.triggerAttack(this.def.animation || 'cast');
    }
    if (effects && this.def.range > 0 && this.def.range < 5000) {
      effects.telegraph(player.x, player.y, this.def.range, '#ffd24a', 0.35);
      if (effects.particles) effects.particles(player.x, player.y, '#ffd24a', 6, 90);
    }
    if (events) {
      events.emit('shake', { magnitude: this.slot === 'ultimate' ? 10 : 4, duration: 0.2 });
      events.emit('sfx', { id: this.id, kind: 'skill_cast' });
    }
  }
}

export default BaseSkill;
