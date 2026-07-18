/**
 * wechat-entry.js — 微信小游戏打包入口（由 esbuild 打成单文件 game.js）。
 *
 * 微信开发者工具对原生 ES Module 支持不稳定（动态 import / MIME / import.meta），
 * 因此微信端使用「打包后的单文件 IIFE」，运行时不再有任何 import/export。
 */

/* global wx, GameGlobal */
import { boot } from './main.js';

try {
  const canvas = wx.createCanvas();
  if (typeof GameGlobal !== 'undefined') {
    GameGlobal.canvas = canvas;
  }
  boot();
} catch (err) {
  console.error('[HellRift] 启动失败', err);
}
