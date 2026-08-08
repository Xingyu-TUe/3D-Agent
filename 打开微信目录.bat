@echo off
chcp 65001 >nul
setlocal
set "ROOT=D:\RIFT"
set "WECHAT=%ROOT%\dist\wechat"

echo ========================================
echo   打开微信小游戏导入目录
echo ========================================
echo.

if not exist "%ROOT%\package.json" (
  echo [失败] 未找到 %ROOT%
  echo 请先双击运行：同步到本机.bat
  pause
  exit /b 1
)

pushd "%ROOT%"
echo 当前分支 / 最新提交：
git rev-parse --abbrev-ref HEAD 2>nul
git log -1 --oneline 2>nul
echo.

if not exist "%WECHAT%\game.js" (
  echo [提示] 尚未打包，正在执行 npm run build:wechat ...
  call npm run build:wechat
)
popd

if not exist "%WECHAT%\game.js" (
  echo [失败] 仍没有 %WECHAT%\game.js
  pause
  exit /b 1
)

echo 微信目录: %WECHAT%
for %%A in ("%WECHAT%\game.js") do (
  echo game.js 大小: %%~zA 字节
  echo game.js 时间: %%~tA
)
echo.
findstr /C:"SkillButtons" "%WECHAT%\game.js" >nul
if errorlevel 1 (
  echo [警告] game.js 里没有 SkillButtons —— 仍是旧包！
  echo 请在 %ROOT% 再执行：同步到本机.bat
) else (
  echo [OK] 已检测到主动技能按钮代码（SkillButtons）
)
echo.
echo ========================================
echo 请在微信开发者工具中：
echo   1. 关闭旧项目（若开着 D:\3D-Agent 或其它旧路径）
echo   2. 导入项目 / 打开目录，选择：
echo      %WECHAT%
echo   3. 确认该目录下有：game.js、game.json、Assets\
echo   4. 点「编译」；不行就「清缓存」后重编译
echo ========================================
echo.
explorer "%WECHAT%"
pause
