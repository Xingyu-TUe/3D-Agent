"""单张或批量截图推理（CLI + 供 API 复用）。"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import torch
from PIL import Image
from torchvision import transforms

from dataset import IMAGENET_MEAN, IMAGENET_STD
from model import build_mobilenet_v3_small


def load_checkpoint(ckpt_path: Path, device):
    ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
    classes = ckpt["classes"]
    model = build_mobilenet_v3_small(len(classes), pretrained=False)
    model.load_state_dict(ckpt["model_state"])
    model.to(device).eval()
    return model, classes


def _build_transform(image_size: int) -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )


def predict_pil(
    model,
    classes: list[str],
    image: Image.Image,
    image_size: int,
    device,
    path: str | None = None,
) -> dict[str, Any]:
    tf = _build_transform(image_size)
    img = image.convert("RGB")
    x = tf(img).unsqueeze(0).to(device)
    with torch.no_grad():
        probs = torch.softmax(model(x), dim=1)[0].cpu()
    idx = int(probs.argmax())
    result: dict[str, Any] = {
        "label": classes[idx],
        "confidence": float(probs[idx]),
        "top3": [
            {"label": classes[i], "confidence": float(probs[i])}
            for i in probs.argsort(descending=True)[:3].tolist()
        ],
    }
    if path is not None:
        result["path"] = path
    return result


def predict_image(model, classes, image_path: Path, image_size: int, device):
    img = Image.open(image_path).convert("RGB")
    return predict_pil(model, classes, img, image_size, device, path=str(image_path))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--image", type=Path, nargs="+", required=True)
    parser.add_argument("--image-size", type=int, default=224)
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model, classes = load_checkpoint(args.checkpoint, device)

    results = [
        predict_image(model, classes, p, args.image_size, device) for p in args.image
    ]
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
