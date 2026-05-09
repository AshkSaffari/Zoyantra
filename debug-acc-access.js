// Debug script to test ACC API access with your token
const fetch = require('node-fetch');

async function debugACCAccess() {
  console.log('🔍 Debugging ACC API Access...');
  
  // You'll need to get your actual token from the browser console
  const token = 'YOUR_TOKEN_HERE'; // Replace with your actual token
  
  if (token === 'YOUR_TOKEN_HERE') {
    console.log('❌ Please replace YOUR_TOKEN_HERE with your actual token from the browser console');
    console.log('📋 To get your token:');
    console.log('   1. Open browser console (F12)');
    console.log('   2. Look for "Access Token: Present" in the logs');
    console.log('   3. Copy the token value');
    console.log('   4. Replace YOUR_TOKEN_HERE in this script');
    return;
  }
  
  console.log('🔑 Using token:', token.substring(0, 20) + '...');
  
  // Test 1: Check if token is valid
  console.log('\n📋 Test 1: Validating Token');
  try {
    const tokenResponse = await fetch('https://developer.api.autodesk.com/userprofile/v1/users/@me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (tokenResponse.ok) {
      const userData = await tokenResponse.json();
      console.log('✅ Token is valid');
      console.log('👤 User:', userData.firstName, userData.lastName);
      console.log('📧 Email:', userData.emailId);
    } else {
      console.log('❌ Token validation failed:', tokenResponse.status);
      const errorData = await tokenResponse.text();
      console.log('Error:', errorData);
      return;
    }
  } catch (error) {
    console.log('❌ Token validation error:', error.message);
    return;
  }
  
  // Test 2: Check ACC accounts endpoint
  console.log('\n📋 Test 2: ACC Accounts API');
  try {
    const accResponse = await fetch('https://developer.api.autodesk.com/construction/admin/v1/accounts', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', accResponse.status);
    console.log('Status Text:', accResponse.statusText);
    
    if (accResponse.ok) {
      const accData = await accResponse.json();
      console.log('✅ ACC Accounts found:', accData.data?.length || 0);
      if (accData.data && accData.data.length > 0) {
        console.log('📋 Account details:');
        accData.data.forEach((account, index) => {
          console.log(`   ${index + 1}. ${account.name} (${account.id})`);
        });
      }
    } else {
      const errorData = await accResponse.text();
      console.log('❌ ACC Accounts API failed');
      console.log('Error:', errorData);
      
      if (accResponse.status === 404) {
        console.log('\n🔍 Possible reasons for 404:');
        console.log('   1. Your account has no ACC accounts');
        console.log('   2. Your OAuth app doesn\'t have Construction Admin API access');
        console.log('   3. Your account is not provisioned for ACC');
        console.log('   4. You need to be added to an ACC account by an admin');
      }
    }
  } catch (error) {
    console.log('❌ ACC Accounts API error:', error.message);
  }
  
  // Test 3: Check Data Management API (BIM 360)
  console.log('\n📋 Test 3: Data Management API (BIM 360)');
  try {
    const dmResponse = await fetch('https://developer.api.autodesk.com/data/v1/hubs', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', dmResponse.status);
    console.log('Status Text:', dmResponse.statusText);
    
    if (dmResponse.ok) {
      const dmData = await dmResponse.json();
      console.log('✅ BIM 360 Hubs found:', dmData.data?.length || 0);
      if (dmData.data && dmData.data.length > 0) {
        console.log('📋 Hub details:');
        dmData.data.forEach((hub, index) => {
          console.log(`   ${index + 1}. ${hub.attributes.name} (${hub.id})`);
        });
      }
    } else {
      const errorData = await dmResponse.text();
      console.log('❌ Data Management API failed');
      console.log('Error:', errorData);
    }
  } catch (error) {
    console.log('❌ Data Management API error:', error.message);
  }
  
  // Test 4: Check OAuth app permissions
  console.log('\n📋 Test 4: OAuth App Permissions Check');
  console.log('🔍 Please check your OAuth app in Autodesk Developer Portal:');
  console.log('   1. Go to https://forge.autodesk.com/myapps');
  console.log('   2. Find your app: ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo');
  console.log('   3. Check if these APIs are enabled:');
  console.log('      - Data Management API');
  console.log('      - Autodesk Construction Cloud API');
  console.log('      - Construction Admin API');
  console.log('   4. Make sure the scopes include: account:read');
  
  console.log('\n✅ Debug complete!');
}

debugACCAccess().catch(console.error);
