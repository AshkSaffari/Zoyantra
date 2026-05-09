@echo off
echo ========================================
echo   TIME SHEET SOFTWARE - DEPLOYMENT
echo ========================================
echo.
echo Choose deployment option:
echo.
echo 1. Build for production (local)
echo 2. Start network server (accessible on WiFi)
echo 3. Deploy to Vercel (FREE - accessible worldwide)
echo 4. Deploy to Netlify (FREE - accessible worldwide)
echo 5. Preview production build locally
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto build
if "%choice%"=="2" goto network
if "%choice%"=="3" goto vercel
if "%choice%"=="4" goto netlify
if "%choice%"=="5" goto preview
goto invalid

:build
echo.
echo Building for production...
call npm run build:production
echo.
echo Build complete! Files are in the 'build' folder.
echo You can now deploy this folder to any hosting service.
pause
goto end

:network
echo.
echo Starting network server...
echo Your app will be accessible at:
echo - http://localhost:3000 (local)
echo - http://YOUR_IP_ADDRESS:3000 (other devices on WiFi)
echo.
echo Press Ctrl+C to stop the server
call npm run start:public
goto end

:vercel
echo.
echo Deploying to Vercel...
echo Make sure you have Vercel CLI installed: npm install -g vercel
echo.
call npm run build
call vercel --prod
echo.
echo Your app is now live on Vercel!
echo Check your Vercel dashboard for the URL.
pause
goto end

:netlify
echo.
echo Deploying to Netlify...
echo Make sure you have Netlify CLI installed: npm install -g netlify-cli
echo.
call npm run build
call netlify deploy --prod --dir=build
echo.
echo Your app is now live on Netlify!
echo Check your Netlify dashboard for the URL.
pause
goto end

:preview
echo.
echo Starting production preview...
echo Your app will be accessible at http://localhost:3000
echo.
call npm run build
call npm run preview
goto end

:invalid
echo.
echo Invalid choice. Please run the script again.
pause
goto end

:end
echo.
echo ========================================
echo   DEPLOYMENT COMPLETE!
echo ========================================
