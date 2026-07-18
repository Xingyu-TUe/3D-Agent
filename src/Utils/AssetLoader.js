/**
 * AssetLoader.js
 * 素材预加载（预留）。读取 Assets/manifest.json 后批量加载 PNG，
 * 供后续用贴图替换程序化绘制。
 *
 * 微信：wx.createImage()
 * 浏览器：new Image()
 */

import Platform from './Platform.js';

export class AssetLoader {
  constructor() {
    this.images = new Map();
    this.manifest = null;
    this.basePath = 'src/Assets/';
  }

  async loadManifest() {
    if (Platform.isWeChat) {
      // 微信小游戏通常把素材打进包内，用相对路径即可
      // 若使用独立 json，可用 wx.request 读取本地/CDN
      console.warn('[AssetLoader] 微信端请在构建时内联 manifest，或放置于包内路径');
      return null;
    }
    const res = await fetch(this.basePath + 'manifest.json');
    this.manifest = await res.json();
    return this.manifest;
  }

  loadImage(relPath) {
    return new Promise((resolve, reject) => {
      if (this.images.has(relPath)) {
        resolve(this.images.get(relPath));
        return;
      }
      let img;
      if (Platform.isWeChat) {
        img = wx.createImage();
      } else {
        img = new Image();
      }
      img.onload = () => {
        this.images.set(relPath, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = this.basePath + relPath;
    });
  }

  async preloadAll(manifest) {
    const m = manifest || this.manifest;
    if (!m) return;
    const paths = new Set();
    for (const id in m.characters) paths.add(m.characters[id].file);
    for (const id in m.enemies) {
      paths.add(m.enemies[id].file);
      if (m.enemies[id].walk) paths.add(m.enemies[id].walk);
      if (m.enemies[id].idle) paths.add(m.enemies[id].idle);
    }
    for (const icon of m.skillIcons || []) paths.add(icon.file);
    for (const fx of m.skillFX || []) paths.add(fx.file);
    for (const t of m.tiles || []) paths.add(t.file);
    for (const u of m.ui || []) paths.add(u.file);
    await Promise.all([...paths].map((p) => this.loadImage(p).catch(() => null)));
  }

  get(relPath) {
    return this.images.get(relPath) || null;
  }
}

export default AssetLoader;
