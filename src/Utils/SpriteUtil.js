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
 * 按脚底 pivot 绘制（角色专用）。
 * pivot 为帧内坐标，绘制时脚底对齐 (dx, dy)。
 */
export function drawFramePivot(ctx, img, frameW, frameH, col, row, dx, dy, pivotX, pivotY, dw, dh) {
  if (!img) return false;
  dw = dw || frameW;
  dh = dh || frameH;
  const scaleX = dw / frameW;
  const scaleY = dh / frameH;
  const sx = col * frameW;
  const sy = row * frameH;
  ctx.drawImage(
    img, sx, sy, frameW, frameH,
    dx - pivotX * scaleX,
    dy - pivotY * scaleY,
    dw, dh,
  );
  return true;
}

/**
 * facing(atan2) → 8 方向索引：N NE E SE S SW W NW
 */
export function facingToDirIndex(facing) {
  let deg = (facing * 180) / Math.PI + 90; // 0 = North
  while (deg < 0) deg += 360;
  while (deg >= 360) deg -= 360;
  return Math.round(deg / 45) % 8;
}

/**
 * 绘制整张图（图标用），居中。
 */
export function drawIcon(ctx, img, cx, cy, size) {
  if (!img) return false;
  ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
  return true;
}

export default { drawFrame, drawFramePivot, facingToDirIndex, drawIcon };
