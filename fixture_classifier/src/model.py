"""MobileNetV3-Small 分类头。"""

from __future__ import annotations

import torch.nn as nn
from torchvision import models
from torchvision.models import MobileNet_V3_Small_Weights


def build_mobilenet_v3_small(num_classes: int, pretrained: bool = True) -> nn.Module:
    weights = MobileNet_V3_Small_Weights.IMAGENET1K_V1 if pretrained else None
    model = models.mobilenet_v3_small(weights=weights)
    in_features = model.classifier[-1].in_features
    model.classifier[-1] = nn.Linear(in_features, num_classes)
    return model


def set_trainable_backbone(model: nn.Module, trainable: bool) -> None:
    for name, param in model.named_parameters():
        if name.startswith("classifier"):
            param.requires_grad = True
        else:
            param.requires_grad = trainable
