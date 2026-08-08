/**
 * SceneManager.js
 * 场景管理器：维护场景栈/当前场景，统一分发 update / render / 触摸事件 / resize。
 *
 * 场景需实现（可选）：
 *   enter(params) / exit()
 *   update(dt)
 *   render(ctx)
 *   onTouchStart(id, x, y) / onTouchMove(id, x, y) / onTouchEnd(id, x, y)
 *   resize(w, h)
 */

export class SceneManager {
  constructor(game) {
    this.game = game;
    this.scenes = new Map();
    this.current = null;
    this.currentName = '';
  }

  register(name, scene) {
    this.scenes.set(name, scene);
    return this;
  }

  switchTo(name, params) {
    const next = this.scenes.get(name);
    if (!next) {
      console.warn('[SceneManager] 未注册场景:', name);
      return;
    }
    if (this.current && this.current.exit) this.current.exit();
    this.current = next;
    this.currentName = name;
    if (next.resize) next.resize(this.game.width, this.game.height);
    if (next.enter) next.enter(params || {});
  }

  update(dt) {
    if (this.current && this.current.update) this.current.update(dt);
  }

  render(ctx) {
    if (this.current && this.current.render) this.current.render(ctx);
  }

  resize(w, h) {
    for (const scene of this.scenes.values()) {
      if (scene.resize) scene.resize(w, h);
    }
  }

  onTouchStart(id, x, y) {
    if (this.current && this.current.onTouchStart) this.current.onTouchStart(id, x, y);
  }

  onTouchMove(id, x, y) {
    if (this.current && this.current.onTouchMove) this.current.onTouchMove(id, x, y);
  }

  onTouchEnd(id, x, y) {
    if (this.current && this.current.onTouchEnd) this.current.onTouchEnd(id, x, y);
  }
}

export default SceneManager;
