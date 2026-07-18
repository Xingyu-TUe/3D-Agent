@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   地狱裂隙 - 一键更新 game.js
echo ========================================
echo 当前目录: %CD%
echo.

REM 备份旧文件（若存在）
if exist game.js (
  copy /Y game.js game.js.bak >nul
  echo 已备份旧文件为 game.js.bak
)

set URL1=https://cdn.jsdelivr.net/gh/Xingyu-TUe/3D-Agent@cursor/hell-rift-wechat-game-b0ee/game.js
set URL2=https://raw.githubusercontent.com/Xingyu-TUe/3D-Agent/cursor/hell-rift-wechat-game-b0ee/game.js

echo 正在下载（优先国内可访问的 jsDelivr）...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ ProgressivePreference='Stop';" ^
  "$urls=@('%URL1%','%URL2%'); $ok=$false;" ^
  "foreach($u in $urls){ try { Write-Host ('尝试: '+$u); Invoke-WebRequest -Uri $u -OutFile 'game.js.tmp' -UseBasicParsing; if((Get-Item 'game.js.tmp').Length -gt 50000){ Move-Item -Force 'game.js.tmp' 'game.js'; $ok=$true; break } else { Remove-Item -Force 'game.js.tmp' -ErrorAction SilentlyContinue } } catch { Write-Host ('失败: '+$_.Exception.Message) } }" ^
  "if(-not $ok){ exit 1 }"

if errorlevel 1 (
  echo.
  echo [失败] 自动下载不成功。
  if exist game.js.bak (
    copy /Y game.js.bak game.js >nul
    echo 已从备份恢复 game.js
  )
  echo.
  echo 请手动处理：
  echo 1. 浏览器打开:
  echo    https://cdn.jsdelivr.net/gh/Xingyu-TUe/3D-Agent@cursor/hell-rift-wechat-game-b0ee/game.js
  echo 2. 页面另存为 / 右键保存，覆盖本目录的 game.js
  echo 3. 回到微信开发者工具点「编译」
  echo.
  pause
  exit /b 1
)

for %%A in (game.js) do echo 下载成功: game.js 大小=%%~zA 字节
echo.
echo 更新完成！请回到微信开发者工具点击「编译」。
echo 不需要重新导入项目。
echo.
pause
