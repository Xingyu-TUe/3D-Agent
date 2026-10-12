@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 当前目录: %CD%
echo.

if not exist "scripts\check_dataset.py" (
  echo 错误: 未找到 scripts\check_dataset.py，请在本 bat 所在目录（fixture_classifier）下运行。
  pause
  exit /b 1
)

set "DATA_ROOT=F:/AI单元分类"
if not "%~1"=="" set "DATA_ROOT=%~1"

echo 检查数据集: %DATA_ROOT%
echo.

python --version >nul 2>&1
if errorlevel 1 (
  echo 错误: 未找到 python，请先安装 Python 3.10+ 并勾选 "Add to PATH"。
  pause
  exit /b 1
)

if not exist "requirements.txt" (
  echo 错误: 缺少 requirements.txt
  pause
  exit /b 1
)

echo 正在安装依赖（首次可能较慢）...
python -m pip install -r requirements.txt -q
if errorlevel 1 (
  echo pip 安装失败，可手动执行: python -m pip install -r requirements.txt
  pause
  exit /b 1
)

python scripts\check_dataset.py "%DATA_ROOT%"
echo.
pause
