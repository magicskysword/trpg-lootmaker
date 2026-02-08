@echo off
setlocal
cd /d %~dp0

if not exist data mkdir data
if not exist data\image mkdir data\image
if not exist temp mkdir temp

if not exist .env (
  copy .env.example .env >nul
  echo 已生成 .env (来自 .env.example)
)

if not exist node_modules (
  echo 正在安装依赖...
  call npm install
  if errorlevel 1 (
    echo 依赖安装失败，请检查网络后重试。
    exit /b 1
  )
)

echo 启动开发环境...
call npm run dev
