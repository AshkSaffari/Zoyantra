@echo off
echo ========================================
echo DocuSign Setup for Zoyantra Project
echo ========================================
echo.

echo Step 1: Create DocuSign Developer Account
echo Go to: https://developers.docusign.com/
echo Sign up for a free developer account
echo.

echo Step 2: Create Integration Key
echo 1. Go to "Apps and Keys" in DocuSign Developer Center
echo 2. Click "Add App and Integration Key"
echo 3. Fill in app details
echo 4. Copy the Integration Key (Client ID)
echo 5. Generate and copy the Secret Key
echo.

echo Step 3: Create .env file
echo Create a .env file in your project root with:
echo.
echo REACT_APP_DOCUSIGN_CLIENT_ID=your_integration_key_here
echo REACT_APP_DOCUSIGN_CLIENT_SECRET=your_secret_key_here
echo REACT_APP_DOCUSIGN_REDIRECT_URI=http://localhost:3000/docusign/callback
echo REACT_APP_DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
echo REACT_APP_DOCUSIGN_AUTH_SERVER=https://account-d.docusign.com
echo.

echo Step 4: Restart your development server
echo npm start
echo.

echo Step 5: Test the connection
echo Go to DocuSign tab and click "Check Configuration"
echo.

pause
