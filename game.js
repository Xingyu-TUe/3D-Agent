/**
 * game.js — 微信小游戏入口文件（wx 环境专用）。
 *
 * 微信小游戏没有 DOM。这里通过 wx.createCanvas() 创建主屏 canvas，
 * 挂到 GameGlobal，让 Platform 适配层统一读取，然后启动游戏。
 *
 * 浏览器请使用 index.html（其加载 src/main.js）。
 */

/* global wx, GameGlobal */
const canvas = wx.createCanvas();
if (typeof GameGlobal !== 'undefined') {
  GameGlobal.canvas = canvas;
}

// 微信小游戏支持 ESM（需在 game.json / project.config 中开启），
// 这里动态引入共享启动逻辑。
import('./src/main.js').then(({ boot }) => {
  boot();
}).catch((err) => {
  console.error('[HellRift] 启动失败', err);
});
