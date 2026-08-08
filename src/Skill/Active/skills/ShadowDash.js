/**
 * ShadowDash.js — 猎人小技能：暗影突进
 * 朝面向快速位移 400px，期间无敌，路径留下暗影箭。
 */

import BaseSkill from '../BaseSkill.js';
import { emitShake, emitSfx } from '../helpers.js';

export class ShadowDash extends BaseSkill {
  constructor(def, ctx) {
    super(def, ctx);
    this.fromX = 0;
    this.fromY = 0;
    this.toX = 0;
    this.toY = 0;
    this.travel = 0;
    this._arrowsFired = 0;
    this._arrowTarget = 0;
  }

  playCastFeedback() {}

  onCast() {
    const { player, effects, events } = this.ctx;
    const params = this.def.params || {};
    const distance = params.distance || this.def.range || 400;
    this._arrowTarget = params.shadowArrows || 5;
    this._arrowsFired = 0;
    this.travel = 0;

    this.fromX = player.x;
    this.fromY = player.y;
    const ang = player.facing;
    this.toX = this.fromX + Math.cos(ang) * distance;
    this.toY = this.fromY + Math.sin(ang) * distance;

    player.invincible = Math.max(player.invincible, this.duration || 0.35);
    if (player.triggerAttack) player.triggerAttack(this.def.animation || 'attack01');
    if (effects) {
      effects.telegraph(this.fromX, this.fromY, 48, '#6b4cff', 0.2);
      effects.puff(this.fromX, this.fromY, '#3a2a6a');
    }
    emitShake(events, 4, 0.12);
    emitSfx(events, this.id, 'skill_cast');
    this.effect({ phase: 'start' });
    return true;
  }

  onUpdate(dt) {
    const { player, effects, bulletSystem } = this.ctx;
    const dur = Math.max(0.05, this.duration || 0.35);
    this.travel = Math.min(1, this.travel + dt / dur);

    const x = this.fromX + (this.toX - this.fromX) * this.travel;
    const y = this.fromY + (this.toY - this.fromY) * this.travel;
    player.x = x;
    player.y = y;
    player.invincible = Math.max(player.invincible, 0.05);

    // 沿路径均匀射出暗影箭
    const want = Math.floor(this.travel * this._arrowTarget);
    while (this._arrowsFired < want && this._arrowsFired < this._arrowTarget) {
      this._fireShadowArrow(this._arrowsFired);
      this._arrowsFired++;
    }

    if (effects && Math.random() < 0.5) {
      effects.puff(x, y, '#4a3a7a');
    }

    if (this.travel >= 1 && this._arrowsFired < this._arrowTarget) {
      while (this._arrowsFired < this._arrowTarget) {
        this._fireShadowArrow(this._arrowsFired);
        this._arrowsFired++;
      }
    }
  }

  _fireShadowArrow(index) {
    const { bulletSystem, player, effects } = this.ctx;
    if (!bulletSystem) return;
    const t = (index + 0.5) / this._arrowTarget;
    const x = this.fromX + (this.toX - this.fromX) * t;
    const y = this.fromY + (this.toY - this.fromY) * t;
    const base = player.facing;
    // 略微散射，朝突进方向射出
    const spread = (index - (this._arrowTarget - 1) / 2) * 0.18;
    const ang = base + spread;
    const speed = 520;
    bulletSystem.fire({
      x, y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      radius: 7,
      damage: this.def.damage,
      life: 0.7,
      pierce: 2,
      color: '#7b5cff',
      canCrit: true,
      skillId: this.id,
    });
    if (effects) effects.slash(x, y, ang, 36, 0.5, '#6b4cff');
  }

  onDestroy() {
    const { player, effects } = this.ctx;
    player.x = this.toX;
    player.y = this.toY;
    if (effects) effects.puff(player.x, player.y, '#6b4cff');
    this.effect({ phase: 'end' });
  }

  effect(_payload) {}
}

export default ShadowDash;
