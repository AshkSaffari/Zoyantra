import React, { useState, useEffect } from 'react';
import { 
  X, 
  Folder, 
  File, 
  Upload, 
  Search, 
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import AccDocsFolderPicker from './AccDocsFolderPicker';

/**
 * Modal for attaching files from ACC Docs folder tree
 * Uses Autodesk Data Management API to browse and select files
 */
export default function FileAttachmentModal({ 
  isOpen, 
  onClose, 
  onFileSelect, 
  projectId, 
  hubId,
  accessToken,
  title = "Attach File from Docs"
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  const handleConfirm = () => {
    if (selectedFile && onFileSelect) {
      onFileSelect(selectedFile);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <File className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Folder Tree */}
          <div className="w-1/2 border-r">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Folder className="w-5 h-5" />
                Browse ACC Docs
              </h3>
              
              {projectId && accessToken ? (
                <AccDocsFolderPicker
                  projectId={projectId}
                  hubId={hubId}
                  accessToken={accessToken}
                  onSelect={() => {}} // We don't need folder selection for this modal
                  onFileSelect={handleFileSelect}
                  showFiles={true}
                  title="Select File"
                />
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No project selected or access token missing</p>
                  <p className="text-sm">Please select a project first</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Selected File Preview */}
          <div className="w-1/2">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <File className="w-5 h-5" />
                Selected File
              </h3>

              {selectedFile ? (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <File className="w-8 h-8 text-blue-600 mt-1" />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {selectedFile.attributes?.displayName || selectedFile.attributes?.name || 'Unknown file'}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedFile.attributes?.fileType || 'File'}
                        </p>
                        {selectedFile.attributes?.fileSize && (
                          <p className="text-sm text-gray-500 mt-1">
                            Size: {formatFileSize(selectedFile.attributes.fileSize)}
                          </p>
                        )}
                        {selectedFile.attributes?.createTime && (
                          <p className="text-sm text-gray-500">
                            Created: {new Date(selectedFile.attributes.createTime).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* File Details */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">File ID:</span>
                      <span className="text-sm font-mono text-gray-900">{selectedFile.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Type:</span>
                      <span className="text-sm text-gray-900">{selectedFile.type}</span>
                    </div>
                    {selectedFile.attributes?.extension && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Extension:</span>
                        <span className="text-sm text-gray-900">
                          {selectedFile.attributes.extension.type}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleConfirm}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Attach File
                    </button>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <File className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No file selected</p>
                  <p className="text-sm">Browse the folder tree to select a file</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedFile ? (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                File selected: {selectedFile.attributes?.displayName || selectedFile.attributes?.name}
              </span>
            ) : (
              'No file selected'
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedFile}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Attach File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes) {
  if (!bytes) return 'Unknown size';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}
