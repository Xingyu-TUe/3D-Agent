"""生成演示用合成「3D 截图风格」数据集，用于在无 F: 盘时验证训练流水线。"""

from __future__ import annotations

import random
from pathlib import Path

from PIL import Image, ImageDraw


CLASSES = ["定位块", "压紧块", "支撑块"]


def make_screenshot_like(label: str, seed: int) -> Image.Image:
    rng = random.Random(seed)
    w, h = 320, 240
    bg = rng.randint(30, 60)
    img = Image.new("RGB", (w, h), (bg, bg + 10, bg + 20))
    draw = ImageDraw.Draw(img)
    cx, cy = w // 2 + rng.randint(-20, 20), h // 2 + rng.randint(-15, 15)
    if label == "定位块":
        draw.rectangle([cx - 50, cy - 30, cx + 50, cy + 30], fill=(200, 80, 80))
    elif label == "压紧块":
        draw.polygon(
            [(cx, cy - 45), (cx + 55, cy + 35), (cx - 55, cy + 35)],
            fill=(80, 180, 120),
        )
    else:
        draw.ellipse([cx - 45, cy - 45, cx + 45, cy + 45], fill=(90, 120, 220))
    for _ in range(8):
        x0, y0 = rng.randint(0, w - 1), rng.randint(0, h - 1)
        draw.line([x0, y0, x0 + rng.randint(-30, 30), y0 + rng.randint(-30, 30)], fill=(120, 120, 130), width=1)
    return img


def main() -> None:
    root = Path(__file__).resolve().parent.parent / "data" / "dataset" / "train"
    per_class = 40
    seed_base = 2026
    for ci, cls in enumerate(CLASSES):
        d = root / cls
        d.mkdir(parents=True, exist_ok=True)
        for i in range(per_class):
            img = make_screenshot_like(cls, seed_base + ci * 1000 + i)
            img.save(d / f"{cls}_{i:03d}.png")
    print(f"已写入演示数据: {root} ({len(CLASSES)} 类, 每类 {per_class} 张)")


if __name__ == "__main__":
    main()
