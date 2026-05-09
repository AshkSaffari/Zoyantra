import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Users, Globe, Database } from 'lucide-react';
import AccService from '../services/AccService';

const MemberDebugPanel = ({ selectedHub, selectedProject, credentials }) => {
  const [debugResults, setDebugResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const runMemberDebug = async () => {
    if (!selectedHub || !selectedProject) {
      setError('Please select both a hub and project first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setDebugResults(null);

    try {
      const results = {
        hub: {
          id: selectedHub.id,
          name: selectedHub.name,
          region: selectedHub.region || 'Unknown'
        },
        project: {
          id: selectedProject.id,
          name: selectedProject.name
        },
        tests: []
      };

      // Test 1: Account Users API (HQ API)
      try {
        console.log('🔍 Testing Account Users API...');
        const accountId = selectedHub.id.replace(/^a\./, '');
        const accountUsers = await AccService.getAccountUsers(accountId);
        results.tests.push({
          name: 'Account Users API (HQ)',
          endpoint: `GET /hq/v1/accounts/${accountId}/users`,
          status: 'success',
          count: accountUsers.length,
          data: accountUsers.slice(0, 3), // First 3 users
          error: null
        });
      } catch (err) {
        results.tests.push({
          name: 'Account Users API (HQ)',
          endpoint: `GET /hq/v1/accounts/${selectedHub.id.replace(/^a\./, '')}/users`,
          status: 'error',
          count: 0,
          data: null,
          error: err.message
        });
      }

      // Test 2: Project Users API (Admin API)
      try {
        console.log('🔍 Testing Project Users API...');
        const projectId = selectedProject.id.replace(/^b\./, '');
        const projectUsers = await AccService.getProjectUsersAdmin(selectedProject.id, selectedHub.id);
        results.tests.push({
          name: 'Project Users API (Admin)',
          endpoint: `GET /construction/admin/v1/projects/${projectId}/users`,
          status: 'success',
          count: projectUsers.length,
          data: projectUsers.slice(0, 3), // First 3 users
          error: null
        });
      } catch (err) {
        results.tests.push({
          name: 'Project Users API (Admin)',
          endpoint: `GET /construction/admin/v1/projects/${selectedProject.id.replace(/^b\./, '')}/users`,
          status: 'error',
          count: 0,
          data: null,
          error: err.message
        });
      }

      // Test 3: Reliable Method
      try {
        console.log('🔍 Testing Reliable Method...');
        const reliableUsers = await AccService.getProjectUsersReliable(selectedProject.id, selectedHub.id);
        results.tests.push({
          name: 'Reliable Method',
          endpoint: 'getProjectUsersReliable()',
          status: 'success',
          count: reliableUsers.length,
          data: reliableUsers.slice(0, 3), // First 3 users
          error: null
        });
      } catch (err) {
        results.tests.push({
          name: 'Reliable Method',
          endpoint: 'getProjectUsersReliable()',
          status: 'error',
          count: 0,
          data: null,
          error: err.message
        });
      }

      // Test 4: Check OAuth Scopes
      try {
        const token = credentials?.threeLegToken;
        if (token) {
          const decoded = JSON.parse(atob(token.split('.')[1]));
          const scopes = decoded?.scope || '';
          results.oauth = {
            scopes: scopes,
            hasAccountRead: scopes.includes('account:read'),
            hasDataRead: scopes.includes('data:read'),
            hasCostRead: scopes.includes('cost:read')
          };
        } else {
          results.oauth = {
            scopes: 'No token available',
            hasAccountRead: false,
            hasDataRead: false,
            hasCostRead: false
          };
        }
      } catch (err) {
        results.oauth = {
          scopes: 'Error decoding token',
          hasAccountRead: false,
          hasDataRead: false,
          hasCostRead: false
        };
      }

      // Test 5: Region Detection
      results.region = {
        hubRegion: selectedHub.region || 'Unknown',
        detectedRegion: selectedHub.id.includes('eu') ? 'EMEA' : 'US',
        apiEndpoints: {
          us: 'https://developer.api.autodesk.com',
          emea: 'https://developer.api.autodesk.com'
        }
      };

      setDebugResults(results);
    } catch (err) {
      setError(`Debug failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'success') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-600" />;
    return <RefreshCw className="w-4 h-4 text-yellow-600" />;
  };

  const getStatusColor = (status) => {
    if (status === 'success') return 'text-green-600 bg-green-50';
    if (status === 'error') return 'text-red-600 bg-red-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Member Fetching Debug Panel</h3>
        </div>
        <button
          onClick={runMemberDebug}
          disabled={isLoading || !selectedHub || !selectedProject}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Run Debug
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {debugResults && (
        <div className="space-y-6">
          {/* Hub & Project Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Hub Information</h4>
              <div className="space-y-1 text-sm">
                <p><strong>ID:</strong> {debugResults.hub.id}</p>
                <p><strong>Name:</strong> {debugResults.hub.name}</p>
                <p><strong>Region:</strong> {debugResults.hub.region}</p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Project Information</h4>
              <div className="space-y-1 text-sm">
                <p><strong>ID:</strong> {debugResults.project.id}</p>
                <p><strong>Name:</strong> {debugResults.project.name}</p>
                <p><strong>Raw ID:</strong> {debugResults.project.id.replace(/^b\./, '')}</p>
              </div>
            </div>
          </div>

          {/* OAuth Scopes */}
          {debugResults.oauth && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">OAuth Scopes</h4>
              <div className="space-y-2">
                <p className="text-sm"><strong>Scopes:</strong> {debugResults.oauth.scopes}</p>
                <div className="flex gap-4">
                  <span className={`px-2 py-1 rounded text-xs ${debugResults.oauth.hasAccountRead ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    account:read {debugResults.oauth.hasAccountRead ? '✓' : '✗'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${debugResults.oauth.hasDataRead ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    data:read {debugResults.oauth.hasDataRead ? '✓' : '✗'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${debugResults.oauth.hasCostRead ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    cost:read {debugResults.oauth.hasCostRead ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* API Test Results */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">API Test Results</h4>
            {debugResults.tests.map((test, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(test.status)}
                    <span className="font-medium">{test.name}</span>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(test.status)}`}>
                      {test.status.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {test.count} users found
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Endpoint:</strong> {test.endpoint}
                </p>
                {test.error && (
                  <p className="text-sm text-red-600 mb-2">
                    <strong>Error:</strong> {test.error}
                  </p>
                )}
                {test.data && test.data.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-700 mb-1">Sample Users:</p>
                    <div className="space-y-1">
                      {test.data.map((user, userIndex) => (
                        <div key={userIndex} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <p><strong>Name:</strong> {user.name || user.firstName + ' ' + user.lastName || 'Unknown'}</p>
                          <p><strong>Email:</strong> {user.email || 'No email'}</p>
                          <p><strong>ID:</strong> {user.id}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Recommendations */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Recommendations</h4>
            <ul className="text-sm space-y-1">
              {debugResults.oauth && !debugResults.oauth.hasAccountRead && (
                <li className="text-red-600">• Add 'account:read' scope to OAuth flow</li>
              )}
              {debugResults.tests.every(test => test.status === 'error') && (
                <li className="text-red-600">• All API methods failed - check token validity and region</li>
              )}
              {debugResults.tests.some(test => test.status === 'success') && (
                <li className="text-green-600">• Some methods work - use the successful method</li>
              )}
              <li className="text-gray-600">• Ensure hub ID has 'a.' prefix for account APIs</li>
              <li className="text-gray-600">• Ensure project ID has 'b.' prefix for project APIs</li>
              <li className="text-gray-600">• Check if region is US or EMEA and use correct endpoints</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberDebugPanel;
