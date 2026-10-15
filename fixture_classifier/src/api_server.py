"""夹具单元分类 HTTP 推理服务（供外部系统调用）。

启动示例:
  python api_server.py --checkpoint ../outputs/run/best.pt --host 0.0.0.0 --port 8000

接口:
  GET  /health
  GET  /classes
  POST /predict          multipart/form-data, 字段 file
  POST /predict/batch    multipart/form-data, 字段 files（多文件）
"""

from __future__ import annotations

import argparse
import io
from contextlib import asynccontextmanager
from pathlib import Path

import torch
import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

from predict import load_checkpoint, predict_pil

# 启动时由 main() 注入
STATE: dict = {}


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield

    app = FastAPI(
        title="夹具单元分类 API",
        description="基于 MobileNetV3-Small 的 3D 数模截图分类推理接口",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health():
        return {
            "status": "ok",
            "device": str(STATE.get("device", "")),
            "num_classes": len(STATE.get("classes", [])),
            "checkpoint": STATE.get("checkpoint"),
        }

    @app.get("/classes")
    def classes():
        return {"classes": STATE["classes"]}

    async def _read_image(upload: UploadFile) -> Image.Image:
        raw = await upload.read()
        if not raw:
            raise HTTPException(status_code=400, detail=f"空文件: {upload.filename}")
        try:
            return Image.open(io.BytesIO(raw)).convert("RGB")
        except UnidentifiedImageError as e:
            raise HTTPException(
                status_code=400, detail=f"无法解析图片: {upload.filename}"
            ) from e

    @app.post("/predict")
    async def predict(file: UploadFile = File(..., description="截图 PNG/JPG")):
        if "model" not in STATE:
            raise HTTPException(status_code=503, detail="模型未加载")
        image = await _read_image(file)
        result = predict_pil(
            STATE["model"],
            STATE["classes"],
            image,
            STATE["image_size"],
            STATE["device"],
            path=file.filename,
        )
        return result

    @app.post("/predict/batch")
    async def predict_batch(files: list[UploadFile] = File(...)):
        if "model" not in STATE:
            raise HTTPException(status_code=503, detail="模型未加载")
        if not files:
            raise HTTPException(status_code=400, detail="未上传文件")
        results = []
        for f in files:
            image = await _read_image(f)
            results.append(
                predict_pil(
                    STATE["model"],
                    STATE["classes"],
                    image,
                    STATE["image_size"],
                    STATE["device"],
                    path=f.filename,
                )
            )
        return {"results": results}

    return app


app = create_app()


def main() -> None:
    parser = argparse.ArgumentParser(description="夹具单元分类 HTTP API")
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--image-size", type=int, default=224)
    args = parser.parse_args()

    if not args.checkpoint.is_file():
        raise SystemExit(f"找不到权重: {args.checkpoint}")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model, classes = load_checkpoint(args.checkpoint, device)
    STATE.update(
        {
            "model": model,
            "classes": classes,
            "device": device,
            "image_size": args.image_size,
            "checkpoint": str(args.checkpoint.resolve()),
        }
    )
    print(f"已加载: {args.checkpoint} | 类别={classes} | 设备={device}")
    print(f"文档: http://{args.host}:{args.port}/docs")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
