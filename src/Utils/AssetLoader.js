/**
 * AssetLoader.js
 * 全局素材管理：预加载角色（8 向动画包）/怪物/UI/技能图标。
 *
 * 路径候选：
 *   微信小游戏 → Assets/ → src/Assets/
 *   浏览器 H5  → src/Assets/ → Assets/
 */

import Platform from './Platform.js';
import manifest from '../Assets/manifestData.js';
import charPack from '../Assets/characters/packData.js';

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
    this.charPack = charPack;
    this.ready = false;
    this.basePath = candidateBases()[0];
    this._warned = new Set();
  }

  get(relPath) {
    return this.images.get(relPath) || null;
  }

  /**
   * 新版 8 向角色动画。
   * @returns {{ img, frameW, frameH, frames, fps, loop, pivot, dirs } | null}
   */
  characterAnim(classId, animName) {
    const pack = this.charPack.characters[classId];
    if (!pack || !pack.animations[animName]) return null;
    const a = pack.animations[animName];
    const rel = `characters/${classId}/${a.file}`;
    const img = this.get(rel);
    if (!img) return null;
    return {
      img,
      frameW: pack.frameWidth || this.charPack.frameSize || 128,
      frameH: pack.frameHeight || this.charPack.frameSize || 128,
      frames: a.frames,
      fps: a.fps,
      loop: a.loop,
      pivot: pack.pivot || { x: 64, y: 110 },
      dirs: pack.directions || this.charPack.directions,
    };
  }

  characterShadow(classId) {
    const img = this.get(`characters/${classId}/shadow.png`);
    if (!img) return null;
    const pack = this.charPack.characters[classId];
    return {
      img,
      frameW: pack?.frameWidth || 128,
      frameH: pack?.frameHeight || 128,
      pivot: pack?.pivot || { x: 64, y: 110 },
    };
  }

  characterPortrait(classId) {
    return this.get(`characters/${classId}/portrait.png`)
      || this.get(`characters/${classId}_portrait.png`)
      || null;
  }

  /** 旧版单表回退 */
  character(classId) {
    const meta = this.manifest.characters[classId];
    if (!meta) return null;
    const img = this.get(meta.file);
    if (!img) return null;
    return {
      img,
      meta,
      portrait: this.characterPortrait(classId) || (meta.portrait ? this.get(meta.portrait) : null),
    };
  }

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
      if (this._warned.size <= 2) {
        console.warn('[Assets] 加载失败:', relPath, '（已尝试', bases.join(' / '), '）');
      }
    }
    return null;
  }

  collectPaths() {
    const paths = new Set();
    const m = this.manifest;

    // 新版角色包
    const cp = this.charPack;
    if (cp && cp.characters) {
      for (const id of Object.keys(cp.characters)) {
        const c = cp.characters[id];
        for (const anim of Object.keys(c.animations || {})) {
          paths.add(`characters/${id}/${c.animations[anim].file}`);
        }
        paths.add(`characters/${id}/shadow.png`);
        paths.add(`characters/${id}/portrait.png`);
      }
    }

    // 旧版角色表（回退）
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
    if (paths.length) await this.loadImage(paths[0]);
    await Promise.all(paths.slice(1).map((p) => this.loadImage(p)));
    let ok = 0;
    for (const p of paths) if (this.images.get(p)) ok++;
    this.ready = ok > 0;
    if (ok === 0) {
      console.warn(
        '[Assets] 预加载 0/' + paths.length
          + '。请确认项目目录里有 Assets/ 文件夹（与 game.js 同级）。',
      );
    } else {
      console.log(`[Assets] 预加载 ${ok}/${paths.length}，base=${this.basePath}`);
    }
    return this.ready;
  }
}

export const Assets = new AssetLoader();
export default Assets;
