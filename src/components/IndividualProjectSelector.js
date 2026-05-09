import React, { useState, useEffect } from 'react';
import { Building2, FolderOpen, Loader2, AlertCircle } from 'lucide-react';
import AccService from '../services/AccService';

const IndividualProjectSelector = ({ onProjectSelected, onHubSelected, selectedProject, selectedHub }) => {
  const [hubs, setHubs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize AccService first
    const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
    console.log('🔑 Credentials loaded:', credentials);
    
    if (credentials.threeLegToken) {
      try {
        AccService.initialize(credentials);
        console.log('✅ AccService initialized in IndividualProjectSelector');
        loadHubs();
      } catch (error) {
        console.error('❌ Error initializing AccService:', error);
        setError(`Failed to initialize AccService: ${error.message}`);
      }
    } else {
      console.log('⚠️ No credentials found');
      setError('Please authenticate first');
    }
  }, []);

  const loadHubs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 Loading hubs...');
      const hubsData = await AccService.getHubs();
      console.log('✅ Hubs loaded:', hubsData);
      setHubs(hubsData);
    } catch (error) {
      console.error('❌ Error loading hubs:', error);
      setError(`Failed to load hubs: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHubSelect = async (hubId) => {
    console.log('🔄 Loading projects for hub:', hubId);
    try {
      setIsLoading(true);
      setError(null);
      
      const hub = hubs.find(h => h.id === hubId);
      if (!hub) {
        console.error('❌ Hub not found:', hubId);
        return;
      }
      
      console.log('🏢 Selected hub:', hub.name);
      onHubSelected(hub);
      
      console.log('🔄 Fetching projects from AccService...');
      const projectsData = await AccService.getProjects(hubId);
      console.log('📊 Projects received:', projectsData);
      
      setProjects(projectsData);
      
      onProjectSelected(null);
      
      console.log(`✅ Loaded ${projectsData.length} projects for hub: ${hub.name}`);
    } catch (error) {
      console.error('❌ Error loading projects:', error);
      setError(`Failed to load projects: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectSelect = (project) => {
    console.log('📁 Project selected:', project?.name);
    onProjectSelected(project);
  };

  if (isLoading && !selectedHub) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 text-blue-600 animate-spin mr-2" />
        <span className="text-gray-600">Loading hubs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hub Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Building2 className="w-4 h-4 inline mr-1" />
          Select Hub
        </label>
        <select
          value={selectedHub?.id || ''}
          onChange={(e) => handleHubSelect(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Choose a hub...</option>
          {hubs.map(hub => (
            <option key={hub.id} value={hub.id}>
              {hub.name}
            </option>
          ))}
        </select>
      </div>

      {/* Project Selection */}
      {selectedHub && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FolderOpen className="w-4 h-4 inline mr-1" />
            Select Project
            {isLoading && <Loader2 className="w-4 h-4 inline ml-2 animate-spin" />}
          </label>
          <select
            value={selectedProject?.id || ''}
            onChange={(e) => {
              const project = projects.find(p => p.id === e.target.value);
              handleProjectSelect(project);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value="">Choose a project...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Selected Project Info */}
      {selectedProject && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center">
            <FolderOpen className="w-4 h-4 text-blue-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-900">{selectedProject.name}</p>
              <p className="text-xs text-blue-600">{selectedHub?.name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndividualProjectSelector;
