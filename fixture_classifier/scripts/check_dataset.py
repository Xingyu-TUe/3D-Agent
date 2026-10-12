"""检查本地数据集目录是否符合 ImageFolder 约定。"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from dataset import IMAGE_EXTENSIONS, prepare_data_root  # noqa: E402


def count_images(folder: Path) -> int:
    if not folder.is_dir():
        return 0
    return sum(
        1
        for p in folder.rglob("*")
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("data_root", type=Path, help="例如 F:/AI单元分类 或 data/dataset")
    parser.add_argument("--no-split", action="store_true", help="仅检查已有 train/val，不自动划分")
    args = parser.parse_args()

    root = args.data_root.resolve()
    print(f"数据根目录: {root}")
    if not root.exists():
        print("错误: 目录不存在")
        return

    train_root, val_root = prepare_data_root(
        root,
        auto_split_val=not args.no_split,
        val_ratio=0.15,
        seed=42,
    )
    classes = sorted(d.name for d in train_root.iterdir() if d.is_dir())
    print(f"类别 ({len(classes)}): {classes}")
    for c in classes:
        tr = count_images(train_root / c)
        va = count_images(val_root / c)
        print(f"  {c}: train={tr}, val={va}")
    total_tr = sum(count_images(train_root / c) for c in classes)
    total_va = sum(count_images(val_root / c) for c in classes)
    print(f"合计: train={total_tr}, val={total_va}")
    if total_tr < 20 * len(classes):
        print("提示: 每类样本较少时建议增加截图或加强规范视角，避免过拟合")


if __name__ == "__main__":
    main()
