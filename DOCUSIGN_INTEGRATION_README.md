# DocuSign Integration with Autodesk Construction Cloud (ACC)

This integration allows you to:
1. Browse ACC project folders and select PDF or Word documents
2. Convert Word documents to PDF automatically
3. Send documents for signature via DocuSign
4. Upload signed documents back to ACC as new versions

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install docusign-esign express multer fs-extra libreoffice-convert cors dotenv
```

### 2. Set Up Environment Variables
Create a `.env.docusign` file with your credentials:

```env
PORT=3001
DOCUSIGN_CLIENT_ID=your_docusign_client_id
DOCUSIGN_CLIENT_SECRET=your_docusign_client_secret
DOCUSIGN_REDIRECT_URI=http://localhost:3001/docusign/callback
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
DOCUSIGN_AUTH_SERVER=https://account-d.docusign.com
DOCUSIGN_ACCOUNT_ID=your_docusign_account_id
AUTODESK_CLIENT_ID=your_autodesk_client_id
AUTODESK_CLIENT_SECRET=your_autodesk_client_secret
AUTODESK_REDIRECT_URI=http://localhost:3001/autodesk/callback
AUTODESK_BASE_URL=https://developer.api.autodesk.com
```

### 3. Start the DocuSign Server
```bash
node docusign-server.js
```

### 4. Start the React App
```bash
npm start
```

## 📋 How It Works

### 1. ACC Folder Browser
- Click "Browse ACC Folders" in the DocuSign tab
- Navigate through your ACC project folders
- Select PDF or Word documents for signature

### 2. Document Conversion
- Word documents (.docx, .doc) are automatically converted to PDF
- PDF documents are used directly
- Conversion happens server-side using LibreOffice

### 3. DocuSign Integration
- Connect to DocuSign via OAuth
- Send documents for signature
- Track signature status
- Download signed documents

### 4. ACC Version Upload
- Signed documents are uploaded back to ACC
- Creates new versions of the original files
- Maintains file history and versioning

## 🔧 API Endpoints

### DocuSign Server (Port 3001)
- `GET /docusign/auth` - Start DocuSign OAuth flow
- `GET /docusign/callback` - DocuSign OAuth callback
- `GET /autodesk/auth` - Start Autodesk OAuth flow
- `GET /autodesk/callback` - Autodesk OAuth callback
- `GET /api/docusign/status` - Check DocuSign connection
- `GET /api/autodesk/status` - Check Autodesk connection
- `POST /api/convert-to-pdf` - Convert DOCX to PDF
- `POST /api/docusign/send-for-signature` - Send document for signature
- `GET /api/docusign/status/:envelopeId` - Check signature status
- `GET /api/docusign/download/:envelopeId` - Download signed document
- `POST /api/docusign/upload-to-acc/:envelopeId` - Upload to ACC

## 🎯 Features

### ✅ Implemented
- ACC folder browsing and file selection
- PDF viewing for selected documents
- DOCX to PDF conversion
- DocuSign OAuth integration
- Document sending for signature
- Signature status tracking
- Signed document download
- ACC version upload (simulated)

### 🔄 Workflow
1. **Select Files**: Browse ACC folders and select PDF/Word documents
2. **Convert**: Word documents are converted to PDF automatically
3. **Sign**: Connect to DocuSign and send documents for signature
4. **Track**: Monitor signature status and progress
5. **Download**: Download signed documents when complete
6. **Upload**: Upload signed versions back to ACC

## 🛠️ Configuration

### DocuSign Setup
1. Create a DocuSign developer account
2. Create an integration key
3. Set redirect URI: `http://localhost:3001/docusign/callback`
4. Get your account ID from DocuSign admin

### Autodesk Setup
1. Create an Autodesk developer account
2. Create a new app with Data Management API access
3. Set redirect URI: `http://localhost:3001/autodesk/callback`
4. Get client ID and secret

## 📁 File Structure

```
├── docusign-server.js          # Main DocuSign integration server
├── setup-docusign-server.bat   # Setup script for Windows
├── .env.docusign               # Environment variables
├── uploads/                    # Temporary file storage
└── src/components/
    ├── DocuSignTab.js          # React component for DocuSign UI
    └── AccFolderBrowser.js     # ACC folder browser component
```

## 🔍 Troubleshooting

### Common Issues
1. **DocuSign not connecting**: Check your client ID and secret
2. **File conversion failing**: Ensure LibreOffice is installed
3. **ACC folder not loading**: Verify your ACC credentials
4. **CORS errors**: Make sure both servers are running

### Debug Steps
1. Check server logs for error messages
2. Verify environment variables are set correctly
3. Test OAuth flows individually
4. Check network connectivity

## 🚀 Production Deployment

For production deployment:
1. Use Redis for token storage instead of in-memory
2. Implement proper error handling and logging
3. Set up webhooks for real-time status updates
4. Use HTTPS for all endpoints
5. Implement rate limiting and security measures

## 📞 Support

For issues or questions:
1. Check the server logs
2. Verify your credentials
3. Test the OAuth flows
4. Check the browser console for errors
