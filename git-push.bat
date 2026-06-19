@echo off
cd /d "%~dp0rescue-portal"
echo Pushing to GitHub...
git push origin main
echo.
if %errorlevel% equ 0 (
    echo SUCCESS! Pushed to GitHub. Vercel will auto-deploy.
) else (
    echo FAILED. You may need to run: git push origin main
)
echo.
pause
