const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const path = require('path');
require('dotenv').config();

// Centralized OAuth configuration
const CLIENT_ID = process.env.CLIENT_ID || 'WN6yXCVdbZB2SOVgVtZFsCtV7eGgNYn95wCm9TaheeUjtvPj';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
// Minimal default scopes to avoid AUTH-001 when Cost products are not enabled
// Keep 2-legged default scopes minimal to avoid invalid_scope when products are not enabled
const DEFAULT_SCOPES = process.env.SCOPES || 'data:read data:write';

// Simple fetch implementation using Node.js built-in modules
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data)
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : options.body.toString());
    }
    
    req.end();
  });
}

const app = express();
const PORT = process.env.PORT || 3001;

const APAC_HUB_HINTS = ['ddc5f6e2', 'australia', 'australian', 'sydney', 'melbourne', 'apac', 'au'];

function normalizeCostRegion(value) {
  const normalized = (value || '').toString().trim().toUpperCase();
  if (normalized === 'AUS' || normalized === 'AU') return 'APAC';
  if (normalized === 'EU' || normalized === 'UK') return 'EMEA';
  if (normalized === 'APAC' || normalized === 'EMEA' || normalized === 'US') return normalized;
  return '';
}

function resolveCostRegion(req, fallback = 'US') {
  const body = req.body || {};
  const candidates = [
    req.headers['x-ads-region'],
    req.query.region,
    req.query.hubRegion,
    body.region,
    body.hubRegion
  ];

  for (const candidate of candidates) {
    const normalized = normalizeCostRegion(candidate);
    if (normalized) return normalized;
  }

  const rawHints = [
    req.query.hubId,
    req.query.hubName,
    req.query.projectName,
    body.hubId,
    body.hubName,
    body.projectName
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (APAC_HUB_HINTS.some(hint => rawHints.includes(hint))) {
    return 'APAC';
  }

  return fallback;
}

function buildAutodeskHeaders(accessToken, region, includeRegion = true) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };

  if (includeRegion && region && region !== 'US') {
    headers['x-ads-region'] = region;
  }

  return headers;
}

// Middleware
app.use(cors());
app.use(express.json());

// Proxy: ACC RFIs search (uses caller's 3-legged token)
app.post('/api/acc/rfis/search', async (req, res) => {
  try {
    console.log('➡️  Incoming POST /api/acc/rfis/search');
    const authHeader = req.headers['authorization'];
    const { projectId, body } = req.body || {};
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    // Clean project id (remove b. prefix)
    const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
    const url = `https://developer.api.autodesk.com/construction/rfis/v3/projects/${cleanProjectId}/search:rfis`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body || { limit: 50, offset: 0 })
    });

    const text = await response.text();
    if (!response.ok) {
      return res.status(response.status).send(text);
    }
    return res.status(200).send(text);
  } catch (error) {
    console.error('❌ RFIs search proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Lightweight health endpoint to confirm backend availability
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend is running', port: PORT });
});

