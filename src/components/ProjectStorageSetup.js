import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Settings,
  Folder,
  File,
  Bucket,
  Shield,
  Clock,
  Calendar,
  Info,
  Zap
} from 'lucide-react';
import AccService from '../services/AccService_old';

/**
 * Project Storage Setup Component
 * Creates project-specific storage buckets with appropriate retention policies
 * Sets up organized storage structure for different project phases
 */
const ProjectStorageSetup = ({ 
  isOpen, 
  onClose, 
  projectId,
  projectName,
  onSetupComplete
}) => {
  const [setupConfig, setSetupConfig] = useState({
    projectName: projectName || '',
    createPersistentBucket: true,
    createTemporaryBucket: true,
    createTransientBucket: true,
    persistentBucketName: '',
    temporaryBucketName: '',
    transientBucketName: '',
    region: 'US',
    createFolderStructure: true,
    folderStructure: {
      documents: true,
      drawings: true,
      reports: true,
      temp: true,
      cache: true
    }
  });
  const [setupProgress, setSetupProgress] = useState(0);
  const [setupStatus, setSetupStatus] = useState('');
  const [setupRunning, setSetupRunning] = useState(false);
  const [setupResults, setSetupResults] = useState([]);
  const [existingBuckets, setExistingBuckets] = useState([]);

  // Load existing buckets when component opens
  useEffect(() => {
    if (isOpen) {
      loadExistingBuckets();
      generateBucketNames();
    }
  }, [isOpen, projectName]);

  const loadExistingBuckets = async () => {
    try {
      console.log('🪣 Loading existing buckets...');
      const bucketData = await AccService.getBuckets();
      setExistingBuckets(bucketData.items || []);
    } catch (error) {
      console.error('❌ Error loading existing buckets:', error);
    }
  };

  const generateBucketNames = () => {
    const baseName = setupConfig.projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const timestamp = Date.now().toString().slice(-6);
    
    setSetupConfig(prev => ({
      ...prev,
      persistentBucketName: `${baseName}-persistent-${timestamp}`,
      temporaryBucketName: `${baseName}-temporary-${timestamp}`,
      transientBucketName: `${baseName}-transient-${timestamp}`
    }));
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

  const handleInputChange = (field, value) => {
    setSetupConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFolderStructureChange = (folder, value) => {
    setSetupConfig(prev => ({
      ...prev,
      folderStructure: {
        ...prev.folderStructure,
        [folder]: value
      }
    }));
  };

  const runSetup = async () => {
    setSetupRunning(true);
    setSetupProgress(0);
    setSetupStatus('Starting project storage setup...');
    setSetupResults([]);

    const results = [];
    const totalSteps = Object.values(setupConfig).filter(v => typeof v === 'boolean').length + 
                      (setupConfig.createFolderStructure ? Object.values(setupConfig.folderStructure).filter(Boolean).length : 0);
    let currentStep = 0;

    try {
      // Step 1: Create persistent bucket
      if (setupConfig.createPersistentBucket) {
        setSetupStatus('Creating persistent storage bucket...');
        setSetupProgress((++currentStep / totalSteps) * 100);
        
        try {
          const result = await AccService.createPersistentBucket(
            setupConfig.persistentBucketName,
            { region: setupConfig.region }
          );
          
          if (result) {
            results.push({
              type: 'bucket',
              name: setupConfig.persistentBucketName,
              policy: 'persistent',
              success: true,
              message: 'Persistent bucket created successfully'
            });
          } else {
            results.push({
              type: 'bucket',
              name: setupConfig.persistentBucketName,
              policy: 'persistent',
              success: false,
              message: 'Failed to create persistent bucket'
            });
          }
        } catch (error) {
          results.push({
            type: 'bucket',
            name: setupConfig.persistentBucketName,
            policy: 'persistent',
            success: false,
            message: `Error: ${error.message}`
          });
        }
      }

      // Step 2: Create temporary bucket
      if (setupConfig.createTemporaryBucket) {
        setSetupStatus('Creating temporary storage bucket...');
        setSetupProgress((++currentStep / totalSteps) * 100);
        
        try {
          const result = await AccService.createTemporaryBucket(
            setupConfig.temporaryBucketName,
            { region: setupConfig.region }
          );
          
          if (result) {
            results.push({
              type: 'bucket',
              name: setupConfig.temporaryBucketName,
              policy: 'temporary',
              success: true,
              message: 'Temporary bucket created successfully'
            });
          } else {
            results.push({
              type: 'bucket',
              name: setupConfig.temporaryBucketName,
              policy: 'temporary',
              success: false,
              message: 'Failed to create temporary bucket'
            });
          }
        } catch (error) {
          results.push({
            type: 'bucket',
            name: setupConfig.temporaryBucketName,
            policy: 'temporary',
            success: false,
            message: `Error: ${error.message}`
          });
        }
      }

      // Step 3: Create transient bucket
      if (setupConfig.createTransientBucket) {
        setSetupStatus('Creating transient storage bucket...');
        setSetupProgress((++currentStep / totalSteps) * 100);
        
        try {
          const result = await AccService.createTransientBucket(
            setupConfig.transientBucketName,
            { region: setupConfig.region }
          );
          
          if (result) {
            results.push({
              type: 'bucket',
              name: setupConfig.transientBucketName,
              policy: 'transient',
              success: true,
              message: 'Transient bucket created successfully'
            });
          } else {
            results.push({
              type: 'bucket',
              name: setupConfig.transientBucketName,
              policy: 'transient',
              success: false,
              message: 'Failed to create transient bucket'
            });
          }
        } catch (error) {
          results.push({
            type: 'bucket',
            name: setupConfig.transientBucketName,
            policy: 'transient',
            success: false,
            message: `Error: ${error.message}`
          });
        }
      }

      // Step 4: Create folder structure (if enabled)
      if (setupConfig.createFolderStructure) {
        setSetupStatus('Setting up folder structure...');
        
        const folderConfigs = [
          { name: 'documents', description: 'Project documents and specifications' },
          { name: 'drawings', description: 'Technical drawings and plans' },
          { name: 'reports', description: 'Project reports and analysis' },
          { name: 'temp', description: 'Temporary files and drafts' },
          { name: 'cache', description: 'Cache files and processing artifacts' }
        ];

        for (const folder of folderConfigs) {
          if (setupConfig.folderStructure[folder.name]) {
            setSetupProgress((++currentStep / totalSteps) * 100);
            setSetupStatus(`Creating ${folder.name} folder...`);
            
            // Note: Folder creation would require ACC Data Management API calls
            // For now, we'll just log the intention
            results.push({
              type: 'folder',
              name: folder.name,
              success: true,
              message: `Folder structure planned: ${folder.description}`
            });
          }
        }
      }

      setSetupStatus('Project storage setup completed!');
      setSetupProgress(100);
      setSetupResults(results);

      // Notify parent component
      if (onSetupComplete) {
        onSetupComplete({
          projectId,
          projectName: setupConfig.projectName,
          results: results,
          config: setupConfig
        });
      }

    } catch (error) {
      console.error('❌ Setup failed:', error);
      setSetupStatus(`Setup failed: ${error.message}`);
    } finally {
      setSetupRunning(false);
    }
  };

  const getResultIcon = (success) => {
    return success ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <AlertCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getResultColor = (success) => {
    return success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-indigo-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Project Storage Setup</h3>
              <p className="text-sm text-gray-500">
                {projectName ? `Setup storage for: ${projectName}` : 'Configure project storage buckets'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Project Configuration */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Project Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={setupConfig.projectName}
                  onChange={(e) => handleInputChange('projectName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region
                </label>
                <select
                  value={setupConfig.region}
                  onChange={(e) => handleInputChange('region', e.target.value)}
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
            </div>
          </div>

          {/* Bucket Configuration */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Storage Buckets</h4>
            <div className="space-y-4">
              {/* Persistent Bucket */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={setupConfig.createPersistentBucket}
                      onChange={(e) => handleInputChange('createPersistentBucket', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <Shield className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Persistent Storage</span>
                    <span className="text-sm text-gray-500">(Permanent)</span>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs border ${getPolicyColor('persistent')}`}>
                    {getRetentionPolicyInfo('persistent').name}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {getRetentionPolicyInfo('persistent').description}
                </p>
                {setupConfig.createPersistentBucket && (
                  <input
                    type="text"
                    value={setupConfig.persistentBucketName}
                    onChange={(e) => handleInputChange('persistentBucketName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="persistent-bucket-name"
                  />
                )}
              </div>

              {/* Temporary Bucket */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={setupConfig.createTemporaryBucket}
                      onChange={(e) => handleInputChange('createTemporaryBucket', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <Calendar className="w-5 h-5 text-yellow-500" />
                    <span className="font-medium">Temporary Storage</span>
                    <span className="text-sm text-gray-500">(30 days)</span>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs border ${getPolicyColor('temporary')}`}>
                    {getRetentionPolicyInfo('temporary').name}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {getRetentionPolicyInfo('temporary').description}
                </p>
                {setupConfig.createTemporaryBucket && (
                  <input
                    type="text"
                    value={setupConfig.temporaryBucketName}
                    onChange={(e) => handleInputChange('temporaryBucketName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="temporary-bucket-name"
                  />
                )}
              </div>

              {/* Transient Bucket */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={setupConfig.createTransientBucket}
                      onChange={(e) => handleInputChange('createTransientBucket', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <Clock className="w-5 h-5 text-orange-500" />
                    <span className="font-medium">Transient Storage</span>
                    <span className="text-sm text-gray-500">(24 hours)</span>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs border ${getPolicyColor('transient')}`}>
                    {getRetentionPolicyInfo('transient').name}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {getRetentionPolicyInfo('transient').description}
                </p>
                {setupConfig.createTransientBucket && (
                  <input
                    type="text"
                    value={setupConfig.transientBucketName}
                    onChange={(e) => handleInputChange('transientBucketName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="transient-bucket-name"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Folder Structure */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Folder Structure</h4>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={setupConfig.createFolderStructure}
                  onChange={(e) => handleInputChange('createFolderStructure', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-600">Create folder structure</span>
              </div>
            </div>
            
            {setupConfig.createFolderStructure && (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(setupConfig.folderStructure).map(([folder, enabled]) => (
                  <div key={folder} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => handleFolderStructureChange(folder, e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <Folder className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 capitalize">{folder}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Setup Progress */}
          {setupRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Setup Progress</span>
                <span className="text-sm text-gray-500">{Math.round(setupProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${setupProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{setupStatus}</p>
            </div>
          )}

          {/* Setup Results */}
          {setupResults.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Setup Results</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {setupResults.map((result, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${getResultColor(result.success)}`}>
                    <div className="flex items-center space-x-2">
                      {getResultIcon(result.success)}
                      <span className="font-medium">{result.name}</span>
                      <span className="text-sm text-gray-500">({result.type})</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {setupConfig.createPersistentBucket + setupConfig.createTemporaryBucket + setupConfig.createTransientBucket} bucket{setupConfig.createPersistentBucket + setupConfig.createTemporaryBucket + setupConfig.createTransientBucket !== 1 ? 's' : ''} to create
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={runSetup}
              disabled={setupRunning}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {setupRunning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {setupRunning ? 'Setting up...' : 'Setup Storage'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProjectStorageSetup;
