import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Settings, ExternalLink } from 'lucide-react';

const DocuSignConfigChecker = () => {
  const [configStatus, setConfigStatus] = useState(null);

  const checkConfiguration = () => {
    const config = {
      clientId: process.env.REACT_APP_DOCUSIGN_CLIENT_ID || '4d3698b6-cf09-4204-8d0f-45f7da89de9e',
      clientSecret: process.env.REACT_APP_DOCUSIGN_CLIENT_SECRET || '2e490b30-332b-4563-83d6-299a74ef93ee',
        redirectUri: process.env.REACT_APP_DOCUSIGN_REDIRECT_URI || 'http://localhost:3000/docusign/callback',
      basePath: process.env.REACT_APP_DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi',
      authServer: process.env.REACT_APP_DOCUSIGN_AUTH_SERVER || 'https://account-d.docusign.com'
    };

    const issues = [];
    
    if (!config.clientId || config.clientId === 'your_docusign_client_id') {
      issues.push('DocuSign Client ID is not set or using default value');
    }
    
    if (!config.clientSecret || config.clientSecret === 'your_docusign_client_secret') {
      issues.push('DocuSign Client Secret is not set or using default value');
    }
    
    if (!config.redirectUri || config.redirectUri === 'http://localhost:3000/docusign/callback') {
      issues.push('Redirect URI is using default value - make sure it matches your DocuSign app settings');
    }

    if (issues.length === 0) {
      setConfigStatus({ valid: true, message: 'Configuration looks good!' });
    } else {
      setConfigStatus({ valid: false, issues });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">DocuSign Configuration Check</h3>
        <button
          onClick={checkConfiguration}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Settings className="w-4 h-4 mr-2" />
          Check Configuration
        </button>
      </div>

      {configStatus && (
        <div className={`p-4 rounded-lg ${
          configStatus.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center mb-2">
            {configStatus.valid ? (
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            )}
            <span className={`font-medium ${
              configStatus.valid ? 'text-green-800' : 'text-red-800'
            }`}>
              {configStatus.valid ? 'Configuration Valid' : 'Configuration Issues Found'}
            </span>
          </div>
          
          {configStatus.valid ? (
            <p className="text-green-700">{configStatus.message}</p>
          ) : (
            <div>
              <p className="text-red-700 mb-2">Please fix the following issues:</p>
              <ul className="list-disc list-inside text-red-700 space-y-1">
                {configStatus.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Current Configuration:</h4>
        <div className="space-y-1 text-sm text-gray-600">
          <div><strong>Client ID:</strong> {process.env.REACT_APP_DOCUSIGN_CLIENT_ID || '4d3698b6-cf09-4204-8d0f-45f7da89de9e'}</div>
          <div><strong>Client Secret:</strong> {process.env.REACT_APP_DOCUSIGN_CLIENT_SECRET ? '***hidden***' : '***hidden***'}</div>
          <div><strong>Redirect URI:</strong> {process.env.REACT_APP_DOCUSIGN_REDIRECT_URI || 'http://localhost:3000/docusign/callback'}</div>
          <div><strong>Base Path:</strong> {process.env.REACT_APP_DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi'}</div>
          <div><strong>Auth Server:</strong> {process.env.REACT_APP_DOCUSIGN_AUTH_SERVER || 'https://account-d.docusign.com'}</div>
        </div>
      </div>

      <div className="mt-4">
        <a
          href="https://developers.docusign.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Go to DocuSign Developer Center
        </a>
      </div>
    </div>
  );
};

export default DocuSignConfigChecker;
