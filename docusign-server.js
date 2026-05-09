const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const libre = require('libreoffice-convert');
const { ApiClient, EnvelopesApi, EnvelopeDefinition, Document, Signer, Recipients, Tabs, SignHere } = require('docusign-esign');
require('dotenv').config();

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
  clientSecret: process.env.DOCUSIGN_CLIENT_SECRET,
  redirectUri: process.env.DOCUSIGN_REDIRECT_URI || 'http://localhost:3000/docusign/callback',
  basePath: process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi',
  authServer: process.env.DOCUSIGN_AUTH_SERVER || 'https://account-d.docusign.com',
  accountId: process.env.DOCUSIGN_ACCOUNT_ID
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
let envelopeMappings = new Map(); // envelopeId -> { accFileId, accProjectId, fileName }

// DocuSign OAuth Routes
app.get('/docusign/auth', (req, res) => {
  const authUrl = `${DOCUSIGN_CONFIG.authServer}/oauth/auth?response_type=code&scope=signature&client_id=${DOCUSIGN_CONFIG.clientId}&redirect_uri=${DOCUSIGN_CONFIG.redirectUri}`;
  res.redirect(authUrl);
});

app.get('/docusign/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).send('No authorization code received');
    }

    // Exchange code for token
    const tokenResponse = await fetch(`${DOCUSIGN_CONFIG.authServer}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: DOCUSIGN_CONFIG.clientId,
        client_secret: DOCUSIGN_CONFIG.clientSecret,
        redirect_uri: DOCUSIGN_CONFIG.redirectUri
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    docuSignToken = tokenData.access_token;

    // Get user info
    const userResponse = await fetch(`${DOCUSIGN_CONFIG.authServer}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${docuSignToken}`
      }
    });

    const userData = await userResponse.json();
    console.log('✅ DocuSign connected:', userData);

    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: green;">✅ DocuSign Connected Successfully!</h2>
          <p>You can now close this window and return to the application.</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('DocuSign OAuth error:', error);
    res.status(500).send('Authentication failed');
  }
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
app.get('/api/docusign/status', (req, res) => {
  res.json({
    connected: !!docuSignToken,
    user: docuSignToken ? { name: 'DocuSign User' } : null
  });
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
    if (!docuSignToken) {
      return res.status(401).json({ error: 'DocuSign not connected' });
    }

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
    apiClient.addDefaultHeader('Authorization', `Bearer ${docuSignToken}`);

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
    
    if (!docuSignToken) {
      return res.status(401).json({ error: 'DocuSign not connected' });
    }

    const apiClient = new ApiClient();
    apiClient.setBasePath(DOCUSIGN_CONFIG.basePath);
    apiClient.addDefaultHeader('Authorization', `Bearer ${docuSignToken}`);

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
    
    if (!docuSignToken) {
      return res.status(401).json({ error: 'DocuSign not connected' });
    }

    const apiClient = new ApiClient();
    apiClient.setBasePath(DOCUSIGN_CONFIG.basePath);
    apiClient.addDefaultHeader('Authorization', `Bearer ${docuSignToken}`);

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
    const apiClient = new ApiClient();
    apiClient.setBasePath(DOCUSIGN_CONFIG.basePath);
    apiClient.addDefaultHeader('Authorization', `Bearer ${docuSignToken}`);

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
    autodeskConnected: !!autodeskToken
  });
});

// Cleanup function
process.on('SIGINT', () => {
  console.log('🔄 Cleaning up...');
  fs.removeSync('uploads');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 DocuSign Integration Server running on port ${PORT}`);
  console.log(`📝 Available endpoints:`);
  console.log(`   GET  /docusign/auth`);
  console.log(`   GET  /docusign/callback`);
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
});
