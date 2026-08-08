@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   地狱裂隙 - 从 src\Assets 复制到 Assets\
echo ========================================
echo 仅当你误开了「源码仓库根目录」时使用。
echo 当前目录: %CD%
echo.

if exist Assets\ (
  echo 已存在 Assets\ ，无需修复。
  pause
  exit /b 0
)

if exist src\Assets\ (
  echo 发现 src\Assets\ ，正在复制...
  xcopy /E /I /Y src\Assets Assets >nul
  if exist Assets\manifest.json (
    echo [OK] 已生成 Assets\
    echo 请回微信开发者工具点「编译」。
    echo.
    echo 更推荐：关掉本项目，改导入 dist\HellRift.zip 解压出的 HellRift 文件夹。
  ) else (
    echo [失败] 复制异常
  )
  pause
  exit /b 0
)

echo [失败] 当前目录既没有 Assets\ 也没有 src\Assets\。
echo 请重新下载并解压:
echo   dist\HellRift.zip
echo 导入解压后的 HellRift 文件夹（与 game.js 同级必须有 Assets\）。
echo.
pause
exit /b 1
