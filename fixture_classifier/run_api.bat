@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "CKPT=%~1"
if "%CKPT%"=="" set "CKPT=outputs\run\best.pt"

if not exist "%CKPT%" (
  echo 错误: 找不到权重文件 "%CKPT%"
  echo 用法: run_api.bat [best.pt路径]
  echo 示例: run_api.bat outputs\run\best.pt
  pause
  exit /b 1
)

python -m pip install -r requirements.txt -q
cd src
python api_server.py --checkpoint "..\%CKPT%" --host 0.0.0.0 --port 8000
pause
