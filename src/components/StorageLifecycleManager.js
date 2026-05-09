import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, 
  Clock, 
  Calendar, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Database,
  HardDrive,
  Settings,
  RefreshCw,
  Info,
  Warning
} from 'lucide-react';
import AccService from '../services/AccService_old';

/**
 * Storage Lifecycle Manager Component
 * Manages automatic bucket cleanup based on retention policies
 * Monitors bucket usage and provides cleanup recommendations
 */
const StorageLifecycleManager = ({ 
  isOpen, 
  onClose, 
  projectId,
  projectName
}) => {
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cleanupResults, setCleanupResults] = useState([]);
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [selectedBuckets, setSelectedBuckets] = useState(new Set());
  const [filter, setFilter] = useState('all'); // all, transient, temporary, persistent
  const [sortBy, setSortBy] = useState('createdDate'); // createdDate, policyKey, bucketKey

  // Load buckets when component opens
  useEffect(() => {
    if (isOpen) {
      loadBuckets();
    }
  }, [isOpen]);

  const loadBuckets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🪣 Loading buckets for lifecycle management...');
      const bucketData = await AccService.getBuckets();
      const bucketsWithDetails = [];
      
      // Get detailed information for each bucket
      for (const bucket of bucketData.items || []) {
        try {
          const details = await AccService.getBucketDetails(bucket.bucketKey);
          bucketsWithDetails.push({
            ...bucket,
            details: details,
            hasDetails: !!details,
            isAccessible: !!details
          });
        } catch (err) {
          console.warn(`⚠️ Could not get details for bucket ${bucket.bucketKey}:`, err);
          bucketsWithDetails.push({
            ...bucket,
            details: null,
            hasDetails: false,
            isAccessible: false
          });
        }
      }
      
      setBuckets(bucketsWithDetails);
    } catch (err) {
      console.error('❌ Error loading buckets:', err);
      setError(`Failed to load buckets: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getRetentionPolicyInfo = (policyKey) => {
    return AccService.getRetentionPolicyInfo(policyKey);
  };

  const getPolicyIcon = (policyKey) => {
    switch (policyKey) {
      case 'transient':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'temporary':
        return <Calendar className="w-4 h-4 text-yellow-500" />;
      case 'persistent':
        return <Shield className="w-4 h-4 text-green-500" />;
      default:
        return <Database className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPolicyColor = (policyKey) => {
    switch (policyKey) {
      case 'transient':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'temporary':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'persistent':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const calculateBucketAge = (createdDate) => {
    if (!createdDate) return null;
    
    const created = new Date(createdDate);
    const now = new Date();
    const ageInHours = (now - created) / (1000 * 60 * 60);
    const ageInDays = ageInHours / 24;
    
    return {
      hours: Math.floor(ageInHours),
      days: Math.floor(ageInDays),
      totalHours: ageInHours
    };
  };

  const getBucketStatus = (bucket) => {
    const policyInfo = getRetentionPolicyInfo(bucket.policyKey);
    const age = calculateBucketAge(bucket.createdDate);
    
    if (!age) return { status: 'unknown', message: 'Unknown age' };
    
    let status = 'active';
    let message = '';
    
    switch (bucket.policyKey) {
      case 'transient':
        if (age.hours >= 24) {
          status = 'expired';
          message = 'Expired (24+ hours old)';
        } else if (age.hours >= 20) {
          status = 'warning';
          message = `Expires in ${24 - age.hours} hours`;
        } else {
          message = `Active (${age.hours} hours old)`;
        }
        break;
        
      case 'temporary':
        if (age.days >= 30) {
          status = 'expired';
          message = 'Expired (30+ days old)';
        } else if (age.days >= 25) {
          status = 'warning';
          message = `Expires in ${30 - age.days} days`;
        } else {
          message = `Active (${age.days} days old)`;
        }
        break;
        
      case 'persistent':
        message = `Permanent storage (${age.days} days old)`;
        break;
        
      default:
        message = `Unknown policy (${age.days} days old)`;
    }
    
    return { status, message };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'expired':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <Warning className="w-4 h-4 text-yellow-500" />;
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'expired':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'active':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const handleCleanup = async () => {
    if (selectedBuckets.size === 0) {
      alert('Please select buckets to clean up');
      return;
    }

    setCleanupRunning(true);
    setCleanupResults([]);

    const results = [];
    
    for (const bucketKey of selectedBuckets) {
      const bucket = buckets.find(b => b.bucketKey === bucketKey);
      if (!bucket) continue;

      try {
        console.log(`🗑️ Cleaning up bucket: ${bucketKey}`);
        const success = await AccService.deleteBucket(bucketKey);
        
        results.push({
          bucketKey,
          success,
          error: success ? null : 'Failed to delete bucket',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`❌ Error cleaning up ${bucketKey}:`, error);
        results.push({
          bucketKey,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    setCleanupResults(results);
    setCleanupRunning(false);
    
    // Refresh bucket list
    await loadBuckets();
  };

  const filteredBuckets = buckets.filter(bucket => {
    if (filter === 'all') return true;
    return bucket.policyKey === filter;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'createdDate':
        return new Date(b.createdDate) - new Date(a.createdDate);
      case 'policyKey':
        return a.policyKey.localeCompare(b.policyKey);
      case 'bucketKey':
        return a.bucketKey.localeCompare(b.bucketKey);
      default:
        return 0;
    }
  });

  const expiredBuckets = filteredBuckets.filter(bucket => {
    const bucketStatus = getBucketStatus(bucket);
    return bucketStatus.status === 'expired';
  });

  const warningBuckets = filteredBuckets.filter(bucket => {
    const bucketStatus = getBucketStatus(bucket);
    return bucketStatus.status === 'warning';
  });

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
            <HardDrive className="w-6 h-6 text-indigo-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Storage Lifecycle Manager</h3>
              <p className="text-sm text-gray-500">
                {projectName ? `Project: ${projectName}` : 'Manage bucket lifecycle and cleanup'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadBuckets}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{filteredBuckets.length}</div>
              <div className="text-sm text-gray-600">Total Buckets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{expiredBuckets.length}</div>
              <div className="text-sm text-gray-600">Expired</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{warningBuckets.length}</div>
              <div className="text-sm text-gray-600">Expiring Soon</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredBuckets.length - expiredBuckets.length - warningBuckets.length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Policy</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Policies</option>
                  <option value="transient">Transient (24h)</option>
                  <option value="temporary">Temporary (30d)</option>
                  <option value="persistent">Persistent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="createdDate">Created Date</option>
                  <option value="policyKey">Policy</option>
                  <option value="bucketKey">Bucket Name</option>
                </select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const expiredKeys = expiredBuckets.map(b => b.bucketKey);
                  setSelectedBuckets(new Set(expiredKeys));
                }}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
              >
                Select Expired
              </button>
              <button
                onClick={handleCleanup}
                disabled={cleanupRunning || selectedBuckets.size === 0}
                className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center"
              >
                {cleanupRunning && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Cleanup Selected ({selectedBuckets.size})
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="ml-2 text-gray-600">Loading buckets...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Buckets</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadBuckets}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBuckets.map((bucket) => {
                const bucketStatus = getBucketStatus(bucket);
                const age = calculateBucketAge(bucket.createdDate);
                const isSelected = selectedBuckets.has(bucket.bucketKey);
                
                return (
                  <motion.div
                    key={bucket.bucketKey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border rounded-lg p-4 ${getStatusColor(bucketStatus.status)} ${
                      isSelected ? 'ring-2 ring-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSelected = new Set(selectedBuckets);
                            if (e.target.checked) {
                              newSelected.add(bucket.bucketKey);
                            } else {
                              newSelected.delete(bucket.bucketKey);
                            }
                            setSelectedBuckets(newSelected);
                          }}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <HardDrive className="w-5 h-5 text-indigo-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">{bucket.bucketKey}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Region: {bucket.region || 'US'}</span>
                            <span>Created: {new Date(bucket.createdDate).toLocaleDateString()}</span>
                            {age && <span>Age: {age.days}d {age.hours % 24}h</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getPolicyColor(bucket.policyKey)}`}>
                          <div className="flex items-center space-x-1">
                            {getPolicyIcon(bucket.policyKey)}
                            <span>{getRetentionPolicyInfo(bucket.policyKey).name}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 text-sm">
                          {getStatusIcon(bucketStatus.status)}
                          <span className={bucketStatus.status === 'expired' ? 'text-red-600' : 
                                          bucketStatus.status === 'warning' ? 'text-yellow-600' : 
                                          'text-green-600'}>
                            {bucketStatus.message}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              
              {filteredBuckets.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <HardDrive className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No buckets found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cleanup Results */}
        {cleanupResults.length > 0 && (
          <div className="p-4 border-t bg-gray-50">
            <h4 className="font-medium text-gray-900 mb-2">Cleanup Results</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {cleanupResults.map((result, index) => (
                <div key={index} className={`p-2 rounded text-sm ${
                  result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  <div className="flex items-center space-x-2">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    <span>{result.bucketKey}: {result.success ? 'Deleted successfully' : result.error}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedBuckets.size} bucket{selectedBuckets.size !== 1 ? 's' : ''} selected
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

export default StorageLifecycleManager;
