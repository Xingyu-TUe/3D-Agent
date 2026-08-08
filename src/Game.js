/**
 * Game.js
 * 游戏核心：初始化渲染器 / 输入 / 场景管理，驱动主循环（requestAnimationFrame）。
 *
 * 主循环采用「可变步长 + 上限钳制」：
 *   - dt 以秒为单位，超过 maxDelta 时钳制，避免切后台回来后一次性大跳。
 *   - 逻辑更新与渲染同频（对本类型割草游戏足够，且实现简单、GC 友好）。
 *
 * 输入：统一从 Platform 收集触摸，将屏幕坐标直接透传给场景（UI 使用屏幕坐标）。
 */

import Platform from './Utils/Platform.js';
import Renderer from './Utils/Renderer.js';
import SceneManager from './SceneManager.js';
import GameConfig from './Config/GameConfig.js';
import { loadSettings } from './Config/Settings.js';

import MenuScene from './Scenes/MenuScene.js';
import CharacterSelectScene from './Scenes/CharacterSelectScene.js';
import GameScene from './Scenes/GameScene.js';
import ResultScene from './Scenes/ResultScene.js';
import { getDefaultCharacterId } from './Config/Character.js';

export class Game {
  constructor(canvas) {
    loadSettings();
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.ctx = this.renderer.ctx;

    this.width = this.renderer.width;
    this.height = this.renderer.height;
    this.safeArea = Platform.getSafeArea();

    this.scenes = new SceneManager(this);
    this.selectedClassId = getDefaultCharacterId();

    this.running = false;
    this.lastTime = 0;
    this._loop = this._loop.bind(this);

    // FPS 统计
    this.fps = 0;
    this._fpsAccum = 0;
    this._fpsFrames = 0;

    this._registerScenes();
    this._setupInput();
    this._setupResize();
  }

  _registerScenes() {
    this.scenes.register('menu', new MenuScene(this));
    this.scenes.register('characterSelect', new CharacterSelectScene(this));
    this.scenes.register('game', new GameScene(this));
    this.scenes.register('result', new ResultScene(this));
  }

  _setupResize() {
    this.renderer.onResize((w, h) => {
      this.width = w;
      this.height = h;
      this.safeArea = Platform.getSafeArea();
      this.scenes.resize(w, h);
    });
    if (!Platform.isWeChat && typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.renderer.resize());
      window.addEventListener('orientationchange', () => {
        setTimeout(() => this.renderer.resize(), 200);
      });
    }
  }

  _setupInput() {
    Platform.onTouchStart((changed) => {
      for (let i = 0; i < changed.length; i++) {
        this.scenes.onTouchStart(changed[i].id, changed[i].x, changed[i].y);
      }
    });
    Platform.onTouchMove((changed) => {
      for (let i = 0; i < changed.length; i++) {
        this.scenes.onTouchMove(changed[i].id, changed[i].x, changed[i].y);
      }
    });
    Platform.onTouchEnd((changed) => {
      for (let i = 0; i < changed.length; i++) {
        this.scenes.onTouchEnd(changed[i].id, changed[i].x, changed[i].y);
      }
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = Platform.now();
    // 启动后直接进入角色选择大厅
    this.scenes.switchTo('characterSelect');
    Platform.raf(this._loop);
  }

  _loop(now) {
    if (!this.running) return;
    now = now || Platform.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // 钳制步长，避免卡顿后大跳
    if (dt > GameConfig.performance.maxDelta) dt = GameConfig.performance.maxDelta;
    if (dt < 0) dt = 0;

    // FPS
    this._fpsAccum += dt;
    this._fpsFrames++;
    if (this._fpsAccum >= 0.5) {
      this.fps = Math.round(this._fpsFrames / this._fpsAccum);
      this._fpsAccum = 0;
      this._fpsFrames = 0;
    }

    // 更新 + 渲染
    this.scenes.update(dt);
    this.renderer.clear('#0a0b10');
    this.scenes.render(this.ctx);

    Platform.raf(this._loop);
  }

  stop() {
    this.running = false;
  }
}

export default Game;
