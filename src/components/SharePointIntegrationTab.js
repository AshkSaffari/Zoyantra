import React, { useState, useEffect, useCallback } from 'react';
import AccService from '../services/AccService_old';
import WebhookCallbackHandler from './WebhookCallbackHandler';

const SharePointIntegrationTab = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [webhooks, setWebhooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [ngrokUrl, setNgrokUrl] = useState('');
  const [localServerStatus, setLocalServerStatus] = useState('stopped');
  const [syncStatus, setSyncStatus] = useState({});
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [sharePointConfig, setSharePointConfig] = useState({
    siteUrl: '',
    listName: '',
    tenantId: '',
    clientId: '',
    clientSecret: ''
  });

  // Load existing webhooks on component mount
  useEffect(() => {
    loadWebhooks();
  }, [selectedProject]);

  const loadWebhooks = async () => {
    if (!selectedProject) return;
    
    try {
      setIsLoading(true);
      const webhookList = await AccService.getWebhooks();
      setWebhooks(webhookList);
    } catch (error) {
      console.error('Error loading webhooks:', error);
      setError('Failed to load webhooks');
    } finally {
      setIsLoading(false);
    }
  };

  const startLocalServer = () => {
    setLocalServerStatus('starting');
    // In a real implementation, this would start a local server
    // For now, we'll simulate it
    setTimeout(() => {
      setLocalServerStatus('running');
      setSuccess('Local server started successfully');
    }, 2000);
  };

  const stopLocalServer = () => {
    setLocalServerStatus('stopped');
    setSuccess('Local server stopped');
  };

  const setupNgrok = () => {
    // In a real implementation, this would configure ngrok
    const mockNgrokUrl = `https://${Math.random().toString(36).substr(2, 9)}.ngrok.io`;
    setNgrokUrl(mockNgrokUrl);
    setSuccess('Ngrok configured successfully');
  };

  const createDataManagementWebhook = async () => {
    if (!selectedProject || !ngrokUrl) {
      setError('Please select a project and configure ngrok URL');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get project root folder for webhook scope
      const projectFolders = await AccService.getProjectRootFolder(selectedProject.id);
      const rootFolderUrn = projectFolders?.data?.id;

      if (!rootFolderUrn) {
        throw new Error('Could not find project root folder');
      }

      // Create webhook for file uploads
      const webhookResult = await AccService.createDataManagementWebhook(
        'dm.version.added',
        rootFolderUrn,
        `${ngrokUrl}/webhook/acc-file-upload`,
        {
          projectId: selectedProject.id,
          projectName: selectedProject.name,
          integrationType: 'sharepoint-sync'
        },
        "$[?(@.ext=='docx' || @.ext=='xlsx' || @.ext=='pptx' || @.ext=='pdf')]" // Office files
      );

      if (webhookResult.success) {
        setSuccess('Data Management webhook created successfully');
        addWebhookLog('Data Management webhook created', 'success');
        await loadWebhooks();
      } else {
        throw new Error(webhookResult.error || 'Failed to create webhook');
      }
    } catch (error) {
      console.error('Error creating Data Management webhook:', error);
      setError(`Failed to create webhook: ${error.message}`);
      addWebhookLog(`Webhook creation failed: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const createCostManagementWebhook = async () => {
    if (!selectedProject || !ngrokUrl) {
      setError('Please select a project and configure ngrok URL');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create webhook for cost management events
      const webhookResult = await AccService.createCostManagementWebhook(
        'budget.*',
        selectedProject.id,
        `${ngrokUrl}/webhook/acc-cost-update`,
        {
          projectId: selectedProject.id,
          projectName: selectedProject.name,
          integrationType: 'sharepoint-sync'
        }
      );

      if (webhookResult.success) {
        setSuccess('Cost Management webhook created successfully');
        addWebhookLog('Cost Management webhook created', 'success');
        await loadWebhooks();
      } else {
        throw new Error(webhookResult.error || 'Failed to create webhook');
      }
    } catch (error) {
      console.error('Error creating Cost Management webhook:', error);
      setError(`Failed to create webhook: ${error.message}`);
      addWebhookLog(`Cost webhook creation failed: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const createAutoWebhook = async () => {
    if (!selectedProject || !ngrokUrl) {
      setError('Please select a project and configure ngrok URL');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get project root folder for scope
      const projectFolders = await AccService.getProjectRootFolder(selectedProject.id);
      const rootFolderUrn = projectFolders?.data?.id;

      if (!rootFolderUrn) {
        throw new Error('Could not find project root folder');
      }

      // Create auto-detected webhook
      const webhookResult = await AccService.createWebhookAuto(
        'dm.*',
        rootFolderUrn,
        `${ngrokUrl}/webhook/acc-auto-sync`,
        {
          hookAttribute: {
            projectId: selectedProject.id,
            projectName: selectedProject.name,
            integrationType: 'sharepoint-sync',
            syncDirection: 'acc-to-sharepoint'
          },
          filter: "$[?(@.ext=='docx' || @.ext=='xlsx' || @.ext=='pptx' || @.ext=='pdf' || @.ext=='dwg' || @.ext=='rvt')]",
          scopeType: 'folder'
        }
      );

      if (webhookResult.success) {
        setSuccess('Auto webhook created successfully');
        addWebhookLog('Auto webhook created', 'success');
        await loadWebhooks();
      } else {
        throw new Error(webhookResult.error || 'Failed to create webhook');
      }
    } catch (error) {
      console.error('Error creating auto webhook:', error);
      setError(`Failed to create webhook: ${error.message}`);
      addWebhookLog(`Auto webhook creation failed: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWebhook = async (webhookId) => {
    try {
      setIsLoading(true);
      const result = await AccService.deleteWebhook(webhookId);
      
      if (result.success) {
        setSuccess('Webhook deleted successfully');
        addWebhookLog(`Webhook ${webhookId} deleted`, 'success');
        await loadWebhooks();
      } else {
        throw new Error(result.error || 'Failed to delete webhook');
      }
    } catch (error) {
      console.error('Error deleting webhook:', error);
      setError(`Failed to delete webhook: ${error.message}`);
      addWebhookLog(`Webhook deletion failed: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const addWebhookLog = (message, type = 'info') => {
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      message,
      type
    };
    setWebhookLogs(prev => [logEntry, ...prev.slice(0, 49)]); // Keep last 50 logs
  };

  const testWebhookConnection = async () => {
    if (!ngrokUrl) {
      setError('Please configure ngrok URL first');
      return;
    }

    try {
      setIsLoading(true);
      // Test webhook endpoint
      const response = await fetch(`${ngrokUrl}/webhook/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setSuccess('Webhook connection test successful');
        addWebhookLog('Webhook connection test successful', 'success');
      } else {
        throw new Error(`Test failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Webhook test failed:', error);
      setError(`Webhook test failed: ${error.message}`);
      addWebhookLog(`Webhook test failed: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const syncSharePointToACC = async () => {
    if (!sharePointConfig.siteUrl || !sharePointConfig.listName) {
      setError('Please configure SharePoint settings');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // This would integrate with SharePoint API
      // For now, we'll simulate the sync
      addWebhookLog('Starting SharePoint to ACC sync...', 'info');
      
      // Simulate sync process
      setTimeout(() => {
        setSuccess('SharePoint to ACC sync completed');
        addWebhookLog('SharePoint to ACC sync completed', 'success');
        setIsLoading(false);
      }, 3000);
      
    } catch (error) {
      console.error('SharePoint sync failed:', error);
      setError(`SharePoint sync failed: ${error.message}`);
      addWebhookLog(`SharePoint sync failed: ${error.message}`, 'error');
      setIsLoading(false);
    }
  };

  const syncACCToSharePoint = async () => {
    if (!sharePointConfig.siteUrl || !sharePointConfig.listName) {
      setError('Please configure SharePoint settings');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // This would integrate with SharePoint API
      // For now, we'll simulate the sync
      addWebhookLog('Starting ACC to SharePoint sync...', 'info');
      
      // Simulate sync process
      setTimeout(() => {
        setSuccess('ACC to SharePoint sync completed');
        addWebhookLog('ACC to SharePoint sync completed', 'success');
        setIsLoading(false);
      }, 3000);
      
    } catch (error) {
      console.error('ACC sync failed:', error);
      setError(`ACC sync failed: ${error.message}`);
      addWebhookLog(`ACC sync failed: ${error.message}`, 'error');
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            SharePoint Integration & Webhook Sync
          </h1>
          
          {/* Project Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected Project
            </label>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              {selectedProject ? (
                <div>
                  <h3 className="font-semibold text-blue-900">{selectedProject.name}</h3>
                  <p className="text-sm text-blue-700">ID: {selectedProject.id}</p>
                </div>
              ) : (
                <p className="text-blue-700">No project selected</p>
              )}
            </div>
          </div>

          {/* Local Server Configuration */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Local Server Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Ngrok Configuration</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngrok URL
                    </label>
                    <input
                      type="text"
                      value={ngrokUrl}
                      onChange={(e) => setNgrokUrl(e.target.value)}
                      placeholder="https://abc123.ngrok.io"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={setupNgrok}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Configure Ngrok
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Local Server Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      localServerStatus === 'running' ? 'bg-green-500' : 
                      localServerStatus === 'starting' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm font-medium capitalize">{localServerStatus}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={startLocalServer}
                      disabled={localServerStatus === 'running' || localServerStatus === 'starting'}
                      className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Start Server
                    </button>
                    <button
                      onClick={stopLocalServer}
                      disabled={localServerStatus === 'stopped'}
                      className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Stop Server
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Webhook Management */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Webhook Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <button
                onClick={createDataManagementWebhook}
                disabled={!selectedProject || !ngrokUrl || isLoading}
                className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Data Management Webhook
              </button>
              <button
                onClick={createCostManagementWebhook}
                disabled={!selectedProject || !ngrokUrl || isLoading}
                className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Cost Management Webhook
              </button>
              <button
                onClick={createAutoWebhook}
                disabled={!selectedProject || !ngrokUrl || isLoading}
                className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Auto Webhook
              </button>
            </div>

            <div className="mb-4">
              <button
                onClick={testWebhookConnection}
                disabled={!ngrokUrl || isLoading}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Test Webhook Connection
              </button>
            </div>

            {/* Webhooks List */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Active Webhooks</h3>
              {webhooks.length === 0 ? (
                <p className="text-gray-500">No webhooks configured</p>
              ) : (
                <div className="space-y-2">
                  {webhooks.map((webhook) => (
                    <div key={webhook.id} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{webhook.event}</p>
                          <p className="text-sm text-gray-600">{webhook.callbackUrl}</p>
                          <p className="text-xs text-gray-500">ID: {webhook.id}</p>
                        </div>
                        <button
                          onClick={() => deleteWebhook(webhook.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SharePoint Configuration */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">SharePoint Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SharePoint Site URL
                  </label>
                  <input
                    type="url"
                    value={sharePointConfig.siteUrl}
                    onChange={(e) => setSharePointConfig(prev => ({ ...prev, siteUrl: e.target.value }))}
                    placeholder="https://yourtenant.sharepoint.com/sites/yoursite"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    List Name
                  </label>
                  <input
                    type="text"
                    value={sharePointConfig.listName}
                    onChange={(e) => setSharePointConfig(prev => ({ ...prev, listName: e.target.value }))}
                    placeholder="Documents"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tenant ID
                  </label>
                  <input
                    type="text"
                    value={sharePointConfig.tenantId}
                    onChange={(e) => setSharePointConfig(prev => ({ ...prev, tenantId: e.target.value }))}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={sharePointConfig.clientId}
                    onChange={(e) => setSharePointConfig(prev => ({ ...prev, clientId: e.target.value }))}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sync Operations */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Sync Operations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={syncSharePointToACC}
                disabled={isLoading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sync SharePoint → ACC
              </button>
              <button
                onClick={syncACCToSharePoint}
                disabled={isLoading}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sync ACC → SharePoint
              </button>
            </div>
          </div>

          {/* Webhook Logs */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Webhook Logs</h2>
            <div className="bg-gray-900 text-green-400 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
              {webhookLogs.length === 0 ? (
                <p className="text-gray-500">No logs yet</p>
              ) : (
                webhookLogs.map((log) => (
                  <div key={log.id} className={`mb-1 ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    'text-blue-400'
                  }`}>
                    <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Success</h3>
                  <div className="mt-2 text-sm text-green-700">{success}</div>
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-800">Processing...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Webhook Callback Handler */}
      <div className="mt-8">
        <WebhookCallbackHandler 
          onWebhookReceived={(webhookData) => {
            console.log('Webhook received in SharePoint tab:', webhookData);
            addWebhookLog(`Webhook received: ${webhookData.type}`, 'info');
          }}
        />
      </div>
    </div>
  );
};

export default SharePointIntegrationTab;