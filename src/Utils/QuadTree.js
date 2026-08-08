/**
 * QuadTree.js
 * 四叉树空间划分，用于加速碰撞检测（玩家/子弹 vs 海量怪物）。
 *
 * 采用可复用节点 + clear() 每帧重建，避免 GC。
 * 存储对象需具备 { x, y, radius } 或 { x, y, w, h }，这里统一用中心点 + 半径。
 */

export class QuadTree {
  /**
   * @param {object} bounds { x, y, w, h } 区域（世界坐标，左上角）
   * @param {number} maxObjects 单节点最大对象数
   * @param {number} maxLevels 最大深度
   * @param {number} level 当前层级
   */
  constructor(bounds, maxObjects = 8, maxLevels = 6, level = 0) {
    this.bounds = bounds;
    this.maxObjects = maxObjects;
    this.maxLevels = maxLevels;
    this.level = level;
    this.objects = [];
    this.nodes = null; // 4 个子节点，惰性创建
  }

  clear() {
    this.objects.length = 0;
    if (this.nodes) {
      for (let i = 0; i < 4; i++) this.nodes[i].clear();
      // 保留节点结构以复用
    }
  }

  reset(bounds) {
    this.bounds = bounds;
    this.objects.length = 0;
    this.nodes = null;
  }

  _split() {
    const { x, y, w, h } = this.bounds;
    const hw = w / 2;
    const hh = h / 2;
    const nl = this.level + 1;
    this.nodes = [
      new QuadTree({ x: x + hw, y, w: hw, h: hh }, this.maxObjects, this.maxLevels, nl),
      new QuadTree({ x, y, w: hw, h: hh }, this.maxObjects, this.maxLevels, nl),
      new QuadTree({ x, y: y + hh, w: hw, h: hh }, this.maxObjects, this.maxLevels, nl),
      new QuadTree({ x: x + hw, y: y + hh, w: hw, h: hh }, this.maxObjects, this.maxLevels, nl),
    ];
  }

  /** 判断对象（中心+半径）属于哪个象限，返回索引；跨界返回 -1 */
  _getIndex(obj) {
    const { x, y, w, h } = this.bounds;
    const midX = x + w / 2;
    const midY = y + h / 2;
    const r = obj.radius || 0;
    const top = (obj.y + r) < midY;
    const bottom = (obj.y - r) > midY;
    const left = (obj.x + r) < midX;
    const right = (obj.x - r) > midX;

    if (right) {
      if (top) return 0;
      if (bottom) return 3;
    } else if (left) {
      if (top) return 1;
      if (bottom) return 2;
    }
    return -1;
  }

  insert(obj) {
    if (this.nodes) {
      const index = this._getIndex(obj);
      if (index !== -1) {
        this.nodes[index].insert(obj);
        return;
      }
    }

    this.objects.push(obj);

    if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
      if (!this.nodes) this._split();
      let i = 0;
      while (i < this.objects.length) {
        const index = this._getIndex(this.objects[i]);
        if (index !== -1) {
          this.nodes[index].insert(this.objects.splice(i, 1)[0]);
        } else {
          i++;
        }
      }
    }
  }

  /**
   * 查询与给定区域（中心 cx,cy 半径 r）可能相交的对象，push 到 out 数组。
   */
  retrieve(cx, cy, r, out) {
    if (this.nodes) {
      const { x, y, w, h } = this.bounds;
      const midX = x + w / 2;
      const midY = y + h / 2;
      const top = (cy - r) < midY;
      const bottom = (cy + r) > midY;
      const left = (cx - r) < midX;
      const right = (cx + r) > midX;

      if (top) {
        if (right) this.nodes[0].retrieve(cx, cy, r, out);
        if (left) this.nodes[1].retrieve(cx, cy, r, out);
      }
      if (bottom) {
        if (left) this.nodes[2].retrieve(cx, cy, r, out);
        if (right) this.nodes[3].retrieve(cx, cy, r, out);
      }
    }
    const objs = this.objects;
    for (let i = 0; i < objs.length; i++) out.push(objs[i]);
    return out;
  }

  /** 调试：收集所有节点边界 */
  collectBounds(out) {
    out.push(this.bounds);
    if (this.nodes) {
      for (let i = 0; i < 4; i++) this.nodes[i].collectBounds(out);
    }
    return out;
  }
}

export default QuadTree;