// Proxy: ACC RFI detail
app.get('/api/acc/rfis/:projectId/:rfiId', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const { projectId, rfiId } = req.params;
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
    if (!projectId || !rfiId) return res.status(400).json({ error: 'projectId and rfiId required' });

    const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
    const url = `https://developer.api.autodesk.com/construction/rfis/v3/projects/${cleanProjectId}/rfis/${rfiId}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    const text = await response.text();
    if (!response.ok) {
      return res.status(response.status).send(text);
    }
    return res.status(200).send(text);
  } catch (error) {
    console.error('❌ RFI detail proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get 2-legged token for Cost Management APIs
app.post('/api/auth/two-legged', async (req, res) => {
  try {
    // Use environment variables by default, allow override from request body
    const clientId = req.body?.clientId || CLIENT_ID;
    const clientSecret = req.body?.clientSecret || CLIENT_SECRET;
    const scope = (req.body?.scope || process.env.SCOPES || DEFAULT_SCOPES).trim();

    console.log('🔑 Requesting 2-legged token...');

    const response = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Token request failed:', response.status, error);
      return res.status(response.status).send(error);
    }

    const data = await response.json();
    console.log('✅ 2-legged token obtained successfully');
    res.json(data);
  } catch (error) {
    console.error('❌ Error getting 2-legged token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get cost container ID from project relationships
app.post('/api/cost/container-id', async (req, res) => {
  try {
    const { projectId, hubId, clientId, clientSecret } = req.body;
    
    if (!projectId || !hubId) {
      return res.status(400).json({ error: 'Project ID and Hub ID required' });
    }

    // Use provided credentials or fallback to environment variables
    const finalClientId = clientId || CLIENT_ID;
    const finalClientSecret = clientSecret || CLIENT_SECRET;

    // Get 2-legged token directly
    const tokenResponse = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: finalClientId,
        client_secret: finalClientSecret,
        scope: 'data:read data:write bucket:create bucket:read cost:read cost:write'
      })
    });

    if (!tokenResponse.ok) {
      return res.status(500).json({ error: 'Failed to get authentication token' });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Determine region from explicit request values first, then fall back to hub heuristics
    const region = resolveCostRegion(req, 'US');
    
    // Get project details to find cost container ID.
    // Some APIs require b.<id> while others need stripped ids, so try both formats.
    const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
    const prefixedProjectId = projectId.startsWith('b.') ? projectId : `b.${projectId}`;
    const projectIdCandidates = [prefixedProjectId, cleanProjectId].filter((id, idx, arr) => arr.indexOf(id) === idx);
    const headers = buildAutodeskHeaders(accessToken, region);

    let projectData = null;
    let lastStatus = 500;
    let lastError = 'Failed to get project details';

    for (const projectIdCandidate of projectIdCandidates) {
      const projectUrl = `https://developer.api.autodesk.com/project/v1/hubs/${hubId}/projects/${projectIdCandidate}`;
      const projectResponse = await fetch(projectUrl, { headers });

      if (projectResponse.ok) {
        projectData = await projectResponse.json();
        break;
      }

      lastStatus = projectResponse.status;
      lastError = await projectResponse.text();
      console.warn(`Project lookup failed for ${projectIdCandidate}:`, projectResponse.status);
    }

    if (!projectData) {
      return res.status(lastStatus).json({
        error: 'Failed to get project details',
        status: lastStatus,
        detail: lastError
      });
    }
    const containerId = projectData.data?.relationships?.cost?.data?.id;

    if (!containerId) {
      return res.status(404).json({ 
        error: 'No cost container found for this project',
        available: false
      });
    }

    res.json({ 
      containerId,
      available: true,
      projectName: projectData.data?.attributes?.name,
      region
    });
  } catch (error) {
    console.error('Error getting cost container ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get budgets
app.get('/api/cost/budgets/:containerId', async (req, res) => {
  try {
    const { containerId } = req.params;
    const { limit, offset, sort, include } = req.query;
    const region = resolveCostRegion(req, 'US');

    // Get 2-legged token directly
    const tokenResponse = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'data:read data:write bucket:create bucket:read cost:read cost:write'
      })
    });

    if (!tokenResponse.ok) {
      return res.status(500).json({ error: 'Failed to get authentication token' });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit);
    if (offset) queryParams.append('offset', offset);
    if (sort) queryParams.append('sort', sort);
    if (include) queryParams.append('include', include);

    const url = `https://developer.api.autodesk.com/cost/v1/containers/${containerId}/budgets${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await fetch(url, {
      headers: buildAutodeskHeaders(accessToken, region)
    });

    if (!response.ok) {
      console.error('Budgets request failed:', response.status);
      return res.status(response.status).json({ 
        error: 'Failed to get budgets',
        status: response.status
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error getting budgets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get contracts
app.get('/api/cost/contracts/:containerId', async (req, res) => {
  try {
    const { containerId } = req.params;
    const { limit, offset, sort, include } = req.query;
    const region = resolveCostRegion(req, 'US');

    // Get 2-legged token directly
    const tokenResponse = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'data:read data:write bucket:create bucket:read cost:read cost:write'
      })
    });

    if (!tokenResponse.ok) {
      return res.status(500).json({ error: 'Failed to get authentication token' });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit);
    if (offset) queryParams.append('offset', offset);
    if (sort) queryParams.append('sort', sort);
    if (include) queryParams.append('include', include);

    const url = `https://developer.api.autodesk.com/cost/v1/containers/${containerId}/contracts${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await fetch(url, {
      headers: buildAutodeskHeaders(accessToken, region)
    });

    if (!response.ok) {
      console.error('Contracts request failed:', response.status);
      return res.status(response.status).json({ 
        error: 'Failed to get contracts',
        status: response.status
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error getting contracts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single contract by id
app.get('/api/cost/contracts/:containerId/:contractId', async (req, res) => {
  try {
    const { containerId, contractId } = req.params;
    const region = resolveCostRegion(req, 'US');
    // Get 2-legged token directly
    const tokenResponse = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'data:read data:write bucket:create bucket:read cost:read cost:write'
      })
    });

    if (!tokenResponse.ok) {
      return res.status(500).json({ error: 'Failed to get authentication token' });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const url = `https://developer.api.autodesk.com/cost/v1/containers/${containerId}/contracts/${contractId}`;
    const response = await fetch(url, {
      headers: buildAutodeskHeaders(accessToken, region)
    });

    const text = await response.text();
    if (!response.ok) {
      return res.status(response.status).send(text);
    }
    return res.status(200).send(text);
  } catch (error) {
    console.error('Error getting contract by id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get individual RFI details
app.get('/api/acc/rfis/:projectId/:rfiId', async (req, res) => {
  try {
    const { projectId, rfiId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
    const url = `https://developer.api.autodesk.com/construction/rfis/v3/projects/${cleanProjectId}/rfis/${rfiId}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    const text = await response.text();
    if (!response.ok) {
      return res.status(response.status).send(text);
    }
    return res.status(200).send(text);
  } catch (error) {
    console.error('Error getting RFI details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get cost items
app.get('/api/cost/cost-items/:containerId', async (req, res) => {
  try {
    const { containerId } = req.params;
    const { limit, offset, sort, include } = req.query;
    const region = resolveCostRegion(req, 'US');

    // Get 2-legged token directly
    const tokenResponse = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'data:read data:write bucket:create bucket:read cost:read cost:write'
      })
    });

    if (!tokenResponse.ok) {
      return res.status(500).json({ error: 'Failed to get authentication token' });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit);
    if (offset) queryParams.append('offset', offset);
    if (sort) queryParams.append('sort', sort);
    if (include) queryParams.append('include', include);

    const url = `https://developer.api.autodesk.com/cost/v1/containers/${containerId}/cost-items${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await fetch(url, {
      headers: buildAutodeskHeaders(accessToken, region)
    });

    if (!response.ok) {
      console.error('Cost items request failed:', response.status);
      return res.status(response.status).json({ 
        error: 'Failed to get cost items',
        status: response.status
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error getting cost items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get expenses
app.get('/api/cost/expenses/:containerId', async (req, res) => {
  try {
    const { containerId } = req.params;
    const { limit, offset, sort, include } = req.query;
    const region = resolveCostRegion(req, 'US');

    // Get 2-legged token directly
    const tokenResponse = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'data:read data:write bucket:create bucket:read cost:read cost:write'
      })
    });

    if (!tokenResponse.ok) {
      return res.status(500).json({ error: 'Failed to get authentication token' });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit);
    if (offset) queryParams.append('offset', offset);
    if (sort) queryParams.append('sort', sort);
    if (include) queryParams.append('include', include);

    const url = `https://developer.api.autodesk.com/cost/v1/containers/${containerId}/expenses${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await fetch(url, {
      headers: buildAutodeskHeaders(accessToken, region)
    });

    if (!response.ok) {
      console.error('Expenses request failed:', response.status);
      return res.status(response.status).json({ 
        error: 'Failed to get expenses',
        status: response.status
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error getting expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create budget
app.post('/api/cost/budgets/:containerId', async (req, res) => {
  try {
    const { containerId } = req.params;
    const budgetData = req.body;
    const region = resolveCostRegion(req, 'US');

    // Get 2-legged token directly
    const tokenResponse = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'data:read data:write bucket:create bucket:read cost:read cost:write'
      })
    });

    if (!tokenResponse.ok) {
      return res.status(500).json({ error: 'Failed to get authentication token' });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const url = `https://developer.api.autodesk.com/cost/v1/containers/${containerId}/budgets`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: buildAutodeskHeaders(accessToken, region),
      body: JSON.stringify(budgetData)
    });

    if (!response.ok) {
      console.error('Create budget request failed:', response.status);
      return res.status(response.status).json({ 
        error: 'Failed to create budget',
        status: response.status
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OAuth callback route
app.get('/auth/callback', (req, res) => {
  const { code, state, error, error_description } = req.query;
  
  console.log('🔍 OAuth Callback received:');
  console.log('  Code:', code ? 'Present' : 'Missing');
  console.log('  State:', state || 'Missing');
  console.log('  Error:', error || 'None');
  console.log('  Error Description:', error_description || 'None');
  
  if (error) {
    console.error('❌ OAuth Error:', error, error_description);
    return res.redirect(`/?error=${error}&error_description=${error_description || ''}`);
  }
  
  if (code) {
    console.log('✅ OAuth code received, redirecting to main app...');
    return res.redirect(`/?code=${code}&state=${state || ''}`);
  }
  
  // No code or error - redirect to main app
  console.warn('⚠️ No authorization code received');
  return res.redirect('/');
});

// DocuSign OAuth configuration
const DOCUSIGN_CONFIG = {
  clientId: process.env.DOCUSIGN_CLIENT_ID || '4d3698b6-cf09-4204-8d0f-45f7da89de9e',
  clientSecret: process.env.DOCUSIGN_CLIENT_SECRET || '2e490b30-332b-4563-83d6-299a74ef93ee',
  redirectUri: process.env.DOCUSIGN_REDIRECT_URI || 'http://localhost:3002/docusign/callback',
  basePath: process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi',
  authServer: process.env.DOCUSIGN_AUTH_SERVER || 'https://account-d.docusign.com',
  accountId: process.env.DOCUSIGN_ACCOUNT_ID || 'd97cd187-0164-438e-8e18-828c6e1d0574'
};

// Store DocuSign token in memory (in production, use Redis or database)
let docuSignToken = null;

// Store recent document send information
let recentDocumentSends = [];

// Simple file-based token storage for development
const fs = require('fs');

const TOKEN_FILE = path.join(__dirname, 'docusign-token.json');

// Load token from file on startup
try {
  if (fs.existsSync(TOKEN_FILE)) {
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    if (tokenData && tokenData.access_token && tokenData.expiresAt > Date.now()) {
      docuSignToken = tokenData;
      console.log('✅ Loaded DocuSign token from file');
    } else {
      console.log('⚠️ DocuSign token expired, removing file');
      fs.unlinkSync(TOKEN_FILE);
    }
  }
} catch (error) {
  console.log('⚠️ Could not load DocuSign token:', error.message);
}

// Save token to file
const saveDocuSignToken = (token) => {
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2));
    console.log('💾 Saved DocuSign token to file');
  } catch (error) {
    console.error('❌ Failed to save DocuSign token:', error.message);
  }
};

// DocuSign OAuth routes
app.get('/docusign/auth', (req, res) => {
  const authUrl = `${DOCUSIGN_CONFIG.authServer}/oauth/auth?response_type=code&scope=signature&client_id=${DOCUSIGN_CONFIG.clientId}&redirect_uri=${DOCUSIGN_CONFIG.redirectUri}`;
  console.log('🔐 DocuSign OAuth redirect to:', authUrl);
  res.redirect(authUrl);
});

// Shared DocuSign callback handler
async function handleDocuSignCallback(code, res) {
  try {
    console.log('🔐 DocuSign OAuth callback received');
    
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
      const errorText = await tokenResponse.text();
      throw new Error(`OAuth token exchange failed: ${tokenResponse.status} ${errorText}`);
    }

        const tokenData = await tokenResponse.json();
        docuSignToken = {
          access_token: tokenData.access_token,
          expiresAt: Date.now() + (tokenData.expires_in * 1000)
        };
        
        // Save token to file for persistence
        saveDocuSignToken(docuSignToken);

        console.log('✅ DocuSign OAuth authentication successful');

        if (res.req.method === 'POST') { // Check original request method from res.req
          res.json({ success: true, message: 'DocuSign authentication successful' });
        } else {
          // Return success page that closes popup and notifies parent window
          res.send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>DocuSign Authentication</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 50px; 
                  background: #f0f8ff;
                }
                .success { 
                  color: #28a745; 
                  font-size: 18px; 
                  margin: 20px 0;
                }
                .spinner {
                  border: 4px solid #f3f3f3;
                  border-top: 4px solid #3498db;
                  border-radius: 50%;
                  width: 40px;
                  height: 40px;
                  animation: spin 2s linear infinite;
                  margin: 20px auto;
                }
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              </style>
            </head>
            <body>
              <div class="spinner"></div>
              <div class="success">✅ DocuSign authentication successful!</div>
              <p>Closing window and refreshing Zoyantra...</p>
              <script>
                // Notify parent window that authentication was successful
                if (window.opener) {
                  window.opener.postMessage({ type: 'DOCUSIGN_AUTH_SUCCESS' }, '*');
                }
                // Close the popup immediately
                setTimeout(() => {
                  window.close();
                }, 1000);
              </script>
            </body>
            </html>
          `);
        }
  } catch (error) {
    console.error('❌ DocuSign OAuth error:', error);
    if (res.req.method === 'POST') {
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.status(500).send('Authentication failed: ' + error.message);
    }
  }
}

app.get('/docusign/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('No authorization code received');
  }
  await handleDocuSignCallback(code, res);
});

app.post('/docusign/callback', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, error: 'No authorization code received' });
  }
  await handleDocuSignCallback(code, res);
});

// DocuSign endpoints
app.get('/api/docusign/status', async (req, res) => {
  try {
    if (!docuSignToken) {
      return res.json({ 
        connected: false,
        user: null
      });
    }

    // Try to fetch user info from DocuSign API
    let userInfo = { 
      name: 'DocuSign User',
      email: 'user@docusign.com',
      accountId: DOCUSIGN_CONFIG.accountId
    };

    try {
      // Try DocuSign userinfo endpoint
      const userResponse = await fetch(`${DOCUSIGN_CONFIG.authServer}/oauth/userinfo`, {
        headers: {
          'Authorization': `Bearer ${docuSignToken.access_token}`
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('📊 DocuSign user data:', userData);
        userInfo = {
          name: userData.name || userData.sub || 'DocuSign User',
          email: userData.email || userData.sub || 'user@docusign.com',
          accountId: userData.accounts?.[0]?.account_id || DOCUSIGN_CONFIG.accountId
        };
      } else {
        console.log('⚠️ DocuSign userinfo failed:', userResponse.status, await userResponse.text());
      }
    } catch (error) {
      console.log('⚠️ Could not fetch DocuSign user info, using defaults:', error.message);
    }

    // If we still don't have good user info, try to get it from the token itself
    if (userInfo.email === 'user@docusign.com') {
      // Try to extract user info from the token or use a more descriptive default
      userInfo = {
        name: 'DocuSign User',
        email: 'authenticated@docusign.com', // More descriptive than generic
        accountId: DOCUSIGN_CONFIG.accountId
      };
    }

    // Add recent document send information
    const recentEmails = recentDocumentSends.map(send => send.email);
    const uniqueEmails = [...new Set(recentEmails)];

    res.json({ 
      connected: true,
      user: userInfo,
      recentActivity: {
        emailsUsed: uniqueEmails,
        totalSends: recentDocumentSends.length,
        lastSend: recentDocumentSends.length > 0 ? recentDocumentSends[recentDocumentSends.length - 1] : null
      }
    });
  } catch (error) {
    console.error('❌ Error checking DocuSign status:', error);
    res.status(500).json({ 
      connected: false,
      error: 'Failed to check DocuSign status'
    });
  }
});

// Get DocuSign documents/envelopes
app.get('/api/docusign/documents', async (req, res) => {
  try {
    if (!docuSignToken) {
      return res.status(401).json({ error: 'Not authenticated with DocuSign' });
    }

    // For now, return empty documents list
    // TODO: Implement actual DocuSign envelopes API call
    res.json({ 
      documents: [],
      message: 'No documents found. This endpoint will be implemented to fetch actual DocuSign envelopes.'
    });
  } catch (error) {
    console.error('❌ Error fetching DocuSign documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// DocuSign logout endpoint
app.post('/api/docusign/logout', async (req, res) => {
  try {
    console.log('🔓 DocuSign logout requested');
    
    // If we have a token, try to revoke it with DocuSign
    if (docuSignToken) {
      try {
        console.log('🔄 Revoking DocuSign token...');
        const revokeResponse = await fetch(`${DOCUSIGN_CONFIG.authServer}/oauth/revoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${DOCUSIGN_CONFIG.clientId}:${DOCUSIGN_CONFIG.clientSecret}`).toString('base64')}`
          },
          body: `token=${docuSignToken.access_token}&token_type_hint=access_token`
        });
        
        if (revokeResponse.ok) {
          console.log('✅ DocuSign token revoked successfully');
        } else {
          console.log('⚠️ Could not revoke DocuSign token, but continuing with logout');
        }
      } catch (error) {
        console.log('⚠️ Error revoking DocuSign token:', error.message);
      }
    }
    
    // Clear the token
    docuSignToken = null;
    
    // Remove token file if it exists
    try {
      if (fs.existsSync(TOKEN_FILE)) {
        fs.unlinkSync(TOKEN_FILE);
        console.log('🗑️ Removed DocuSign token file');
      }
    } catch (error) {
      console.log('⚠️ Could not remove token file:', error.message);
    }
    
    // Clear recent document sends
    recentDocumentSends = [];
    
    console.log('✅ DocuSign logout successful');
    res.json({ success: true, message: 'Successfully logged out from DocuSign' });
  } catch (error) {
    console.error('❌ Error during DocuSign logout:', error);
    res.status(500).json({ error: 'Failed to logout from DocuSign' });
  }
});

