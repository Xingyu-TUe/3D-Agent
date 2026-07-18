/**
 * Boss.js
 * Boss（裂隙领主）行为控制器。附着于一个 Enemy 实例（enemy.boss = new BossController(...)）。
 * 负责：
 *   - 多阶段切换（依据血量百分比，提升速度、解锁技能）
 *   - 技能释放：冲锋 charge / 召唤小怪 summon / 范围攻击 novaAoe
 *   - 死亡动画标记
 *
 * 实际的伤害/召唤通过回调交给 EnemySystem，实现解耦。
 */

export class BossController {
  constructor(enemy, data) {
    this.enemy = enemy;
    this.data = data;
    this.phases = data.phases;
    this.skills = data.bossSkills;
    this.phaseIndex = 0;
    this.speedMul = this.phases[0].speedMul;

    // 各技能独立冷却计时
    this.cd = {};
    for (const key in this.skills) this.cd[key] = this.skills[key].cooldown * 0.6;

    // 冲锋状态机
    this.state = 'idle'; // idle / telegraph / charging
    this.stateTime = 0;
    this.chargeVX = 0;
    this.chargeVY = 0;
    this.currentSkill = null;

    // 死亡动画
    this.dying = false;
    this.deathT = 0;
  }

  getPhaseName() {
    return this.phases[this.phaseIndex].name;
  }

  _updatePhase() {
    const pct = this.enemy.hp / this.enemy.maxHp;
    for (let i = this.phases.length - 1; i >= 0; i--) {
      if (pct <= this.phases[i].hpPct) {
        if (i > this.phaseIndex) {
          this.phaseIndex = i;
          this.speedMul = this.phases[i].speedMul;
          return true; // 进入新阶段
        }
        break;
      }
    }
    return false;
  }

  /**
   * @param dt
   * @param player
   * @param api { telegraph, dealAoe, summon, shake }
   */
  update(dt, player, api) {
    const e = this.enemy;
    const enteredNewPhase = this._updatePhase();
    if (enteredNewPhase) {
      api.shake(10, 0.4);
      api.telegraph(e.x, e.y, e.radius * 2.4, '#ff3b6b', 0.6);
    }

    const phase = this.phases[this.phaseIndex];
    const available = phase.skills;

    // 冷却递减
    for (const key in this.cd) this.cd[key] -= dt;

    // 状态机
    if (this.state === 'idle') {
      // 普通移动交给 EnemySystem（追玩家）。此处只挑选技能。
      for (let i = 0; i < available.length; i++) {
        const key = available[i];
        if (this.cd[key] <= 0) {
          this._startSkill(key, player, api);
          break;
        }
      }
    } else if (this.state === 'telegraph') {
      this.stateTime -= dt;
      if (this.stateTime <= 0) {
        this._fireSkill(this.currentSkill, player, api);
      }
    } else if (this.state === 'charging') {
      this.stateTime -= dt;
      e.x += this.chargeVX * dt;
      e.y += this.chargeVY * dt;
      // 冲锋期间的碰撞伤害由 EnemySystem 常规接触伤害处理
      if (this.stateTime <= 0) {
        this.state = 'idle';
      }
    }

    return this.state === 'charging'; // true 表示自主移动，EnemySystem 不再追击
  }

  _startSkill(key, player, api) {
    this.currentSkill = key;
    const s = this.skills[key];
    this.cd[key] = s.cooldown;

    if (key === 'charge') {
      // 预警后朝玩家冲锋
      this.state = 'telegraph';
      this.stateTime = s.telegraph;
      this._chargeTargetX = player.x;
      this._chargeTargetY = player.y;
      api.telegraph(this.enemy.x, this.enemy.y, this.enemy.radius * 1.6, '#ffcf5c', s.telegraph);
    } else if (key === 'novaAoe') {
      this.state = 'telegraph';
      this.stateTime = s.telegraph;
      api.telegraph(this.enemy.x, this.enemy.y, s.radius, '#ff3b3b', s.telegraph);
    } else if (key === 'summon') {
      // 即时召唤
      this._fireSkill(key, player, api);
    }
  }

  _fireSkill(key, player, api) {
    const s = this.skills[key];
    const e = this.enemy;

    if (key === 'charge') {
      const dx = this._chargeTargetX - e.x;
      const dy = this._chargeTargetY - e.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      this.chargeVX = (dx / d) * s.chargeSpeed;
      this.chargeVY = (dy / d) * s.chargeSpeed;
      this.state = 'charging';
      this.stateTime = Math.min(1.0, d / s.chargeSpeed + 0.15);
      api.shake(6, 0.2);
    } else if (key === 'novaAoe') {
      api.dealAoe(e.x, e.y, s.radius, s.damage);
      api.explosion(e.x, e.y, s.radius, '#ff3b3b');
      api.shake(12, 0.4);
      this.state = 'idle';
    } else if (key === 'summon') {
      api.summon(e.x, e.y, s.count, s.enemyId);
      this.state = 'idle';
    }
  }
}

export default BossController;
