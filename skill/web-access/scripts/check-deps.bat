@echo off
REM 环境检查 + 确保 CDP Proxy 就绪 (Windows)
setlocal enabledelayedexpansion

REM Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo node: missing - 请安装 Node.js 22+
    exit /b 1
)
for /f "tokens=1" %%v in ('node --version') do set NODE_VER=%%v
echo node: ok %NODE_VER%

REM Chrome 调试端口
node -e "const net=require('net');const s=net.createConnection(9222,'127.0.0.1');s.on('connect',()=>{console.log('ok');s.destroy()});s.on('error',()=>{process.exit(1)});setTimeout(()=>{process.exit(1)},2000);" >nul 2>&1
if errorlevel 1 (
    echo chrome: not connected - 请打开 chrome:\/\/inspect\/^#remote-debugging 并勾选 Allow remote debugging
    exit /b 1
)
echo chrome: ok ^(port 9222^)

REM CDP Proxy
curl -s --connect-timeout 2 "http://127.0.0.1:3456/health" >nul 2>&1
if not errorlevel 1 (
    curl -s "http://127.0.0.1:3456/health" | findstr /C:"\"connected\":true" >nul 2>&1
    if not errorlevel 1 (
        echo proxy: ready
        exit /b 0
    )
)

echo proxy: starting...
set SKILL_DIR=%~dp0..
start /B node "%SKILL_DIR%\scripts\cdp-proxy.mjs" >nul 2>&1

for /L %%i in ^(1,1,15^) do (
    timeout /t 1 /nobreak >nul
    curl -s "http://127.0.0.1:3456/health" | findstr /C:"\"connected\":true" >nul 2>&1
    if not errorlevel 1 (
        echo proxy: ready
        exit /b 0
    )
    if %%i equ 3 (
        echo:WARNING: Chrome 可能有授权弹窗，请点击 Allow 后等待连接...
    )
)
echo FAILED: 连接超时，请检查 Chrome 调试设置
exit /b 1
