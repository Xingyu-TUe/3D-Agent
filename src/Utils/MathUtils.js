/**
 * MathUtils.js
 * 数学工具函数集合。纯函数，无副作用，避免在热点循环中产生临时对象。
 */

export const TWO_PI = Math.PI * 2;

export function clamp(v, min, max) {
  return v < min ? min : (v > max ? max : v);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function chance(p) {
  return Math.random() < p;
}

/** 从数组随机取一个元素 */
export function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

/** 平方距离，避免开方，用于比较距离 */
export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function dist(ax, ay, bx, by) {
  return Math.sqrt(dist2(ax, ay, bx, by));
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

/**
 * 线性时间曲线插值。keyframes = [{time, value}], 按 time 升序。
 * 返回给定 t 处线性插值后的 value。
 */
export function sampleCurve(keyframes, t) {
  if (t <= keyframes[0].time) return keyframes[0].value;
  const last = keyframes[keyframes.length - 1];
  if (t >= last.time) return last.value;
  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (t >= a.time && t <= b.time) {
      const k = (t - a.time) / (b.time - a.time);
      return lerp(a.value, b.value, k);
    }
  }
  return last.value;
}

/** 圆与圆碰撞（用半径） */
export function circleHit(ax, ay, ar, bx, by, br) {
  const r = ar + br;
  return dist2(ax, ay, bx, by) <= r * r;
}

/** 保留 n 位小数（显示用） */
export function round(v, n = 0) {
  const p = Math.pow(10, n);
  return Math.round(v * p) / p;
}

export default {
  TWO_PI,
  clamp,
  lerp,
  randRange,
  randInt,
  chance,
  pick,
  dist2,
  dist,
  angleTo,
  sampleCurve,
  circleHit,
  round,
};
