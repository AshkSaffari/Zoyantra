/**
 * Debug API Endpoints - Test all possible Autodesk API endpoints
 * This will help identify which APIs work with your account
 */

const testAllEndpoints = async () => {
  console.log('🔍 Testing All Autodesk API Endpoints...');
  
  // First, get a 2-legged token
  const clientId = 'ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo';
  const clientSecret = 'fwAMvFSSo7TsrYA1TVzqRnxt2j7j2kCNtmbOkgO2rau4HBjfaUXUn0u3FsQbpOBa';
  
  let accessToken = null;
  
  try {
    console.log('🔑 Getting 2-legged token...');
    const tokenResponse = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'data:read data:write data:create data:search bucket:read bucket:create account:read'
      })
    });
    
    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;
      console.log('✅ 2-legged token obtained');
    } else {
      console.log('❌ Failed to get 2-legged token');
      return;
    }
  } catch (error) {
    console.log('❌ Error getting token:', error.message);
    return;
  }
  
  // Test all possible endpoints
  const endpoints = [
    {
      name: 'Data Management API - Hubs',
      url: 'https://developer.api.autodesk.com/data/v1/hubs',
      description: 'Standard Data Management API for hubs'
    },
    {
      name: 'Data Management API - Hubs (v2)',
      url: 'https://developer.api.autodesk.com/data/v2/hubs',
      description: 'Data Management API v2 for hubs'
    },
    {
      name: 'ACC Admin API - Accounts',
      url: 'https://developer.api.autodesk.com/construction/admin/v1/accounts',
      description: 'ACC Admin API for accounts'
    },
    {
      name: 'ACC Admin API - Accounts (v2)',
      url: 'https://developer.api.autodesk.com/construction/admin/v2/accounts',
      description: 'ACC Admin API v2 for accounts'
    },
    {
      name: 'Forge Data Management - Hubs',
      url: 'https://developer.api.autodesk.com/forge/data/v1/hubs',
      description: 'Forge Data Management API for hubs'
    },
    {
      name: 'User Profile API',
      url: 'https://developer.api.autodesk.com/userprofile/v1/users/@me',
      description: 'User profile information'
    },
    {
      name: 'User Info API',
      url: 'https://developer.api.autodesk.com/userinfo/v1/users/@me',
      description: 'User info API'
    }
  ];
  
  console.log('\n📊 Testing all endpoints...');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing: ${endpoint.name}`);
      console.log(`   URL: ${endpoint.url}`);
      
      const response = await fetch(endpoint.url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ SUCCESS (${response.status})`);
        console.log(`   📊 Response keys:`, Object.keys(data));
        if (data.data) {
          console.log(`   📊 Data items: ${data.data.length || 0}`);
        }
        if (data.results) {
          console.log(`   📊 Results items: ${data.results.length || 0}`);
        }
        console.log(`   📋 Sample data:`, JSON.stringify(data).substring(0, 200) + '...');
      } else {
        const errorText = await response.text();
        console.log(`   ❌ FAILED (${response.status})`);
        console.log(`   📊 Error: ${errorText.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }
  
  console.log('\n📋 Summary:');
  console.log('1. Look for endpoints that return SUCCESS');
  console.log('2. Check which endpoints return actual data');
  console.log('3. Use the working endpoints in your application');
  console.log('\n🔧 Next steps:');
  console.log('1. Update AccService.js to use the working endpoints');
  console.log('2. Test with your 3-legged token from OAuth flow');
};

// Run the test
testAllEndpoints();
