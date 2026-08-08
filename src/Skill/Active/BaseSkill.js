/**
 * BaseSkill.js
 * 主动技能基类。所有职业主动技继承此类。
 *
 * 生命周期：cast() → update() 循环 → destroy()
 * 约定接口：cast / update / cooldown / effect / destroy
 *
 * 注意：本模块为骨架，具体职业技能在后续步骤实现。
 */

export class BaseSkill {
  /**
   * @param {object} def SkillConfig 中的技能定义
   * @param {object} ctx { player, enemySystem, bulletSystem, collision, effects, events, camera }
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
  }

  get ready() {
    return this.cooldownLeft <= 0 && !this.running;
  }

  get cooldownRatio() {
    const cd = this.cooldown();
    if (cd <= 0) return 0;
    return Math.max(0, Math.min(1, this.cooldownLeft / cd));
  }

  /** 配置冷却时长（秒） */
  cooldown() {
    return this.cooldownMax;
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

  /** 子类覆盖：持续帧逻辑 */
  onUpdate(_dt) {}

  /** 子类覆盖：瞬时/周期效果 */
  effect(_payload) {}

  /** 结束持续效果并清理（不清冷却） */
  destroy() {
    if (!this.running) return;
    this.running = false;
    this.activeTime = 0;
    this.onDestroy();
  }

  onDestroy() {}

  /** 统一表现接口占位：动画 / 震动 / 音效 / 范围提示 */
  playCastFeedback() {
    const { player, effects, events } = this.ctx;
    if (player && player.triggerAttack) {
      player.triggerAttack(this.def.animation || 'cast');
    }
    if (effects && this.def.range > 0 && this.def.range < 5000) {
      effects.telegraph(player.x, player.y, this.def.range, '#ffd24a', 0.35);
    }
    if (events) {
      events.emit('shake', { magnitude: this.slot === 'ultimate' ? 10 : 4, duration: 0.2 });
      events.emit('sfx', { id: this.id, kind: 'skill_cast' });
    }
  }
}

export default BaseSkill;
