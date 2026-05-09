// Debug script to test Cost Management API access
// Run this in browser console after authentication

async function debugCostAPI() {
  console.log('🔍 Starting Cost Management API Debug...');
  
  // Test 1: Verify token
  console.log('\n1️⃣ Testing token verification...');
  try {
    const response = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      headers: {
        'Authorization': `Bearer ${AccService.getAccessToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const tokenInfo = await response.json();
      console.log('✅ Token verification successful:');
      console.log('📋 Scopes:', tokenInfo.scope);
      console.log('🆔 Client ID:', tokenInfo.client_id);
      
      const scopes = tokenInfo.scope.split(' ');
      const hasAccountRead = scopes.includes('account:read');
      const hasDataRead = scopes.includes('data:read');
      
      console.log('✅ account:read scope:', hasAccountRead ? 'Present' : 'Missing');
      console.log('✅ data:read scope:', hasDataRead ? 'Present' : 'Missing');
      
      if (!hasAccountRead) {
        console.log('⚠️ Missing account:read scope - this will cause 404 errors!');
      }
    } else {
      console.log('❌ Token verification failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Token verification error:', error.message);
  }
  
  // Test 2: Get project containers
  console.log('\n2️⃣ Testing project containers...');
  const projectId = '5fec8f39-7a15-48c4-973a-789cc5906a63';
  const hubId = 'b.ddc5f6e2-9ddc-475e-82ed-b05da4ac18c2';
  
  try {
    const url = `https://developer.api.autodesk.com/project/v1/hubs/${hubId}/projects/b.${projectId}/containers`;
    console.log('🔍 Testing URL:', url);
    
    const response = await fetch(url, {
      headers: AccService.getHeaders()
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Project containers loaded:', data);
      
      // Look for cost container
      const costContainer = data.results?.find(c => c.type === 'cost');
      if (costContainer) {
        console.log('✅ Found cost container:', costContainer.id);
      } else {
        console.log('⚠️ No cost container found in project');
      }
    } else {
      console.log('❌ Project containers failed:', response.status);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
  } catch (error) {
    console.log('❌ Project containers error:', error.message);
  }
  
  // Test 3: Try different region endpoints
  console.log('\n3️⃣ Testing different region endpoints...');
  const regions = ['', '/apac', '/emea'];
  const containerId = projectId; // Try project ID as container
  
  for (const region of regions) {
    try {
      const url = `https://developer.api.autodesk.com${region}/cost/v1/containers/${containerId}/budgets?limit=1`;
      console.log(`🔍 Testing region ${region || 'US'}:`, url);
      
      const response = await fetch(url, {
        headers: AccService.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Region ${region || 'US'} works!`, data);
        break;
      } else {
        console.log(`❌ Region ${region || 'US'} failed:`, response.status);
      }
    } catch (error) {
      console.log(`❌ Region ${region || 'US'} error:`, error.message);
    }
  }
  
  // Test 4: Try to create a test budget
  console.log('\n4️⃣ Testing budget creation...');
  try {
    const testBudget = await AccService.createTestBudget(projectId);
    if (testBudget) {
      console.log('✅ Test budget created successfully!');
      console.log('📊 Created budget:', testBudget);
    } else {
      console.log('❌ Test budget creation failed');
    }
  } catch (error) {
    console.log('❌ Test budget creation error:', error.message);
  }
  
  console.log('\n🏁 Debug complete!');
}

// Run the debug function
debugCostAPI();
