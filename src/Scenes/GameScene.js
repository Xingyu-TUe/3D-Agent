/**
 * GameScene.js
 * 核心玩法场景。装配并驱动所有子系统，管理运行子状态：
 *   playing  正常战斗
 *   levelup  升级三选一（冻结战斗）
 *   paused   手动暂停
 *
 * 负责输入路由（摇杆 / 暂停 / 升级选择）、胜负判定与结算跳转、渲染分层。
 */

import GameConfig from '../Config/GameConfig.js';
import { getDefaultCharacterId } from '../Config/Character.js';
import EventBus from '../Utils/EventBus.js';
import Camera from '../Utils/Camera.js';
import Background from '../Utils/Background.js';
import CollisionSystem from '../Utils/CollisionSystem.js';

import Player from '../Player/Player.js';
import ExpSystem from '../Player/ExpSystem.js';
import CharacterSave from '../Player/CharacterSave.js';
import EnemySystem from '../Enemy/EnemySystem.js';
import BulletSystem from '../Bullet/BulletSystem.js';
import SkillSystem from '../Skill/SkillSystem.js';
import SummonSystem from '../Skill/SummonSystem.js';
import UpgradeManager from '../Skill/UpgradeManager.js';
import EffectSystem from '../FX/EffectSystem.js';

import Joystick from '../UI/Joystick.js';
import HUD from '../UI/HUD.js';
import LevelUpUI from '../UI/LevelUpUI.js';
import BossBar from '../UI/BossBar.js';
import { SKILL_ICONS } from '../UI/UIHelpers.js';
import { EquipmentFactory } from '../Player/Equipment.js';

export class GameScene {
  constructor(game) {
    this.game = game;
    this.state = 'playing';

    this.events = new EventBus();
    this.camera = new Camera(game.width, game.height);
    this.background = new Background();
    this.collision = new CollisionSystem();

    this.player = new Player();
    this.effects = new EffectSystem();
    this.expSystem = new ExpSystem(this.player, this.events);
    this.enemySystem = new EnemySystem(this.player, this.events, this.effects);
    this.bulletSystem = new BulletSystem(this.player, this.enemySystem, this.collision, this.effects, this.events);
    this.summonSystem = new SummonSystem(this.player, this.enemySystem, this.collision, this.effects);
    this.skillSystem = new SkillSystem(
      this.player, this.enemySystem, this.bulletSystem,
      this.collision, this.effects, this.events, this.summonSystem,
    );
    this.upgradeManager = new UpgradeManager(this.skillSystem, this.player);

    // UI
    this.joystick = new Joystick();
    this.hud = new HUD();
    this.hud.showFps = GameConfig.debug.showFps;
    this.levelUpUI = new LevelUpUI();
    this.bossBar = new BossBar();

    this.time = 0;             // 游戏内累计时间
    this.pendingLevelUps = 0;  // 待处理升级次数
    this.gameTime = 0;         // 存活计时（秒）
    this.finished = false;
    this.victory = false;
    this.endTimer = 0;

    this._bindEvents();
  }

  _bindEvents() {
    this.events.on('shake', (p) => this.camera.shake(p.magnitude, p.duration));

    this.events.on('enemyDeath', (p) => {
      this.expSystem.dropOrb(p.x, p.y, p.exp);
    });

    this.events.on('levelup', (p) => {
      this.pendingLevelUps += p.times;
      if (this.state === 'playing') this._openLevelUp();
    });

    this.events.on('bossSpawn', () => {
      this.bossBar.triggerBanner();
    });

    this.events.on('bossDead', () => {
      this._grantChestLoot();
      this.bossKilled = true;
      this.victory = true;
      this.finished = true;
      this.endTimer = 1.6;
      this.camera.shake(14, 0.6);
    });

    this.events.on('playerDead', () => {
      if (this.finished) return;
      this.finished = true;
      this.victory = false;
      this.endTimer = 1.2;
    });
  }

  _grantChestLoot() {
    // 预留装备系统：胜利掉落一件随机史诗+装备并存档
    const item = EquipmentFactory.roll(undefined, Math.random() < 0.4 ? 'legendary' : 'epic');
    this.lastLoot = item;
    // 立即装备以体现属性成长（长期成长可改为进背包）
    this.player.equip(item);
  }

  enter(params) {
    this._classId = (params && params.classId)
      || this.game.selectedClassId
      || getDefaultCharacterId();
    this.reset();
  }

  reset() {
    this.state = 'playing';
    this.time = 0;
    this.gameTime = 0;
    this.pendingLevelUps = 0;
    this.finished = false;
    this.victory = false;
    this.endTimer = 0;
    this.lastLoot = null;
    this.bossKilled = false;

    this.player.reset(this._classId);
    this.expSystem.clear();
    this.expSystem.player.expToNext = this.expSystem.expNeeded(1);
    this.enemySystem.clear();
    this.bulletSystem.clear();
    this.summonSystem.clear();
    this.skillSystem.clear();
    this.effects.clear();
    this.upgradeManager.reset();
    this.upgradeManager.setSkillPool(this.player.classData.skillPool || []);
    this.joystick.reset();

    // 职业初始技能
    for (const id of this.player.classData.startSkills) {
      this.skillSystem.acquire(id);
    }

    this.camera.snapTo(this.player.x, this.player.y);
  }

  resize(w, h) {
    this.camera.resize(w, h);
    this.joystick.resize(w, h);
    const safeTop = this.game.safeArea ? this.game.safeArea.top : 0;
    this.hud.resize(w, h, safeTop);
    this.levelUpUI.resize(w, h);
    this.bossBar.resize(w, h);
  }

  _openLevelUp() {
    this.state = 'levelup';
    const options = this.upgradeManager.roll(3);
    this.levelUpUI.setOptions(options);
  }

