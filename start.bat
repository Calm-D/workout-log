@echo off
setlocal
cd /d "%~dp0"
netstat -ano | findstr "LISTENING" | findstr ":8014" >nul
if %errorlevel%==0 (
  start "" "http://127.0.0.1:8014"
  exit /b 0
)
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm run dev' -WorkingDirectory '%CD%' -WindowStyle Hidden"
ping -n 4 127.0.0.1 >nul
start "" "http://127.0.0.1:8014"
endlocal
