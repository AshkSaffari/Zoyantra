/**
 * Environment Variables Test
 * Check if environment variables are loaded correctly
 */

export const testEnvironmentVariables = () => {
  console.log('🔍 Testing Environment Variables...');
  
  const clientId = process.env.REACT_APP_CLIENT_ID;
  const clientSecret = process.env.REACT_APP_CLIENT_SECRET;
  const accountId = process.env.REACT_APP_ACCOUNT_ID;
  
  console.log('📋 Environment Variables Status:');
  console.log('  REACT_APP_CLIENT_ID:', clientId ? '✅ Loaded' : '❌ Missing');
  console.log('  REACT_APP_CLIENT_SECRET:', clientSecret ? '✅ Loaded' : '❌ Missing');
  console.log('  REACT_APP_ACCOUNT_ID:', accountId ? '✅ Loaded' : '❌ Missing');
  
  if (clientId) {
    console.log('  Client ID Value:', clientId);
  }
  
  if (clientSecret) {
    console.log('  Client Secret Value:', clientSecret.substring(0, 10) + '...');
  }
  
  if (accountId) {
    console.log('  Account ID Value:', accountId);
  }
  
  return {
    clientId: !!clientId,
    clientSecret: !!clientSecret,
    accountId: !!accountId,
    allLoaded: !!(clientId && clientSecret && accountId)
  };
};

export const testOAuthScopes = () => {
  console.log('🔍 Testing OAuth Scopes...');
  
  const scopes = [
    'data:read',
    'data:write',
    'data:create',
    'data:search',
    'bucket:read',
    'bucket:create',
    'bucket:update',
    'bucket:delete'
  ];
  
  console.log('📋 OAuth Scopes:');
  scopes.forEach(scope => {
    console.log(`  ${scope}: ✅ Included`);
  });
  
  const scopeString = scopes.join(' ');
  console.log('  Full Scope String:', scopeString);
  
  return {
    scopes,
    scopeString,
    encodedScope: encodeURIComponent(scopeString)
  };
};

export const testOAuthUrl = () => {
  console.log('🔍 Testing OAuth URL Generation...');
  
  const clientId = process.env.REACT_APP_CLIENT_ID || 'WN6yXCVdbZB2SOVgVtZFsCtV7eGgNYn95wCm9TaheeUjtvPj';
  const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
  const scopes = [
    'data:read',
    'data:write',
    'data:create',
    'data:search',
    'bucket:read',
    'bucket:create',
    'bucket:update',
    'bucket:delete'
  ];
  const scope = encodeURIComponent(scopes.join(' '));
  
  const oauthUrl = `https://developer.api.autodesk.com/authentication/v2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  
  console.log('📋 OAuth URL Components:');
  console.log('  Base URL: https://developer.api.autodesk.com/authentication/v2/authorize');
  console.log('  Client ID:', clientId);
  console.log('  Redirect URI:', window.location.origin + '/auth/callback');
  console.log('  Scopes:', scopes.join(' '));
  console.log('  Full OAuth URL:', oauthUrl);
  
  return {
    oauthUrl,
    clientId,
    redirectUri,
    scopes,
    isValid: !!(clientId && redirectUri && scope)
  };
};

export default {
  testEnvironmentVariables,
  testOAuthScopes,
  testOAuthUrl
};
