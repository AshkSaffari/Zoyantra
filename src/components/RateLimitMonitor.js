import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Activity, 
  Zap, 
  Shield,
  Info,
  X,
  RefreshCw
} from 'lucide-react';
import { useRateLimit } from '../hooks/useRateLimit';

/**
 * Rate Limit Monitor Component
 * Displays real-time rate limiting status, warnings, and statistics
 */
const RateLimitMonitor = ({ isVisible = false, onClose }) => {
  const {
    statistics,
    warnings,
    ossStatus,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetCounters,
    formatTime
  } = useRateLimit();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTab, setSelectedTab] = useState('endpoints');

  // Auto-start monitoring when component mounts
  useEffect(() => {
    if (isVisible) {
      startMonitoring();
    }
  }, [isVisible, startMonitoring]);

  if (!isVisible) return null;

  const getStatusColor = (utilization) => {
    if (utilization >= 90) return 'text-red-600';
    if (utilization >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = (utilization) => {
    if (utilization >= 90) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (utilization >= 70) return <Clock className="h-4 w-4 text-yellow-500" />;
    return <Shield className="h-4 w-4 text-green-500" />;
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Rate Limit Monitor</h3>
            {isMonitoring && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500">Live</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-100 rounded"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              <TrendingUp className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
              title="Close"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Quick Status */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">Total Requests</span>
                <span className="text-lg font-bold text-blue-600">{statistics.totalRequests || 0}</span>
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-900">Violations</span>
                <span className="text-lg font-bold text-red-600">{statistics.violations || 0}</span>
              </div>
            </div>
          </div>

          {/* OSS Status */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">OSS Overall Limit</span>
              {getStatusIcon(ossStatus.utilization || 0)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">
                {ossStatus.current || 0} / {ossStatus.limit || 1000} requests
              </span>
              <span className={`text-xs font-medium ${getStatusColor(ossStatus.utilization || 0)}`}>
                {Math.round(ossStatus.utilization || 0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  (ossStatus.utilization || 0) >= 90 ? 'bg-red-500' :
                  (ossStatus.utilization || 0) >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(ossStatus.utilization || 0, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Rate Limit Warnings</span>
              </div>
              <div className="space-y-1">
                {warnings.slice(0, 3).map((warning, index) => (
                  <div key={index} className="text-xs text-yellow-800">
                    {warning.method} {warning.endpoint}: {warning.utilization}% utilized
                  </div>
                ))}
                {warnings.length > 3 && (
                  <div className="text-xs text-yellow-600">
                    +{warnings.length - 3} more warnings
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Expanded Details */}
          {isExpanded && (
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                {false && (
                <button
                  onClick={() => setSelectedTab('overview')}
                  className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    selectedTab === 'overview' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Overview
                </button>
                )}
                <button
                  onClick={() => setSelectedTab('endpoints')}
                  className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    selectedTab === 'endpoints' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Endpoints
                </button>
                <button
                  onClick={() => setSelectedTab('violations')}
                  className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    selectedTab === 'violations' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Violations
                </button>
              </div>

              {/* Tab Content */}
              {false && selectedTab === 'overview' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-green-900 mb-1">Available</div>
                      <div className="text-lg font-bold text-green-600">
                        {ossStatus.limit - ossStatus.current || 0}
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-blue-900 mb-1">Time Until Reset</div>
                      <div className="text-lg font-bold text-blue-600">
                        {formatTime(ossStatus.timeUntilReset || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === 'endpoints' && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(statistics.endpoints || {}).map(([key, endpoint]) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-900">
                          {endpoint.method} {endpoint.endpoint}
                        </span>
                        {getStatusIcon(endpoint.utilization)}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{endpoint.currentRequests} / {endpoint.rateLimit}</span>
                        <span className={getStatusColor(endpoint.utilization)}>
                          {Math.round(endpoint.utilization)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            endpoint.utilization >= 90 ? 'bg-red-500' :
                            endpoint.utilization >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(endpoint.utilization, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedTab === 'violations' && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {statistics.violations > 0 ? (
                    <div className="text-xs text-gray-600">
                      {statistics.violations} rate limit violations recorded
                    </div>
                  ) : (
                    <div className="text-xs text-green-600 flex items-center space-x-1">
                      <Shield className="h-3 w-3" />
                      <span>No violations recorded</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <button
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
                className={`flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  isMonitoring 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                <Activity className="h-3 w-3" />
                <span>{isMonitoring ? 'Stop' : 'Start'}</span>
              </button>
              <button
                onClick={resetCounters}
                className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>
            <div className="text-xs text-gray-500">
              Updated {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RateLimitMonitor;
