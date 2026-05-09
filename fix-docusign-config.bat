@echo off
echo Fixing DocuSign Configuration...

echo.
echo Current environment file:
type docusign.env

echo.
echo ========================================
echo DOCUSIGN CONFIGURATION REQUIRED
echo ========================================
echo.
echo You need to update the following values in docusign.env:
echo.
echo 1. DOCUSIGN_CLIENT_SECRET=your_actual_client_secret_here
echo    ^(Get this from your DocuSign app settings^)
echo.
echo 2. AUTODESK_CLIENT_ID=your_autodesk_client_id
echo    ^(Get this from your Autodesk developer account^)
echo.
echo 3. AUTODESK_CLIENT_SECRET=your_autodesk_client_secret
echo    ^(Get this from your Autodesk developer account^)
echo.
echo ========================================
echo ACC AUTHENTICATION ISSUES
echo ========================================
echo.
echo The ACC authentication errors suggest:
echo 1. Your Autodesk refresh token has expired
echo 2. You need to re-authenticate with Autodesk
echo 3. Clear your browser's localStorage and sessionStorage
echo.
echo To fix ACC authentication:
echo 1. Open browser console
echo 2. Run: localStorage.clear(); sessionStorage.clear(); window.location.reload();
echo 3. Re-authenticate with Autodesk
echo.
echo ========================================
echo NEXT STEPS
echo ========================================
echo.
echo 1. Get your DocuSign Client Secret from your app settings
echo 2. Get your Autodesk credentials from your developer account
echo 3. Update docusign.env with actual values
echo 4. Clear browser storage and re-authenticate
echo 5. Restart the DocuSign server
echo.
pause
