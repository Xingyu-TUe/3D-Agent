# Windows 本地运行（拿不到路径时看这里）

## 常见报错原因

1. **`cd <你的仓库路径>\fixture_classifier`**  
   `<你的仓库路径>` 是**占位符**，不能原样输入。要换成你电脑上仓库的真实路径。

2. **`requirements.txt` 找不到**  
   说明当前目录不是 `fixture_classifier` 文件夹，需要先 `cd` 进去。

3. **云 Agent 无法访问 `F:`**  
   检查数据集必须在**你自己的 Windows 电脑**上跑；`F:/AI单元分类` 只有本机能读。

---

## 方式 A：已有 Git 仓库

```cmd
cd C:\Users\付星宇\Documents\3D-Agent\fixture_classifier
```

路径示例：把 `C:\Users\付星宇\Documents\3D-Agent` 换成你 clone 下来的实际位置。  
不确定在哪：在资源管理器打开含 `fixture_classifier` 的文件夹，地址栏复制路径。

然后：

```cmd
python -m pip install -r requirements.txt
python scripts\check_dataset.py "F:/AI单元分类"
```

---

## 方式 B：还没有 clone 仓库

```cmd
cd C:\Users\付星宇\Documents
git clone https://github.com/Xingyu-TUe/3D-Agent.git
cd 3D-Agent\fixture_classifier
python -m pip install -r requirements.txt
python scripts\check_dataset.py "F:/AI单元分类"
```

---

## 方式 C：双击脚本（最简单）

1. 用资源管理器进入 **`fixture_classifier`** 文件夹（里面有 `run_check_dataset.bat`）。
2. 双击 **`run_check_dataset.bat`**（默认检查 `F:/AI单元分类`）。
3. 若数据在其他盘，把文件夹拖到 bat 上，或在 cmd 里：

```cmd
run_check_dataset.bat "D:/我的数据/AI单元分类"
```

---

## 仍没有 `fixture_classifier` 文件夹

从 GitHub 下载 ZIP：  
https://github.com/Xingyu-TUe/3D-Agent/archive/refs/heads/main.zip  

解压后进入：`3D-Agent-main\fixture_classifier`，再按方式 C 或 A 执行。

---

检查成功后，把黑窗口里 **「类别」「train/val 数量」** 整段复制发即可继续配置训练。
