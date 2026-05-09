@echo off
echo ========================================
echo   DEPLOYMENT DIAGNOSTIC CHECK
echo ========================================
echo.

echo Checking if your app is ready for deployment...
echo.

echo 1. Checking if build folder exists...
if exist "build" (
    echo ✅ Build folder exists
    echo Checking build contents...
    dir build /b
) else (
    echo ❌ Build folder not found
    echo Building app...
    call npm run build
)

echo.
echo 2. Checking package.json...
if exist "package.json" (
    echo ✅ package.json exists
) else (
    echo ❌ package.json not found
)

echo.
echo 3. Checking if git repository is ready...
git status
echo.

echo 4. Checking if all files are committed...
git status --porcelain
if %errorlevel%==0 (
    echo ✅ All files are committed
) else (
    echo ⚠️  Some files may not be committed
)

echo.
echo ========================================
echo   DEPLOYMENT READINESS CHECK COMPLETE
echo ========================================
echo.

echo Next steps:
echo 1. Push to GitHub: git push origin main
echo 2. Go to vercel.com and import your repository
echo 3. Or use network access: npm run start:public
echo.

pause