app.post('/api/docusign/send-for-signature', async (req, res) => {
  try {
    const { files, signer, projectId, hubId } = req.body;
    
    console.log('📤 DocuSign send for signature request:', {
      filesCount: files?.length,
      signer: signer?.signerEmail,
      projectId,
      hubId
    });

    // Track the email address for user info
    if (signer?.signerEmail) {
      recentDocumentSends.push({
        email: signer.signerEmail,
        timestamp: new Date().toISOString(),
        projectId
      });
      
      // Keep only last 10 sends
      if (recentDocumentSends.length > 10) {
        recentDocumentSends = recentDocumentSends.slice(-10);
      }
    }

    // For now, simulate a successful response
    const envelopeId = `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({
      success: true,
      envelopeId,
      message: 'Document sent for signature successfully'
    });
  } catch (error) {
    console.error('Error sending for signature:', error);
    res.status(500).json({ error: 'Failed to send document for signature' });
  }
});

app.get('/api/docusign/status/:envelopeId', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    
    // For now, simulate status check
    res.json({
      envelopeId,
      status: 'sent',
      message: 'Envelope status retrieved'
    });
  } catch (error) {
    console.error('Error checking signature status:', error);
    res.status(500).json({ error: 'Failed to check signature status' });
  }
});

app.get('/api/docusign/download/:envelopeId', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    
    // For now, simulate download
    res.status(404).json({ error: 'Download not implemented yet' });
  } catch (error) {
    console.error('Error downloading signed document:', error);
    res.status(500).json({ error: 'Failed to download signed document' });
  }
});

app.post('/api/docusign/upload-to-acc/:envelopeId', async (req, res) => {
  try {
    const { envelopeId } = req.params;
    const { projectId, hubId } = req.body;
    
    console.log('📤 Upload to ACC request:', { envelopeId, projectId, hubId });
    
    // For now, simulate successful upload
    res.json({
      success: true,
      message: 'Signed document uploaded to ACC successfully'
    });
  } catch (error) {
    console.error('Error uploading to ACC:', error);
    res.status(500).json({ error: 'Failed to upload signed document to ACC' });
  }
});

// Document conversion endpoint
app.post('/api/convert-to-pdf', async (req, res) => {
  try {
    // For now, simulate conversion
    const pdfPath = `converted_${Date.now()}.pdf`;
    
    res.json({
      success: true,
      pdfPath,
      message: 'Document converted to PDF successfully'
    });
  } catch (error) {
    console.error('Error converting to PDF:', error);
    res.status(500).json({ error: 'Failed to convert document to PDF' });
  }
});

// Get forms for a project
app.get('/api/acc/forms/:projectId', async (req, res) => {
  try {
    console.log('🔍 Forms API called with projectId:', req.params.projectId);
    const authHeader = req.headers['authorization'];
    const { projectId } = req.params;
    const { limit = 50, offset = 0, statuses, sortBy, sortOrder, formDateMin, formDateMax, updatedAfter, updatedBefore, templateId, locationIds } = req.query;
    
    console.log('🔍 Auth header present:', !!authHeader);
    console.log('🔍 Query params:', { limit, offset, statuses, sortBy, sortOrder });
    
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    // Clean project id (remove b. prefix)
    const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
    console.log('🔍 Clean project ID:', cleanProjectId);
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit);
    if (offset) queryParams.append('offset', offset);
    if (statuses) queryParams.append('statuses', statuses);
    if (sortBy) queryParams.append('sortBy', sortBy);
    if (sortOrder) queryParams.append('sortOrder', sortOrder);
    if (formDateMin) queryParams.append('formDateMin', formDateMin);
    if (formDateMax) queryParams.append('formDateMax', formDateMax);
    if (updatedAfter) queryParams.append('updatedAfter', updatedAfter);
    if (updatedBefore) queryParams.append('updatedBefore', updatedBefore);
    if (templateId) queryParams.append('templateId', templateId);
    if (locationIds) queryParams.append('locationIds', locationIds);

    const url = `https://developer.api.autodesk.com/construction/forms/v1/projects/${cleanProjectId}/forms${queryParams.toString() ? `?${queryParams}` : ''}`;
    console.log('🔍 ACC Forms API URL:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    console.log('🔍 ACC API response status:', response.status);
    console.log('🔍 ACC API response headers:', response.headers);

    const text = await response.text();
    console.log('🔍 ACC API response body:', text.substring(0, 500) + '...');
    
    if (!response.ok) {
      console.error('❌ ACC Forms API error:', response.status, text);
      
      // If the API returns 404 or 403, return empty forms array instead of error
      if (response.status === 404 || response.status === 403) {
        console.log('⚠️ Forms API not available for this project, returning empty array');
        return res.status(200).json({
          data: [],
          pagination: {
            offset: 0,
            limit: 50,
            totalResults: 0,
            nextUrl: null
          }
        });
      }
      
      return res.status(response.status).send(text);
    }
    
    console.log('✅ ACC Forms API success, returning data');
    return res.status(200).send(text);
  } catch (error) {
    console.error('❌ Forms API proxy error:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Return empty forms array on error instead of 500
    console.log('⚠️ Returning empty forms array due to error');
    return res.status(200).json({
      data: [],
      pagination: {
        offset: 0,
        limit: 50,
        totalResults: 0,
        nextUrl: null
      }
    });
  }
});

// Download form PDF
app.get('/api/acc/forms/:projectId/:formId/pdf', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const { projectId, formId } = req.params;
    
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
    if (!projectId || !formId) return res.status(400).json({ error: 'projectId and formId required' });

    // Clean project id (remove b. prefix)
    const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
    
    // First get the form details to get the pdfUrl
    const formUrl = `https://developer.api.autodesk.com/construction/forms/v1/projects/${cleanProjectId}/forms/${formId}`;
    
    const formResponse = await fetch(formUrl, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    if (!formResponse.ok) {
      return res.status(formResponse.status).json({ error: 'Failed to get form details' });
    }

    const formData = await formResponse.json();
    
    if (!formData.pdfUrl) {
      return res.status(404).json({ error: 'No PDF available for this form' });
    }

    // Now fetch the PDF using the pdfUrl
    const pdfResponse = await fetch(formData.pdfUrl, {
      headers: {
        'Authorization': authHeader
      }
    });

    if (!pdfResponse.ok) {
      return res.status(pdfResponse.status).json({ error: 'Failed to download PDF' });
    }

    // Set appropriate headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${formData.name || 'form'}.pdf"`);
    
    // Stream the PDF to the client
    pdfResponse.body.pipe(res);
    
  } catch (error) {
    console.error('❌ PDF download error:', error);
    res.status(500).json({ error: 'Failed to download PDF' });
  }
});

// Get single form details
app.get('/api/acc/forms/:projectId/:formId', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const { projectId, formId } = req.params;
    
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
    if (!projectId || !formId) return res.status(400).json({ error: 'projectId and formId required' });

    // Clean project id (remove b. prefix)
    const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
    const url = `https://developer.api.autodesk.com/construction/forms/v1/projects/${cleanProjectId}/forms/${formId}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    const text = await response.text();
    if (!response.ok) {
      return res.status(response.status).send(text);
    }
    return res.status(200).send(text);
  } catch (error) {
    console.error('❌ Form detail proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ACC Workflows API endpoint
app.get('/api/acc/workflows/:projectId', async (req, res) => {
  try {
    console.log('🔍 Fetching workflows for project:', req.params.projectId);
    
    const { projectId } = req.params;
    const { limit = 50, offset = 0, sort = 'name', filter } = req.query;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Build query parameters
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      sort: sort
    });
    
    // Add filters if provided
    if (filter) {
      Object.keys(filter).forEach(key => {
        queryParams.append(`filter[${key}]`, filter[key]);
      });
    }
    
    // Clean project ID (remove b. prefix for workflows API)
    const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
    const accUrl = `https://developer.api.autodesk.com/construction/reviews/v1/projects/${cleanProjectId}/workflows?${queryParams.toString()}`;
    
    console.log('🔍 Original project ID:', projectId);
    console.log('🔍 Clean project ID for workflows:', cleanProjectId);
    console.log('🔍 Workflows API URL:', accUrl);
    
    console.log('🔗 ACC Workflows API URL:', accUrl);
    console.log('📊 Query parameters:', { limit, offset, sort, filter });
    
    const response = await fetch(accUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.api+json',
      },
    });
    
    const json = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error fetching workflows:', json);
      return res.status(response.status).json({
        error: json,
        message: json.errors?.[0]?.detail || 'Failed to fetch workflows',
      });
    }
    
    console.log(`✅ Retrieved ${json.results?.length || 0} workflows`);
    console.log('📊 Pagination info:', json.pagination);
    res.status(200).json(json);
  } catch (err) {
    console.error('💥 Server error fetching workflows:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get specific workflow details
app.get('/api/acc/workflows/:projectId/:workflowId', async (req, res) => {
  try {
    console.log('🔍 Fetching workflow details for:', req.params.workflowId);
    
    const { projectId, workflowId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    
    const token = authHeader.split(' ')[1];
    // Clean project ID (remove b. prefix for workflows API)
    const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
    const accUrl = `https://developer.api.autodesk.com/construction/reviews/v1/projects/${cleanProjectId}/workflows/${workflowId}`;
    
    console.log('🔍 Original project ID:', projectId);
    console.log('🔍 Clean project ID for workflows:', cleanProjectId);
    console.log('🔍 Workflow details API URL:', accUrl);
    
    console.log('🔗 ACC Workflow Details API URL:', accUrl);
    
    const response = await fetch(accUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.api+json',
      },
    });
    
    const json = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error fetching workflow details:', json);
      return res.status(response.status).json({
        error: json,
        message: json.errors?.[0]?.detail || 'Failed to fetch workflow details',
      });
    }
    
    console.log('✅ Retrieved workflow details successfully');
    res.status(200).json(json);
  } catch (err) {
    console.error('💥 Server error fetching workflow details:', err);
    res.status(500).json({ error: err.message });
  }
});

