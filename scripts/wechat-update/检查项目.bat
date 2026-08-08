@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 检查微信小游戏项目文件...
echo 目录: %CD%
echo.

set OK=1
if not exist game.js (
  echo [缺失] game.js  —— 这就是报错「game.js 未找到」的原因
  set OK=0
) else (
  for %%A in (game.js) do echo [OK] game.js  %%~zA 字节
)
if not exist game.json (
  echo [缺失] game.json
  set OK=0
) else (
  echo [OK] game.json
)
if not exist project.config.json (
  echo [缺失] project.config.json
  set OK=0
) else (
  echo [OK] project.config.json
)
if not exist Assets\ (
  echo [缺失] Assets\  —— 角色/怪物/UI 贴图目录，缺少时会回退为简单图形
  set OK=0
) else (
  echo [OK] Assets\
)

echo.
if "%OK%"=="0" (
  echo 项目不完整。请重新解压 HellRift.zip，并用微信开发者工具选择解压后的 HellRift 文件夹。
  echo 或双击「更新游戏.bat」尝试只补全 game.js（贴图仍需 zip 中的 Assets）。
) else (
  echo 文件齐全。若工具仍报错，请确认开发者工具「打开的目录」就是本文件夹。
)
echo.
pause
