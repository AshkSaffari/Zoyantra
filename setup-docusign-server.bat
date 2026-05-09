@echo off
echo Setting up DocuSign Integration Server...

echo.
echo Installing dependencies...
npm install docusign-esign express multer fs-extra libreoffice-convert cors dotenv

echo.
echo Creating environment file...
echo PORT=3001 > .env.docusign
echo DOCUSIGN_CLIENT_ID=your_docusign_client_id >> .env.docusign
echo DOCUSIGN_CLIENT_SECRET=your_docusign_client_secret >> .env.docusign
echo DOCUSIGN_REDIRECT_URI=http://localhost:3001/docusign/callback >> .env.docusign
echo DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi >> .env.docusign
echo DOCUSIGN_AUTH_SERVER=https://account-d.docusign.com >> .env.docusign
echo DOCUSIGN_ACCOUNT_ID=your_docusign_account_id >> .env.docusign
echo AUTODESK_CLIENT_ID=your_autodesk_client_id >> .env.docusign
echo AUTODESK_CLIENT_SECRET=your_autodesk_client_secret >> .env.docusign
echo AUTODESK_REDIRECT_URI=http://localhost:3001/autodesk/callback >> .env.docusign
echo AUTODESK_BASE_URL=https://developer.api.autodesk.com >> .env.docusign

echo.
echo Setup complete! 
echo.
echo Next steps:
echo 1. Update .env.docusign with your actual DocuSign and Autodesk credentials
echo 2. Run: node docusign-server.js
echo.
pause
