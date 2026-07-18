/**
 * Platform.js
 * 平台适配层：屏蔽微信小游戏与浏览器（H5）环境差异。
 *
 * 微信小游戏中全局存在 `wx` 与 `canvas`（由 game.js 通过 wx.createCanvas 提供）。
 * 浏览器中我们用 <canvas id="game"> 并 mock 一个最小 wx。
 *
 * 该模块只暴露统一 API：
 *   Platform.isWeChat
 *   Platform.getCanvas()
 *   Platform.getScreenSize()
 *   Platform.onTouchStart/Move/End(cb)
 *   Platform.getSafeArea()
 *   Platform.now()
 *   Platform.raf(cb) / caf(id)
 */

function detectWeChat() {
  return typeof wx !== 'undefined' && typeof wx.createCanvas === 'function';
}

const isWeChat = detectWeChat();

let _canvas = null;

function getCanvas() {
  if (_canvas) return _canvas;

  if (isWeChat) {
    // 微信小游戏：优先使用全局 canvas（game.js 中通过 GameGlobal 提供），
    // 否则创建主屏 canvas。
    /* global GameGlobal */
    if (typeof GameGlobal !== 'undefined' && GameGlobal.canvas) {
      _canvas = GameGlobal.canvas;
    } else if (typeof canvas !== 'undefined') {
      _canvas = canvas;
    } else {
      _canvas = wx.createCanvas();
    }
  } else {
    _canvas = document.getElementById('game');
    if (!_canvas) {
      _canvas = document.createElement('canvas');
      _canvas.id = 'game';
      document.body.appendChild(_canvas);
    }
  }
  return _canvas;
}

function getScreenSize() {
  if (isWeChat) {
    const info = wx.getSystemInfoSync();
    return {
      width: info.windowWidth,
      height: info.windowHeight,
      pixelRatio: info.pixelRatio || 1,
    };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
  };
}

function getSafeArea() {
  if (isWeChat) {
    const info = wx.getSystemInfoSync();
    if (info.safeArea) {
      return {
        top: info.safeArea.top,
        bottom: info.windowHeight - info.safeArea.bottom,
        left: info.safeArea.left,
        right: info.windowWidth - info.safeArea.right,
      };
    }
  }
  return { top: 0, bottom: 0, left: 0, right: 0 };
}

/**
 * 统一触摸事件。回调收到标准化的触点数组：[{ id, x, y }]
 * 坐标为屏幕物理像素坐标（左上角原点）。
 */
function _normalizeTouches(e) {
  const list = e.touches || e.changedTouches || [];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    out.push({
      id: t.identifier != null ? t.identifier : i,
      x: t.clientX != null ? t.clientX : t.x,
      y: t.clientY != null ? t.clientY : t.y,
    });
  }
  return out;
}

function _changedTouches(e) {
  const list = e.changedTouches || e.touches || [];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    out.push({
      id: t.identifier != null ? t.identifier : i,
      x: t.clientX != null ? t.clientX : t.x,
      y: t.clientY != null ? t.clientY : t.y,
    });
  }
  return out;
}

function onTouchStart(cb) {
  if (isWeChat) {
    wx.onTouchStart((e) => cb(_changedTouches(e), _normalizeTouches(e)));
  } else {
    const canvas = getCanvas();
    // 同时支持鼠标，便于桌面浏览器调试
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      cb(_changedTouches(e), _normalizeTouches(e));
    }, { passive: false });
    canvas.addEventListener('mousedown', (e) => {
      const p = [{ id: 'mouse', x: e.clientX, y: e.clientY }];
      cb(p, p);
    });
  }
}

function onTouchMove(cb) {
  if (isWeChat) {
    wx.onTouchMove((e) => cb(_changedTouches(e), _normalizeTouches(e)));
  } else {
    const canvas = getCanvas();
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      cb(_changedTouches(e), _normalizeTouches(e));
    }, { passive: false });
    canvas.addEventListener('mousemove', (e) => {
      if (e.buttons !== 1) return;
      const p = [{ id: 'mouse', x: e.clientX, y: e.clientY }];
      cb(p, p);
    });
  }
}

function onTouchEnd(cb) {
  if (isWeChat) {
    wx.onTouchEnd((e) => cb(_changedTouches(e), _normalizeTouches(e)));
    wx.onTouchCancel((e) => cb(_changedTouches(e), _normalizeTouches(e)));
  } else {
    const canvas = getCanvas();
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      cb(_changedTouches(e), _normalizeTouches(e));
    }, { passive: false });
    canvas.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      cb(_changedTouches(e), _normalizeTouches(e));
    }, { passive: false });
    canvas.addEventListener('mouseup', (e) => {
      const p = [{ id: 'mouse', x: e.clientX, y: e.clientY }];
      cb(p, p);
    });
  }
}

function now() {
  return (typeof performance !== 'undefined' && performance.now)
    ? performance.now()
    : Date.now();
}

function raf(cb) {
  if (isWeChat) {
    return requestAnimationFrame(cb);
  }
  return window.requestAnimationFrame(cb);
}

function caf(id) {
  if (isWeChat) {
    return cancelAnimationFrame(id);
  }
  return window.cancelAnimationFrame(id);
}

/**
 * 本地存储（装备/成长长期存档使用）。
 */
function getStorage(key, def) {
  try {
    if (isWeChat) {
      const v = wx.getStorageSync(key);
      return v === '' || v == null ? def : v;
    }
    const v = window.localStorage.getItem(key);
    return v == null ? def : JSON.parse(v);
  } catch (e) {
    return def;
  }
}

function setStorage(key, value) {
  try {
    if (isWeChat) {
      wx.setStorageSync(key, value);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    /* ignore */
  }
}

export const Platform = {
  isWeChat,
  getCanvas,
  getScreenSize,
  getSafeArea,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  now,
  raf,
  caf,
  getStorage,
  setStorage,
};

export default Platform;
