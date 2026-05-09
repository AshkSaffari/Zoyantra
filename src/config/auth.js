// Authentication configuration
// In production, these should be environment variables or server-side only

export const AUTH_CONFIG = {
  // These should be moved to environment variables in production
  CLIENT_ID: process.env.REACT_APP_CLIENT_ID || 'WN6yXCVdbZB2SOVgVtZFsCtV7eGgNYn95wCm9TaheeUjtvPj',
  ACCOUNT_ID: process.env.REACT_APP_ACCOUNT_ID || 'ddc5f6e2-9ddc-475e-82ed-b05da4ac18c2',
  
  // Client secret for 2-legged OAuth (temporary - should be server-side in production)
  CLIENT_SECRET: process.env.REACT_APP_CLIENT_SECRET || '',
  
  // OAuth endpoints
  OAUTH_BASE_URL: 'https://developer.api.autodesk.com',
  REDIRECT_URI: process.env.REACT_APP_REDIRECT_URI || `${window.location.origin}/auth/callback`,
  
  // Scopes for 3-legged OAuth
  SCOPES: [
    'data:read',
    'data:write',
    'data:create',
    'data:search',
    'bucket:read',
    'bucket:create',
    'bucket:update',
    'bucket:delete'
  ].join(' '),
  
  // Token storage keys
  STORAGE_KEYS: {
    CREDENTIALS: 'zoyantra_credentials',
    ACCESS_TOKEN: 'zoyantra_access_token',
    REFRESH_TOKEN: 'zoyantra_refresh_token',
    PROJECT_SELECTION: 'zoyantra_selected_project',
    HUB_SELECTION: 'zoyantra_selected_hub'
  }
};

// Outlook/Office 365 Integration Configuration for CEWA
export const OUTLOOK_CONFIG = {
  tenantId: process.env.REACT_APP_OUTLOOK_TENANT_ID || 'c5852f23-3633-4f29-b386-51da53e35e23',
  clientId: process.env.REACT_APP_OUTLOOK_CLIENT_ID || '2a998440-08f4-44ee-a5dc-36b03f30eb17',
  clientSecretId: process.env.REACT_APP_OUTLOOK_CLIENT_SECRET || 'a8291bcf-ced0-44f0-a665-3022f497a189',
  redirectUri: process.env.REACT_APP_OUTLOOK_REDIRECT_URI || `${window.location.origin}/outlook-callback`,
  authority: `https://login.microsoftonline.com/c5852f23-3633-4f29-b386-51da53e35e23`,
  baseUrl: 'https://graph.microsoft.com',
  scopes: ['https://graph.microsoft.com/Mail.Read', 'https://graph.microsoft.com/Mail.Send', 'https://graph.microsoft.com/Calendars.ReadWrite'],
  testAccount: '8445svc_zoyantra.testing@cewa.edu.au'
};

// Security warning for development
if (process.env.NODE_ENV === 'development' && AUTH_CONFIG.CLIENT_SECRET) {
  console.warn('⚠️ SECURITY WARNING: Client secret is exposed in frontend code!');
  console.warn('⚠️ Move client secret to server-side in production!');
}
