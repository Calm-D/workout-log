@echo off
setlocal
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":8014"') do (
  taskkill /f /pid %%a >nul 2>&1
)
endlocal
