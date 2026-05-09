import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Copy, 
  RefreshCw,
  Database,
  Folder,
  File,
  Settings,
  Zap,
  Target,
  Loader2,
  X
} from 'lucide-react';
import AccService from '../services/AccService_old';

/**
 * ACC API Debugger Component
 * Tests different ID formats and API endpoints to find working combinations
 */
const AccApiDebugger = ({ 
  isOpen, 
  onClose, 
  projectId, 
  hubId,
  onWorkingConfigFound
}) => {
  const [debugResults, setDebugResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');
  const [workingConfig, setWorkingConfig] = useState(null);
  const [testConfigs, setTestConfigs] = useState([]);
  const [diagnostics, setDiagnostics] = useState({
    authentication: null,
    hubAccess: null,
    projectExists: null,
    permissions: null,
    recommendations: []
  });

  // Run comprehensive diagnostics
  const runDiagnostics = async () => {
    const newDiagnostics = {
      authentication: null,
      hubAccess: null,
      projectExists: null,
      permissions: null,
      recommendations: []
    };

    try {
      // Test 1: Authentication
      console.log('🔐 Testing authentication...');
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (credentials.threeLegToken) {
        newDiagnostics.authentication = {
          status: 'success',
          message: '3-legged token available',
          tokenType: '3-legged'
        };
      } else if (credentials.twoLegToken) {
        newDiagnostics.authentication = {
          status: 'success',
          message: '2-legged token available',
          tokenType: '2-legged'
        };
      } else {
        newDiagnostics.authentication = {
          status: 'error',
          message: 'No access token found',
          tokenType: 'none'
        };
        newDiagnostics.recommendations.push('🔐 Re-authenticate to get a valid access token');
      }

      // Test 2: Hub Access
      console.log('🏢 Testing hub access...');
      try {
        const hubs = await AccService.getHubs();
        if (hubs && hubs.length > 0) {
          newDiagnostics.hubAccess = {
            status: 'success',
            message: `Access to ${hubs.length} hub(s)`,
            hubs: hubs.map(h => ({ id: h.id, name: h.attributes?.name }))
          };
        } else {
          newDiagnostics.hubAccess = {
            status: 'warning',
            message: 'No hubs accessible',
            hubs: []
          };
          newDiagnostics.recommendations.push('🏢 Check hub permissions and access rights');
        }
      } catch (error) {
        newDiagnostics.hubAccess = {
          status: 'error',
          message: `Hub access failed: ${error.message}`,
          hubs: []
        };
        newDiagnostics.recommendations.push('🏢 Verify hub access permissions');
      }

      // Test 3: Project Existence
      console.log('📋 Testing project existence...');
      try {
        // Try to get project details using hub context
        if (hubId) {
          const projectUrl = `https://developer.api.autodesk.com/project/v1/hubs/${hubId}/projects/${projectId}`;
          const response = await fetch(projectUrl, {
            method: 'GET',
            headers: AccService.getHeaders()
          });
          
          if (response.ok) {
            newDiagnostics.projectExists = {
              status: 'success',
              message: 'Project found in hub',
              projectId,
              hubId
            };
          } else if (response.status === 404) {
            newDiagnostics.projectExists = {
              status: 'error',
              message: 'Project not found in specified hub',
              projectId,
              hubId
            };
            newDiagnostics.recommendations.push('📋 Verify project ID and hub ID are correct');
            newDiagnostics.recommendations.push('📋 Check if project exists in a different hub');
          } else {
            newDiagnostics.projectExists = {
              status: 'error',
              message: `Project access failed: ${response.status}`,
              projectId,
              hubId
            };
            newDiagnostics.recommendations.push('📋 Check project permissions and access rights');
          }
        } else {
          newDiagnostics.projectExists = {
            status: 'warning',
            message: 'No hub ID provided for project lookup',
            projectId,
            hubId: null
          };
          newDiagnostics.recommendations.push('📋 Provide hub ID for project verification');
        }
      } catch (error) {
        newDiagnostics.projectExists = {
          status: 'error',
          message: `Project check failed: ${error.message}`,
          projectId,
          hubId
        };
      }

      // Test 4: Permissions
      console.log('🔑 Testing permissions...');
      try {
        const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/commands`, {
          method: 'POST',
          headers: {
            ...AccService.getHeaders(),
            'Content-Type': 'application/vnd.api+json'
          },
          body: JSON.stringify({
            jsonapi: { version: '1.0' },
            data: {
              type: 'commands',
              attributes: {
                command: 'ListItems'
              }
            }
          })
        });

        if (response.ok) {
          newDiagnostics.permissions = {
            status: 'success',
            message: 'Commands API accessible',
            canExecuteCommands: true
          };
        } else if (response.status === 403) {
          newDiagnostics.permissions = {
            status: 'error',
            message: 'Insufficient permissions for commands',
            canExecuteCommands: false
          };
          newDiagnostics.recommendations.push('🔑 Check Data Management API permissions');
        } else {
          newDiagnostics.permissions = {
            status: 'error',
            message: `Permissions check failed: ${response.status}`,
            canExecuteCommands: false
          };
          newDiagnostics.recommendations.push('🔑 Verify API permissions and scopes');
        }
      } catch (error) {
        newDiagnostics.permissions = {
          status: 'error',
          message: `Permissions check failed: ${error.message}`,
          canExecuteCommands: false
        };
      }

      setDiagnostics(newDiagnostics);
    } catch (error) {
      console.error('❌ Diagnostics failed:', error);
    }
  };

  // Try alternative approaches when standard methods fail
  const tryAlternativeApproaches = async () => {
    console.log('🔄 Trying alternative approaches...');
    const alternatives = [];

    try {
      // Approach 1: Try to get all projects from all hubs
      const hubs = await AccService.getHubs();
      for (const hub of hubs) {
        try {
          const projects = await AccService.getProjects(hub.id);
          for (const project of projects) {
            if (project.id === projectId || project.id.includes(projectId.replace('b.', ''))) {
              alternatives.push({
                type: 'Found in different hub',
                message: `Project found in hub: ${hub.attributes?.name || hub.id}`,
                hubId: hub.id,
                projectId: project.id,
                success: true
              });
            }
          }
        } catch (error) {
          console.log(`⚠️ Could not get projects from hub ${hub.id}:`, error.message);
        }
      }
    } catch (error) {
      console.log('⚠️ Could not get hubs:', error.message);
    }

    // Approach 2: Try different project ID variations
    const variations = generateIdVariations(projectId);
    for (const variation of variations) {
      try {
        const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${variation.id}/commands`, {
          method: 'POST',
          headers: {
            ...AccService.getHeaders(),
            'Content-Type': 'application/vnd.api+json'
          },
          body: JSON.stringify({
            jsonapi: { version: '1.0' },
            data: {
              type: 'commands',
              attributes: {
                command: 'ListItems'
              }
            }
          })
        });

        if (response.ok) {
          alternatives.push({
            type: 'Working ID format',
            message: `ID format "${variation.type}" works for commands`,
            projectId: variation.id,
            success: true
          });
        }
      } catch (error) {
        // Ignore errors for alternative approaches
      }
    }

    return alternatives;
  };

  // Generate different ID format variations
  const generateIdVariations = (originalId) => {
    if (!originalId) return [];
    
    const variations = [];
    
    // Original ID
    variations.push({
      id: originalId,
      type: 'Original',
      description: 'As provided'
    });
    
    // Remove prefixes
    if (originalId.startsWith('b.')) {
      variations.push({
        id: originalId.substring(2),
        type: 'Without b. prefix',
        description: 'Removed b. prefix'
      });
    }
    
    // Add different prefixes
    variations.push({
      id: `urn:adsk.dtm:${originalId}`,
      type: 'URN format',
      description: 'URN format with adsk.dtm'
    });
    
    variations.push({
      id: `urn:adsk.dtm:Project:${originalId}`,
      type: 'URN Project',
      description: 'URN format with Project type'
    });
    
    // URL encoded
    variations.push({
      id: encodeURIComponent(originalId),
      type: 'URL Encoded',
      description: 'URL encoded version'
    });
    
    // Base64 encoded (if it looks like base64)
    if (originalId.includes('-') && originalId.length > 20) {
      try {
        const base64 = btoa(originalId);
        variations.push({
          id: base64,
          type: 'Base64 Encoded',
          description: 'Base64 encoded version'
        });
      } catch (e) {
        // Skip if not encodable
      }
    }
    
    return variations;
  };

  // Generate test configurations
  const generateTestConfigs = () => {
    const configs = [];
    
    // Test different API endpoints
    const endpoints = [
      {
        name: 'Project Service - Project Details',
        method: 'GET',
        url: (projectId) => `https://developer.api.autodesk.com/project/v1/projects/${projectId}`,
        description: 'Get project details from Project service'
      },
      {
        name: 'Data Service - Project Files',
        method: 'GET', 
        url: (projectId) => `https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders`,
        description: 'Get project folders from Data service'
      },
      {
        name: 'Data Service - Root Folder Contents',
        method: 'GET',
        url: (projectId) => `https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/root/contents`,
        description: 'Get root folder contents'
      },
      {
        name: 'Data Service - Project Storage',
        method: 'GET',
        url: (projectId) => `https://developer.api.autodesk.com/data/v1/projects/${projectId}/storage`,
        description: 'Get project storage information'
      },
      {
        name: 'Data Service - Commands - Check Permissions',
        method: 'POST',
        url: (projectId) => `https://developer.api.autodesk.com/data/v1/projects/${projectId}/commands`,
        description: 'Check permissions using commands',
        isCommand: true,
        command: 'CheckPermission'
      },
      {
        name: 'Data Service - Commands - List Relationships',
        method: 'POST',
        url: (projectId) => `https://developer.api.autodesk.com/data/v1/projects/${projectId}/commands`,
        description: 'List relationships using commands',
        isCommand: true,
        command: 'ListRefs'
      },
      {
        name: 'Data Service - Commands - List Items',
        method: 'POST',
        url: (projectId) => `https://developer.api.autodesk.com/data/v1/projects/${projectId}/commands`,
        description: 'List items metadata using commands',
        isCommand: true,
        command: 'ListItems'
      }
    ];

    // Test with different project ID formats
    const projectVariations = generateIdVariations(projectId);
    const hubVariations = generateIdVariations(hubId);

    // Create test matrix
    projectVariations.forEach(projectVar => {
      endpoints.forEach(endpoint => {
        configs.push({
          id: `${endpoint.name}-${projectVar.type}`,
          name: `${endpoint.name} (${projectVar.type})`,
          description: `${endpoint.description} using ${projectVar.description}`,
          endpoint: endpoint,
          projectId: projectVar.id,
          projectType: projectVar.type,
          hubId: hubId,
          expectedSuccess: endpoint.name.includes('Project Details') || endpoint.name.includes('Root Folder')
        });
      });
    });

    // Test with hub ID as project ID (sometimes they're interchangeable)
    if (hubId && hubId !== projectId) {
      const hubVariations = generateIdVariations(hubId);
      hubVariations.forEach(hubVar => {
        endpoints.forEach(endpoint => {
          configs.push({
            id: `${endpoint.name}-Hub-${hubVar.type}`,
            name: `${endpoint.name} (Hub as Project - ${hubVar.type})`,
            description: `${endpoint.description} using Hub ID as Project ID`,
            endpoint: endpoint,
            projectId: hubVar.id,
            projectType: `Hub-${hubVar.type}`,
            hubId: hubId,
            expectedSuccess: false // Less likely to succeed
          });
        });
      });
    }

    return configs;
  };

  // Run a single test
  const runTest = async (config) => {
    const startTime = Date.now();
    let result = {
      config,
      status: 'running',
      response: null,
      error: null,
      duration: 0,
      success: false,
      data: null
    };

    try {
      console.log(`🧪 Testing: ${config.name}`);
      console.log(`🔗 URL: ${config.endpoint.url(config.projectId)}`);
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('No 3-legged token available');
      }

      let response;
      
      // Handle command tests differently
      if (config.endpoint.isCommand) {
        console.log(`🔧 Executing command: ${config.endpoint.command}`);
        
        // Use AccService command methods
        let commandResult;
        switch (config.endpoint.command) {
          case 'CheckPermission':
            commandResult = await AccService.checkPermissions(config.projectId, [{
              type: 'projects',
              id: config.projectId
            }]);
            break;
          case 'ListRefs':
            commandResult = await AccService.listRefs(config.projectId, [{
              type: 'projects',
              id: config.projectId
            }]);
            break;
          case 'ListItems':
            // Try to get some items first
            const projectFiles = await AccService.getProjectFiles(config.projectId);
            if (projectFiles && projectFiles.length > 0) {
              const itemIds = projectFiles.filter(item => item.type === 'file').slice(0, 3).map(item => item.id);
              if (itemIds.length > 0) {
                commandResult = await AccService.listItems(config.projectId, itemIds);
              } else {
                commandResult = { message: 'No items found to test' };
              }
            } else {
              commandResult = { message: 'No files found in project' };
            }
            break;
          default:
            throw new Error(`Unknown command: ${config.endpoint.command}`);
        }
        
        result = {
          ...result,
          status: commandResult ? 'success' : 'error',
          response: {
            status: commandResult ? 200 : 400,
            statusText: commandResult ? 'OK' : 'Command Failed'
          },
          duration: Date.now() - startTime,
          success: !!commandResult,
          data: commandResult
        };
        
      } else {
        // Handle regular API tests
        response = await fetch(config.endpoint.url(config.projectId), {
          method: config.endpoint.method,
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.api+json'
          }
        });

        const duration = Date.now() - startTime;
        const responseText = await response.text();
        
        result = {
          ...result,
          status: response.ok ? 'success' : 'error',
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
          },
          duration,
          success: response.ok,
          data: response.ok ? (responseText ? JSON.parse(responseText) : null) : null
        };

        // If successful, extract useful information
        if (response.ok && result.data) {
          if (result.data.data) {
            result.extractedInfo = {
              type: result.data.data.type,
              id: result.data.data.id,
              attributes: result.data.data.attributes
            };
          }
          
          if (result.data.links) {
            result.links = result.data.links;
          }
        }
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      result = {
        ...result,
        status: 'error',
        error: error.message,
        duration,
        success: false
      };
    }

    return result;
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    setDebugResults([]);
    setWorkingConfig(null);
    setCurrentTest('Running diagnostics...');
    
    // First run comprehensive diagnostics
    await runDiagnostics();
    
    // Try alternative approaches if diagnostics show issues
    setCurrentTest('Trying alternative approaches...');
    const alternatives = await tryAlternativeApproaches();
    if (alternatives.length > 0) {
      console.log('🔄 Found alternative approaches:', alternatives);
    }
    
    setCurrentTest('Initializing tests...');
    const configs = generateTestConfigs();
    setTestConfigs(configs);
    
    console.log(`🧪 Running ${configs.length} API tests...`);
    
    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      setCurrentTest(config.name);
      
      const result = await runTest(config);
      
      setDebugResults(prev => [...prev, result]);
      
      // If this is a successful test that can help us get folders, mark it as working
      if (result.success && (
        result.data?.data?.relationships?.rootFolder ||
        result.data?.data?.type === 'folders' ||
        result.data?.data?.type === 'items' ||
        result.links?.self?.href
      )) {
        setWorkingConfig(result);
        console.log('✅ Found working configuration:', result.config);
      }
      
      // Small delay to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setIsRunning(false);
    setCurrentTest('');
  };

  // Apply working configuration
  const applyWorkingConfig = () => {
    if (workingConfig && onWorkingConfigFound) {
      onWorkingConfigFound(workingConfig);
      onClose();
    }
  };

  // Copy result to clipboard
  const copyResult = (result) => {
    const resultText = JSON.stringify({
      config: result.config,
      success: result.success,
      status: result.response?.status,
      data: result.data
    }, null, 2);
    
    navigator.clipboard.writeText(resultText);
  };

  const getStatusIcon = (result) => {
    if (result.status === 'running') return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    if (result.success) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (result.response?.status === 404) return <XCircle className="w-4 h-4 text-red-500" />;
    if (result.response?.status === 403) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getStatusColor = (result) => {
    if (result.status === 'running') return 'bg-blue-50 border-blue-200';
    if (result.success) return 'bg-green-50 border-green-200';
    if (result.response?.status === 404) return 'bg-red-50 border-red-200';
    if (result.response?.status === 403) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-5/6 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <Zap className="w-6 h-6 text-indigo-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">ACC API Debugger</h3>
              <p className="text-sm text-gray-500">
                Testing different ID formats and API endpoints
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Current Test Status */}
        {isRunning && (
          <div className="p-4 bg-blue-50 border-b">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-blue-800">
                Currently testing: <strong>{currentTest}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Working Configuration Alert */}
        {workingConfig && (
          <div className="p-4 bg-green-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  ✅ Found working configuration: {workingConfig.config.name}
                </span>
              </div>
              <button
                onClick={applyWorkingConfig}
                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              >
                Apply This Config
              </button>
            </div>
          </div>
        )}

        {/* Diagnostics Section */}
        {(diagnostics.authentication || diagnostics.hubAccess || diagnostics.projectExists || diagnostics.permissions) && (
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-indigo-600" />
              System Diagnostics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Authentication Status */}
              {diagnostics.authentication && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    {diagnostics.authentication.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 mr-2" />
                    )}
                    <span className="font-medium">Authentication</span>
                  </div>
                  <p className="text-sm text-gray-600">{diagnostics.authentication.message}</p>
                </div>
              )}

              {/* Hub Access Status */}
              {diagnostics.hubAccess && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    {diagnostics.hubAccess.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    ) : diagnostics.hubAccess.status === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 mr-2" />
                    )}
                    <span className="font-medium">Hub Access</span>
                  </div>
                  <p className="text-sm text-gray-600">{diagnostics.hubAccess.message}</p>
                  {diagnostics.hubAccess.hubs && diagnostics.hubAccess.hubs.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Available Hubs:</p>
                      {diagnostics.hubAccess.hubs.map((hub, index) => (
                        <div key={index} className="text-xs text-gray-600 ml-2">
                          • {hub.name || hub.id}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Project Existence Status */}
              {diagnostics.projectExists && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    {diagnostics.projectExists.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    ) : diagnostics.projectExists.status === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 mr-2" />
                    )}
                    <span className="font-medium">Project Access</span>
                  </div>
                  <p className="text-sm text-gray-600">{diagnostics.projectExists.message}</p>
                </div>
              )}

              {/* Permissions Status */}
              {diagnostics.permissions && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    {diagnostics.permissions.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 mr-2" />
                    )}
                    <span className="font-medium">API Permissions</span>
                  </div>
                  <p className="text-sm text-gray-600">{diagnostics.permissions.message}</p>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {diagnostics.recommendations && diagnostics.recommendations.length > 0 && (
              <div className="mt-4 bg-blue-50 rounded-lg p-3">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                  <Info className="w-4 h-4 mr-2" />
                  Recommendations
                </h4>
                <ul className="space-y-1">
                  {diagnostics.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-blue-800">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Test Results */}
        <div className="flex-1 overflow-auto p-4">
          {debugResults.length === 0 && !isRunning ? (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No tests run yet</p>
              <p className="text-sm">Click "Run All Tests" to start debugging</p>
            </div>
          ) : (
            <div className="space-y-3">
              {debugResults.map((result, index) => (
                <motion.div
                  key={result.config.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded-lg p-4 ${getStatusColor(result)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(result)}
                      <div>
                        <h4 className="font-medium text-gray-900">{result.config.name}</h4>
                        <p className="text-sm text-gray-600">{result.config.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {result.duration}ms
                      </span>
                      <button
                        onClick={() => copyResult(result)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Copy result"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div><strong>Project ID:</strong> {result.config.projectId}</div>
                    <div><strong>URL:</strong> {result.config.endpoint.url(result.config.projectId)}</div>
                    {result.response && (
                      <div><strong>Status:</strong> {result.response.status} {result.response.statusText}</div>
                    )}
                    {result.error && (
                      <div><strong>Error:</strong> {result.error}</div>
                    )}
                    {result.extractedInfo && (
                      <div><strong>Extracted Info:</strong> {JSON.stringify(result.extractedInfo, null, 2)}</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {debugResults.length} test{debugResults.length !== 1 ? 's' : ''} completed
            {workingConfig && ' • Working configuration found!'}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AccApiDebugger;
