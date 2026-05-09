import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown, Loader2, AlertCircle, Search, ArrowUpDown } from 'lucide-react';
import AccService from '../services/AccService_old';

const ProjectSelector = ({ selectedHub, selectedProject, projects, onHubSelect, onProjectSelect, credentials }) => {
  const [hubs, setHubs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [hubSearchTerm, setHubSearchTerm] = useState('');
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [hubSortOrder, setHubSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [projectSortOrder, setProjectSortOrder] = useState('asc'); // 'asc' or 'desc'
  
  // Create AccService instance
  const [accService] = useState(() => new AccService());

  useEffect(() => {
    if (credentials && credentials.threeLegToken) {
      loadHubs();
    }
  }, [credentials]);

  const loadHubs = async () => {
    console.log('🔄 Loading hubs...', { credentials: !!credentials, threeLegToken: !!credentials?.threeLegToken });
    setIsLoading(true);
    setError(null);
    
    try {
      // Get hubs using static method
      console.log('🔍 Loading hubs with static AccService...');
      let hubsData = await AccService.getHubs();
      
      // Add region information to each hub
      const hubsWithRegion = hubsData.map(hub => {
        const regionInfo = AccService.getHubRegionInfo(hub);
        return {
          ...hub,
          regionInfo: regionInfo
        };
      });
      
      console.log('✅ Hubs loaded in ProjectSelector:', hubsWithRegion);
      console.log('📊 Number of hubs received:', hubsWithRegion.length);
      console.log('📋 Hub names with regions:', hubsWithRegion.map(h => `${h.attributes?.name || h.name || 'Unnamed'} (${h.regionInfo.region})`));
      console.log('📋 Detailed hub data:', hubsWithRegion.map(hub => ({
        id: hub.id,
        name: hub.attributes?.name || hub.name,
        type: hub.type,
        region: hub.regionInfo.region,
        regionFlag: hub.regionInfo.flag,
        regionName: hub.regionInfo.name,
        dataCenter: hub.regionInfo.dataCenter,
        attributes: hub.attributes
      })));
      setHubs(hubsWithRegion);
    } catch (err) {
      console.error('❌ Error loading hubs:', err);
      setError(err.message || 'Failed to load hubs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHubSelect = (hub) => {
    onHubSelect(hub);
    setIsHubOpen(false);
    setHubSearchTerm(''); // Clear search when selecting
  };

  const handleProjectSelect = (project) => {
    onProjectSelect(project);
    setIsProjectOpen(false);
    setProjectSearchTerm(''); // Clear search when selecting
  };

  const handleRefresh = () => {
    loadHubs();
  };

  // Filter and sort hubs
  const filteredAndSortedHubs = (hubs || [])
    .filter(hub => {
      const hubName = (hub?.attributes?.name || hub?.name || '').toLowerCase();
      const hubRegion = (hub?.attributes?.region || hub?.region || '').toLowerCase();
      const hubType = (hub?.type || '').toLowerCase();
      const searchLower = hubSearchTerm.toLowerCase();
      return hubName.includes(searchLower) || 
             hubRegion.includes(searchLower) || 
             hubType.includes(searchLower);
    })
    .sort((a, b) => {
      const nameA = a?.attributes?.name || a?.name || '';
      const nameB = b?.attributes?.name || b?.name || '';
      const comparison = nameA.localeCompare(nameB);
      return hubSortOrder === 'asc' ? comparison : -comparison;
    });

  // Debug projects data (commented out to prevent infinite loop)
  // console.log('🔍 ProjectSelector received projects:', projects);
  // console.log('📊 Projects length:', projects?.length);

  // Filter and sort projects
  const filteredAndSortedProjects = (projects || [])
    .filter(project => {
      const projectName = (project?.attributes?.name || project?.name || '').toLowerCase();
      const jobNumber = (project?.attributes?.jobNumber || project?.jobNumber || '').toLowerCase();
      const status = (project?.attributes?.status || project?.status || '').toLowerCase();
      const searchLower = projectSearchTerm.toLowerCase();
      return projectName.includes(searchLower) || 
             jobNumber.includes(searchLower) || 
             status.includes(searchLower);
    })
    .sort((a, b) => {
      const nameA = a?.attributes?.name || a?.name || '';
      const nameB = b?.attributes?.name || b?.name || '';
      const comparison = nameA.localeCompare(nameB);
      return projectSortOrder === 'asc' ? comparison : -comparison;
    });

  // console.log('📊 Filtered projects length:', filteredAndSortedProjects.length);
  // console.log('📋 Filtered projects:', filteredAndSortedProjects.map(p => ({ name: p.name, id: p.id })));

  const toggleHubSort = () => {
    setHubSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const toggleProjectSort = () => {
    setProjectSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-center">
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin mr-2" />
          <span className="text-sm text-gray-600">Loading hubs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Project Selection</h3>
        <button
          onClick={handleRefresh}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hub Selection */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hub
          </label>
          <button
            onClick={() => {
              setIsHubOpen(!isHubOpen);
              if (isHubOpen) {
                setHubSearchTerm(''); // Clear search when closing
              }
            }}
            className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <div className="flex items-center">
              <Building2 className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-900">
                {selectedHub ? (
                  <span className="flex items-center gap-2">
                    {selectedHub.regionInfo?.flag} {selectedHub.attributes?.name || selectedHub.name || 'Unnamed Hub'}
                    <span className="text-xs text-gray-500">({selectedHub.regionInfo?.name || 'Unknown Region'})</span>
                  </span>
                ) : 'Select a hub...'}
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isHubOpen ? 'rotate-180' : ''}`} />
          </button>

          {isHubOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
              {/* Search bar for hubs */}
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search hubs..."
                    value={hubSearchTerm}
                    onChange={(e) => setHubSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {filteredAndSortedHubs.length} hub{filteredAndSortedHubs.length !== 1 ? 's' : ''} found
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHubSort();
                    }}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    {hubSortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                  </button>
                </div>
              </div>
              
              <div className="max-h-48 overflow-auto">
                {filteredAndSortedHubs.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    {hubSearchTerm ? 'No hubs match your search' : 'No hubs available'}
                  </div>
                ) : (
                  filteredAndSortedHubs.map((hub) => (
                    <button
                      key={hub.id}
                      onClick={() => handleHubSelect(hub)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        selectedHub?.id === hub.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {hub.regionInfo?.flag} {hub.attributes?.name || hub.name || 'Unnamed Hub'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {hub.regionInfo?.name || 'Unknown Region'} • {hub.regionInfo?.dataCenter || 'Unknown Data Center'} • {hub.type || 'Unknown Type'}
                          </div>
                        </div>
                        {selectedHub?.id === hub.id && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Project Selection */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project
          </label>
          <button
            onClick={() => {
              setIsProjectOpen(!isProjectOpen);
              if (isProjectOpen) {
                setProjectSearchTerm(''); // Clear search when closing
              }
            }}
            disabled={!selectedHub}
            className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center">
              <Building2 className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-900">
                {selectedProject ? selectedProject.name : 'Select a project...'}
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isProjectOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProjectOpen && selectedHub && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
              {/* Search bar for projects */}
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearchTerm}
                    onChange={(e) => setProjectSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {filteredAndSortedProjects.length} project{filteredAndSortedProjects.length !== 1 ? 's' : ''} found
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleProjectSort();
                    }}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    {projectSortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                  </button>
                </div>
              </div>
              
              <div className="max-h-48 overflow-auto">
                {filteredAndSortedProjects.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    {projectSearchTerm ? 'No projects match your search' : 'No projects available'}
                  </div>
                ) : (
                  filteredAndSortedProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelect(project)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        selectedProject?.id === project.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <div className="font-medium">{project.name}</div>
                            {(() => {
                              // For CEWA hub, all projects are ACC projects with Cost Management enabled
                              const isACC = true; // CEWA projects are all ACC
                              return isACC ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  ACC
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  BIM 360
                                </span>
                              );
                            })()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {project.jobNumber} • {project.status}
                          </div>
                        </div>
                        {selectedProject?.id === project.id && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Project Status Bar - Hidden per user request */}
      {false && selectedProject && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <Building2 className="h-4 w-4 text-green-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-900">
                Project: {selectedProject.name}
              </p>
              <p className="text-xs text-green-600">
                {selectedProject.jobNumber} • {selectedProject.status}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSelector;