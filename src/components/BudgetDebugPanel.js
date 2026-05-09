/**
 * Budget Debug Panel
 * Comprehensive debugging tool for ACC budget loading issues
 */

import React, { useState, useEffect } from 'react';
import { Bug, RefreshCw, AlertCircle, CheckCircle, XCircle, Eye, Copy } from 'lucide-react';
import DebugBudgetService from '../services/DebugBudgetService';

const BudgetDebugPanel = ({ selectedProject, selectedHub, credentials }) => {
  const [debugService, setDebugService] = useState(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugResult, setDebugResult] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (credentials) {
      const service = new DebugBudgetService();
      service.initialize(credentials);
      setDebugService(service);
    }
  }, [credentials]);

  const runDebug = async () => {
    if (!debugService || !selectedProject) return;

    setIsDebugging(true);
    setDebugResult(null);

    try {
      console.log('🔍 Starting budget debug session...');
      const result = await debugService.debugLoadBudgets(selectedProject.id, selectedHub?.id);
      setDebugResult(result);
      console.log('🔍 Debug result:', result);
    } catch (error) {
      console.error('❌ Debug failed:', error);
      setDebugResult({
        success: false,
        error: error.message,
        debugInfo: { logs: debugService.getDebugLogs() }
      });
    } finally {
      setIsDebugging(false);
    }
  };

  const copyDebugInfo = () => {
    if (!debugResult) return;
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      project: selectedProject,
      hub: selectedHub,
      result: debugResult
    };
    
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusIcon = (success) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getStatusColor = (success) => {
    return success ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100';
  };

  if (!selectedProject) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="text-center text-gray-500">
          <Bug className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>Select a project to start debugging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bug className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Budget Debug Panel</h3>
              <p className="text-sm text-gray-600">
                Project: {selectedProject.name} ({selectedProject.id})
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showLogs ? 'Hide' : 'Show'} Logs
            </button>
            <button
              onClick={runDebug}
              disabled={isDebugging}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isDebugging ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bug className="h-4 w-4 mr-2" />
              )}
              {isDebugging ? 'Debugging...' : 'Run Debug'}
            </button>
          </div>
        </div>
      </div>

      {/* Debug Results */}
      {debugResult && (
        <div className="space-y-4">
          {/* Summary */}
          <div className={`p-4 rounded-lg border ${getStatusColor(debugResult.success)}`}>
            <div className="flex items-center space-x-3">
              {getStatusIcon(debugResult.success)}
              <div className="flex-1">
                <h4 className="font-semibold">
                  {debugResult.success ? 'Debug Successful' : 'Debug Failed'}
                </h4>
                <p className="text-sm">
                  {debugResult.success 
                    ? `Found ${debugResult.budgets?.length || 0} budgets using ${debugResult.debugInfo?.strategies?.find(s => s.success)?.name || 'unknown'} strategy`
                    : debugResult.error || 'Unknown error occurred'
                  }
                </p>
              </div>
              <button
                onClick={copyDebugInfo}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? 'Copied!' : 'Copy Debug Info'}
              </button>
            </div>
          </div>

          {/* Strategy Results */}
          {debugResult.debugInfo?.strategies && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-4 py-3 border-b border-gray-200">
                <h4 className="font-semibold text-gray-900">Strategy Results</h4>
              </div>
              <div className="divide-y divide-gray-200">
                {debugResult.debugInfo.strategies.map((strategy, index) => (
                  <div key={index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(strategy.success)}
                        <div>
                          <h5 className="font-medium text-gray-900">{strategy.name}</h5>
                          <p className="text-sm text-gray-600">
                            {strategy.success 
                              ? `Found ${strategy.count} budgets`
                              : strategy.error
                            }
                          </p>
                        </div>
                      </div>
                      {strategy.success && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {strategy.count} budgets
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Project Details */}
          {debugResult.debugInfo?.projectDetails && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-4 py-3 border-b border-gray-200">
                <h4 className="font-semibold text-gray-900">Project Details</h4>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Source:</span>
                    <span className="ml-2 text-gray-900">
                      {debugResult.debugInfo.projectDetails.source}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Platform:</span>
                    <span className="ml-2 text-gray-900">
                      {debugResult.debugInfo.projectDetails.data?.platform || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Type:</span>
                    <span className="ml-2 text-gray-900">
                      {debugResult.debugInfo.projectDetails.data?.type || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Status:</span>
                    <span className="ml-2 text-gray-900">
                      {debugResult.debugInfo.projectDetails.data?.status || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Debug Logs */}
          {showLogs && debugResult.debugInfo?.logs && (
            <div className="bg-gray-900 rounded-lg shadow-sm border">
              <div className="px-4 py-3 border-b border-gray-700">
                <h4 className="font-semibold text-white">Debug Logs</h4>
              </div>
              <div className="p-4">
                <pre className="text-sm text-green-400 overflow-auto max-h-64">
                  {debugResult.debugInfo.logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      <span className="text-gray-400">[{log.timestamp}]</span> {log.message}
                      {log.data && (
                        <div className="ml-4 text-yellow-400">
                          {JSON.stringify(log.data, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
          <div>
            <h4 className="font-medium text-blue-800">Debug Instructions</h4>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Click "Run Debug" to test all budget loading strategies</li>
              <li>• Check the strategy results to see which approach works</li>
              <li>• Review project details to verify API access</li>
              <li>• Use "Copy Debug Info" to share results for troubleshooting</li>
              <li>• Enable "Show Logs" to see detailed debugging information</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetDebugPanel;
