// OAuth Debug Utility
// This helps debug OAuth configuration issues

export const debugOAuthConfig = () => {
  const config = {
    clientId: process.env.REACT_APP_CLIENT_ID || 'WN6yXCVdbZB2SOVgVtZFsCtV7eGgNYn95wCm9TaheeUjtvPj',
    accountId: process.env.REACT_APP_ACCOUNT_ID || 'ddc5f6e2-9ddc-475e-82ed-b05da4ac18c2',
    redirectUri: process.env.REACT_APP_REDIRECT_URI || `${window.location.origin}/auth/callback`,
    oauthBaseUrl: 'https://developer.api.autodesk.com',
    scopes: 'data:read data:write data:create data:search bucket:read bucket:create bucket:update bucket:delete'
  };

  console.log('🔍 3-Legged OAuth Configuration Debug:');
  console.log('📋 Client ID:', config.clientId);
  console.log('📋 Account ID:', config.accountId);
  console.log('📋 Redirect URI:', config.redirectUri);
  console.log('📋 OAuth Base URL:', config.oauthBaseUrl);
  console.log('📋 Scopes:', config.scopes);
  console.log('📋 Grant Type: authorization_code (3-legged with PKCE)');

  // Generate the 3-legged OAuth authorization URL
  const authUrl = new URL(`${config.oauthBaseUrl}/authentication/v2/authorize`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', config.redirectUri);
  authUrl.searchParams.set('scope', config.scopes);
  console.log('🔗 Authorization URL:', authUrl.toString());

  return {
    config,
    authUrl: authUrl.toString()
  };
};

// Common OAuth Error Messages
export const getOAuthErrorMessage = (status, errorText) => {
  const commonErrors = {
    400: {
      'invalid_client': 'Client ID or secret is incorrect. Check your Autodesk app configuration.',
      'invalid_grant': 'Authorization code is invalid or expired. Try logging in again.',
      'invalid_request': 'Request parameters are missing or invalid.',
      'redirect_uri_mismatch': 'Redirect URI does not match the one configured in your Autodesk app.',
      'unsupported_grant_type': 'Grant type is not supported.'
    },
    401: 'Unauthorized. Check your client credentials.',
    403: 'Forbidden. Check your app permissions.',
    429: 'Too many requests. Please wait before trying again.'
  };

  if (status === 400 && errorText) {
    try {
      const errorData = JSON.parse(errorText);
      const errorCode = errorData.error || errorData.errorCode;
      if (commonErrors[400][errorCode]) {
        return commonErrors[400][errorCode];
      }
    } catch (e) {
      // Not JSON, use generic message
    }
  }

  return commonErrors[status] || `HTTP ${status}: ${errorText || 'Unknown error'}`;
};
