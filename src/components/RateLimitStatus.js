import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  RefreshCw,
  Database,
  HardDrive,
  Zap,
  Settings,
  TrendingUp,
  TrendingDown,
  X
} from 'lucide-react';
import rateLimiter from '../utils/rateLimiter';
import { useRateLimit } from '../hooks/useRateLimit';

/**
 * Rate Limit Status Component
 * Displays real-time rate limit and quota status for APS APIs
 */
const RateLimitStatus = ({ 
  isOpen, 
  onClose, 
  endpoint = null,
  userId = null,
  applicationId = null
}) => {
  const [fullStatus, setFullStatus] = useState(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState(endpoint);
  const [selectedResourceType, setSelectedResourceType] = useState('file_size');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Use rate limit hook if specific endpoint is provided
  const rateLimitHook = selectedEndpoint ? useRateLimit(selectedEndpoint, userId, applicationId) : null;

  // Update full status
  const updateFullStatus = () => {
    const status = rateLimiter.getFullStatus();
    setFullStatus(status);
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      updateFullStatus();
      const interval = setInterval(updateFullStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Initial load
  useEffect(() => {
    updateFullStatus();
  }, []);

  const getStatusIcon = (status) => {
    if (status.isRetryAfter) return <XCircle className="w-4 h-4 text-red-500" />;
    if (status.remainingRequests === 0) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    if (status.remainingRequests < status.maxRequests * 0.2) return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getStatusColor = (status) => {
    if (status.isRetryAfter) return 'bg-red-50 border-red-200';
    if (status.remainingRequests === 0) return 'bg-yellow-50 border-yellow-200';
    if (status.remainingRequests < status.maxRequests * 0.2) return 'bg-orange-50 border-orange-200';
    return 'bg-green-50 border-green-200';
  };

  const getQuotaIcon = (quota) => {
    if (quota.percentage >= 100) return <XCircle className="w-4 h-4 text-red-500" />;
    if (quota.percentage >= 80) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    if (quota.percentage >= 60) return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getQuotaColor = (quota) => {
    if (quota.percentage >= 100) return 'bg-red-50 border-red-200';
    if (quota.percentage >= 80) return 'bg-yellow-50 border-yellow-200';
    if (quota.percentage >= 60) return 'bg-orange-50 border-orange-200';
    return 'bg-green-50 border-green-200';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (milliseconds) => {
    const seconds = Math.ceil(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <Zap className="w-6 h-6 text-indigo-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">APS Rate Limit Status</h3>
              <p className="text-sm text-gray-500">
                Real-time monitoring of API rate limits and quotas
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={updateFullStatus}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </button>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-600">Auto-refresh</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rate Limits */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                <Database className="w-5 h-5 mr-2 text-blue-500" />
                Rate Limits
              </h4>
              
              {fullStatus?.rateLimits && Object.keys(fullStatus.rateLimits).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(fullStatus.rateLimits).map(([endpoint, status]) => (
                    <motion.div
                      key={endpoint}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`border rounded-lg p-3 ${getStatusColor(status)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(status)}
                          <span className="font-medium text-sm">{endpoint}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {status.currentRequests}/{status.maxRequests}
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            status.remainingRequests === 0 ? 'bg-red-500' :
                            status.remainingRequests < status.maxRequests * 0.2 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ 
                            width: `${(status.currentRequests / status.maxRequests) * 100}%` 
                          }}
                        />
                      </div>
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>Remaining: {status.remainingRequests} requests</div>
                        {status.isRetryAfter && (
                          <div className="text-red-600">
                            Retry after: {formatTime(status.retryAfterTime - Date.now())}
                          </div>
                        )}
                        <div>Reset in: {formatTime(status.resetTime - Date.now())}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No rate limit data available</p>
                  <p className="text-sm">Make some API requests to see rate limit status</p>
                </div>
              )}
            </div>

            {/* Quotas */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                <HardDrive className="w-5 h-5 mr-2 text-purple-500" />
                Quotas
              </h4>
              
              {fullStatus?.quotas && Object.keys(fullStatus.quotas).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(fullStatus.quotas).map(([resourceType, quota]) => (
                    <motion.div
                      key={resourceType}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`border rounded-lg p-3 ${getQuotaColor(quota)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getQuotaIcon(quota)}
                          <span className="font-medium text-sm capitalize">
                            {resourceType.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {quota.percentage.toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            quota.percentage >= 100 ? 'bg-red-500' :
                            quota.percentage >= 80 ? 'bg-yellow-500' :
                            quota.percentage >= 60 ? 'bg-orange-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${quota.percentage}%` }}
                        />
                      </div>
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>
                          Used: {resourceType === 'file_size' || resourceType === 'storage' 
                            ? formatBytes(quota.currentUsage) 
                            : quota.currentUsage.toLocaleString()
                          } / {resourceType === 'file_size' || resourceType === 'storage' 
                            ? formatBytes(quota.limit) 
                            : quota.limit.toLocaleString()
                          } {quota.unit}
                        </div>
                        <div>Remaining: {resourceType === 'file_size' || resourceType === 'storage' 
                          ? formatBytes(quota.remaining) 
                          : quota.remaining.toLocaleString()
                        } {quota.unit}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <HardDrive className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No quota data available</p>
                  <p className="text-sm">Use resources to see quota status</p>
                </div>
              )}
            </div>
          </div>

          {/* APS Rate Limits Reference */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Info className="w-5 h-5 mr-2 text-blue-500" />
              APS Data Management Rate Limits
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <div className="font-medium text-gray-700">Hub Endpoints</div>
                <div className="text-gray-600">• GET /hubs: 50 req/min</div>
                <div className="text-gray-600">• GET /hubs/{hub_id}: 50 req/min</div>
              </div>
              <div className="space-y-2">
                <div className="font-medium text-gray-700">Folder Endpoints</div>
                <div className="text-gray-600">• GET /folders/{folder_id}: 300 req/min</div>
                <div className="text-gray-600">• GET /folders/{folder_id}/contents: 300 req/min</div>
                <div className="text-gray-600">• GET /folders/{folder_id}/parent: 50 req/min</div>
              </div>
              <div className="space-y-2">
                <div className="font-medium text-gray-700">Item & Version Endpoints</div>
                <div className="text-gray-600">• GET /items/{item_id}: 300 req/min</div>
                <div className="text-gray-600">• GET /items/{item_id}/versions: 800 req/min</div>
                <div className="text-gray-600">• GET /versions/{version_id}: 300 req/min</div>
              </div>
              <div className="space-y-2">
                <div className="font-medium text-gray-700">Command & OSS</div>
                <div className="text-gray-600">• POST /commands: 300 req/min</div>
                <div className="text-gray-600">• OSS Overall: 1000 req/min</div>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          {fullStatus && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {Object.keys(fullStatus.rateLimits).length}
                  </div>
                  <div className="text-sm text-gray-600">Tracked Endpoints</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {Object.values(fullStatus.rateLimits).reduce((sum, status) => sum + status.remainingRequests, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Remaining Requests</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {Object.keys(fullStatus.quotas).length}
                  </div>
                  <div className="text-sm text-gray-600">Tracked Quotas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {new Date(fullStatus.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="text-sm text-gray-600">Last Updated</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {autoRefresh ? 'Auto-refreshing every 5 seconds' : 'Manual refresh only'}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                rateLimiter.clearRateLimitData();
                rateLimiter.clearQuotaData();
                updateFullStatus();
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Clear Data
            </button>
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

export default RateLimitStatus;
