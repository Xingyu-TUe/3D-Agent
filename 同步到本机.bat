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
echo 用 Cursor / VS Code 打开该文件夹即可继续开发。
echo H5 调试: 在该目录执行 npm run dev
echo 微信导入: %TARGET%\dist\wechat\
echo.
explorer "%TARGET%"
pause
