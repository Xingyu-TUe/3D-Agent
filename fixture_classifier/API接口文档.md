# 夹具单元分类 API 接口文档

| 项 | 说明 |
|----|------|
| 版本 | 1.0.0 |
| 协议 | HTTP/1.1 |
| 默认地址 | `http://{主机}:8000` |
| 交互文档 | 服务启动后访问 `http://{主机}:8000/docs`（Swagger） |
| 编码 | UTF-8；响应体为 JSON |

基于 **MobileNetV3-Small** 的 3D 数模截图分类推理服务。类别由训练时的文件夹名决定，接口只做预测，不生成新类别。

---

## 1. 服务启动

### 1.1 命令行

```bash
cd fixture_classifier/src
python api_server.py --checkpoint ../outputs/run/best.pt --host 0.0.0.0 --port 8000
```

| 参数 | 默认 | 说明 |
|------|------|------|
| `--checkpoint` | （必填） | 训练产出的 `best.pt` 路径 |
| `--host` | `0.0.0.0` | 监听地址；`0.0.0.0` 允许局域网访问 |
| `--port` | `8000` | 端口 |
| `--image-size` | `224` | 输入缩放边长，需与训练一致 |

### 1.2 Windows

双击 `run_api.bat`，或：

```cmd
cd fixture_classifier
run_api.bat outputs\run\best.pt
```

### 1.3 前置条件

- 已完成训练，存在有效 `best.pt`
- 已安装依赖：`pip install -r requirements.txt`
- 防火墙放行对应端口（局域网调用时）

---

## 2. 通用约定

### 2.1 Base URL

| 场景 | Base URL |
|------|----------|
| 本机 | `http://127.0.0.1:8000` |
| 局域网 | `http://{服务器IP}:8000` |

### 2.2 请求 / 响应

- 成功：HTTP `200`，`Content-Type: application/json`
- 上传图片：`Content-Type: multipart/form-data`
- CORS：当前允许任意来源（内网演示用；生产环境建议收紧）

### 2.3 图片要求

| 项 | 要求 |
|----|------|
| 格式 | PNG、JPG、JPEG、BMP、WEBP 等 Pillow 可解码格式 |
| 通道 | 自动转为 RGB |
| 尺寸 | 任意；服务端缩放到 `image_size × image_size` |
| 内容 | 与训练时一致的 3D 数模截图风格（视角、背景尽量统一） |

### 2.4 预测结果字段

单张预测对象结构：

| 字段 | 类型 | 说明 |
|------|------|------|
| `label` | string | 预测类别名（与训练文件夹名一致） |
| `confidence` | number | 该类别概率，范围 `[0, 1]` |
| `top3` | array | 置信度最高的最多 3 个类别 |
| `top3[].label` | string | 类别名 |
| `top3[].confidence` | number | 对应概率 |
| `path` | string \| null | 上传时的文件名（便于对账） |

---

## 3. 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/classes` | 查询当前模型类别列表 |
| POST | `/predict` | 单张截图分类 |
| POST | `/predict/batch` | 批量截图分类 |
| GET | `/docs` | Swagger UI（浏览器） |
| GET | `/openapi.json` | OpenAPI 规范 JSON |

---

## 4. 接口详情

### 4.1 健康检查

**`GET /health`**

确认服务是否就绪、模型是否已加载。

**请求参数：** 无

**成功响应 `200`：**

```json
{
  "status": "ok",
  "device": "cpu",
  "num_classes": 3,
  "checkpoint": "F:\\...\\outputs\\run\\best.pt"
}
```

| 字段 | 说明 |
|------|------|
| `status` | 正常时为 `"ok"` |
| `device` | `"cpu"` 或 `"cuda"` |
| `num_classes` | 类别数量 |
| `checkpoint` | 当前加载的权重绝对路径 |

**调用示例：**

```bash
curl -s http://127.0.0.1:8000/health
```

---

### 4.2 查询类别

**`GET /classes`**

返回当前权重对应的全部预设类别（顺序与训练时 `ImageFolder` 一致）。

**请求参数：** 无

**成功响应 `200`：**

```json
{
  "classes": ["压紧块", "定位块", "支撑块"]
}
```

**说明：** 实际类别名以你数据集文件夹名为准；上述仅为示例。

**调用示例：**

```bash
curl -s http://127.0.0.1:8000/classes
```

---

### 4.3 单张预测

**`POST /predict`**

上传一张 3D 截图，返回预测类别与置信度。

**请求**

| 项 | 值 |
|----|-----|
| Content-Type | `multipart/form-data` |
| 表单字段 | `file`（必填，二进制图片） |

**成功响应 `200`：**

