import React, { useState, useEffect, useCallback } from 'react';
import { Key, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import AuthService from '../services/AuthService';
import AccService from '../services/AccService';
import { AUTH_CONFIG } from '../config/auth';
import { debugOAuthConfig, getOAuthErrorMessage } from '../utils/oauthDebug';

const AuthHandler = ({ onAuthenticated, onError }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState(null);

  const handleOAuthCallback = useCallback(async (code) => {
    try {
      setIsAuthenticating(true);
      setError(null);

      await AuthService.handleOAuthCallback(code);

      // Initialize AccService with the new token
      const storedCredentials = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.CREDENTIALS);
      if (storedCredentials) {
        const credentials = JSON.parse(storedCredentials);
        AccService.initialize({
          threeLegToken: credentials.threeLegToken,
          accountId: AUTH_CONFIG.ACCOUNT_ID,
          clientId: AUTH_CONFIG.CLIENT_ID
        });
      }
      
      onAuthenticated();
    } catch (error) {
      console.error('❌ OAuth callback failed:', error);
      const errorMessage = getOAuthErrorMessage(400, error.message);
      setError(`Authentication failed: ${errorMessage}`);
      setIsAuthenticating(false);
    }
  }, [onAuthenticated]);

  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if we have a code from URL (OAuth callback)
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        console.log('🔄 Processing OAuth callback from URL');
        await handleOAuthCallback(code);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // No OAuth callback - just show login page
      console.log('🔐 No OAuth callback, showing login page');
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Authentication initialization failed:', error);
      setError('Authentication failed. Please try again.');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Debug OAuth configuration
    debugOAuthConfig();
    
    initializeAuth();
    
    // Listen for OAuth callback messages
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'OAUTH_CALLBACK') {
        handleOAuthCallback(event.data.code);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleOAuthCallback, initializeAuth]);

  const handleLogin = async () => {
    try {
      setIsAuthenticating(true);
      setError(null);
      await AuthService.startOAuthFlow();
    } catch (error) {
      console.error('❌ Login failed:', error);
      setError('Login failed. Please try again.');
      setIsAuthenticating(false);
    }
  };


  if (isLoading || isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isAuthenticating ? 'Completing Authentication...' : 'Loading ZOYANTRA...'}
          </h2>
          <p className="text-gray-600">
            {isAuthenticating ? 'Please wait while we complete your login.' : 'Initializing application...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Key className="h-8 w-8 text-white" />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleLogin}
            disabled={isAuthenticating}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAuthenticating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            {isAuthenticating ? 'Authenticating...' : 'Login with Autodesk'}
          </button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              You'll be redirected to Autodesk to complete authentication
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">Security Notice</p>
            <p className="text-xs text-gray-400">
              Your credentials are stored securely and never shared with third parties.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthHandler;


