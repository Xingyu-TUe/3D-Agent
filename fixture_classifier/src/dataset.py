"""数据集加载与划分（ImageFolder 约定）。"""

from __future__ import annotations

import json
import random
import shutil
from pathlib import Path
from typing import Tuple

from torch.utils.data import DataLoader, Subset
from torchvision import datasets, transforms


IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}


def build_transforms(image_size: int, train: bool, augment: dict) -> transforms.Compose:
    ops = []
    if train:
        if augment.get("horizontal_flip", True):
            ops.append(transforms.RandomHorizontalFlip())
        rot = augment.get("rotation_degrees", 15)
        if rot:
            ops.append(transforms.RandomRotation(rot))
        cj = augment.get("color_jitter", 0.1)
        if cj:
            ops.append(
                transforms.ColorJitter(
                    brightness=cj, contrast=cj, saturation=cj, hue=min(cj / 2, 0.1)
                )
            )
    ops.extend(
        [
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )
    return transforms.Compose(ops)


def _has_split_layout(root: Path) -> bool:
    train_dir = root / "train"
    val_dir = root / "val"
    return train_dir.is_dir() and val_dir.is_dir()


def split_train_val(
    train_root: Path, val_root: Path, val_ratio: float, seed: int
) -> None:
    """从 train_root 各类别文件夹中按比例复制到 val_root（不移动原文件）。"""
    val_root.mkdir(parents=True, exist_ok=True)
    rng = random.Random(seed)
    for class_dir in sorted(train_root.iterdir()):
        if not class_dir.is_dir():
            continue
        images = [
            p
            for p in class_dir.iterdir()
            if p.suffix.lower() in IMAGE_EXTENSIONS
        ]
        if not images:
            continue
        rng.shuffle(images)
        n_val = max(1, int(len(images) * val_ratio)) if len(images) > 1 else 0
        val_class = val_root / class_dir.name
        val_class.mkdir(parents=True, exist_ok=True)
        for p in images[:n_val]:
            dest = val_class / p.name
            if not dest.exists():
                shutil.copy2(p, dest)


def prepare_data_root(
    data_root: Path, auto_split_val: bool, val_ratio: float, seed: int
) -> Tuple[Path, Path]:
    data_root = data_root.resolve()
    if _has_split_layout(data_root):
        return data_root / "train", data_root / "val"

    flat_train = data_root / "train"
    if flat_train.is_dir():
        train_root = flat_train
    elif any(data_root.iterdir()):
        # 根目录下直接是类别文件夹
        train_root = data_root
    else:
        raise FileNotFoundError(f"数据集目录为空或不存在: {data_root}")

    val_root = data_root / "val"
    if auto_split_val:
        if not val_root.is_dir() or not any(val_root.iterdir()):
            val_root.mkdir(parents=True, exist_ok=True)
            split_train_val(train_root, val_root, val_ratio, seed)
    else:
        if not val_root.is_dir():
            raise FileNotFoundError(
                "auto_split_val=false 时需要 data_root/val 目录"
            )
    return train_root, val_root


def create_dataloaders(
    data_root: Path,
    image_size: int,
    batch_size: int,
    num_workers: int,
    augment: dict,
    auto_split_val: bool,
    val_ratio: float,
    seed: int,
) -> Tuple[DataLoader, DataLoader, list[str]]:
    train_root, val_root = prepare_data_root(
        data_root, auto_split_val, val_ratio, seed
    )
    train_tf = build_transforms(image_size, train=True, augment=augment)
    val_tf = build_transforms(image_size, train=False, augment=augment)

    train_ds = datasets.ImageFolder(str(train_root), transform=train_tf)
    val_ds = datasets.ImageFolder(str(val_root), transform=val_tf)

    if train_ds.classes != val_ds.classes:
        raise ValueError("训练集与验证集类别不一致，请检查文件夹名称")

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=True,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True,
    )
    return train_loader, val_loader, train_ds.classes


def save_class_map(classes: list[str], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    mapping = {str(i): name for i, name in enumerate(classes)}
    path.write_text(json.dumps(mapping, ensure_ascii=False, indent=2), encoding="utf-8")
