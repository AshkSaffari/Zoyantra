import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, 
  Upload, 
  Download, 
  RefreshCw, 
  Settings, 
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Home,
  Layers,
  Info
} from 'lucide-react';
import AccService from '../services/AccService';

const ModelViewerTab = ({ selectedProject, selectedHub }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerSettings, setViewerSettings] = useState({
    showGrid: true,
    showAxes: true,
    showBoundingBox: true,
    backgroundColor: '#f0f0f0'
  });
  const viewerContainerRef = useRef(null);

  useEffect(() => {
    if (selectedProject?.id) {
      loadModels();
    }
  }, [selectedProject?.id]);

  useEffect(() => {
    if (selectedModel && viewerContainerRef.current) {
      initializeViewer();
    }
  }, [selectedModel]);

  const loadModels = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading models for project:', selectedProject.id);
      
      // Get project folders to find models
      const folders = await AccService.getProjectFolders(selectedProject.id);
      const models = [];
      
      // Process folders to find model files
      for (const folder of folders) {
        try {
          const contents = await AccService.getFolderContents(selectedProject.id, folder.id);
          
          for (const item of contents.data || []) {
            if (item.type === 'items') {
              // Get tip version for proper URN
              const tipData = await AccService.getItemTipVersion(selectedProject.id, item.id);
              const urn = tipData?.data?.relationships?.derivatives?.data?.id;
              
              if (urn) {
                models.push({
                  id: item.id,
                  name: item.attributes?.displayName || 'Unnamed Model',
                  urn: urn,
                  folder: folder.attributes?.name || 'Root',
                  type: item.attributes?.extension?.type || 'Unknown',
                  created: item.attributes?.createTime,
                  size: item.attributes?.storageSize
                });
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ Error processing folder:', folder.id, error);
        }
      }
      
      setModels(models);
      console.log(`✅ Loaded ${models.length} models`);
      
    } catch (error) {
      console.error('❌ Error loading models:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeViewer = async () => {
    if (!selectedModel || !viewerContainerRef.current) return;

    try {
      console.log('🔄 Initializing APS Model Viewer...');
      
      // Get access token
      const tokenResponse = await AccService.getAccessToken();
      const accessToken = tokenResponse.access_token;
      
      // Clear previous viewer
      if (viewer) {
        viewer.finish();
        setViewer(null);
      }
      
      // Initialize the viewer
      const options = {
        env: 'AutodeskProduction',
        api: 'streamingV2', // Use latest API as per documentation
        accessToken: accessToken,
        documentId: selectedModel.urn
      };
      
      // Create viewer instance
      const newViewer = new Autodesk.Viewing.GuiViewer3D(viewerContainerRef.current);
      
      // Configure viewer settings
      newViewer.setBackgroundColor(viewerSettings.backgroundColor);
      
      // Initialize the viewer
      Autodesk.Viewing.Initializer(options, () => {
        newViewer.start();
        
        // Load the document
        const documentId = selectedModel.urn;
        Autodesk.Viewing.Document.load(documentId, (doc) => {
          const viewables = doc.getRoot().getDefaultGeometry();
          if (viewables) {
            newViewer.loadDocumentNode(doc, viewables).then(() => {
              console.log('✅ Model loaded successfully');
              
              // Apply viewer settings
              if (viewerSettings.showGrid) {
                newViewer.setGroundShadow(true);
              }
              
              setViewer(newViewer);
            });
          }
        }, (error) => {
          console.error('❌ Error loading document:', error);
        });
      });
      
    } catch (error) {
      console.error('❌ Error initializing viewer:', error);
    }
  };

  const uploadModel = async (file) => {
    try {
      console.log('🔄 Uploading model file:', file.name);
      
      // Create OSS bucket if needed
      const bucketKey = `zoyantra-models-${selectedProject.id}`;
      
      try {
        await AccService.getOSSBucketDetails(bucketKey);
      } catch (error) {
        // Bucket doesn't exist, create it
        await AccService.createOSSBucket(bucketKey, 'transient');
      }
      
      // Upload file to OSS
      const uploadResult = await AccService.uploadFileToOSS(bucketKey, file.name, file);
      
      // Translate the model for viewing
      const translateResult = await AccService.translateModel(uploadResult.objectId);
      
      console.log('✅ Model uploaded and translated successfully');
      loadModels(); // Refresh models list
      
    } catch (error) {
      console.error('❌ Error uploading model:', error);
      alert('Failed to upload model. Check console for details.');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      uploadModel(file);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const resetView = () => {
    if (viewer) {
      viewer.fitToView();
    }
  };

  const zoomIn = () => {
    if (viewer) {
      viewer.navigation.zoomIn();
    }
  };

  const zoomOut = () => {
    if (viewer) {
      viewer.navigation.zoomOut();
    }
  };

  const homeView = () => {
    if (viewer) {
      viewer.navigation.goHome();
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">3D Model Viewer</h2>
          <p className="text-gray-600">View and interact with BIM models from ACC projects</p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            Upload Model
            <input
              type="file"
              accept=".rvt,.dwg,.fbx,.obj,.3ds,.dae,.ifc"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={loadModels}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Models List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Available Models</h3>
            </div>
            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading models...</span>
                </div>
              ) : models.length === 0 ? (
                <div className="text-center py-8">
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No models found in this project.</p>
                  <p className="text-sm text-gray-500 mt-2">Upload a model to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {models.map((model) => (
                    <div
                      key={model.id}
                      onClick={() => setSelectedModel(model)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedModel?.id === model.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 truncate">{model.name}</h4>
                        <span className="text-xs text-gray-500">{model.type}</span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center">
                          <Layers className="w-3 h-3 mr-1" />
                          <span>{model.folder}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>{formatDate(model.created)}</span>
                        </div>
                        {model.size && (
                          <div className="flex items-center">
                            <Info className="w-3 h-3 mr-1" />
                            <span>{formatFileSize(model.size)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Viewer */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedModel ? selectedModel.name : 'Select a Model'}
              </h3>
              {selectedModel && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={homeView}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                    title="Home View"
                  >
                    <Home className="w-4 h-4" />
                  </button>
                  <button
                    onClick={resetView}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                    title="Reset View"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={zoomIn}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={zoomOut}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
            <div className="p-4">
              {selectedModel ? (
                <div 
                  ref={viewerContainerRef}
                  className="w-full h-96 bg-gray-100 rounded-lg"
                  style={{ minHeight: '400px' }}
                />
              ) : (
                <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">Select a model to view</p>
                    <p className="text-gray-500 text-sm mt-2">Choose a model from the list to start viewing</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Viewer Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Viewer Settings</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showGrid"
                checked={viewerSettings.showGrid}
                onChange={(e) => setViewerSettings({...viewerSettings, showGrid: e.target.checked})}
                className="mr-3"
              />
              <label htmlFor="showGrid" className="text-sm font-medium text-gray-700">
                Show Grid
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showAxes"
                checked={viewerSettings.showAxes}
                onChange={(e) => setViewerSettings({...viewerSettings, showAxes: e.target.checked})}
                className="mr-3"
              />
              <label htmlFor="showAxes" className="text-sm font-medium text-gray-700">
                Show Axes
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showBoundingBox"
                checked={viewerSettings.showBoundingBox}
                onChange={(e) => setViewerSettings({...viewerSettings, showBoundingBox: e.target.checked})}
                className="mr-3"
              />
              <label htmlFor="showBoundingBox" className="text-sm font-medium text-gray-700">
                Show Bounding Box
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelViewerTab;
