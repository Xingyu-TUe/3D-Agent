@echo off
chcp 65001 >nul
echo ========================================
echo   地狱裂隙 - 一键更新 game.js
echo ========================================
echo.
echo 正在从 GitHub 下载最新 game.js ...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/Xingyu-TUe/3D-Agent/cursor/hell-rift-wechat-game-b0ee/game.js' -OutFile 'game.js' -UseBasicParsing; Write-Host 'OK: game.js 已更新' } catch { Write-Host 'FAIL:' $_.Exception.Message; exit 1 }"

if errorlevel 1 (
  echo.
  echo 下载失败。也可手动打开浏览器下载：
  echo https://raw.githubusercontent.com/Xingyu-TUe/3D-Agent/cursor/hell-rift-wechat-game-b0ee/game.js
  echo 保存为当前目录下的 game.js 覆盖即可。
  pause
  exit /b 1
)

echo.
echo 更新完成！请回到微信开发者工具点击「编译」。
echo 不需要重新导入项目。
echo.
pause
