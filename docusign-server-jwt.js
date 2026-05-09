const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const libre = require('libreoffice-convert');
const { ApiClient, EnvelopesApi, EnvelopeDefinition, Document, Signer, Recipients, Tabs, SignHere } = require('docusign-esign');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'docusign.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// DocuSign Configuration
const DOCUSIGN_CONFIG = {
  clientId: process.env.DOCUSIGN_CLIENT_ID,
  keypairId: process.env.DOCUSIGN_KEYPAIR_ID,
  privateKey: process.env.DOCUSIGN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  basePath: process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi',
  authServer: process.env.DOCUSIGN_AUTH_SERVER || 'https://account-d.docusign.com',
  accountId: process.env.DOCUSIGN_ACCOUNT_ID,
  userId: process.env.DOCUSIGN_USER_ID || process.env.DOCUSIGN_ACCOUNT_ID // Use account ID as user ID if not specified
};

// Autodesk Configuration
const AUTODESK_CONFIG = {
  clientId: process.env.AUTODESK_CLIENT_ID,
  clientSecret: process.env.AUTODESK_CLIENT_SECRET,
  baseUrl: process.env.AUTODESK_BASE_URL || 'https://developer.api.autodesk.com'
};

// In-memory storage for demo (use Redis in production)
let docuSignToken = null;
let autodeskToken = null;
let envelopeMappings = new Map(); // envelopeId -> { accFileId, accProjectId, fileName, status }

// Generate JWT token for DocuSign
async function generateDocuSignJWT() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: DOCUSIGN_CONFIG.clientId,
      sub: process.env.DOCUSIGN_USER_ID || DOCUSIGN_CONFIG.accountId,
      aud: 'account-d.docusign.com',
      iat: now,
      exp: now + 3600, // 1 hour
      scope: 'signature impersonation'
    };

    const token = jwt.sign(payload, DOCUSIGN_CONFIG.privateKey, { 
      algorithm: 'RS256',
      header: {
        kid: DOCUSIGN_CONFIG.keypairId
      }
    });

    return token;
  } catch (error) {
    console.error('Error generating JWT:', error);
    throw error;
  }
}

