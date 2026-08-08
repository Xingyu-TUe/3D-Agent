@echo off
chcp 65001 >nul
setlocal
set "TARGET=D:\RIFT"
set "REPO=https://github.com/Xingyu-TUe/3D-Agent.git"
set "BRANCH=cursor/hell-rift-wechat-game-b0ee"

echo ========================================
echo   地狱裂隙 - 同步更新到 %TARGET%
echo ========================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo [失败] 未找到 git。请先安装 Git for Windows：
  echo   https://git-scm.com/download/win
  pause
  exit /b 1
)

if not exist "%TARGET%\.git" (
  echo 本地尚无仓库，正在克隆到 %TARGET% ...
  if exist "%TARGET%" (
    echo [提示] 目录已存在但不是 git 仓库，将克隆到临时目录再合并较危险。
    echo 请先备份并清空 %TARGET%，或手动执行：
    echo   git clone -b %BRANCH% %REPO% "%TARGET%"
    pause
    exit /b 1
  )
  git clone -b %BRANCH% "%REPO%" "%TARGET%"
  if errorlevel 1 (
    echo [失败] 克隆失败
    pause
    exit /b 1
  )
) else (
  echo 正在拉取最新代码...
  pushd "%TARGET%"
  git fetch origin %BRANCH%
  git checkout %BRANCH%
  git pull origin %BRANCH%
  if errorlevel 1 (
    echo [失败] 拉取失败。若有本地未提交修改，请先处理冲突。
    popd
    pause
    exit /b 1
  )
  popd
)

echo.
echo 安装 / 更新依赖...
pushd "%TARGET%"
call npm install
if errorlevel 1 (
  echo [警告] npm install 失败，可稍后手动执行
) else (
  echo 正在打包微信包...
  call npm run build:wechat
)
popd

echo.
echo [完成] 本地路径: %TARGET%
git -C "%TARGET%" log -1 --oneline
echo.
if exist "%TARGET%\dist\wechat\game.js" (
  for %%A in ("%TARGET%\dist\wechat\game.js") do (
    echo 微信包 game.js: %%~zA 字节  修改时间 %%~tA
  )
  findstr /C:"SkillButtons" "%TARGET%\dist\wechat\game.js" >nul
  if errorlevel 1 (
    echo [警告] 微信包似乎仍是旧版，请检查构建日志
  ) else (
    echo [OK] 已包含主动技能按钮（SkillButtons）
  )
)
echo.
echo ========================================
echo 下一步（很重要）：
echo   用微信开发者工具打开：
echo     %TARGET%\dist\wechat\
echo   不要打开仓库根目录，也不要打开旧的 D:\3D-Agent
echo   打开后点「编译」；若仍是旧版：清缓存 ^> 全部清除 再编译
echo ========================================
echo.
explorer "%TARGET%\dist\wechat"
pause