```json
{
  "label": "定位块",
  "confidence": 0.9130623936653137,
  "top3": [
    { "label": "定位块", "confidence": 0.9130623936653137 },
    { "label": "压紧块", "confidence": 0.08225378394126892 },
    { "label": "支撑块", "confidence": 0.004683787934482098 }
  ],
  "path": "定位块_000.png"
}
```

**错误响应**

| HTTP | 场景 | `detail` 示例 |
|------|------|----------------|
| 400 | 空文件 | `"空文件: xxx.png"` |
| 400 | 非图片 / 损坏 | `"无法解析图片: xxx.png"` |
| 422 | 未传 `file` 字段 | FastAPI 校验错误 |
| 503 | 模型未加载 | `"模型未加载"` |

**curl：**

```bash
curl -s -X POST ^
  -F "file=@F:/截图/单元01.png" ^
  http://127.0.0.1:8000/predict
```

Linux / macOS：

```bash
curl -s -X POST \
  -F "file=@/path/to/shot.png" \
  http://127.0.0.1:8000/predict
```

**Python（requests）：**

```python
import requests

url = "http://127.0.0.1:8000/predict"
with open(r"F:\截图\单元01.png", "rb") as f:
    resp = requests.post(url, files={"file": ("单元01.png", f, "image/png")})
resp.raise_for_status()
data = resp.json()
print(data["label"], data["confidence"])
```

**C#（HttpClient）：**

```csharp
using var client = new HttpClient();
using var form = new MultipartFormDataContent();
using var fs = File.OpenRead(@"F:\截图\单元01.png");
form.Add(new StreamContent(fs), "file", "单元01.png");

var resp = await client.PostAsync("http://127.0.0.1:8000/predict", form);
resp.EnsureSuccessStatusCode();
var json = await resp.Content.ReadAsStringAsync();
// 解析 json 中的 label / confidence
```

---

### 4.4 批量预测

**`POST /predict/batch`**

一次上传多张截图，按上传顺序返回结果列表。

**请求**

| 项 | 值 |
|----|-----|
| Content-Type | `multipart/form-data` |
| 表单字段 | `files`（必填，可重复多个文件） |

**成功响应 `200`：**

```json
{
  "results": [
    {
      "label": "定位块",
      "confidence": 0.91,
      "top3": [ ... ],
      "path": "a.png"
    },
    {
      "label": "压紧块",
      "confidence": 0.88,
      "top3": [ ... ],
      "path": "b.png"
    }
  ]
}
```

**错误响应：** 同单张预测；另可因未上传文件返回 `400`。

**curl：**

```bash
curl -s -X POST ^
  -F "files=@F:/截图/a.png" ^
  -F "files=@F:/截图/b.png" ^
  http://127.0.0.1:8000/predict/batch
```

**Python：**

```python
import requests

files = [
    ("files", ("a.png", open(r"F:\截图\a.png", "rb"), "image/png")),
    ("files", ("b.png", open(r"F:\截图\b.png", "rb"), "image/png")),
]
resp = requests.post("http://127.0.0.1:8000/predict/batch", files=files)
print(resp.json())
```

> 注意：批量接口会一次性把所有图片读入内存。单次建议控制张数（例如几十张以内）；大批量请循环调用 `/predict` 或自行分批。

---

## 5. 错误码汇总

| HTTP 状态码 | 含义 | 处理建议 |
|-------------|------|----------|
| 200 | 成功 | 解析 JSON |
| 400 | 请求内容非法（空文件、非图片等） | 检查上传文件 |
| 422 | 参数/表单字段校验失败 | 确认字段名为 `file` 或 `files` |
| 503 | 服务未就绪（模型未加载） | 检查启动参数与 `best.pt` |
| 500 | 服务内部错误 | 查看服务端控制台日志 |

错误体一般形如：

```json
{ "detail": "无法解析图片: bad.txt" }
```

---

## 6. 对接建议

1. **先调 `/health`**：`status == "ok"` 再发预测请求。  
2. **用 `/classes` 做本地枚举校验**：业务侧下拉框应与返回列表一致。  
3. **截图规范**：与训练集同一视角/背景，准确率更稳。  
4. **置信度阈值**：例如 `confidence < 0.6` 时提示人工确认（阈值按业务自定）。  
5. **网络**：跨机器访问时用服务器内网 IP，并放行端口；勿把未鉴权服务直接暴露公网。  
6. **当前无 Token**：内网可信环境可用；上生产建议增加鉴权与 HTTPS。

---

## 7. 相关文件

| 文件 | 说明 |
|------|------|
| `src/api_server.py` | HTTP 服务实现 |
| `src/predict.py` | 推理逻辑（CLI 与 API 共用） |
| `run_api.bat` | Windows 一键启动 |
| `outputs/run/best.pt` | 训练产出权重（路径以实际为准） |
| `outputs/run/class_map.json` | 类别索引映射 |

在线调试：服务启动后打开 **`http://127.0.0.1:8000/docs`**。
