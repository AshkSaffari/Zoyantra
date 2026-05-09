import React, { useState, useEffect } from 'react';
import { Search, Building2, Calendar, MapPin, CheckCircle, Clock, CalendarDays } from 'lucide-react';
import AccService from '../services/AccService';

const ProjectList = ({ projects, selectedProject, onProjectSelect, credentials }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [detailedProjects, setDetailedProjects] = useState({});

  // Debug logging
  console.log('🔍 ProjectList props:', { 
    projectsCount: projects?.length, 
    selectedProject: selectedProject?.id, 
    hasOnProjectSelect: !!onProjectSelect,
    credentials: !!credentials 
  });

  const filteredProjects = projects.filter(project =>
    project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.jobNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch detailed project data for all projects
  const fetchAllProjectDetails = async () => {
    if (!projects || projects.length === 0) return;
    
    console.log('🔍 Fetching detailed project data for all projects...');
    console.log('🔍 Credentials object:', credentials);
    console.log('🔍 Account ID:', credentials?.accountId);
    
    const promises = projects.map(async (project) => {
      if (!detailedProjects[project.id]) {
        try {
          const details = await AccService.getProjectDetails(project.id, project.type, credentials.accountId);
          if (details) {
            setDetailedProjects(prev => ({ ...prev, [project.id]: details }));
          }
        } catch (error) {
          console.error(`Error fetching details for project ${project.id}:`, error);
        }
      }
    });
    
    await Promise.all(promises);
  };

  // Fetch detailed project data for a specific project
  const fetchProjectDetails = async (projectId) => {
    if (detailedProjects[projectId]) {
      return detailedProjects[projectId];
    }
    
    // Find the project to get its type
    const project = projects.find(p => p.id === projectId);
    const projectType = project?.type;
    
    try {
      console.log(`🔍 Fetching detailed project data for: ${projectId}`);
      const details = await AccService.getProjectDetails(projectId, projectType, credentials.accountId);
      if (details) {
        setDetailedProjects(prev => ({ ...prev, [projectId]: details }));
        return details;
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    }
    return null;
  };

  // Auto-fetch detailed project data when projects change
  useEffect(() => {
    if (projects && projects.length > 0) {
      fetchAllProjectDetails();
    }
  }, [projects]);


  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {searchTerm ? 'No Projects Found' : 'No Projects Available'}
            </h3>
            <p className="text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Projects will appear here once loaded.'}
            </p>
          </div>
        ) : (
          filteredProjects.map((project, index) => {
            const colors = [
              { bg: 'from-blue-500 to-cyan-500', light: 'from-blue-50 to-cyan-50', accent: 'blue' },
              { bg: 'from-purple-500 to-pink-500', light: 'from-purple-50 to-pink-50', accent: 'purple' },
              { bg: 'from-green-500 to-emerald-500', light: 'from-green-50 to-emerald-50', accent: 'green' },
              { bg: 'from-orange-500 to-red-500', light: 'from-orange-50 to-red-50', accent: 'orange' },
              { bg: 'from-indigo-500 to-blue-500', light: 'from-indigo-50 to-blue-50', accent: 'indigo' },
              { bg: 'from-pink-500 to-rose-500', light: 'from-pink-50 to-rose-50', accent: 'pink' },
              { bg: 'from-teal-500 to-green-500', light: 'from-teal-50 to-green-50', accent: 'teal' },
              { bg: 'from-yellow-500 to-orange-500', light: 'from-yellow-50 to-orange-50', accent: 'yellow' }
            ];
            const colorScheme = colors[index % colors.length];
            const isSelected = selectedProject?.id === project.id;

            return (
            <div
              key={project.id}
              onClick={() => {
                console.log('🖱️ Project clicked:', project);
                console.log('🖱️ onProjectSelect function:', onProjectSelect);
                if (onProjectSelect) {
                  onProjectSelect(project);
                } else {
                  console.error('❌ onProjectSelect function is not defined!');
                }
              }}
                className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.01] flex items-center justify-between ${
                  isSelected
                    ? `bg-gradient-to-r ${colorScheme.bg} text-white shadow-lg border-2 border-white/30`
                    : `bg-gradient-to-r ${colorScheme.light} hover:shadow-md border-2 border-transparent hover:border-${colorScheme.accent}-200`
                }`}
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                )}

                {/* Left Side - Project Info */}
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-white/20' : `bg-gradient-to-r ${colorScheme.bg}`
                  }`}>
                    <Building2 className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-white'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-semibold break-words leading-tight ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                      {project.name || 'Unnamed Project'}
                    </h4>
                    {project.jobNumber && (
                      <p className={`text-xs ${isSelected ? 'text-blue-100' : 'text-gray-600'} truncate`}>
                        Job #: {project.jobNumber}
                      </p>
                    )}
                  </div>
                </div>


                {/* Right Side - Status */}
                <div className="flex items-center space-x-3">
                  {project.status && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      project.status === 'active' 
                        ? isSelected 
                          ? 'bg-green-400 text-white' 
                          : 'bg-green-100 text-green-800'
                        : project.status === 'pending' 
                        ? isSelected 
                          ? 'bg-yellow-400 text-white' 
                          : 'bg-yellow-100 text-yellow-800'
                        : isSelected 
                          ? 'bg-gray-400 text-white' 
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      <div className={`w-2 h-2 rounded-full mr-1 ${
                        project.status === 'active' ? 'bg-green-500' : 
                        project.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`}></div>
                      {project.status}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProjectList;