/**
 * AssetLoader.js
 * 全局素材管理：预加载角色/怪物/UI/技能图标贴图。
 *
 * 路径候选：
 *   微信小游戏 → Assets/（推荐，与 game.js 同级）→ src/Assets/（误开仓库根目录时回退）
 *   浏览器 H5  → src/Assets/ → Assets/
 *
 * 未加载成功时渲染层回退到程序化绘制。
 */

import Platform from './Platform.js';
import manifest from '../Assets/manifestData.js';

function createImage() {
  if (Platform.isWeChat && typeof wx !== 'undefined' && wx.createImage) {
    return wx.createImage();
  }
  if (typeof Image !== 'undefined') return new Image();
  return null;
}

function candidateBases() {
  if (Platform.isWeChat) return ['Assets/', 'src/Assets/'];
  return ['src/Assets/', 'Assets/'];
}

export class AssetLoader {
  constructor() {
    this.images = new Map();
    this.manifest = manifest;
    this.ready = false;
    this.basePath = candidateBases()[0];
    this._warned = new Set();
  }

  get(relPath) {
    return this.images.get(relPath) || null;
  }

  /** 角色精灵表（含可选立绘 portrait） */
  character(classId) {
    const meta = this.manifest.characters[classId];
    if (!meta) return null;
    const img = this.get(meta.file);
    if (!img) return null;
    return {
      img,
      meta,
      portrait: meta.portrait ? this.get(meta.portrait) : null,
    };
  }

  /** 怪物立绘 / walk 条带 */
  enemy(enemyId) {
    const meta = this.manifest.enemies[enemyId];
    if (!meta) return null;
    return {
      meta,
      portrait: this.get(meta.file),
      walk: meta.walk ? this.get(meta.walk) : null,
      idle: meta.idle ? this.get(meta.idle) : null,
    };
  }

  /**
   * 怪物精灵条：walk / idle / portrait。
   * @returns {{ img, frameW, frameH, frames, fps } | null}
   */
  enemySheet(enemyId, kind = 'walk') {
    const pack = this.enemy(enemyId);
    if (!pack) return null;
    const size = pack.meta.size || 64;
    let img = null;
    if (kind === 'walk') img = pack.walk || pack.portrait;
    else if (kind === 'idle') img = pack.idle || pack.portrait;
    else img = pack.portrait || pack.walk || pack.idle;
    if (!img) return null;
    const w = img.width || size;
    const frames = w > size ? Math.max(1, Math.floor(w / size)) : 1;
    return { img, frameW: size, frameH: size, frames, fps: 8 };
  }

  ui(id) {
    const item = (this.manifest.ui || []).find((u) => u.id === id);
    return item ? this.get(item.file) : null;
  }

  skillIcon(id) {
    const item = (this.manifest.skillIcons || []).find((u) => u.id === id);
    return item ? this.get(item.file) : null;
  }

  skillFx(id) {
    const item = (this.manifest.skillFX || []).find((u) => u.id === id);
    return item ? { img: this.get(item.file), meta: item } : null;
  }

  tile(id) {
    const item = (this.manifest.tiles || []).find((u) => u.id === id);
    return item ? this.get(item.file) : null;
  }

  _tryLoad(relPath, base) {
    return new Promise((resolve) => {
      const img = createImage();
      if (!img) {
        resolve(null);
        return;
      }
      let settled = false;
      const done = (val) => {
        if (settled) return;
        settled = true;
        resolve(val);
      };
      img.onload = () => done(img);
      img.onerror = () => done(null);
      // 微信部分环境无 onerror，给超时兜底
      setTimeout(() => done(null), 4000);
      img.src = base + relPath;
    });
  }

  async loadImage(relPath) {
    if (this.images.has(relPath)) return this.images.get(relPath);

    const bases = candidateBases();
    for (const base of bases) {
      const img = await this._tryLoad(relPath, base);
      if (img) {
        this.images.set(relPath, img);
        this.basePath = base;
        return img;
      }
    }
    if (!this._warned.has(relPath)) {
      this._warned.add(relPath);
      // 只对首个失败打一次样例，避免刷屏 40+ 条
      if (this._warned.size <= 2) {
        console.warn('[Assets] 加载失败:', relPath, '（已尝试', bases.join(' / '), '）');
      }
    }
    return null;
  }

  collectPaths() {
    const paths = new Set();
    const m = this.manifest;
    for (const id in m.characters) {
      paths.add(m.characters[id].file);
      if (m.characters[id].portrait) paths.add(m.characters[id].portrait);
    }
    for (const id in m.enemies) {
      const e = m.enemies[id];
      paths.add(e.file);
      if (e.walk) paths.add(e.walk);
      if (e.idle) paths.add(e.idle);
    }
    for (const icon of m.skillIcons || []) paths.add(icon.file);
    for (const fx of m.skillFX || []) paths.add(fx.file);
    for (const t of m.tiles || []) paths.add(t.file);
    for (const u of m.ui || []) paths.add(u.file);
    return [...paths];
  }

  async preload() {
    const paths = this.collectPaths();
    // 先探测一条，锁定可用 base，减少错误路径上的无效请求
    if (paths.length) {
      await this.loadImage(paths[0]);
    }
    await Promise.all(paths.slice(1).map((p) => this.loadImage(p)));
    let ok = 0;
    for (const p of paths) if (this.images.get(p)) ok++;
    this.ready = ok > 0;
    if (ok === 0) {
      console.warn(
        '[Assets] 预加载 0/' + paths.length
          + '。请确认项目目录里有 Assets/ 文件夹（与 game.js 同级）。'
          + '正确做法：导入 dist/HellRift.zip 解压后的 HellRift 目录，不要打开整个源码仓库。',
      );
    } else {
      console.log(`[Assets] 预加载 ${ok}/${paths.length}，base=${this.basePath}`);
    }
    return this.ready;
  }
}

/** 全局单例 */
export const Assets = new AssetLoader();
export default Assets;
