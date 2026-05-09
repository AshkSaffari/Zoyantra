import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  Settings,
  Shield,
  Database,
  FolderOpen
} from 'lucide-react';
import ApsSetupVerification from '../utils/apsSetupVerification';

const ApsSetupVerificationComponent = () => {
  const [verificationResults, setVerificationResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);

  const runVerification = async () => {
    setIsRunning(true);
    try {
      const results = await ApsSetupVerification.runFullVerification();
      setVerificationResults(results);
      setLastRun(new Date());
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    // Auto-run verification on component mount
    runVerification();
  }, []);

  const getStatusIcon = (status) => {
    if (status) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = (status) => {
    return status ? 'PASS' : 'FAIL';
  };

  const getStatusColor = (status) => {
    return status ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="aps-setup-verification bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Shield className="h-6 w-6 mr-2 text-blue-600" />
            APS Setup Verification
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Verify your Autodesk Platform Services configuration
          </p>
        </div>
        <button
          onClick={runVerification}
          disabled={isRunning}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running...' : 'Run Verification'}
        </button>
      </div>

      {lastRun && (
        <div className="text-xs text-gray-500 mb-4">
          Last run: {lastRun.toLocaleString()}
        </div>
      )}

      {verificationResults && (
        <div className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Authentication</span>
                </div>
                <div className="flex items-center">
                  {getStatusIcon(verificationResults.authentication)}
                  <span className={`ml-2 text-sm font-medium ${getStatusColor(verificationResults.authentication)}`}>
                    {getStatusText(verificationResults.authentication)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Database className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">API Access</span>
                </div>
                <div className="flex items-center">
                  {getStatusIcon(verificationResults.apiAccess)}
                  <span className={`ml-2 text-sm font-medium ${getStatusColor(verificationResults.apiAccess)}`}>
                    {getStatusText(verificationResults.apiAccess)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FolderOpen className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Project Access</span>
                </div>
                <div className="flex items-center">
                  {getStatusIcon(verificationResults.projectAccess)}
                  <span className={`ml-2 text-sm font-medium ${getStatusColor(verificationResults.projectAccess)}`}>
                    {getStatusText(verificationResults.projectAccess)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Settings className="h-5 w-5 text-orange-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Permissions</span>
                </div>
                <div className="flex items-center">
                  {getStatusIcon(verificationResults.permissions)}
                  <span className={`ml-2 text-sm font-medium ${getStatusColor(verificationResults.permissions)}`}>
                    {getStatusText(verificationResults.permissions)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {verificationResults.recommendations && verificationResults.recommendations.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-yellow-800 mb-2">Setup Recommendations</h3>
                  <div className="text-sm text-yellow-700 space-y-1">
                    {verificationResults.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start">
                        <span className="mr-2">{rec.startsWith('❌') ? '❌' : rec.startsWith('🔧') ? '🔧' : rec.startsWith('📚') ? '📚' : '•'}</span>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-3">Quick Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <a
                href="https://developer.autodesk.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                APS Developer Portal
              </a>
              <a
                href="https://get-started.aps.autodesk.com/learn-more/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                APS Learning Resources
              </a>
              <a
                href="https://github.com/autodesk-platform-services"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                APS GitHub Samples
              </a>
              <a
                href="https://aps.autodesk.com/blog/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                APS Blog
              </a>
            </div>
          </div>

          {/* Overall Status */}
          <div className={`rounded-lg p-4 ${
            verificationResults.authentication && 
            verificationResults.apiAccess && 
            verificationResults.projectAccess && 
            verificationResults.permissions
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              {verificationResults.authentication && 
               verificationResults.apiAccess && 
               verificationResults.projectAccess && 
               verificationResults.permissions ? (
                <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 mr-3" />
              )}
              <div>
                <h3 className={`text-lg font-medium ${
                  verificationResults.authentication && 
                  verificationResults.apiAccess && 
                  verificationResults.projectAccess && 
                  verificationResults.permissions
                    ? 'text-green-800' 
                    : 'text-red-800'
                }`}>
                  {verificationResults.authentication && 
                   verificationResults.apiAccess && 
                   verificationResults.projectAccess && 
                   verificationResults.permissions
                    ? 'All checks passed! Your APS setup is working correctly.'
                    : 'Some checks failed. Please review the recommendations above.'}
                </h3>
                <p className={`text-sm ${
                  verificationResults.authentication && 
                  verificationResults.apiAccess && 
                  verificationResults.projectAccess && 
                  verificationResults.permissions
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {verificationResults.authentication && 
                   verificationResults.apiAccess && 
                   verificationResults.projectAccess && 
                   verificationResults.permissions
                    ? 'You can now access ACC project files and folders.'
                    : 'Please fix the issues above to enable full functionality.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApsSetupVerificationComponent;