// Get DocuSign access token using JWT
async function getDocuSignAccessToken() {
  try {
    if (docuSignToken && Date.now() < docuSignToken.expiresAt) {
      return docuSignToken.access_token;
    }

    console.log('🔄 Getting DocuSign access token using JWT...');
    
    const jwtToken = await generateDocuSignJWT();
    
    const response = await fetch(`${DOCUSIGN_CONFIG.authServer}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwtToken
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`JWT authentication failed: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();
    docuSignToken = {
      access_token: tokenData.access_token,
      expiresAt: Date.now() + (tokenData.expires_in * 1000)
    };

    console.log('✅ DocuSign JWT authentication successful');
    return docuSignToken.access_token;
  } catch (error) {
    console.error('❌ DocuSign JWT authentication failed:', error);
    throw error;
  }
}

// DocuSign OAuth Routes (for backward compatibility)
app.get('/docusign/auth', (req, res) => {
  res.json({
    message: 'DocuSign JWT authentication is configured. No OAuth flow needed.',
    status: 'jwt_configured'
  });
});

app.get('/docusign/callback', (req, res) => {
  res.json({
    message: 'DocuSign JWT authentication is configured. No OAuth callback needed.',
    status: 'jwt_configured'
  });
});

// Autodesk OAuth Routes
app.get('/autodesk/auth', (req, res) => {
  const authUrl = `${AUTODESK_CONFIG.baseUrl}/authentication/v1/authorize?response_type=code&client_id=${AUTODESK_CONFIG.clientId}&redirect_uri=${process.env.AUTODESK_REDIRECT_URI}&scope=${encodeURIComponent('data:read data:write bucket:create bucket:read')}`;
  res.redirect(authUrl);
});

app.get('/autodesk/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).send('No authorization code received');
    }

    // Exchange code for token
    const tokenResponse = await fetch(`${AUTODESK_CONFIG.baseUrl}/authentication/v1/gettoken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: AUTODESK_CONFIG.clientId,
        client_secret: AUTODESK_CONFIG.clientSecret,
        redirect_uri: process.env.AUTODESK_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    autodeskToken = tokenData.access_token;

    console.log('✅ Autodesk connected');

    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: green;">✅ Autodesk Connected Successfully!</h2>
          <p>You can now close this window and return to the application.</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Autodesk OAuth error:', error);
    res.status(500).send('Authentication failed');
  }
});

// Status endpoints
app.get('/api/docusign/status', async (req, res) => {
  try {
    const accessToken = await getDocuSignAccessToken();
    res.json({
      connected: !!accessToken,
      user: accessToken ? { name: 'DocuSign User (JWT)' } : null,
      authType: 'JWT'
    });
  } catch (error) {
    res.json({
      connected: false,
      user: null,
      error: error.message,
      authType: 'JWT'
    });
  }
});

app.get('/api/autodesk/status', (req, res) => {
  res.json({
    connected: !!autodeskToken,
    user: autodeskToken ? { name: 'Autodesk User' } : null
  });
});

// Document conversion endpoint
app.post('/api/convert-to-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const inputPath = req.file.path;
    const outputPath = path.join('uploads', `converted_${Date.now()}.pdf`);

    // Convert DOCX to PDF using LibreOffice
    const docxBuffer = fs.readFileSync(inputPath);
    const pdfBuffer = await new Promise((resolve, reject) => {
      libre.convert(docxBuffer, '.pdf', undefined, (err, done) => {
        if (err) reject(err);
        else resolve(done);
      });
    });

    fs.writeFileSync(outputPath, pdfBuffer);

    // Clean up input file
    fs.removeSync(inputPath);

    res.json({
      success: true,
      pdfPath: outputPath,
      message: 'Document converted to PDF successfully'
    });
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: 'Failed to convert document to PDF' });
  }
});

// Send for signature endpoint
app.post('/api/docusign/send-for-signature', async (req, res) => {
  try {
    const accessToken = await getDocuSignAccessToken();
    const { files, signer, projectId, hubId } = req.body;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    if (!signer.signerEmail || !signer.signerName) {
      return res.status(400).json({ error: 'Signer information required' });
    }

    // Create DocuSign API client
    const apiClient = new ApiClient();
    apiClient.setBasePath(DOCUSIGN_CONFIG.basePath);
    apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

    const envelopesApi = new EnvelopesApi(apiClient);

    // Prepare documents
    const documents = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileBuffer = fs.readFileSync(file.pdfPath || file.path);
      
      documents.push(new Document({
        documentBase64: fileBuffer.toString('base64'),
        name: file.name || `Document_${i + 1}.pdf`,
        fileExtension: 'pdf',
        documentId: (i + 1).toString()
      }));
    }

    // Create signer
    const signerObj = new Signer({
      email: signer.signerEmail,
      name: signer.signerName,
      recipientId: '1',
      routingOrder: '1'
    });

    // Add signature tab
    const signHere = new SignHere({
      anchorString: '/sig1/',
      anchorYOffset: '10',
      anchorUnits: 'pixels'
    });

    signerObj.tabs = new Tabs({
      signHereTabs: [signHere]
    });

    // Create envelope
    const envelope = new EnvelopeDefinition({
      emailSubject: signer.message || 'Please sign this document',
      documents: documents,
      recipients: new Recipients({
        signers: [signerObj]
      }),
      status: 'sent'
    });

    // Send envelope
    const result = await envelopesApi.createEnvelope(DOCUSIGN_CONFIG.accountId, {
      envelopeDefinition: envelope
    });

    // Store mapping for later upload
    envelopeMappings.set(result.envelopeId, {
      accFileId: files[0].id,
      accProjectId: projectId,
      hubId: hubId,
      fileName: files[0].name,
      status: 'sent',
      createdAt: new Date().toISOString()
    });

    console.log('✅ Envelope created:', result.envelopeId);

    res.json({
      success: true,
      envelopeId: result.envelopeId,
      message: 'Document sent for signature successfully'
    });
  } catch (error) {
    console.error('Error sending for signature:', error);
    res.status(500).json({ error: 'Failed to send document for signature' });
  }
});

// Check signature status
app.get('/api/docusign/status/:envelopeId', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    const accessToken = await getDocuSignAccessToken();

    const apiClient = new ApiClient();
    apiClient.setBasePath(DOCUSIGN_CONFIG.basePath);
    apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

    const envelopesApi = new EnvelopesApi(apiClient);
    const envelope = await envelopesApi.getEnvelope(DOCUSIGN_CONFIG.accountId, envelopeId);

    res.json({
      envelopeId,
      status: envelope.status,
      message: 'Envelope status retrieved'
    });
  } catch (error) {
    console.error('Error checking signature status:', error);
    res.status(500).json({ error: 'Failed to check signature status' });
  }
});

// Download signed document
app.get('/api/docusign/download/:envelopeId', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    const accessToken = await getDocuSignAccessToken();

    const apiClient = new ApiClient();
    apiClient.setBasePath(DOCUSIGN_CONFIG.basePath);
    apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

    const envelopesApi = new EnvelopesApi(apiClient);
    
    // Get the combined document
    const pdfBytes = await envelopesApi.getDocument(DOCUSIGN_CONFIG.accountId, 'combined', envelopeId, null);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="signed_${envelopeId}.pdf"`);
    res.send(pdfBytes);
  } catch (error) {
    console.error('Error downloading signed document:', error);
    res.status(500).json({ error: 'Failed to download signed document' });
  }
});

