// Server-side Project ID Debugger
// Add this to your server.js to debug project ID handling

const express = require('express');
const app = express();

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