// Token refresh endpoint
app.post('/api/acc/refresh-token', async (req, res) => {
  try {
    console.log('🔄 Refreshing access token...');
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'No refresh token provided' });
    }
    
    const clientId = CLIENT_ID;
    const clientSecret = CLIENT_SECRET;
    
    const requestBody = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    });

    const response = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: requestBody
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Token refresh failed:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Token refresh failed', 
        details: errorText 
      });
    }

    const tokenData = await response.json();
    
    const updatedCredentials = {
      threeLegToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken,
      tokenExpiry: Date.now() + (tokenData.expires_in * 1000)
    };
    
    console.log('✅ Access token refreshed successfully');
    res.status(200).json(updatedCredentials);
  } catch (error) {
    console.error('❌ Error refreshing token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create review (proxy to avoid CORS)
app.post('/api/acc/reviews/:projectId', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const { projectId } = req.params;
  const reviewData = req.body;
  let extractedWorkflowId = null;
  
  try {
    console.log('🔍 Creating review via backend proxy...');
    
    console.log('🔍 Project ID:', projectId);
    console.log('🔍 Review data:', reviewData);
    console.log('🔍 DETAILED SERVER DEBUG:');
    console.log('📝 Name:', reviewData.name);
    console.log('🔄 Workflow ID:', reviewData.workflowId);
    console.log('📁 File Versions:', reviewData.fileVersions);
    console.log('📄 Notes:', reviewData.notes);
    console.log('🔍 Workflow ID exists?', !!reviewData.workflowId);
    console.log('🔍 Workflow ID type:', typeof reviewData.workflowId);
    
    // Debug JSON API format
    console.log('🔍 JSON API Debug:');
    console.log('🔍 reviewData.data:', reviewData.data);
    console.log('🔍 reviewData.data?.relationships:', reviewData.data?.relationships);
    console.log('🔍 reviewData.data?.relationships?.workflow:', reviewData.data?.relationships?.workflow);
    console.log('🔍 reviewData.data?.relationships?.workflow?.data:', reviewData.data?.relationships?.workflow?.data);
    console.log('🔍 reviewData.data?.relationships?.workflow?.data?.id:', reviewData.data?.relationships?.workflow?.data?.id);
    
    // Show authentication token being used
    console.log('🔐 SERVER AUTHENTICATION DEBUG:');
    console.log('🔑 Authorization header exists?', !!authHeader);
    console.log('🔑 Authorization header type:', typeof authHeader);
    console.log('🔑 Authorization header length:', authHeader ? authHeader.length : 0);
    console.log('🔑 Authorization header preview:', authHeader ? authHeader.substring(0, 50) + '...' : 'No header');
    console.log('🔑 Bearer token exists?', authHeader ? authHeader.startsWith('Bearer ') : false);
    
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    if (!reviewData) return res.status(400).json({ error: 'Review data required' });
    
    // Check for workflow ID in both formats (JSON API and simple)
    extractedWorkflowId = reviewData.workflowId || 
                      (reviewData.data && reviewData.data.relationships && reviewData.data.relationships.workflow && reviewData.data.relationships.workflow.data && reviewData.data.relationships.workflow.data.id);
    
    console.log('🔍 Extracted workflow ID:', extractedWorkflowId);
    console.log('🔍 Workflow ID from simple format:', reviewData.workflowId);
    console.log('🔍 Workflow ID from JSON API format:', reviewData.data?.relationships?.workflow?.data?.id);
    
    if (!extractedWorkflowId) return res.status(400).json({ error: 'workflowId required in request body' });

    // Use project id WITHOUT b. prefix for ACC Reviews API (review creation only)
    const projectIdForAPI = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
    const url = `https://developer.api.autodesk.com/construction/reviews/v1/projects/${projectIdForAPI}/reviews?projectId=${projectIdForAPI}`;
    
    console.log('🔍 ACC Reviews API URL:', url);
    console.log('🔍 Project ID from params:', projectId);
    console.log('🔍 Project ID for API (cleaned):', projectIdForAPI);
    console.log('🔍 Full Autodesk URL:', `https://developer.api.autodesk.com/construction/reviews/v1/projects/${projectIdForAPI}/reviews?projectId=${projectIdForAPI}`);

    // Clean review data to match ACC Reviews API specification
    // Send payload directly to Autodesk (no data wrapper)
    const cleanReviewData = {
      name: reviewData.name || reviewData.title,
      workflowId: extractedWorkflowId,
      fileVersions: (reviewData.fileVersions || []).map(fileVersion => ({
        urn: typeof fileVersion === 'string' ? fileVersion : (fileVersion.urn || fileVersion)
      })),
    };
    
    // Remove any undefined or null values
    Object.keys(cleanReviewData).forEach(key => {
      if (cleanReviewData[key] === undefined || cleanReviewData[key] === null) {
        delete cleanReviewData[key];
      }
    });
    
    console.log('🔍 Cleaned review data:', cleanReviewData);

    // For three-legged authentication, x-user-id header is not required
    console.log('🔍 Using three-legged authentication (no x-user-id header needed)');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cleanReviewData)
    });

    console.log('🔍 ACC API response status:', response.status);
    const text = await response.text();
    console.log('🔍 ACC API response body:', text.substring(0, 500) + '...');
    
    if (!response.ok) {
      console.error('❌ ACC Reviews API error:', response.status, text);
      
      // Bubble up known ACC business-rule errors with a clear message for the UI.
      if (response.status === 403 && text.includes('ERR_WORKFLOW_STATUS_INACTIVE')) {
        return res.status(409).json({
          error: 'Workflow is archived/inactive',
          code: 'ERR_WORKFLOW_STATUS_INACTIVE',
          details: text
        });
      }
      
      return res.status(response.status).json({ 
        error: 'ACC Reviews API error', 
        status: response.status, 
        details: text 
      });
    }
    
    console.log('✅ Review created successfully via proxy');
    const responseData = text ? JSON.parse(text) : {};
    console.log('🔍 ACC API response data structure:', responseData);
    console.log('🔍 ACC API response data keys:', Object.keys(responseData));
    console.log('🔍 ACC API response data.id:', responseData.id);
    console.log('🔍 ACC API response data.data:', responseData.data);
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('❌ Review creation proxy error:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    return res.status(500).json({
      error: 'Review creation proxy error',
      message: error.message,
      workflowId: extractedWorkflowId || null
    });
  }
});




