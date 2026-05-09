import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Folder, 
  ChevronRight, 
  Search, 
  X, 
  Check,
  Loader2,
  FolderOpen,
  FileText,
  Image,
  FileSpreadsheet
} from 'lucide-react';
import AccService from '../services/AccService';

const AccFolderBrowser = ({ 
  isOpen, 
  onClose, 
  onFileSelect, 
  projectId, 
  selectedFiles = [], 
  multiSelect = false,
  hubId = null
}) => {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [selectedFileIds, setSelectedFileIds] = useState(new Set(selectedFiles.map(f => f.id)));
  const [projectInfo, setProjectInfo] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [fileVersions, setFileVersions] = useState({}); // Store versions for each file
  const [selectedVersions, setSelectedVersions] = useState({}); // Store selected version for each file
  const [loadingVersions, setLoadingVersions] = useState(new Set()); // Track which files are loading versions

  // Load project information and root folder contents
  useEffect(() => {
    console.log('🔍 AccFolderBrowser useEffect triggered');
    console.log('📁 isOpen:', isOpen);
    console.log('📁 projectId:', projectId);
    console.log('📁 hubId:', hubId);
    
    if (isOpen && projectId) {
      console.log('✅ Loading project info and folder contents...');
      loadProjectInfo();
      loadFolderContents();
    } else {
      console.log('❌ Not loading - isOpen:', isOpen, 'projectId:', projectId);
    }
  }, [isOpen, projectId]);

  // Load project information
  const loadProjectInfo = async () => {
    try {
      console.log('📋 Loading project information...');
      
      // Initialize AccService with credentials
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('Please sign in to Autodesk first. Go to the main app and connect to your Autodesk account.');
      }
      
      console.log('📋 Initializing AccService for project info...');
      // Create AccService instance with credentials to initialize the service
      const accService = new AccService(credentials);
      console.log('📋 AccService initialized for project info');
      
      // Try to get project details from different sources
      const projectDetails = {
        projectId,
        hubId,
        timestamp: new Date().toISOString(),
        attempts: []
      };

      // Attempt 1: Direct project lookup using getProjects
      if (hubId) {
        try {
          const projects = await AccService.getProjects(hubId);
          const matchingProject = projects.find(p => 
            p.id === projectId || 
            p.id === projectId.replace('b.', '') ||
            p.id.replace('b.', '') === projectId.replace('b.', '')
          );
          
          if (matchingProject) {
            projectDetails.attempts.push({
              method: 'Direct Hub Lookup',
              success: true,
              data: matchingProject
            });
            setProjectInfo({
              ...projectDetails,
              name: matchingProject.attributes?.name || matchingProject.name || 'Unknown Project',
              description: matchingProject.attributes?.description || 'No description',
              status: 'Found in Hub'
            });
            return;
          }
        } catch (error) {
          projectDetails.attempts.push({
            method: 'Direct Hub Lookup',
            success: false,
            error: error.message
          });
        }
      }

      // Attempt 2: Search all hubs
      try {
        const hubs = await AccService.getHubs();
        
        for (const hub of hubs) {
          try {
            const projects = await AccService.getProjects(hub.id);
            const matchingProject = projects.find(p => 
              p.id === projectId || 
              p.id === projectId.replace('b.', '') ||
              p.id.replace('b.', '') === projectId.replace('b.', '')
            );
            
            if (matchingProject) {
              projectDetails.attempts.push({
                method: `Hub Search: ${hub.id}`,
                success: true,
                data: matchingProject
              });
              setProjectInfo({
                ...projectDetails,
                name: matchingProject.attributes?.name || matchingProject.name || 'Unknown Project',
                description: matchingProject.attributes?.description || 'No description',
                status: `Found in Hub: ${hub.attributes?.name || hub.id}`,
                actualHubId: hub.id
              });
              return;
            }
          } catch (error) {
            projectDetails.attempts.push({
              method: `Hub Search: ${hub.id}`,
              success: false,
              error: error.message
            });
          }
        }
      } catch (error) {
        projectDetails.attempts.push({
          method: 'Hub Search',
          success: false,
          error: error.message
        });
      }

      // If no project found, set basic info
      setProjectInfo({
        ...projectDetails,
        name: `Project ${projectId}`,
        description: 'Project not found in any accessible hub',
        status: 'Not Found',
        attempts: projectDetails.attempts
      });

    } catch (error) {
      console.error('❌ Error loading project info:', error);
    }
  };

  // Load file versions for a specific file
  const loadFileVersions = async (fileId, fileName) => {
    try {
      console.log('🔍 Loading versions for file:', fileName, fileId);
      setLoadingVersions(prev => new Set([...prev, fileId]));
      
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        console.error('❌ No authentication token found');
        return;
      }

      const projectIdForAPI = projectId.startsWith('b.') ? projectId : `b.${projectId}`;
      const versionsUrl = `https://developer.api.autodesk.com/data/v1/projects/${projectIdForAPI}/items/${encodeURIComponent(fileId)}/versions`;
      
      console.log('🔗 Versions API URL:', versionsUrl);
      
      const response = await fetch(versionsUrl, {
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.api+json'
        }
      });

      console.log('📊 Versions API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Versions API response:', data);
        
        if (data.data && data.data.length > 0) {
          // Sort versions by version number (latest first)
          const sortedVersions = data.data.sort((a, b) => {
            const versionA = a.attributes?.versionNumber || 0;
            const versionB = b.attributes?.versionNumber || 0;
            return versionB - versionA;
          });
          
          setFileVersions(prev => ({
            ...prev,
            [fileId]: sortedVersions
          }));
          
        // Auto-select the latest version
        const latestVersion = sortedVersions[0];
        console.log('🔍 Auto-selecting latest version for file:', fileId, latestVersion);
        setSelectedVersions(prev => ({
          ...prev,
          [fileId]: latestVersion
        }));
          
          console.log('✅ Loaded versions for file:', fileName, sortedVersions.length);
        } else {
          console.log('⚠️ No versions found for file:', fileName);
        }
      } else {
        const errorText = await response.text();
        console.log('❌ Versions API error:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Error loading file versions:', error);
    } finally {
      setLoadingVersions(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  // Load versions for all files when folder contents are loaded
  const loadAllFileVersions = async (filesList) => {
    console.log('🔍 Loading versions for all files:', filesList.length);
    
    for (const file of filesList) {
      if (file.type === 'file' && !fileVersions[file.id]) {
        console.log('📁 Loading versions for:', file.name);
        await loadFileVersions(file.id, file.name);
        // Add small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

  const loadFolderContents = async (folderId = null) => {
    // Prevent multiple simultaneous loads
    if (loading) {
      console.log('📁 Already loading, skipping duplicate request');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('📁 Loading folder contents:', folderId || 'root');
      console.log('📁 Project ID:', projectId);
      console.log('📁 Hub ID:', hubId);
      console.log('📁 Folder ID:', folderId);
      
      // Check if we have credentials (cached check)
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      console.log('📁 Credentials available:', !!credentials.threeLegToken);
      
      if (!credentials.threeLegToken) {
        throw new Error('Please sign in to Autodesk first. Go to the main app and connect to your Autodesk account.');
      }
      
      // Skip AccService initialization if not needed for this operation
      console.log('📁 Using AccService static methods for better performance');
      
      
      let contents = [];
      let method = 'unknown';
      
      // If loading root folders, use optimized approach
      if (!folderId) {
        // If hubId is provided, use it directly and try different project ID formats
        if (hubId) {
          try {
            console.log('🔗 Using provided hubId for top folders...');
            console.log('📁 Hub ID:', hubId);
            console.log('📁 Project ID:', projectId);
            
            // Try with the provided hubId first
            const result = await AccService.getProjectTopFolders(hubId, projectId);
            contents = result.folders || [];
            method = result.method || 'project-service';
            console.log(`✅ Project service loaded ${contents.length} top folders using provided hubId`);
          } catch (projectError) {
            console.warn('⚠️ Project service failed with provided hubId, trying project ID variations:', projectError.message);
            
            // Try different project ID formats with the same hubId
            const projectIdVariations = [
              projectId,
              projectId.replace('b.', ''),
              projectId.startsWith('b.') ? projectId : `b.${projectId}`
            ];
            
            for (const variation of projectIdVariations) {
              if (variation === projectId) continue; // Already tried
              try {
                console.log(`🔍 Trying project ID variation: ${variation}`);
                const result = await AccService.getProjectTopFolders(hubId, variation);
                if (result && result.folders && result.folders.length > 0) {
                  contents = result.folders;
                  method = 'project-service-variation';
                  console.log(`✅ Project service loaded ${contents.length} top folders with variation: ${variation}`);
                  break;
                }
              } catch (variationError) {
                console.warn(`⚠️ Variation ${variation} failed:`, variationError.message);
              }
            }
          }
        }
        
        // If still no contents, search all hubs (or if hubId wasn't provided)
        if (contents.length === 0) {
          try {
            console.log('🔍 Searching for project in all accessible hubs...');
            const hubs = await AccService.getHubs();
            let foundProject = null;
            let foundHub = null;
            
            // If hubId was provided, prioritize that hub
            const hubsToCheck = hubId 
              ? [hubs.find(h => h.id === hubId || h.id === hubId.replace('b.', '') || h.id.replace('b.', '') === hubId.replace('b.', '')), ...hubs.filter(h => h.id !== hubId && h.id !== hubId.replace('b.', ''))]
              : hubs;
            
            for (const hub of hubsToCheck.filter(Boolean)) {
              try {
                // List all projects in the hub and find matching project
                const projects = await AccService.getProjects(hub.id);
                const matchingProject = projects.find(p => 
                  p.id === projectId || 
                  p.id === projectId.replace('b.', '') ||
                  p.id.replace('b.', '') === projectId.replace('b.', '')
                );
                
                if (matchingProject) {
                  foundProject = matchingProject;
                  foundHub = hub;
                  console.log(`✅ Found project in hub: ${hub.attributes?.name || hub.id} (via project list)`);
                  break;
                }
              } catch (hubError) {
                console.warn(`⚠️ Could not check hub ${hub.id}:`, hubError.message);
              }
            }
            
            if (foundProject && foundHub) {
              // Try to get top folders from the correct hub
              try {
                const result = await AccService.getProjectTopFolders(foundHub.id, foundProject.id);
                contents = result.folders || [];
                method = 'project-service-found';
                console.log(`✅ Project service loaded ${contents.length} top folders from correct hub`);
              } catch (topFoldersError) {
                console.warn('⚠️ Could not get top folders from correct hub:', topFoldersError.message);
              }
            }
          } catch (searchError) {
            console.warn('⚠️ Hub search failed:', searchError.message);
          }
        }
        
        // Approach 3: If still no contents, try direct Data service approach
        if (contents.length === 0) {
          try {
            console.log('🔗 Trying direct Data service approach...');
            // Try different project ID formats
            const variations = [
              projectId,
              projectId.replace('b.', ''),
              `urn:adsk.dtm:${projectId}`,
              `urn:adsk.dtm:Project:${projectId}`
            ];
            
            for (const variation of variations) {
              try {
                console.log(`🔍 Trying project ID format: ${variation}`);
                const result = await AccService.getProjectFiles(variation, null);
                if (result && result.length >= 0) {
                  contents = result;
                  method = 'data-service-direct';
                  console.log(`✅ Data service loaded ${contents.length} items with format: ${variation}`);
                  break;
                }
              } catch (variationError) {
                console.warn(`⚠️ Variation ${variation} failed:`, variationError.message);
              }
            }
          } catch (directError) {
            console.warn('⚠️ Direct Data service failed:', directError.message);
          }
        }
        
        if (contents.length === 0) {
          // Show helpful error message with suggestions
          const errorMessage = `Project "${projectId}" not found in any accessible hub. 
          
Possible solutions:
1. Verify the project ID is correct
2. Check if the project exists in a different hub
3. Ensure you have access to the project
4. Try using the enhanced debugger to find the correct project ID format`;
          
          console.error('❌ Project not found:', errorMessage);
          throw new Error(errorMessage);
        }
      } else {
        // For subfolders, use the Data service
        try {
          console.log('🔗 Using Data service for folder contents...');
          contents = await AccService.getProjectFiles(projectId, folderId);
          method = 'data-service';
          console.log(`✅ Data service loaded ${contents.length} items`);
        } catch (dataError) {
          console.warn('⚠️ Data service failed:', dataError.message);
          throw dataError;
        }
      }
      
      console.log('📁 Raw contents from API:', contents);
      
      const folderItems = contents.filter(item => item.type === 'folder');
      const fileItems = contents.filter(item => item.type === 'file');
      
      setFolders(folderItems);
      setFiles(fileItems);
      
      console.log(`✅ Loaded ${folderItems.length} folders and ${fileItems.length} files using ${method}`);
      
      // Automatically load versions for all files
      if (fileItems.length > 0) {
        console.log('🔍 Auto-loading versions for all files...');
        // Use setTimeout to prevent blocking the UI
        setTimeout(() => {
          loadAllFileVersions(fileItems);
        }, 500);
      }
      
      // If still no contents, show informative message
      if (folderItems.length === 0 && fileItems.length === 0) {
        console.log('📁 Project appears to be empty - this is normal for new projects');
        setError(null); // Clear error state
        // Don't set error for empty project - this is normal
        
        // Try to provide some helpful information
        console.log('💡 Project might be empty or API endpoints might not be accessible');
        console.log('💡 Try uploading files to the project via ACC web interface first');
      }
      
    } catch (err) {
      console.error('❌ Error loading folder contents:', err);
      setError(`Failed to load folder contents: ${err.message}`);
      
      // Show more detailed error information
      console.log('🔍 Debug info:');
      console.log('- Project ID:', projectId);
      console.log('- Hub ID:', hubId);
      console.log('- Folder ID:', folderId);
      console.log('- Error details:', err);
      
      // Show empty state on error
      console.log('🔄 Showing empty state due to error');
      setFolders([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = async (folder) => {
    // Debounce rapid clicks (prevent clicks within 300ms)
    const now = Date.now();
    if (now - lastClickTime < 300) {
      console.log('⚠️ Click too rapid, debouncing');
      return;
    }
    setLastClickTime(now);
    
    // Prevent multiple rapid clicks
    if (isNavigating || loading) {
      console.log('⚠️ Navigation in progress, ignoring click');
      return;
    }
    
    const folderId = folder.id;
    console.log('📁 Clicking on folder:', folder.name, 'ID:', folderId);
    console.log('📁 Current path before:', currentPath.map(f => f.name));
    
    // Check if we're already in this folder to prevent redundant navigation
    if (currentPath.length > 0 && currentPath[currentPath.length - 1].id === folderId) {
      console.log('⚠️ Already in this folder, skipping navigation');
      return;
    }
    
    // Check if this folder is already in the path to prevent duplicates
    const folderIndex = currentPath.findIndex(f => f.id === folderId);
    if (folderIndex !== -1) {
      console.log('⚠️ Folder already in path, navigating to that level instead');
      const newPath = currentPath.slice(0, folderIndex + 1);
      console.log('📁 Trimming path to:', newPath.map(f => f.name));
      setCurrentPath(newPath);
      // Use setTimeout to prevent blocking the UI and improve performance
      setTimeout(() => loadFolderContents(folderId), 0);
      return;
    }
    
    setIsNavigating(true);
    setLoading(true);
    
    try {
      const newPath = [...currentPath, folder];
      console.log('📁 New path after:', newPath.map(f => f.name));
      
      setCurrentPath(newPath);
      setExpandedFolders(prev => new Set([...prev, folderId]));
      
      // Use setTimeout to prevent blocking the UI and improve performance
      setTimeout(() => loadFolderContents(folderId), 0);
    } finally {
      setIsNavigating(false);
    }
  };

  const handleBackClick = () => {
    if (currentPath.length > 0) {
      const newPath = currentPath.slice(0, -1);
      setCurrentPath(newPath);
      
      const parentFolder = newPath.length > 0 ? newPath[newPath.length - 1] : null;
      loadFolderContents(parentFolder?.id);
    }
  };

  const handleFileClick = (file) => {
    console.log('📁 File clicked:', file);
    console.log('📁 File versions loaded:', !!fileVersions[file.id]);
    console.log('📁 Selected version for this file:', selectedVersions[file.id]);
    
    // Load versions for this file if not already loaded
    if (!fileVersions[file.id]) {
      console.log('📁 Loading versions for file:', file.name);
      loadFileVersions(file.id, file.name);
      // Don't proceed with selection until versions are loaded
      return;
    }
    
    // If versions are loaded but no version is selected, wait a bit for state to update
    if (fileVersions[file.id] && !selectedVersions[file.id]) {
      console.log('📁 Versions loaded but no version selected, waiting for state update...');
      setTimeout(() => {
        console.log('📁 Retrying file selection after delay...');
        handleFileClick(file);
      }, 500);
      return;
    }
    
    if (multiSelect) {
      const newSelectedIds = new Set(selectedFileIds);
      if (newSelectedIds.has(file.id)) {
        newSelectedIds.delete(file.id);
      } else {
        newSelectedIds.add(file.id);
      }
      setSelectedFileIds(newSelectedIds);
    } else {
      // Include version information for single file selection
      const selectedVersion = selectedVersions[file.id];
      console.log('🔍 Single file selection - file:', file.name);
      console.log('🔍 Single file selection - selectedVersion:', selectedVersion);
      console.log('🔍 Single file selection - selectedVersions state:', selectedVersions);
      console.log('🔍 Single file selection - fileVersions for this file:', fileVersions[file.id]);
      
      const fileWithVersion = {
        ...file,
        selectedVersion: selectedVersion,
        versionUrn: selectedVersion?.id || file.id, // Use version URN if available, fallback to lineage URN
        versionNumber: selectedVersion?.attributes?.versionNumber || 1
      };
      
      console.log('🔍 Single file selection - fileWithVersion:', fileWithVersion);
      onFileSelect(fileWithVersion);
      onClose();
    }
  };

  const handleSelectFiles = () => {
    // Only select actual files, not folders
    const selectedFiles = files.filter(file => 
      selectedFileIds.has(file.id) && file.type === 'file'
    ).map(file => {
      // Include version information if available
      const selectedVersion = selectedVersions[file.id];
      return {
        ...file,
        selectedVersion: selectedVersion,
        versionUrn: selectedVersion?.id || file.id, // Use version URN if available, fallback to lineage URN
        versionNumber: selectedVersion?.attributes?.versionNumber || 1
      };
    });
    
    console.log('📁 Selected files with versions:', selectedFiles);
    onFileSelect(selectedFiles);
    onClose();
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="w-4 h-4 text-blue-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getFileExtension = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension || 'file';
  };

  const filteredFolders = folders.filter(folder => 
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-3/4 flex flex-col"
      >
        {/* Modern Colorful Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                <FolderOpen className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">ACC Documents</h3>
                <p className="text-blue-100 text-sm">Select files from your project</p>
                
                {/* Project Information */}
                {projectInfo && (
                  <div className="mt-3 p-3 bg-white bg-opacity-10 rounded-lg backdrop-blur-sm border border-white border-opacity-20">
                    <div className="flex items-center space-x-3 text-sm">
                      <span className="font-medium text-blue-100">Project:</span>
                      <span className="text-white font-semibold">{projectInfo.name}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        projectInfo.status === 'Found in Hub' || projectInfo.status?.includes('Found in Hub') 
                          ? 'bg-green-500 text-white' 
                          : projectInfo.status === 'Not Found'
                          ? 'bg-red-500 text-white'
                          : 'bg-yellow-500 text-white'
                      }`}>
                        {projectInfo.status}
                      </span>
                    </div>
                    <div className="text-xs text-blue-200 mt-2">
                      ID: {projectInfo.projectId} | Hub: {projectInfo.actualHubId || projectInfo.hubId || 'Unknown'}
                    </div>
                    {projectInfo.description && (
                      <div className="text-xs text-blue-300 mt-1">{projectInfo.description}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="p-3 hover:bg-white hover:bg-opacity-20 rounded-full transition-all duration-200 backdrop-blur-sm"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Modern Search Bar */}
        <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500" />
            <input
              type="text"
              placeholder="Search folders and files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all duration-200"
            />
          </div>
        </div>

        {/* Modern Breadcrumb Navigation */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm">
              <button
                onClick={() => {
                  setCurrentPath([]);
                  loadFolderContents();
                }}
                className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Folder className="w-4 h-4 mr-1" />
                Root
              </button>
            {currentPath.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <ChevronRight className="w-4 h-4 text-blue-400" />
                <button
                  onClick={async () => {
                    // Prevent multiple rapid clicks
                    if (isNavigating || loading) {
                      console.log('⚠️ Navigation in progress, ignoring breadcrumb click');
                      return;
                    }
                    
                    const newPath = currentPath.slice(0, index + 1);
                    console.log('📁 Breadcrumb navigation to:', folder.name, 'Path:', newPath.map(f => f.name));
                    console.log('📁 Current path length:', currentPath.length, 'New path length:', newPath.length);
                    console.log('📁 Current last folder ID:', currentPath[currentPath.length - 1]?.id);
                    console.log('📁 Target folder ID:', folder.id);
                    
                    // Check if we're already at this level to prevent redundant navigation
                    if (currentPath.length === newPath.length &&
                        currentPath[currentPath.length - 1]?.id === folder.id) {
                      console.log('⚠️ Already at this folder level, skipping navigation');
                      return;
                    }
                    
                    setIsNavigating(true);
                    setLoading(true);
                    
                    try {
                      setCurrentPath(newPath);
                      // Use setTimeout to prevent blocking the UI and improve performance
                      setTimeout(() => loadFolderContents(folder.id), 0);
                    } finally {
                      setIsNavigating(false);
                    }
                  }}
                  className="flex items-center px-3 py-1 bg-white text-blue-700 rounded-full hover:bg-blue-100 transition-colors shadow-sm border border-blue-200"
                >
                  <Folder className="w-4 h-4 mr-1" />
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  console.log('🧹 Clearing path and resetting to root');
                  setCurrentPath([]);
                  loadFolderContents();
                }}
                className="flex items-center px-3 py-1 text-xs bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
                title="Clear path and reset to root"
              >
                <X className="w-3 h-3 mr-1" />
                Reset
              </button>
            </div>
          </div>
        </div>


        {/* Modern File Browser Content */}
        <div className="flex-1 overflow-auto bg-gradient-to-b from-gray-50 to-white">
          {/* Windows-style Header */}
          <div className="bg-white border-b border-gray-200 px-4 py-2">
            <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <div className="col-span-6 flex items-center">
                <span className="mr-2">📁</span>
                Name
              </div>
              <div className="col-span-2 text-center">Type</div>
              <div className="col-span-2 text-center">Size</div>
              <div className="col-span-2 text-center">Modified</div>
            </div>
          </div>
          
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
            ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Files</h3>
              <p className="text-red-600 mb-4">{error}</p>
              
              {error.includes('Please sign in to Autodesk first') ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
                  <h4 className="font-medium text-blue-800 mb-2">🔐 Authentication Required</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    You need to sign in to your Autodesk account to access project files.
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm text-blue-700 font-medium">To fix this:</p>
                    <ol className="text-sm text-blue-700 space-y-1 ml-4">
                      <li>1. Close this dialog</li>
                      <li>2. Go to the main Zoyantra app</li>
                      <li>3. Sign in to your Autodesk account</li>
                      <li>4. Select a project from the Project Management tab</li>
                      <li>5. Come back and try again</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
                  <h4 className="font-medium text-yellow-800 mb-2">Troubleshooting Steps:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Ensure you're logged in with a valid Autodesk account</li>
                    <li>• Check that API access is enabled in your ACC account</li>
                    <li>• Verify you have permission to access this project</li>
                    <li>• Make sure the project has files uploaded</li>
                  </ul>
                </div>
              )}
              
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={() => loadFolderContents()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Folders */}
              {filteredFolders.map((folder, index) => (
                <motion.div
                  key={`folder-${folder.id}-${folder.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="grid grid-cols-12 gap-4 items-center p-3 hover:bg-blue-50 rounded-lg cursor-pointer group border border-transparent hover:border-blue-200 transition-all duration-200"
                  onClick={() => handleFolderClick(folder)}
                >
                  <div className="col-span-6 flex items-center">
                    <Folder className="w-5 h-5 text-blue-500 mr-3" />
                    <span className="text-gray-900 font-medium truncate">{folder.name}</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Folder</span>
                  </div>
                  <div className="col-span-2 text-center text-gray-500 text-sm">--</div>
                  <div className="col-span-2 text-center text-gray-500 text-sm">--</div>
                </motion.div>
              ))}

              {/* Files */}
              {filteredFiles.map((file, index) => (
                <motion.div
                  key={`file-${file.id}-${file.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`grid grid-cols-12 gap-4 items-center p-3 rounded-lg cursor-pointer group border transition-all duration-200 ${
                    selectedFileIds.has(file.id) 
                      ? 'bg-indigo-50 border-indigo-300 shadow-md' 
                      : 'hover:bg-gray-50 border-transparent hover:border-gray-200'
                  }`}
                  onClick={() => handleFileClick(file)}
                >
                  <div className="col-span-6 flex items-center">
                    <div className="mr-3">
                      {getFileIcon(file.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <span className="text-gray-900 font-medium truncate">{file.name}</span>
                        {selectedFileIds.has(file.id) && (
                          <Check className="w-4 h-4 text-indigo-600 ml-2 flex-shrink-0" />
                        )}
                      </div>
                      
                      {/* Version Selection Dropdown */}
                      {fileVersions[file.id] && fileVersions[file.id].length > 1 && (
                        <div className="mt-2">
                          <select
                            value={selectedVersions[file.id]?.id || ''}
                            onChange={(e) => {
                              const selectedVersion = fileVersions[file.id].find(v => v.id === e.target.value);
                              setSelectedVersions(prev => ({
                                ...prev,
                                [file.id]: selectedVersion
                              }));
                            }}
                            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {fileVersions[file.id].map((version, idx) => (
                              <option key={version.id} value={version.id}>
                                Version {version.attributes?.versionNumber || idx + 1}
                                {version.attributes?.createTime && ` (${new Date(version.attributes.createTime).toLocaleDateString()})`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {/* Version Loading Indicator */}
                      {loadingVersions.has(file.id) && (
                        <div className="mt-2 flex items-center text-xs text-gray-500">
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          Loading versions...
                        </div>
                      )}
                      
                      {/* Single Version Indicator */}
                      {fileVersions[file.id] && fileVersions[file.id].length === 1 && (
                        <div className="mt-2 text-xs text-gray-500">
                          Version {fileVersions[file.id][0].attributes?.versionNumber || 1}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {getFileExtension(file.name).toUpperCase()}
                    </span>
                  </div>
                  <div className="col-span-2 text-center text-gray-500 text-sm">
                    {file.size || 'Unknown'}
                  </div>
                  <div className="col-span-2 text-center text-gray-500 text-sm">
                    {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : '--'}
                  </div>
                </motion.div>
              ))}

              {filteredFolders.length === 0 && filteredFiles.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📁</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Project is Empty</h3>
                  <p className="text-gray-600 mb-6">This project doesn't have any files yet.</p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
                    <h4 className="font-medium text-blue-800 mb-2">Next Steps:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Upload files to your ACC project</li>
                      <li>• Files will appear here once uploaded</li>
                      <li>• You can organize files in folders</li>
                      <li>• Use the ACC web interface to upload files</li>
                    </ul>
                  </div>
                  
                  <div className="flex space-x-3 justify-center">
                    <button
                      onClick={() => loadFolderContents()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
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
              )}
            </div>
          )}
          </div>
        </div>

        {/* Modern Colorful Footer */}
        {multiSelect && (
          <div className="flex items-center justify-between p-6 border-t bg-gradient-to-r from-gray-50 to-blue-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Check className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-sm font-medium text-gray-700">
                {selectedFileIds.size} file{selectedFileIds.size !== 1 ? 's' : ''} selected
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSelectFiles}
                disabled={selectedFileIds.size === 0}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                Select Files ({selectedFileIds.size})
              </button>
            </div>
          </div>
        )}
      </motion.div>

    </div>
  );
};

export default AccFolderBrowser;
