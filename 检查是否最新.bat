@echo off
chcp 65001 >nul
setlocal
set "ROOT=D:\RIFT"
set "BRANCH=cursor/hell-rift-wechat-game-b0ee"

echo ========================================
echo   检查本机是否已是最新代码
echo ========================================
echo.

if not exist "%ROOT%\.git" (
  echo [失败] %ROOT% 还不是 git 仓库
  echo 请先运行 同步到本机.bat
  pause
  exit /b 1
)

pushd "%ROOT%"
echo --- 本地 ---
git fetch origin %BRANCH% 2>nul
git rev-parse --abbrev-ref HEAD
git log -1 --format="本地提交: %%h %%s %%ci"
git log -1 --format="本地时间: %%ci" origin/%BRANCH% 2>nul
echo.
for /f %%H in ('git rev-parse HEAD') do set "LOCAL=%%H"
for /f %%H in ('git rev-parse origin/%BRANCH%') do set "REMOTE=%%H"
echo 本地 HEAD : %LOCAL%
echo 远程分支  : %REMOTE%
if /I "%LOCAL%"=="%REMOTE%" (
  echo [OK] 代码已与远程同步
) else (
  echo [旧] 本机落后远程！请立刻双击 同步到本机.bat
)
echo.
if exist "dist\wechat\game.js" (
  for %%A in ("dist\wechat\game.js") do echo dist\wechat\game.js  %%~zA 字节  %%~tA
  findstr /C:"SkillButtons" "dist\wechat\game.js" >nul && echo [OK] 微信包含主动技能UI || echo [旧] 微信包缺少 SkillButtons，请 npm run build:wechat
) else (
  echo [缺失] dist\wechat\game.js —— 请 npm run build:wechat
)
if exist "game.js" (
  for %%A in ("game.js") do echo 根目录 game.js     %%~zA 字节  %%~tA
)
popd
echo.
echo 微信开发者工具必须打开：
echo   %ROOT%\dist\wechat\
echo 不要打开旧目录（如 D:\3D-Agent）或只含旧解压包的文件夹。
echo.
pause