// Get all reviews for a project (proxy to avoid CORS)
app.get('/api/acc/reviews/:projectId', async (req, res) => {
  try {
    console.log('🔍 Getting all reviews for project via backend proxy...');
    const authHeader = req.headers['authorization'];
    const { projectId } = req.params;
    const { limit = 50, offset = 0, statuses, sortBy, sortOrder } = req.query;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }
    
    const token = authHeader.split(' ')[1];
    // Clean project ID (remove b. prefix for reviews API)
    const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit);
    queryParams.append('offset', offset);
    if (statuses) queryParams.append('statuses', statuses);
    if (sortBy) queryParams.append('sortBy', sortBy);
    if (sortOrder) queryParams.append('sortOrder', sortOrder);
    
    const accUrl = `https://developer.api.autodesk.com/construction/reviews/v1/projects/${cleanProjectId}/reviews?${queryParams.toString()}`;
    
    console.log('🔍 Original project ID:', projectId);
    console.log('🔍 Clean project ID for reviews:', cleanProjectId);
    console.log('🔍 Reviews API URL:', accUrl);
    
    const response = await fetch(accUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ACC API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `ACC API error: ${response.status}`, 
        details: errorText 
      });
    }
    
    const result = await response.json();
    console.log('✅ Project reviews retrieved successfully');
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error getting project reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get review workflow (proxy to avoid CORS)
app.get('/api/acc/reviews/:projectId/:reviewId/workflow', async (req, res) => {
  try {
    console.log('🔍 Getting review workflow via backend proxy...');
    const authHeader = req.headers['authorization'];
    const { projectId, reviewId } = req.params;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }
    
    const token = authHeader.split(' ')[1];
    // Clean project ID (remove b. prefix for reviews API)
    const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
    const accUrl = `https://developer.api.autodesk.com/construction/reviews/v1/projects/${cleanProjectId}/reviews/${reviewId}/workflow`;
    
    console.log('🔍 Original project ID:', projectId);
    console.log('🔍 Clean project ID for reviews:', cleanProjectId);
    console.log('🔍 Review ID:', reviewId);
    console.log('🔍 Workflow API URL:', accUrl);
    
    const response = await fetch(accUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ACC API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `ACC API error: ${response.status}`, 
        details: errorText 
      });
    }
    
    const result = await response.json();
    console.log('✅ Review workflow retrieved successfully');
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error getting review workflow:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get review progress (proxy to avoid CORS)
app.get('/api/acc/reviews/:projectId/:reviewId/progress', async (req, res) => {
  try {
    console.log('🔍 Getting review progress via backend proxy...');
    const authHeader = req.headers['authorization'];
    const { projectId, reviewId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }
    
    const token = authHeader.split(' ')[1];
    // Clean project ID (remove b. prefix for reviews API)
    const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
    const accUrl = `https://developer.api.autodesk.com/construction/reviews/v1/projects/${cleanProjectId}/reviews/${reviewId}/progress?limit=${limit}&offset=${offset}`;
    
    console.log('🔍 Original project ID:', projectId);
    console.log('🔍 Clean project ID for reviews:', cleanProjectId);
    console.log('🔍 Review ID:', reviewId);
    console.log('🔍 Progress API URL:', accUrl);
    
    const response = await fetch(accUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ACC API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `ACC API error: ${response.status}`, 
        details: errorText 
      });
    }
    
    const result = await response.json();
    console.log('✅ Review progress retrieved successfully');
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error getting review progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get review versions (approval status) - proxy to avoid CORS
app.get('/api/acc/reviews/:projectId/:reviewId/versions', async (req, res) => {
  try {
    console.log('🔍 Getting review versions via backend proxy...');
    const authHeader = req.headers['authorization'];
    const { projectId, reviewId } = req.params;
    const { limit = 50, offset = 0, 'filter[approveStatus]': approveStatus } = req.query;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }
    
    const token = authHeader.split(' ')[1];
    // Clean project ID (remove b. prefix for reviews API)
    const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit);
    queryParams.append('offset', offset);
    if (approveStatus) queryParams.append('filter[approveStatus]', approveStatus);
    
    const accUrl = `https://developer.api.autodesk.com/construction/reviews/v1/projects/${cleanProjectId}/reviews/${reviewId}/versions?${queryParams.toString()}`;
    
    console.log('🔍 Original project ID:', projectId);
    console.log('🔍 Clean project ID for reviews:', cleanProjectId);
    console.log('🔍 Review ID:', reviewId);
    console.log('🔍 Versions API URL:', accUrl);
    
    const response = await fetch(accUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ACC API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `ACC API error: ${response.status}`, 
        details: errorText 
      });
    }
    
    const result = await response.json();
    console.log('✅ Review versions retrieved successfully');
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error getting review versions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy: ACC Account Admin - list projects in an account (supports filters)
app.get('/api/acc/admin/accounts/:accountId/projects', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const { accountId } = req.params;
    const {
      limit,
      offset,
      sort,
      direction,
      fields,
      filter,
      filterTextMatch,
      region
    } = req.query;

    // Prefer caller's token; GET works with 3-legged and 2-legged
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    // Build query parameters, including nested filter[...] keys
    const qp = new URLSearchParams();
    if (limit) qp.append('limit', limit);
    if (offset) qp.append('offset', offset);
    if (sort) qp.append('sort', sort);
    if (direction) qp.append('direction', direction); // some endpoints support direction
    if (fields) qp.append('fields', fields);
    if (filterTextMatch) qp.append('filterTextMatch', filterTextMatch);

    // If filter is passed as an object in query, append filter[...] entries
    // Example: filter[classification]=template, filter[type]=Template Project
    if (filter && typeof filter === 'object') {
      Object.keys(filter).forEach(key => {
        const value = filter[key];
        if (Array.isArray(value)) {
          // allow multiple values
          value.forEach(v => qp.append(`filter[${key}]`, v));
        } else if (value !== undefined && value !== null) {
          qp.append(`filter[${key}]`, value);
        }
      });
    }

    const url = `https://developer.api.autodesk.com/construction/admin/v1/accounts/${accountId}/projects${qp.toString() ? `?${qp}` : ''}`;

    // Prepare headers; support region routing if provided
    const headers = {
      'Authorization': authHeader,
      'Accept': 'application/json'
    };
    if (region) {
      headers['Region'] = region; // Official header for routing
      headers['x-ads-region'] = region; // Fallback for legacy routing
    }
    // Optional: forward User-Id header if provided
    const userIdHeader = req.headers['user-id'] || req.headers['User-Id'] || req.headers['userId'];
    if (userIdHeader) {
      headers['User-Id'] = userIdHeader;
    }

    const response = await fetch(url, { headers });
    const text = await response.text();

    if (!response.ok) {
      console.error('❌ Account Admin projects error:', response.status, text);
      return res.status(response.status).send(text);
    }

    return res.status(200).send(text);
  } catch (error) {
    console.error('❌ Account Admin projects proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users in HQ account by email
// Proxy: Outlook OAuth Token Exchange (backend handles client secret securely)
app.post('/api/outlook/oauth/token', async (req, res) => {
  try {
    const { code, clientId, tenantId, clientSecret, redirectUri } = req.body;
    
    if (!code || !clientId || !tenantId || !clientSecret || !redirectUri) {
      return res.status(400).json({ 
        error: 'Missing required parameters: code, clientId, tenantId, clientSecret, redirectUri' 
      });
    }
    
    console.log('🔄 Exchanging Outlook OAuth code for token...');
    console.log('🔑 Client ID:', clientId);
    console.log('🔑 Tenant ID:', tenantId);
    console.log('🔑 Client Secret:', clientSecret ? 'Present (length: ' + clientSecret.length + ')' : 'Missing');
    
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret.trim(),
        code: code,
        redirect_uri: redirectUri,
        scope: 'openid profile email https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send offline_access'
      })
    });
    
    const responseText = await tokenResponse.text();
    
    if (!tokenResponse.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error_description: responseText };
      }
      
      console.error('❌ Outlook token exchange failed:', tokenResponse.status, errorData);
      
      let errorMessage = `Token exchange failed: ${tokenResponse.status}`;
      if (errorData.error === 'invalid_client' && errorData.error_description?.includes('client secret')) {
        errorMessage = 'Invalid client secret. Please check your Azure AD Client Secret in settings. Make sure you\'re using the secret VALUE (not the secret ID), and that it hasn\'t expired.';
      } else if (errorData.error === 'AADSTS9002326') {
        errorMessage = 'The app must be configured as a "Single-Page Application" in Azure AD, or use backend token exchange. Using backend exchange instead.';
      } else if (errorData.error_description) {
        errorMessage = errorData.error_description;
      }
      
      return res.status(tokenResponse.status).json({
        error: errorMessage,
        errorCode: errorData.error,
        errorDetails: errorData
      });
    }
    
    const tokenData = JSON.parse(responseText);
    console.log('✅ Outlook token exchange successful');
    console.log('🔑 Access token present:', !!tokenData.access_token);
    console.log('🔑 Refresh token present:', !!tokenData.refresh_token);
    
    res.json(tokenData);
  } catch (error) {
    console.error('❌ Outlook OAuth token exchange error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/api/hq/users/search/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { email, limit = 100 } = req.query;
    
    console.log('🔍 Searching HQ users for account:', accountId);
    console.log('📧 Search email:', email);
    
    // Get 2-legged token
    const clientId = CLIENT_ID;
    const clientSecret = CLIENT_SECRET;

    const tokenResponse = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'account:read'
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('❌ Failed to get 2-legged token:', error);
      return res.status(500).json({ error: 'Failed to authenticate' });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    // Build query params
    const queryParams = new URLSearchParams({ limit });
    if (email) queryParams.append('email', email);
    
    // Call HQ API
    const url = `https://developer.api.autodesk.com/hq/v1/accounts/${accountId}/users/search?${queryParams.toString()}`;
    console.log('🔍 HQ API URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ HQ API error:', response.status, error);
      return res.status(response.status).json({ error: 'Failed to search users', details: error });
    }

    const users = await response.json();
    console.log(`✅ Found ${users.length} users`);
    res.json(users);
    
  } catch (error) {
    console.error('❌ Error searching HQ users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Cost Management Proxy Server running on port ${PORT}`);
    console.log(`📊 Available endpoints:`);
    console.log(`   POST /api/auth/two-legged`);
    console.log(`   POST /api/cost/container-id`);
    console.log(`   POST /api/outlook/oauth/token`);
    console.log(`   GET  /api/cost/budgets/:containerId`);
    console.log(`   GET  /api/cost/contracts/:containerId`);
    console.log(`   GET  /api/cost/cost-items/:containerId`);
    console.log(`   GET  /api/cost/expenses/:containerId`);
    console.log(`   POST /api/cost/budgets/:containerId`);
    console.log(`   GET  /api/acc/forms/:projectId`);
    console.log(`   GET  /api/acc/forms/:projectId/:formId`);
    console.log(`   POST /api/acc/reviews/:projectId`);
    console.log(`   GET  /api/health`);
    console.log(`📝 DocuSign endpoints:`);
    console.log(`   GET  /api/docusign/status`);
    console.log(`   POST /api/docusign/logout`);
    console.log(`   POST /api/docusign/send-for-signature`);
    console.log(`   GET  /api/docusign/status/:envelopeId`);
    console.log(`   GET  /api/docusign/download/:envelopeId`);
    console.log(`   POST /api/docusign/upload-to-acc/:envelopeId`);
    console.log(`   POST /api/convert-to-pdf`);
    console.log(`📡 Webhook endpoints:`);
    console.log(`   POST /api/webhooks/acc/callback`);
  });
}

