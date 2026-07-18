/**
 * SpriteUtil.js
 * 精灵表裁剪绘制工具。
 */

/**
 * 从精灵表绘制一帧到屏幕。
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource} img
 * @param {number} frameW 帧宽
 * @param {number} frameH 帧高
 * @param {number} col 列（0-based）
 * @param {number} row 行（0-based）
 * @param {number} dx 目标中心 x
 * @param {number} dy 目标中心 y
 * @param {number} [dw] 绘制宽
 * @param {number} [dh] 绘制高
 * @param {boolean} [flipX] 水平翻转（面向左时）
 */
export function drawFrame(ctx, img, frameW, frameH, col, row, dx, dy, dw, dh, flipX) {
  if (!img) return false;
  dw = dw || frameW;
  dh = dh || frameH;
  const sx = col * frameW;
  const sy = row * frameH;
  ctx.save();
  ctx.translate(dx, dy);
  if (flipX) ctx.scale(-1, 1);
  ctx.drawImage(img, sx, sy, frameW, frameH, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  return true;
}

/**
 * 绘制整张图（图标用），居中。
 */
export function drawIcon(ctx, img, cx, cy, size) {
  if (!img) return false;
  ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
  return true;
}

export default { drawFrame, drawIcon };