  update(dt) {
    if (this.state === 'levelup') {
      this.levelUpUI.update(dt);
      return; // 冻结战斗
    }
    if (this.state === 'paused') {
      return;
    }

    // 结算倒计时（死亡/胜利动画后跳转）
    if (this.finished) {
      this.endTimer -= dt;
      // 仍推进特效/相机，让死亡动画播放
      this._updateWorld(dt, true);
      if (this.endTimer <= 0) {
        this._goResult();
      }
      return;
    }

    this.time += dt;
    this.gameTime += dt;
    this._updateWorld(dt, false);

    // 时间到（未击杀 Boss 也按胜利结算——已封印裂隙的时限内存活）
    // Boss 在第 5 分钟出现，玩家需击杀 Boss 才真正胜利；此处不强制结束。
  }

  _updateWorld(dt, freezeSpawns) {
    const p = this.player;

    // 玩家移动
    p.update(dt, this.joystick, this);

    // 相机跟随
    this.camera.follow(p.x, p.y, dt);
    this.background.update(dt);

    if (!freezeSpawns) {
      // 怪物 AI / 刷怪
      this.enemySystem.update(dt, this.camera);
    }

    // 重建碰撞四叉树（供技能与子弹查询）
    this.collision.rebuild(p, this.enemySystem.enemies);

    // 技能（含普通攻击）
    if (!freezeSpawns) {
      this.skillSystem.update(dt, this.camera);
      this.summonSystem.update(dt);
    }

    // 子弹
    this.bulletSystem.update(dt, this.camera);

    // 经验球
    this.expSystem.update(dt, this.camera);

    // 特效 / 飘字
    this.effects.update(dt);

    // Boss 血条横幅
    this.bossBar.update(dt);
  }

  _goResult() {
    const goldEarned = Math.floor(this.player.kills * 0.8 + (this.victory ? 200 : 0));
    const classSave = CharacterSave.recordRun({
      classId: this.player.classId,
      survived: this.gameTime,
      victory: this.victory,
      kills: this.player.kills,
      bossKilled: this.bossKilled,
      goldEarned,
    });
    this.game.scenes.switchTo('result', {
      victory: this.victory,
      survived: this.gameTime,
      level: this.player.level,
      kills: this.player.kills,
      loot: this.lastLoot,
      classId: this.player.classId,
      className: this.player.classData.name,
      goldEarned,
      classSave,
    });
  }

  // ---------------- 渲染 ----------------
  render(ctx) {
    const cam = this.camera;
    // 世界背景
    this.background.render(ctx, cam);
    // 地面区域（毒云）在实体下方
    this.skillSystem.renderZones(ctx, cam, this.time);
    // 经验球
    this.expSystem.render(ctx, cam, this.time);
    // 怪物
    this.enemySystem.render(ctx, cam, this.time);
    // 召唤物
    this.summonSystem.render(ctx, cam, this.time);
    // 子弹
    this.bulletSystem.render(ctx, cam);
    // 特效
    this.effects.render(ctx, cam);
    // 玩家
    this.player.render(ctx, cam);
    // 伤害飘字（最上层世界元素）
    this.effects.renderTexts(ctx, cam);

    // 调试：四叉树
    if (GameConfig.debug.showQuadTree) this.collision.debugRender(ctx, cam);

    // HUD
    this.hud.render(ctx, this._hudState());

    // Boss 血条
    const safeTop = this.game.safeArea ? this.game.safeArea.top : 0;
    this.bossBar.render(ctx, this.enemySystem.boss, safeTop);

    // 摇杆
    this.joystick.render(ctx);

    // 覆盖层
    if (this.state === 'levelup') {
      this.levelUpUI.render(ctx);
    } else if (this.state === 'paused') {
      this._renderPauseOverlay(ctx);
    }
  }

  _hudState() {
    const skills = [];
    for (const skill of this.skillSystem.skills.values()) {
      skills.push({
        id: skill.id,
        icon: SKILL_ICONS[skill.id] || '技',
        level: skill.level,
        color: skill.def.color,
      });
    }
    return {
      player: this.player,
      timeLeft: Math.max(0, GameConfig.matchDuration - this.gameTime),
      enemyCount: this.enemySystem.count,
      fps: this.game.fps,
      skills,
    };
  }

  _renderPauseOverlay(ctx) {
    const w = this.game.width;
    const h = this.game.height;
    ctx.fillStyle = 'rgba(5,6,10,0.75)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 36px "Microsoft YaHei", sans-serif';
    ctx.fillText('已暂停', w / 2, h * 0.42);
    ctx.fillStyle = '#8b9cb3';
    ctx.font = '16px sans-serif';
    ctx.fillText('点击任意处继续', w / 2, h * 0.42 + 40);
  }

  // ---------------- 输入 ----------------
  onTouchStart(id, x, y) {
    if (this.state === 'levelup') {
      const opt = this.levelUpUI.handleTap(x, y);
      if (opt) {
        this.upgradeManager.apply(opt);
        this.pendingLevelUps--;
        if (this.pendingLevelUps > 0) {
          this._openLevelUp();
        } else {
          this.state = 'playing';
        }
      }
      return;
    }

    if (this.state === 'paused') {
      this.state = 'playing';
      return;
    }

    // playing
    if (this.hud.hitPause(x, y)) {
      this.state = 'paused';
      this.joystick.reset();
      return;
    }
    this.joystick.onTouchStart(id, x, y);
  }

  onTouchMove(id, x, y) {
    if (this.state !== 'playing') return;
    this.joystick.onTouchMove(id, x, y);
  }

  onTouchEnd(id, x, y) {
    this.joystick.onTouchEnd(id);
  }
}

export default GameScene;
