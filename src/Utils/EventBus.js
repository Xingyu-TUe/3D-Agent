/**
 * EventBus.js
 * 轻量事件总线，用于系统间解耦（如：怪物死亡 -> 掉落经验、UI 更新等）。
 */

export class EventBus {
  constructor() {
    this._map = new Map();
  }

  on(type, fn) {
    if (!this._map.has(type)) this._map.set(type, []);
    this._map.get(type).push(fn);
    return () => this.off(type, fn);
  }

  off(type, fn) {
    const arr = this._map.get(type);
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i !== -1) arr.splice(i, 1);
  }

  emit(type, payload) {
    const arr = this._map.get(type);
    if (!arr) return;
    for (let i = 0; i < arr.length; i++) arr[i](payload);
  }

  clear() {
    this._map.clear();
  }
}

export default EventBus;
