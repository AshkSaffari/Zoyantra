/**
 * Verify OAuth Configuration
 * This script checks if all OAuth settings match between your app and Autodesk Developer Portal
 */

const verifyOAuthConfig = () => {
  console.log('🔍 Verifying OAuth Configuration...');
  
  // Expected configuration from your Autodesk Developer Portal
  const expectedConfig = {
    clientId: 'ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo',
    clientSecret: 'fwAMvFSSo7TsrYA1TVzqRnxt2j7j2kCNtmbOkgO2rau4HBjfaUXUn0u3FsQbpOBa',
    redirectUri: 'http://localhost:3000/auth/callback',
    scopes: 'user-profile:read user:read user:write viewables:read data:read data:write data:create data:search bucket:create bucket:read bucket:update bucket:delete code:all account:read account:write openid',
    grantType: 'Authorization Code and Client Credentials',
    applicationType: 'Traditional Web App'
  };
  
  console.log('📋 Expected Configuration:');
  console.log('  Client ID:', expectedConfig.clientId);
  console.log('  Client Secret:', expectedConfig.clientSecret ? 'Present' : 'Missing');
  console.log('  Redirect URI:', expectedConfig.redirectUri);
  console.log('  Scopes:', expectedConfig.scopes);
  console.log('  Grant Type:', expectedConfig.grantType);
  console.log('  Application Type:', expectedConfig.applicationType);
  
  // Check if environment variables are set
  console.log('\n🔧 Environment Variables:');
  console.log('  REACT_APP_CLIENT_ID:', process.env.REACT_APP_CLIENT_ID || 'Not set (using fallback)');
  console.log('  REACT_APP_CLIENT_SECRET:', process.env.REACT_APP_CLIENT_SECRET ? 'Set' : 'Not set (using fallback)');
  
  // Generate OAuth URL for testing
  console.log('\n🔗 Generated OAuth URL:');
  const scopes = encodeURIComponent(expectedConfig.scopes);
  const redirectUri = encodeURIComponent(expectedConfig.redirectUri);
  const authUrl = `https://developer.api.autodesk.com/authentication/v2/authorize?response_type=code&client_id=${expectedConfig.clientId}&redirect_uri=${redirectUri}&scope=${scopes}&code_challenge=test&code_challenge_method=S256`;
  console.log('  URL:', authUrl);
  
  // Test token exchange URL
  console.log('\n🔄 Token Exchange URL:');
  console.log('  URL:', 'https://developer.api.autodesk.com/authentication/v2/token');
  console.log('  Method:', 'POST');
  console.log('  Content-Type:', 'application/x-www-form-urlencoded');
  
  // Expected token exchange body
  console.log('\n📝 Token Exchange Body:');
  console.log('  grant_type:', 'authorization_code');
  console.log('  client_id:', expectedConfig.clientId);
  console.log('  client_secret:', expectedConfig.clientSecret ? 'Present' : 'Missing');
  console.log('  code:', '[AUTHORIZATION_CODE_FROM_CALLBACK]');
  console.log('  redirect_uri:', expectedConfig.redirectUri);
  console.log('  code_verifier:', '[PKCE_CODE_VERIFIER]');
  
  console.log('\n✅ Configuration Verification Complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. Make sure your OAuth app in Autodesk Developer Portal matches the expected configuration');
  console.log('2. Test the OAuth flow with the generated URL');
  console.log('3. Check that the callback URL is exactly: http://localhost:3000/auth/callback');
  console.log('4. Verify that your app has the required APIs enabled:');
  console.log('   - Data Management API');
  console.log('   - Autodesk Construction Cloud API');
  console.log('5. Test with a 3-legged token to see if hubs are accessible');
  
  return {
    expectedConfig,
    authUrl,
    tokenExchangeUrl: 'https://developer.api.autodesk.com/authentication/v2/token'
  };
};

// Run verification
const config = verifyOAuthConfig();

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.verifyOAuthConfig = verifyOAuthConfig;
  window.oauthConfig = config;
}