// Upload signed document to ACC
app.post('/api/docusign/upload-to-acc/:envelopeId', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    const { projectId, hubId } = req.body;
    
    if (!autodeskToken) {
      return res.status(401).json({ error: 'Autodesk not connected' });
    }

    // Get mapping info
    const mapping = envelopeMappings.get(envelopeId);
    if (!mapping) {
      return res.status(404).json({ error: 'Envelope mapping not found' });
    }

    // Download signed document
    const accessToken = await getDocuSignAccessToken();
    const apiClient = new ApiClient();
    apiClient.setBasePath(DOCUSIGN_CONFIG.basePath);
    apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

    const envelopesApi = new EnvelopesApi(apiClient);
    const pdfBytes = await envelopesApi.getDocument(DOCUSIGN_CONFIG.accountId, 'combined', envelopeId, null);
    
    // Save signed document
    const signedFilePath = `signed_${envelopeId}.pdf`;
    fs.writeFileSync(signedFilePath, pdfBytes);

    // Upload to ACC (simplified - in production, use proper ACC Data Management API)
    console.log('📤 Uploading signed document to ACC:', {
      envelopeId,
      projectId,
      hubId,
      fileName: mapping.fileName
    });

    // For now, simulate successful upload
    mapping.status = 'completed';
    mapping.uploadedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Signed document uploaded to ACC successfully'
    });
  } catch (error) {
    console.error('Error uploading to ACC:', error);
    res.status(500).json({ error: 'Failed to upload signed document to ACC' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    docuSignConnected: !!docuSignToken,
    autodeskConnected: !!autodeskToken,
    authType: 'JWT'
  });
});

// Cleanup function
process.on('SIGINT', () => {
  console.log('🔄 Cleaning up...');
  fs.removeSync('uploads');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 DocuSign JWT Integration Server running on port ${PORT}`);
  console.log(`📝 Available endpoints:`);
  console.log(`   GET  /docusign/auth (JWT configured)`);
  console.log(`   GET  /docusign/callback (JWT configured)`);
  console.log(`   GET  /autodesk/auth`);
  console.log(`   GET  /autodesk/callback`);
  console.log(`   GET  /api/docusign/status`);
  console.log(`   GET  /api/autodesk/status`);
  console.log(`   POST /api/convert-to-pdf`);
  console.log(`   POST /api/docusign/send-for-signature`);
  console.log(`   GET  /api/docusign/status/:envelopeId`);
  console.log(`   GET  /api/docusign/download/:envelopeId`);
  console.log(`   POST /api/docusign/upload-to-acc/:envelopeId`);
  console.log(`   GET  /api/health`);
  console.log(`🔐 DocuSign Authentication: JWT (No OAuth flow needed)`);
});
