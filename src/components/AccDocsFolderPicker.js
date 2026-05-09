import React, { useEffect, useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  File, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Upload,
  Search,
  X,
  Loader2
} from 'lucide-react';
import AccDocsService from '../services/AccDocsService';

/**
 * Recursive folder picker for ACC Docs
 * Allows users to browse and select folders/files, or create new ones
 */
function FolderNode({ 
  folder, 
  projectId, 
  accessToken, 
  onSelect, 
  selected, 
  refreshParent,
  showFiles = false,
  onFileSelect = null
}) {
  const [children, setChildren] = useState(null);
  const [files, setFiles] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  async function toggleExpand() {
    if (!expanded) {
      setLoading(true);
      try {
        // Get both folders and files using Autodesk Data Management API
        const contents = await AccDocsService.getFolderContents(projectId, folder.id);
        const folders = contents.data?.filter(item => item.type === 'folders') || [];
        const folderFiles = contents.data?.filter(item => item.type === 'items') || [];
        
        setChildren(folders);
        if (showFiles) {
          setFiles(folderFiles);
        }
      } catch (error) {
        console.error('Error loading folder contents:', error);
        // Show user-friendly error message
        alert('Failed to load folder contents. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  }

  async function handleCreateFolder() {
    const name = prompt("Enter new folder name:");
    if (!name) return;
    
    try {
      await AccDocsService.createFolder(projectId, folder.id, name, accessToken);
      // Refresh the children
      const contents = await AccDocsService.getFolderContents(projectId, folder.id);
      const folders = contents.data?.filter(item => item.type === 'folders') || [];
      setChildren(folders);
      setExpanded(true);
      refreshParent(); // notify parent to refresh tree if needed
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder. Please try again.');
    }
  }

  const handleFileClick = (file) => {
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  return (
    <li className="ml-4">
      <div className="flex items-center gap-2 py-1">
        <button
          onClick={toggleExpand}
          className="text-blue-600 font-medium flex items-center gap-1 hover:text-blue-800"
          disabled={loading}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          ) : (
            expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          )}
          {expanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
          <span>{folder.attributes?.displayName || folder.attributes?.name || folder.name}</span>
        </button>

        <button
          className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
            selected === folder.id
              ? "bg-blue-200 text-blue-900"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => onSelect(folder.id)}
        >
          <Folder className="w-3 h-3" />
          Select
        </button>
      </div>

      {expanded && (
        <div className="ml-6 mt-1">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handleCreateFolder}
              className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              New Folder
            </button>
          </div>

          {/* Show files if requested */}
          {showFiles && files && files.length > 0 && (
            <div className="mb-2">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Files:</h4>
              <ul className="ml-2">
                {files.map((file) => (
                  <li key={file.id} className="flex items-center gap-2 py-1">
                    <File className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {file.attributes?.displayName || file.attributes?.name || file.name}
                    </span>
                    <button
                      onClick={() => handleFileClick(file)}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      Attach
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Show subfolders */}
          <ul>
            {children &&
              children.map((child) => (
                <FolderNode
                  key={child.id}
                  folder={child}
                  projectId={projectId}
                  accessToken={accessToken}
                  onSelect={onSelect}
                  selected={selected}
                  refreshParent={refreshParent}
                  showFiles={showFiles}
                  onFileSelect={onFileSelect}
                />
              ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export default function AccDocsFolderPicker({
  projectId,
  hubId,
  accessToken,
  onSelect,
  onFileSelect = null,
  selectedFolder = null,
  showFiles = false,
  title = "Select Folder from ACC Docs"
}) {
  const [rootFolders, setRootFolders] = useState([]);
  const [selected, setSelected] = useState(selectedFolder);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  async function loadRoot() {
    setLoading(true);
    try {
      const root = await AccDocsService.getRootFolders(projectId, hubId, accessToken);
      setRootFolders(root);
    } catch (error) {
      console.error('Error loading root folders:', error);
      alert('Failed to load folders. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (projectId && accessToken) {
      loadRoot();
    }
  }, [projectId, accessToken]);

  const handleSelect = (folderId) => {
    setSelected(folderId);
    onSelect(folderId);
  };

  const handleFileSelect = (file) => {
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Loading folders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Folder className="w-5 h-5" />
          {title}
        </h2>
        <button
          onClick={loadRoot}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Search functionality */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search folders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {selected && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg text-sm flex items-center gap-2">
          <Folder className="w-4 h-4" />
          <span>Selected: {rootFolders.find(f => f.id === selected)?.attributes?.displayName || 'Unknown folder'}</span>
        </div>
      )}

      <ul>
        {rootFolders
          .filter(folder => 
            !searchTerm || 
            (folder.attributes?.displayName || folder.attributes?.name || folder.name)
              .toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              projectId={projectId}
              accessToken={accessToken}
              onSelect={handleSelect}
              selected={selected}
              refreshParent={loadRoot}
              showFiles={showFiles}
              onFileSelect={handleFileSelect}
            />
          ))}
      </ul>

      {rootFolders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Folder className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No folders found</p>
          <p className="text-sm">Make sure you have access to this project</p>
        </div>
      )}
    </div>
  );
}