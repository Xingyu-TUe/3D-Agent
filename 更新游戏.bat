@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   地狱裂隙 - 一键更新（game.js + Assets）
echo ========================================
echo 当前目录: %CD%
echo.

set ZIP_URL1=https://cdn.jsdelivr.net/gh/Xingyu-TUe/3D-Agent@cursor/hell-rift-wechat-game-b0ee/dist/HellRift.zip
set ZIP_URL2=https://raw.githubusercontent.com/Xingyu-TUe/3D-Agent/cursor/hell-rift-wechat-game-b0ee/dist/HellRift.zip
set JS_URL1=https://cdn.jsdelivr.net/gh/Xingyu-TUe/3D-Agent@cursor/hell-rift-wechat-game-b0ee/game.js
set JS_URL2=https://raw.githubusercontent.com/Xingyu-TUe/3D-Agent/cursor/hell-rift-wechat-game-b0ee/game.js

if exist game.js (
  copy /Y game.js game.js.bak >nul
  echo 已备份 game.js.bak
)

echo [1/2] 下载完整微信包 HellRift.zip（含 Assets 贴图）...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ProgressPreference='Stop';" ^
  "$urls=@('%ZIP_URL1%','%ZIP_URL2%'); $ok=$false;" ^
  "foreach($u in $urls){ try {" ^
  "  Write-Host ('尝试: '+$u);" ^
  "  Invoke-WebRequest -Uri $u -OutFile '_hellrift_upd.zip' -UseBasicParsing;" ^
  "  if((Get-Item '_hellrift_upd.zip').Length -gt 80000){ $ok=$true; break }" ^
  "  Remove-Item -Force '_hellrift_upd.zip' -ErrorAction SilentlyContinue" ^
  "} catch { Write-Host ('失败: '+$_.Exception.Message) } }" ^
  "if(-not $ok){ exit 1 };" ^
  "Expand-Archive -Force -Path '_hellrift_upd.zip' -DestinationPath '_hellrift_upd';" ^
  "$src = Get-ChildItem '_hellrift_upd' -Directory | Select-Object -First 1;" ^
  "if(-not $src){ $src = Get-Item '_hellrift_upd' };" ^
  "Copy-Item -Force (Join-Path $src.FullName 'game.js') 'game.js';" ^
  "if(Test-Path (Join-Path $src.FullName 'game.json')){ Copy-Item -Force (Join-Path $src.FullName 'game.json') 'game.json' };" ^
  "if(Test-Path (Join-Path $src.FullName 'Assets')){ if(Test-Path 'Assets'){ Remove-Item -Recurse -Force 'Assets' }; Copy-Item -Recurse -Force (Join-Path $src.FullName 'Assets') 'Assets' };" ^
  "Remove-Item -Recurse -Force '_hellrift_upd' -ErrorAction SilentlyContinue; Remove-Item -Force '_hellrift_upd.zip' -ErrorAction SilentlyContinue;"

if errorlevel 1 (
  echo.
  echo [警告] zip 更新失败，尝试只更新 game.js ...
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ProgressPreference='Stop'; $urls=@('%JS_URL1%','%JS_URL2%'); $ok=$false;" ^
    "foreach($u in $urls){ try { Invoke-WebRequest -Uri $u -OutFile 'game.js.tmp' -UseBasicParsing; if((Get-Item 'game.js.tmp').Length -gt 50000){ Move-Item -Force 'game.js.tmp' 'game.js'; $ok=$true; break } } catch {} }" ^
    "if(-not $ok){ exit 1 }"
  if errorlevel 1 (
    echo [失败] 自动更新不成功。
    if exist game.js.bak copy /Y game.js.bak game.js >nul
    echo.
    echo 请重新下载并解压:
    echo   https://cdn.jsdelivr.net/gh/Xingyu-TUe/3D-Agent@cursor/hell-rift-wechat-game-b0ee/dist/HellRift.zip
    echo 用微信开发者工具打开解压后的 HellRift 文件夹（里面应有 game.js 和 Assets）。
    echo.
    pause
    exit /b 1
  )
)

if exist _hellrift_upd.zip del /f /q _hellrift_upd.zip >nul 2>&1
if exist _hellrift_upd rd /s /q _hellrift_upd >nul 2>&1

echo.
if exist game.js (for %%A in (game.js) do echo [OK] game.js  %%~zA 字节) else echo [缺失] game.js
if exist Assets\ (echo [OK] Assets\) else echo [缺失] Assets\  —— 贴图目录，缺少会导致控制台大量加载失败
echo.
echo 更新完成！请确认：
echo   1. 本目录同时有 game.js 和 Assets\
echo   2. 不要打开带 src\、index.html 的源码仓库根目录
echo   3. 回微信开发者工具点「编译」
echo.
pause
