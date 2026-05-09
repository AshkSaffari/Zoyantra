import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Upload, X } from 'lucide-react';
import AccService from '../services/AccService';

const FolderSelector = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  projectId, 
  projectName, 
  credentials 
}) => {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  useEffect(() => {
    if (isOpen && projectId) {
      loadFolders();
    }
  }, [isOpen, projectId]);

  const loadFolders = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('FolderSelector: Loading folders for project:', projectId);
      console.log('FolderSelector: Credentials:', credentials);
      
      AccService.initialize(credentials);
      const foldersData = await AccService.getProjectFolders(projectId);
      
      console.log('FolderSelector: Received folders data:', foldersData);
      setFolders(foldersData);
    } catch (err) {
      console.error('FolderSelector: Error loading folders:', err);
      setError(err.message || 'Failed to load folders');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFolderSelect = (folder) => {
    setSelectedFolder(folder);
  };

  const handleConfirm = () => {
    if (selectedFolder) {
      onSelect(selectedFolder);
      onClose();
    }
  };

  const renderFolderTree = (parentId = null, level = 0) => {
    const childFolders = folders.filter(folder => folder.parentId === parentId);
    
    console.log('FolderSelector: Rendering folder tree for parentId:', parentId, 'found folders:', childFolders);
    
    return childFolders.map(folder => (
      <div key={folder.id} className="ml-4">
        <div 
          className={`flex items-center py-2 px-3 rounded cursor-pointer hover:bg-gray-100 ${
            selectedFolder?.id === folder.id ? 'bg-blue-50 border border-blue-200' : ''
          }`}
          style={{ marginLeft: `${level * 16}px` }}
          onClick={() => handleFolderSelect(folder)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(folder.id);
            }}
            className="mr-2 p-1 hover:bg-gray-200 rounded"
          >
            {expandedFolders.has(folder.id) ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {expandedFolders.has(folder.id) ? (
            <FolderOpen className="h-4 w-4 text-blue-500 mr-2" />
          ) : (
            <Folder className="h-4 w-4 text-gray-500 mr-2" />
          )}
          
          <span className="text-sm text-gray-900">{folder.displayName || folder.name}</span>
        </div>
        
        {expandedFolders.has(folder.id) && renderFolderTree(folder.id, level + 1)}
      </div>
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Select Folder</h3>
            <p className="text-sm text-gray-600">
              Choose where to save the exported file in {projectName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading folders...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-red-500 mb-2">⚠️</div>
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={loadFolders}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 overflow-y-auto max-h-96">
              {folders.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No folders found in this project</p>
                  <button
                    onClick={() => {
                      // Add some test folders for debugging
                      setFolders([
                        {
                          id: 'test-root',
                          name: 'Test Root',
                          displayName: 'Test Root',
                          type: 'folders',
                          parentId: null,
                          created: new Date().toISOString(),
                          updated: new Date().toISOString()
                        },
                        {
                          id: 'test-docs',
                          name: 'Test Documents',
                          displayName: 'Test Documents',
                          type: 'folders',
                          parentId: 'test-root',
                          created: new Date().toISOString(),
                          updated: new Date().toISOString()
                        }
                      ]);
                    }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Load Test Folders
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {renderFolderTree()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedFolder ? (
              <span>Selected: <strong>{selectedFolder.displayName || selectedFolder.name}</strong></span>
            ) : (
              <span>No folder selected</span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedFolder}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-4 w-4 mr-2" />
              Save Here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FolderSelector;
