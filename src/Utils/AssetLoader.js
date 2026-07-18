/**
 * AssetLoader.js
 * 全局素材管理：预加载角色/怪物/UI/技能图标贴图。
 *
 * 路径：
 *   浏览器 H5  → src/Assets/
 *   微信小游戏 → Assets/（由 build:wechat 拷贝进包）
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

export class AssetLoader {
  constructor() {
    this.images = new Map();
    this.manifest = manifest;
    this.ready = false;
    this.basePath = Platform.isWeChat ? 'Assets/' : 'src/Assets/';
  }

  get(relPath) {
    return this.images.get(relPath) || null;
  }

  /** 角色精灵表 */
  character(classId) {
    const meta = this.manifest.characters[classId];
    if (!meta) return null;
    const img = this.get(meta.file);
    if (!img) return null;
    return { img, meta };
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

  loadImage(relPath) {
    return new Promise((resolve) => {
      if (this.images.has(relPath)) {
        resolve(this.images.get(relPath));
        return;
      }
      const img = createImage();
      if (!img) {
        resolve(null);
        return;
      }
      img.onload = () => {
        this.images.set(relPath, img);
        resolve(img);
      };
      img.onerror = () => {
        console.warn('[Assets] 加载失败:', this.basePath + relPath);
        resolve(null);
      };
      img.src = this.basePath + relPath;
    });
  }

  collectPaths() {
    const paths = new Set();
    const m = this.manifest;
    for (const id in m.characters) paths.add(m.characters[id].file);
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
    await Promise.all(paths.map((p) => this.loadImage(p)));
    let ok = 0;
    for (const p of paths) if (this.images.get(p)) ok++;
    this.ready = ok > 0;
    console.log(`[Assets] 预加载 ${ok}/${paths.length}，base=${this.basePath}`);
    return this.ready;
  }
}

/** 全局单例 */
export const Assets = new AssetLoader();
export default Assets;
