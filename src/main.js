/**
 * main.js — 共享启动入口（浏览器 index.html 与微信 game.js 都调用 boot()）。
 *
 * 职责：
 *   1. 预加载 Assets 贴图（失败则渲染层程序化回退）。
 *   2. 通过 Platform 取得 canvas 并按屏幕做高 DPI 适配。
 *   3. 创建 Game 实例并启动主循环。
 */

import Platform from './Utils/Platform.js';
import Assets from './Utils/AssetLoader.js';
import { Game } from './Game.js';

let game = null;
let booting = null;

export async function boot() {
  if (game) return game;
  if (booting) return booting;

  booting = (async () => {
    try {
      await Assets.preload();
    } catch (err) {
      console.warn('[HellRift] 素材预加载异常，将使用程序化绘制', err);
    }
    const canvas = Platform.getCanvas();
    game = new Game(canvas);
    game.start();
    return game;
  })();

  return booting;
}

export function getGame() {
  return game;
}

export default boot;
