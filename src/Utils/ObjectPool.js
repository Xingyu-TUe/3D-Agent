/**
 * ObjectPool.js
 * 通用对象池。用于怪物、子弹、经验球、飘字等高频创建/销毁的对象，
 * 避免频繁 new 触发 GC 卡顿。
 *
 * 用法：
 *   const pool = new ObjectPool(() => new Enemy(), (e) => e.reset());
 *   const e = pool.acquire();
 *   ...
 *   pool.release(e);
 *
 * 池内对象需自行实现 reset()（可选），acquire 后需自行初始化。
 */

export class ObjectPool {
  constructor(factory, resetFn = null, initialSize = 0) {
    this._factory = factory;
    this._reset = resetFn;
    this._free = [];
    for (let i = 0; i < initialSize; i++) {
      this._free.push(this._factory());
    }
  }

  acquire() {
    let obj;
    if (this._free.length > 0) {
      obj = this._free.pop();
    } else {
      obj = this._factory();
    }
    obj.__pooled = false;
    return obj;
  }

  release(obj) {
    if (obj.__pooled) return; // 防止重复回收
    obj.__pooled = true;
    if (this._reset) this._reset(obj);
    this._free.push(obj);
  }

  get freeCount() {
    return this._free.length;
  }
}

export default ObjectPool;
