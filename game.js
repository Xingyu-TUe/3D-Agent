/**
 * game.js — 微信小游戏入口文件（wx 环境专用）。
 *
 * 微信小游戏没有 DOM。这里通过 wx.createCanvas() 创建主屏 canvas，
 * 挂到 GameGlobal，让 Platform 适配层统一读取，然后启动游戏。
 *
 * 注意：必须使用【静态 import】。微信小游戏由开发者工具在构建期打包 ES 模块，
 * 不支持运行时动态 import() 去 fetch 模块。
 *
 * 浏览器请使用 index.html（其加载 src/main.js）。
 */

/* global wx, GameGlobal */
import { boot } from './src/main.js';

const canvas = wx.createCanvas();
if (typeof GameGlobal !== 'undefined') {
  GameGlobal.canvas = canvas;
}

// Platform.getCanvas() 是惰性调用（在 boot 内部才读取），
// 因此此处先设置好 GameGlobal.canvas 再启动即可。
boot();