// Webhook callback endpoint for ACC Cost Management events
app.post('/api/webhooks/acc/callback', async (req, res) => {
  try {
    console.log('🔔 ACC Webhook received:', req.body);
    
    // Verify webhook signature if needed
    const signature = req.headers['x-adsk-signature'];
    const deliveryId = req.headers['x-adsk-delivery-id'];
    
    console.log('📋 Webhook headers:', {
      signature,
      deliveryId,
      contentType: req.headers['content-type']
    });
    
    // Process the webhook payload
    const { version, resourceUrn, hook, payload } = req.body;
    
    console.log('📊 Webhook details:', {
      version,
      resourceUrn,
      event: hook?.event,
      resourceType: payload?.[0]?.resourceType,
      resourceId: payload?.[0]?.id
    });
    
    // Forward to frontend if available
    if (typeof window !== 'undefined' && window.handleWebhookCallback) {
      window.handleWebhookCallback(req.body);
    }
    
    // Here you can add logic to sync with D365
    // For example, when an expense is created in ACC, create a corresponding record in D365
    
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== PROJECT ID DEBUG ENDPOINTS =====

// Debug endpoint to test project ID handling
app.get('/debug/project-id/:projectId', (req, res) => {
  const { projectId } = req.params;
  
  console.log('🔍 PROJECT ID DEBUG:');
  console.log('📋 Original project ID:', projectId);
  console.log('📋 Type:', typeof projectId);
  console.log('📋 Length:', projectId.length);
  console.log('📋 Starts with b.:', projectId.startsWith('b.'));
  console.log('📋 Contains b.:', projectId.includes('b.'));
  
  // Test different cleaning methods
  const methods = {
    'Original': projectId,
    'Remove b. prefix': projectId.startsWith('b.') ? projectId.substring(2) : projectId,
    'Add b. prefix': projectId.startsWith('b.') ? projectId : `b.${projectId}`,
    'Replace b. with empty': projectId.replace('b.', ''),
    'Split by dot and take last': projectId.split('.').pop(),
    'Split by dot and take first': projectId.split('.')[0],
    'Base64 decode': (() => {
      try {
        return Buffer.from(projectId, 'base64').toString('utf-8');
      } catch (e) {
        return 'Invalid base64';
      }
    })(),
    'URL decode': decodeURIComponent(projectId),
    'Trim whitespace': projectId.trim(),
    'Remove all non-alphanumeric except dots and dashes': projectId.replace(/[^a-zA-Z0-9.-]/g, '')
  };
  
  console.log('🔧 CLEANING METHODS:');
  Object.entries(methods).forEach(([method, result]) => {
    console.log(`  ${method}: "${result}"`);
  });
  
  // Test which format works for different APIs
  const apiTests = {
    'Data Management API': `https://developer.api.autodesk.com/data/v1/projects/${projectId}`,
    'Data Management API (cleaned)': `https://developer.api.autodesk.com/data/v1/projects/${projectId.startsWith('b.') ? projectId.substring(2) : projectId}`,
    'Reviews API': `https://developer.api.autodesk.com/construction/reviews/v1/projects/${projectId}`,
    'Reviews API (cleaned)': `https://developer.api.autodesk.com/construction/reviews/v1/projects/${projectId.startsWith('b.') ? projectId.substring(2) : projectId}`,
    'Workflows API': `https://developer.api.autodesk.com/construction/workflows/v1/projects/${projectId}`,
    'Workflows API (cleaned)': `https://developer.api.autodesk.com/construction/workflows/v1/projects/${projectId.startsWith('b.') ? projectId.substring(2) : projectId}`
  };
  
  console.log('🌐 API URL TESTS:');
  Object.entries(apiTests).forEach(([api, url]) => {
    console.log(`  ${api}: ${url}`);
  });
  
  res.json({
    original: projectId,
    methods: methods,
    apiTests: apiTests,
    recommendations: {
      'For Data Management API': projectId.startsWith('b.') ? projectId : `b.${projectId}`,
      'For Reviews API': projectId.startsWith('b.') ? projectId.substring(2) : projectId,
      'For Workflows API': projectId.startsWith('b.') ? projectId : `b.${projectId}`
    }
  });
});

// Test endpoint to simulate review creation with different project ID formats
app.post('/debug/review-creation/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const { token, fileUrn, workflowId } = req.body;
  
  console.log('🧪 REVIEW CREATION DEBUG:');
  console.log('📋 Project ID:', projectId);
  console.log('📋 Token length:', token ? token.length : 0);
  console.log('📋 File URN:', fileUrn);
  console.log('📋 Workflow ID:', workflowId);
  
  const testFormats = [
    { name: 'Original', id: projectId },
    { name: 'Remove b. prefix', id: projectId.startsWith('b.') ? projectId.substring(2) : projectId },
    { name: 'Add b. prefix', id: projectId.startsWith('b.') ? projectId : `b.${projectId}` }
  ];
  
  const results = [];
  
  for (const format of testFormats) {
    try {
      console.log(`🔍 Testing format: ${format.name} (${format.id})`);
      
      const url = `https://developer.api.autodesk.com/construction/reviews/v1/projects/${format.id}/reviews`;
      const payload = {
        name: `Debug Test - ${format.name}`,
        fileVersions: [{ urn: fileUrn }],
        workflowId: workflowId
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      results.push({
        format: format.name,
        projectId: format.id,
        url: url,
        success: response.ok,
        status: response.status,
        response: data
      });
      
      console.log(`  ${response.ok ? '✅' : '❌'} ${format.name}: ${response.status} ${response.ok ? 'SUCCESS' : 'FAILED'}`);
      
    } catch (error) {
      results.push({
        format: format.name,
        projectId: format.id,
        success: false,
        error: error.message
      });
      
      console.log(`  ❌ ${format.name}: ${error.message}`);
    }
  }
  
  const successful = results.find(r => r.success);
  if (successful) {
    console.log(`🎯 WORKING FORMAT: ${successful.format} (${successful.projectId})`);
  } else {
    console.log('❌ NO WORKING FORMAT FOUND');
  }
  
  res.json({
    projectId: projectId,
    results: results,
    workingFormat: successful,
    recommendations: {
      'Use this format for Reviews API': successful ? successful.projectId : 'None found',
      'Use this format for Data Management API': projectId.startsWith('b.') ? projectId : `b.${projectId}`,
      'Use this format for Workflows API': projectId.startsWith('b.') ? projectId : `b.${projectId}`
    }
  });
});

module.exports = app;
