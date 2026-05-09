import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bucket, 
  Plus, 
  Trash2, 
  Settings, 
  Clock, 
  Calendar, 
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  Database,
  HardDrive
} from 'lucide-react';
import AccService from '../services/AccService_old';

/**
 * Bucket Manager Component
 * Manages OSS buckets with different retention policies
 * Integrates with PLC file upload workflow
 */
const BucketManager = ({ 
  isOpen, 
  onClose, 
  onBucketSelect,
  projectId,
  projectName,
  selectedBucket = null
}) => {
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    bucketKey: '',
    policyKey: 'persistent',
    region: 'US',
    description: ''
  });
  const [creating, setCreating] = useState(false);

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
      console.log('🪣 Loading OSS buckets...');
      const bucketData = await AccService.getBuckets();
      console.log('🪣 Buckets loaded:', bucketData);
      
      setBuckets(bucketData.items || []);
    } catch (err) {
      console.error('❌ Error loading buckets:', err);
      setError(`Failed to load buckets: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBucket = async () => {
    if (!createForm.bucketKey.trim()) {
      setError('Bucket key is required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      console.log('🪣 Creating bucket:', createForm);
      
      const options = {
        region: createForm.region
      };

      let result;
      switch (createForm.policyKey) {
        case 'transient':
          result = await AccService.createTransientBucket(createForm.bucketKey, options);
          break;
        case 'temporary':
          result = await AccService.createTemporaryBucket(createForm.bucketKey, options);
          break;
        case 'persistent':
          result = await AccService.createPersistentBucket(createForm.bucketKey, options);
          break;
        default:
          result = await AccService.createBucket(createForm.bucketKey, createForm.policyKey, options);
      }

      if (result) {
        console.log('✅ Bucket created successfully');
        setCreateForm({
          bucketKey: '',
          policyKey: 'persistent',
          region: 'US',
          description: ''
        });
        setShowCreateForm(false);
        await loadBuckets(); // Refresh the list
      } else {
        setError('Failed to create bucket');
      }
    } catch (err) {
      console.error('❌ Error creating bucket:', err);
      setError(`Failed to create bucket: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBucket = async (bucketKey) => {
    if (!confirm(`Are you sure you want to delete bucket "${bucketKey}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting bucket:', bucketKey);
      const success = await AccService.deleteBucket(bucketKey);
      
      if (success) {
        console.log('✅ Bucket deleted successfully');
        await loadBuckets(); // Refresh the list
      } else {
        setError('Failed to delete bucket');
      }
    } catch (err) {
      console.error('❌ Error deleting bucket:', err);
      setError(`Failed to delete bucket: ${err.message}`);
    }
  };

  const handleBucketSelect = (bucket) => {
    if (onBucketSelect) {
      onBucketSelect(bucket);
    }
    onClose();
  };

  const getPolicyInfo = (policyKey) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-4/5 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <HardDrive className="w-6 h-6 text-indigo-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">OSS Bucket Manager</h3>
              <p className="text-sm text-gray-500">
                {projectName ? `Project: ${projectName}` : 'Manage storage buckets'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create Bucket
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Create Form */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b bg-gray-50 p-4"
            >
              <h4 className="font-medium text-gray-900 mb-3">Create New Bucket</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bucket Key *
                  </label>
                  <input
                    type="text"
                    value={createForm.bucketKey}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, bucketKey: e.target.value }))}
                    placeholder="my-project-bucket"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retention Policy *
                  </label>
                  <select
                    value={createForm.policyKey}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, policyKey: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="persistent">Persistent (Permanent)</option>
                    <option value="temporary">Temporary (30 days)</option>
                    <option value="transient">Transient (24 hours)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region
                  </label>
                  <select
                    value={createForm.region}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, region: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="US">US</option>
                    <option value="EMEA">EMEA</option>
                    <option value="AUS">AUS</option>
                    <option value="CAN">CAN</option>
                    <option value="DEU">DEU</option>
                    <option value="IND">IND</option>
                    <option value="JPN">JPN</option>
                    <option value="GBR">GBR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  {createForm.policyKey && (
                    <div className="flex items-center space-x-2">
                      {getPolicyIcon(createForm.policyKey)}
                      <span>{getPolicyInfo(createForm.policyKey).name}: {getPolicyInfo(createForm.policyKey).retentionPeriod}</span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateBucket}
                    disabled={creating || !createForm.bucketKey.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Bucket
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="ml-2 text-gray-600">Loading buckets...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
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
            <div className="space-y-4">
              {buckets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bucket className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No buckets found</p>
                  <p className="text-sm">Create your first bucket to get started</p>
                </div>
              ) : (
                buckets.map((bucket) => {
                  const policyInfo = getPolicyInfo(bucket.policyKey);
                  const isSelected = selectedBucket?.bucketKey === bucket.bucketKey;
                  
                  return (
                    <motion.div
                      key={bucket.bucketKey}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-indigo-300 bg-indigo-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => handleBucketSelect(bucket)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Bucket className="w-5 h-5 text-indigo-600" />
                          <div>
                            <h4 className="font-medium text-gray-900">{bucket.bucketKey}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Region: {bucket.region || 'US'}</span>
                              <span>Created: {new Date(bucket.createdDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getPolicyColor(bucket.policyKey)}`}>
                            <div className="flex items-center space-x-1">
                              {getPolicyIcon(bucket.policyKey)}
                              <span>{policyInfo.name}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBucket(bucket.bucketKey);
                            }}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Info className="w-3 h-3" />
                          <span>{policyInfo.description}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Retention: {policyInfo.retentionPeriod} • Use case: {policyInfo.useCase}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {buckets.length} bucket{buckets.length !== 1 ? 's' : ''} available
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadBuckets}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
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

export default BucketManager;
