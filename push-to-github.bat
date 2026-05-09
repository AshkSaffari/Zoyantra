@echo off
echo ========================================
echo   TIMESHEET REPOSITORY SETUP
echo ========================================
echo.
echo Step 1: Create repository on GitHub.com
echo - Go to https://github.com
echo - Click "+" button, select "New repository"
echo - Name: timesheet
echo - Description: Timesheet Management System with ACC Performance Tracking Integration
echo - Make it Public
echo - DON'T initialize with README
echo - Click "Create repository"
echo.
echo Step 2: Copy your GitHub username and repository URL
echo - After creating, GitHub will show you the repository URL
echo - It will look like: https://github.com/YOUR_USERNAME/timesheet.git
echo.
echo Step 3: Run these commands (replace YOUR_USERNAME with your actual GitHub username):
echo.
echo git remote add origin https://github.com/YOUR_USERNAME/timesheet.git
echo git push -u origin main
echo.
echo ========================================
echo   READY TO PUSH!
echo ========================================
pause
