import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Folder, 
  File, 
  Bucket, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Plus,
  Trash2,
  Info,
  Clock,
  Calendar,
  Shield,
  Database
} from 'lucide-react';
import AccService from '../services/AccService_old';
import BucketManager from './BucketManager';

/**
 * Enhanced File Upload Component
 * Integrates OSS bucket management with file upload workflow
 * Supports different retention policies for different file types
 */
const EnhancedFileUpload = ({ 
  isOpen, 
  onClose, 
  onUploadComplete,
  projectId,
  projectName,
  stepId,
  stepName
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [buckets, setBuckets] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [showBucketManager, setShowBucketManager] = useState(false);
  const [retentionPolicy, setRetentionPolicy] = useState('persistent');
  const [bucketDescription, setBucketDescription] = useState('');

  // Load buckets when component opens
  useEffect(() => {
    if (isOpen) {
      loadBuckets();
    }
  }, [isOpen]);

  const loadBuckets = async () => {
    try {
      console.log('🪣 Loading available buckets...');
      const bucketData = await AccService.getBuckets();
      setBuckets(bucketData.items || []);
      
      // Auto-select appropriate bucket based on retention policy
      if (bucketData.items && bucketData.items.length > 0) {
        const appropriateBucket = bucketData.items.find(bucket => 
          bucket.policyKey === retentionPolicy
        ) || bucketData.items[0];
        setSelectedBucket(appropriateBucket);
      }
    } catch (error) {
      console.error('❌ Error loading buckets:', error);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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

  const createBucketForUpload = async () => {
    if (!projectId) return null;

    const bucketKey = `${projectId}-${retentionPolicy}-${Date.now()}`;
    const description = bucketDescription || `Files for ${stepName || 'step'} in ${projectName || 'project'}`;

    try {
      console.log('🪣 Creating bucket for upload:', bucketKey);
      
      let result;
      switch (retentionPolicy) {
        case 'transient':
          result = await AccService.createTransientBucket(bucketKey, {
            region: 'US'
          });
          break;
        case 'temporary':
          result = await AccService.createTemporaryBucket(bucketKey, {
            region: 'US'
          });
          break;
        case 'persistent':
          result = await AccService.createPersistentBucket(bucketKey, {
            region: 'US'
          });
          break;
        default:
          result = await AccService.createBucket(bucketKey, retentionPolicy, {
            region: 'US'
          });
      }

      if (result) {
        console.log('✅ Bucket created successfully');
        return result;
      }
    } catch (error) {
      console.error('❌ Error creating bucket:', error);
    }
    
    return null;
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Preparing upload...');

    try {
      let bucket = selectedBucket;
      
      // Create bucket if none selected or if we need a specific retention policy
      if (!bucket || bucket.policyKey !== retentionPolicy) {
        setUploadStatus('Creating storage bucket...');
        bucket = await createBucketForUpload();
        if (!bucket) {
          throw new Error('Failed to create storage bucket');
        }
      }

      setUploadStatus('Uploading files...');
      const uploadResults = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const progress = ((i + 1) / selectedFiles.length) * 100;
        setUploadProgress(progress);
        setUploadStatus(`Uploading ${file.name}...`);

        try {
          // Upload file to ACC project
          const uploadResult = await AccService.uploadFileToProject(
            projectId, 
            file, 
            null // Will use root folder
          );

          if (uploadResult) {
            uploadResults.push({
              fileName: file.name,
              fileSize: file.size,
              uploadResult: uploadResult,
              bucket: bucket,
              retentionPolicy: retentionPolicy
            });
          }
        } catch (error) {
          console.error(`❌ Error uploading ${file.name}:`, error);
          uploadResults.push({
            fileName: file.name,
            error: error.message
          });
        }
      }

      setUploadStatus('Upload completed!');
      setUploadProgress(100);

      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete({
          stepId,
          stepName,
          uploadResults,
          bucket: bucket,
          retentionPolicy: retentionPolicy
        });
      }

      // Reset form
      setSelectedFiles([]);
      setBucketDescription('');

    } catch (error) {
      console.error('❌ Upload failed:', error);
      setUploadStatus(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-4/5 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <Upload className="w-6 h-6 text-indigo-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Enhanced File Upload</h3>
              <p className="text-sm text-gray-500">
                {stepName ? `Step: ${stepName}` : 'Upload files with retention policies'}
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
          {/* Retention Policy Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Retention Policy
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['persistent', 'temporary', 'transient'].map((policy) => {
                const policyInfo = getRetentionPolicyInfo(policy);
                return (
                  <button
                    key={policy}
                    onClick={() => setRetentionPolicy(policy)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      retentionPolicy === policy
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      {getPolicyIcon(policy)}
                      <span className="font-medium">{policyInfo.name}</span>
                    </div>
                    <p className="text-xs text-gray-600">{policyInfo.retentionPeriod}</p>
                    <p className="text-xs text-gray-500 mt-1">{policyInfo.useCase}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bucket Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Storage Bucket
              </label>
              <button
                onClick={() => setShowBucketManager(true)}
                className="flex items-center px-2 py-1 text-sm text-indigo-600 hover:text-indigo-800"
              >
                <Settings className="w-4 h-4 mr-1" />
                Manage Buckets
              </button>
            </div>
            
            {selectedBucket ? (
              <div className={`p-3 rounded-lg border ${getPolicyColor(selectedBucket.policyKey)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bucket className="w-4 h-4" />
                    <span className="font-medium">{selectedBucket.bucketKey}</span>
                    <div className={`px-2 py-1 rounded-full text-xs border ${getPolicyColor(selectedBucket.policyKey)}`}>
                      <div className="flex items-center space-x-1">
                        {getPolicyIcon(selectedBucket.policyKey)}
                        <span>{getRetentionPolicyInfo(selectedBucket.policyKey).name}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {selectedBucket.region || 'US'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 border border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                <Bucket className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No bucket selected</p>
                <p className="text-sm">A new bucket will be created</p>
              </div>
            )}
          </div>

          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Files
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-gray-600">Click to select files or drag and drop</span>
                <span className="text-sm text-gray-500">Supports multiple files</span>
              </label>
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Selected Files ({selectedFiles.length})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <File className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Upload Progress</span>
                <span className="text-sm text-gray-500">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{uploadStatus}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
            {selectedBucket && ` • Using ${selectedBucket.bucketKey}`}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
          </div>
        </div>

        {/* Bucket Manager Modal */}
        <BucketManager
          isOpen={showBucketManager}
          onClose={() => setShowBucketManager(false)}
          onBucketSelect={(bucket) => {
            setSelectedBucket(bucket);
            setShowBucketManager(false);
          }}
          projectId={projectId}
          projectName={projectName}
        />
      </motion.div>
    </div>
  );
};

export default EnhancedFileUpload;
