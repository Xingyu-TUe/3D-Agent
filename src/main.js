/**
 * main.js — 共享启动入口（浏览器 index.html 与微信 game.js 都调用 boot()）。
 *
 * 职责：
 *   1. 通过 Platform 取得 canvas 并按屏幕做高 DPI 适配。
 *   2. 创建 Game 实例并启动主循环。
 *
 * 注意：真正的游戏逻辑在 Game.js / SceneManager.js 中，本文件只做装配。
 */

import Platform from './Utils/Platform.js';
import { Game } from './Game.js';

let game = null;

export function boot() {
  if (game) return game;
  const canvas = Platform.getCanvas();
  game = new Game(canvas);
  game.start();
  return game;
}

export function getGame() {
  return game;
}

export default boot;
