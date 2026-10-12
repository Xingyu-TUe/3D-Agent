"""训练入口。"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import torch
import torch.nn as nn
import yaml
from sklearn.metrics import classification_report, confusion_matrix
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from tqdm import tqdm

from dataset import create_dataloaders, save_class_map
from model import build_mobilenet_v3_small, set_trainable_backbone


def load_config(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def train_one_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0
    for images, labels in tqdm(loader, desc="train", leave=False):
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad(set_to_none=True)
        logits = model(images)
        loss = criterion(logits, labels)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * labels.size(0)
        correct += (logits.argmax(1) == labels).sum().item()
        total += labels.size(0)
    return total_loss / max(total, 1), correct / max(total, 1)


@torch.no_grad()
def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0
    all_preds = []
    all_labels = []
    for images, labels in tqdm(loader, desc="val", leave=False):
        images, labels = images.to(device), labels.to(device)
        logits = model(images)
        loss = criterion(logits, labels)
        total_loss += loss.item() * labels.size(0)
        preds = logits.argmax(1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)
        all_preds.extend(preds.cpu().tolist())
        all_labels.extend(labels.cpu().tolist())
    return (
        total_loss / max(total, 1),
        correct / max(total, 1),
        all_labels,
        all_preds,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="夹具单元 MobileNetV3-Small 训练")
    parser.add_argument(
        "--config",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "config.yaml",
    )
    parser.add_argument("--data-root", type=Path, default=None, help="覆盖 config 中的 data_root")
    parser.add_argument("--output-dir", type=Path, default=None)
    args = parser.parse_args()

    cfg = load_config(args.config)
    data_root = args.data_root or Path(cfg["data_root"])
    if not data_root.is_absolute():
        data_root = (args.config.parent / data_root).resolve()

    out_dir = args.output_dir or Path(cfg["output_dir"])
    if not out_dir.is_absolute():
        out_dir = (args.config.parent / out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"设备: {device}")
    print(f"数据目录: {data_root}")

    train_loader, val_loader, classes = create_dataloaders(
        data_root=data_root,
        image_size=int(cfg["image_size"]),
        batch_size=int(cfg["batch_size"]),
        num_workers=int(cfg["num_workers"]),
        augment=cfg.get("augment", {}),
        auto_split_val=bool(cfg.get("auto_split_val", True)),
        val_ratio=float(cfg.get("val_ratio", 0.15)),
        seed=int(cfg.get("seed", 42)),
    )
    num_classes = len(classes)
    print(f"类别数: {num_classes} -> {classes}")

    save_class_map(classes, out_dir / "class_map.json")
    (out_dir / "config_used.yaml").write_text(
        yaml.dump(cfg, allow_unicode=True), encoding="utf-8"
    )

    model = build_mobilenet_v3_small(num_classes, pretrained=True).to(device)
    criterion = nn.CrossEntropyLoss()
    head_only_epochs = int(cfg.get("head_only_epochs", 3))
    epochs = int(cfg["epochs"])
    best_acc = 0.0
    patience = int(cfg.get("early_stop_patience", 8))
    stale = 0

    for epoch in range(1, epochs + 1):
        if epoch <= head_only_epochs:
            set_trainable_backbone(model, trainable=False)
            lr = float(cfg["learning_rate"])
        else:
            set_trainable_backbone(model, trainable=True)
            lr = float(cfg.get("fine_tune_lr", cfg["learning_rate"] * 0.1))

        optimizer = AdamW(
            filter(lambda p: p.requires_grad, model.parameters()),
            lr=lr,
            weight_decay=float(cfg.get("weight_decay", 1e-4)),
        )
        scheduler = CosineAnnealingLR(optimizer, T_max=max(1, epochs - epoch + 1))

        t0 = time.time()
        train_loss, train_acc = train_one_epoch(
            model, train_loader, criterion, optimizer, device
        )
        val_loss, val_acc, y_true, y_pred = evaluate(
            model, val_loader, criterion, device
        )
        scheduler.step()

        phase = "head" if epoch <= head_only_epochs else "fine-tune"
        print(
            f"Epoch {epoch}/{epochs} [{phase}] "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.4f} "
            f"lr={lr:.6f} time={time.time()-t0:.1f}s"
        )

        if val_acc > best_acc:
            best_acc = val_acc
            stale = 0
            if cfg.get("save_best_only", True):
                torch.save(
                    {
                        "epoch": epoch,
                        "model_state": model.state_dict(),
                        "classes": classes,
                        "val_acc": val_acc,
                    },
                    out_dir / "best.pt",
                )
        else:
            stale += 1

        if stale >= patience:
            print(f"早停: {patience} 个 epoch 验证集无提升")
            break

    ckpt_path = out_dir / "best.pt"
    if ckpt_path.is_file():
        ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
        model.load_state_dict(ckpt["model_state"])
        _, _, y_true, y_pred = evaluate(model, val_loader, criterion, device)
        report = classification_report(y_true, y_pred, target_names=classes)
        print("\n最佳模型验证集报告:\n", report)
        (out_dir / "classification_report.txt").write_text(report, encoding="utf-8")
        cm = confusion_matrix(y_true, y_pred)
        (out_dir / "confusion_matrix.json").write_text(
            json.dumps(cm.tolist()), encoding="utf-8"
        )
    else:
        print("未保存 checkpoint，请检查训练过程")


if __name__ == "__main__":
    main()
