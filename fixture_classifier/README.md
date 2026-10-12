# 夹具单元截图分类（MobileNetV3-Small 迁移学习）

基于 **3D 数模截图** 的**预设类别**分类：使用 ImageNet 预训练的 **MobileNetV3-Small**，先训练分类头再微调全网，适合中小规模数据集与边缘部署。

## 总体流程规划

| 步骤 | 内容 | 说明 |
|------|------|------|
| 1 | 整理数据集 | 按类别分文件夹；建议 `train/`（必须），`val/`（可选，可自动划分） |
| 2 | 环境 | Python 3.10+，`pip install -r requirements.txt` |
| 3 | 配置 | 编辑 `config.yaml` 中 `data_root` 指向你的数据根目录 |
| 4 | 训练 | `python src/train.py` |
| 5 | 评估 | 查看 `outputs/run/classification_report.txt` |
| 6 | 推理 | `python src/predict.py --checkpoint outputs/run/best.pt --image 某截图.png` |
| 7 | 部署 | 导出 ONNX/TorchScript（可按需扩展） |

## 数据集目录约定（对应 `F:\AI单元分类`）

**推荐结构**（与 PyTorch `ImageFolder` 一致）：

```text
F:/AI单元分类/
  train/
    定位块/
      xxx.png
    压紧块/
      ...
    （每个预设类别一个文件夹，文件夹名 = 类别名）
  val/          # 可选；若无则脚本从 train 按 val_ratio 复制划分
    定位块/
    ...
```

也支持根目录直接放类别文件夹（无 `train` 层时会把整个根目录当训练集并自动划验证集）。

**图片要求**：PNG/JPG 等常见格式；尽量统一截图分辨率与视角规范（训练与线上一致）。

**Windows 配置示例**（`config.yaml`）：

```yaml
data_root: "F:/AI单元分类"
# 若只有 train 子目录：
# data_root: "F:/AI单元分类"   # 且存在 F:/AI单元分类/train/...
auto_split_val: true
val_ratio: 0.15
```

## 迁移学习策略（本仓库实现）

1. **加载** `mobilenet_v3_small` ImageNet 预训练权重。  
2. **替换** 最后一层全连接为 `num_classes`。  
3. **阶段一**（默认前 3 epoch）：冻结 backbone，只训 `classifier`。  
4. **阶段二**：解冻全网，较小学习率微调。  
5. **早停**：验证集准确率长期不升则停止；保存 `best.pt` 与 `class_map.json`。

## 快速开始（演示数据）

云环境无法访问 `F:\`，可用脚本生成演示数据验证流水线：

```bash
cd fixture_classifier
pip install -r requirements.txt
python scripts/create_demo_dataset.py
python src/train.py
python src/predict.py --checkpoint outputs/run/best.pt --image data/dataset/train/定位块/定位块_000.png
```

## 使用真实数据（本地）

```bash
cd fixture_classifier
pip install -r requirements.txt
# 修改 config.yaml 的 data_root 为 F:/AI单元分类
python src/train.py --data-root "F:/AI单元分类"
```

有独立验证集时：

```yaml
auto_split_val: false
```

并保证存在 `data_root/val/` 与 `train` 类别一致。

## 输出文件

- `outputs/run/best.pt` — 最佳权重与类别列表  
- `outputs/run/class_map.json` — 索引到类别名  
- `outputs/run/classification_report.txt` — 精确率/召回/F1  
- `outputs/run/confusion_matrix.json` — 混淆矩阵  

## 后续可扩展

- 混合真实截图与轻度渲染增强  
- 导出 ONNX 供 C#/C++ 工位调用  
- 与 3D-Agent 截图批处理脚本联动，自动落盘到 `train/类别名/`
