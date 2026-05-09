import { AUTH_CONFIG } from '../config/auth';

class AuthService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.isRefreshing = false;
  }

  /**
   * Initialize authentication with stored credentials
   */
  initialize() {
    try {
      const stored = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.CREDENTIALS);
      if (stored) {
        const credentials = JSON.parse(stored);
        this.accessToken = credentials.threeLegToken;
        this.refreshToken = credentials.refreshToken;
        this.tokenExpiry = credentials.tokenExpiry;
        
        // Check if token is expired
        if (this.isTokenExpired()) {
          console.log('🔄 Token expired, attempting refresh...');
          this.refreshAccessToken();
        }
        
        return true;
      }
    } catch (error) {
      console.error('❌ Error loading stored credentials:', error);
    }
    return false;
  }

  /**
   * Check if current token is expired
   */
  isTokenExpired() {
    if (!this.tokenExpiry) return true;
    return Date.now() >= this.tokenExpiry;
  }

  /**
   * Get current access token (with auto-refresh if needed)
   */
  async getAccessToken() {
    if (this.isTokenExpired() && this.refreshToken) {
      await this.refreshAccessToken();
    }
    return this.accessToken;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    if (this.isRefreshing) {
      // Wait for ongoing refresh
      while (this.isRefreshing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.accessToken;
    }

    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(`${AUTH_CONFIG.OAUTH_BASE_URL}/authentication/v2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          client_id: AUTH_CONFIG.CLIENT_ID,
          client_secret: AUTH_CONFIG.CLIENT_SECRET || '', // Should be empty in production
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);

      // Save updated credentials
      this.saveCredentials();

      console.log('✅ Token refreshed successfully');
      return this.accessToken;

    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      this.logout();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Save credentials to localStorage
   */
  saveCredentials() {
    const credentials = {
      threeLegToken: this.accessToken,
      refreshToken: this.refreshToken,
      tokenExpiry: this.tokenExpiry,
      accountId: AUTH_CONFIG.ACCOUNT_ID,
      clientId: AUTH_CONFIG.CLIENT_ID,
      // Never store client secret in frontend
    };

    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));
  }

  /**
   * Start 3-legged OAuth flow with PKCE
   */
  async startOAuthFlow() {
    const state = this.generateRandomString(32);
    const codeVerifier = this.generateRandomString(128);
    const codeChallenge = this.base64URLEncode(await this.sha256(codeVerifier));
    
    // Store state and code verifier for validation
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_code_verifier', codeVerifier);
    
    const authUrl = new URL(`${AUTH_CONFIG.OAUTH_BASE_URL}/authentication/v2/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', AUTH_CONFIG.CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', AUTH_CONFIG.REDIRECT_URI);
    authUrl.searchParams.set('scope', AUTH_CONFIG.SCOPES);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    console.log('🔐 Starting 3-legged OAuth flow with PKCE...');
    console.log('🔗 Redirecting to:', authUrl.toString());
    window.location.href = authUrl.toString();
  }

  /**
   * Handle OAuth callback (should be called from callback page)
   */
  async handleOAuthCallback(code) {
    // Check if we're already processing this code
    const processingKey = `oauth_processing_${code}`;
    
    try {
      if (localStorage.getItem(processingKey)) {
        console.log('⚠️ OAuth callback already being processed, skipping...');
        return true;
      }
      
      // Mark as processing
      localStorage.setItem(processingKey, 'true');
      
      console.log('🔄 Processing OAuth callback...');
      console.log('📋 Client ID:', AUTH_CONFIG.CLIENT_ID);
      console.log('📋 Redirect URI:', AUTH_CONFIG.REDIRECT_URI);
      console.log('📋 Code received:', code ? 'Yes' : 'No');
      console.log('📋 Code value:', code);
      console.log('📋 Current time:', new Date().toISOString());

      // Get the stored code verifier
      const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
      if (!codeVerifier) {
        throw new Error('Code verifier not found. Please restart the OAuth flow.');
      }

      // Recreate the code challenge for verification
      const codeChallenge = this.base64URLEncode(await this.sha256(codeVerifier));
      
      const requestBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: AUTH_CONFIG.CLIENT_ID,
        redirect_uri: AUTH_CONFIG.REDIRECT_URI,
        code_verifier: codeVerifier,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      console.log('📋 Request body:', requestBody.toString());
      console.log('📋 Client ID:', AUTH_CONFIG.CLIENT_ID);
      console.log('📋 Redirect URI:', AUTH_CONFIG.REDIRECT_URI);
      console.log('📋 Code verifier length:', codeVerifier.length);

      const response = await fetch(`${AUTH_CONFIG.OAUTH_BASE_URL}/authentication/v2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBody,
      });

      console.log('📋 Response status:', response.status);
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OAuth error response:', errorText);
        throw new Error(`OAuth callback failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📋 Token response:', data);
      
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);

      this.saveCredentials();

      // Clean up processing flag
      localStorage.removeItem(processingKey);

      console.log('✅ OAuth authentication successful');
      return true;

    } catch (error) {
      // Clean up processing flag on error
      localStorage.removeItem(processingKey);
      console.error('❌ OAuth callback failed:', error);
      throw error;
    }
  }

  /**
   * Logout and clear stored credentials
   */
  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.CREDENTIALS);
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.PROJECT_SELECTION);
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.HUB_SELECTION);
    
    console.log('👋 Logged out successfully');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!(this.accessToken && !this.isTokenExpired());
  }

  /**
   * Get stored project selection
   */
  getStoredProjectSelection() {
    try {
      const stored = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.PROJECT_SELECTION);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('❌ Error loading stored project selection:', error);
      return null;
    }
  }

  /**
   * Save project selection
   */
  saveProjectSelection(project, hub) {
    try {
      const selection = { project, hub };
      localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.PROJECT_SELECTION, JSON.stringify(selection));
    } catch (error) {
      console.error('❌ Error saving project selection:', error);
    }
  }

  /**
   * Generate a random string for PKCE
   */
  generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let text = '';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Base64 URL encode
   */
  base64URLEncode(str) {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * SHA256 hash
   */
  async sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return String.fromCharCode(...new Uint8Array(hash));
  }
}

// Add static properties
AuthService.STORAGE_KEYS = AUTH_CONFIG.STORAGE_KEYS;

// Export singleton instance
export default new AuthService();
