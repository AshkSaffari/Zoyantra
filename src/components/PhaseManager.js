import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertCircle, CheckCircle, Plus, Trash2, Calendar, FileText, Download, Clock, Target, TrendingUp, BarChart3, Sparkles } from 'lucide-react';
import LocalPhaseService from '../services/LocalPhaseService';

const PhaseManager = ({ project, onPhaseUpdate, credentials }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('');
  const [availablePhases, setAvailablePhases] = useState([]);
  const [projectPhases, setProjectPhases] = useState([]);
  const [newPhase, setNewPhase] = useState('');
  const [newPhaseDate, setNewPhaseDate] = useState('');

  useEffect(() => {
    if (project) {
      console.log('PhaseManager: Project selected:', project);
      console.log('PhaseManager: Credentials available:', !!credentials?.threeLegToken);
      
      // Load current phase from local storage
      const savedPhase = LocalPhaseService.getProjectPhase(project.id);
      setCurrentPhase(savedPhase);
      
      // Load all phases for this project
      loadProjectPhases();
      loadAvailablePhases();
    }
  }, [project]);

  const loadAvailablePhases = () => {
    try {
      const phases = LocalPhaseService.getAvailablePhases();
      setAvailablePhases(phases);
    } catch (err) {
      console.error('Error loading phases:', err);
      // Continue without phases if loading fails
    }
  };

  const loadProjectPhases = () => {
    try {
      const allPhases = LocalPhaseService.getAllProjectPhases(project.id);
      setProjectPhases(allPhases);
    } catch (err) {
      console.error('Error loading project phases:', err);
      setProjectPhases([]);
    }
  };


  const handleAddPhase = () => {
    console.log('🔄 Add Phase clicked:', { newPhase, newPhaseDate, projectPhasesLength: projectPhases.length });
    
    if (!newPhase || !newPhaseDate) {
      console.log('❌ Validation failed: missing phase or date');
      setError('Please select both phase and date');
      return;
    }

    if (projectPhases.length >= 7) {
      console.log('❌ Validation failed: too many phases');
      setError('Maximum 7 phases allowed per project');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Add new phase with custom date
      const phaseData = {
        phase: newPhase,
        dateSet: newPhaseDate,
        timestamp: new Date().toISOString(),
        isCurrent: false
      };

      console.log('📝 Adding phase data:', phaseData);
      console.log('📝 Project ID:', project.id);

      // Update the service to handle custom dates
      LocalPhaseService.addPhaseWithDate(project.id, phaseData);
      
      // Automatically set this as the current phase (last added by time)
      LocalPhaseService.setProjectPhase(project.id, newPhase);
      
      // Update the current phase display
      setCurrentPhase(newPhase);
      
      console.log('✅ Phase added to service, reloading phases...');
      
      // Reload phases
      loadProjectPhases();
      
      // Clear form
      setNewPhase('');
      setNewPhaseDate('');
      
      setSuccess(true);
      console.log(`✅ Phase added and set as current for project ${project.id}: ${newPhase} on ${newPhaseDate}`);
      
      // Notify parent component
      onPhaseUpdate(project.id, newPhase);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('❌ Error adding phase:', err);
      setError('Failed to add phase');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePhase = (index) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Remove the phase
      LocalPhaseService.removePhaseByIndex(project.id, index);
      
      // Reload phases and current phase
      loadProjectPhases();
      
      // Get updated current phase
      const updatedCurrentPhase = LocalPhaseService.getProjectPhase(project.id);
      setCurrentPhase(updatedCurrentPhase);
      
      // Notify parent component
      onPhaseUpdate(project.id, updatedCurrentPhase);
      
      setSuccess(true);
      console.log(`Phase removed from project ${project.id}`);
      
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error removing phase:', err);
      setError('Failed to remove phase');
    } finally {
      setIsLoading(false);
    }
  };


  const handleGeneratePDF = async () => {
    if (!project || !currentPhase) {
      setError('No project or phase selected for report generation');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Project Phase Report', pageWidth / 2, 30, { align: 'center' });
      
      // Subtitle
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, 40, { align: 'center' });
      
      // Project Information
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Project Information', 20, 60);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Project Name: ${project.name || 'Unnamed Project'}`, 20, 75);
      doc.text(`Project ID: ${project.id}`, 20, 85);
      doc.text(`Current Phase: ${currentPhase}`, 20, 95);
      doc.text(`Status: ${project.status || 'N/A'}`, 20, 105);
      
      
      // Phase History
      if (projectPhases.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Phase History', 20, 145);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        let currentY = 160;
        projectPhases.forEach((phaseData, index) => {
          if (currentY > pageHeight - 30) {
            doc.addPage();
            currentY = 30;
          }
          
          const phaseText = `${index + 1}. ${phaseData.phase} - ${phaseData.dateSet}`;
          doc.text(phaseText, 20, currentY);
          currentY += 10;
        });
      }
      
      // Summary
      let summaryY = 160;
      if (projectPhases.length > 0) {
        summaryY = 160 + (projectPhases.length * 10) + 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text('Summary:', 20, summaryY);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Phases: ${projectPhases.length}`, 20, summaryY + 10);
      doc.text(`Current Phase: ${currentPhase}`, 20, summaryY + 20);
      
      // Generate filename
      const fileName = `${project.name?.replace(/[^a-z0-9]/gi, '_') || 'project'}-phase-report-${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Save the PDF
      doc.save(fileName);
      
      setSuccess('PDF report generated successfully!');
      console.log(`✅ PDF report generated for project ${project.id}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (err) {
      console.error('❌ Error generating PDF:', err);
      setError('Failed to generate PDF report');
    } finally {
      setIsLoading(false);
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-white/20">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Project Selected</h3>
              <p className="text-gray-500">Please select a project to manage its phases</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Project Phase Management
          </h1>
          <p className="text-gray-600 text-lg">Track and manage project phases with style</p>
      </div>

        {/* Project Info Card */}
        <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-white/20">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl flex items-center justify-center mr-4">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Project Information</h3>
              <p className="text-gray-600">Managing phases for: <strong className="text-blue-600">{project.name}</strong></p>
            </div>
          </div>

          {/* Status Messages */}
      {error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl shadow-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                <div>
                  <p className="text-sm font-semibold text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl shadow-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-semibold text-green-800">
                {success}
              </p>
            </div>
          </div>
        </div>
      )}

        {/* Current Phase Display */}
          <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-white/20">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-lg flex items-center justify-center mr-4">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Current Phase Status</h3>
                <p className="text-gray-600">Track your project's current phase</p>
              </div>
            </div>

        {currentPhase && currentPhase !== 'Not Set' ? (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                    <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full mr-4 animate-pulse"></div>
                <div>
                      <p className="text-sm font-medium text-green-700">Current Phase</p>
                      <p className="text-2xl font-bold text-green-800">{currentPhase}</p>
                    </div>
                  </div>
                  <div className="text-sm text-green-600 bg-green-100 px-4 py-2 rounded-xl font-semibold">
                    ✅ Active
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-400 rounded-full mr-4"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Current Phase</p>
                    <p className="text-2xl font-bold text-gray-500">Not Set</p>
                    <p className="text-sm text-gray-500 mt-1">Add a phase below to set it as current</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Add New Phase Section */}
          <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-white/20">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-red-500 rounded-lg flex items-center justify-center mr-4">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Add New Phase</h3>
                <p className="text-gray-600">Create a new phase with custom date</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Phase Type
              </label>
              <select
                value={newPhase}
                onChange={(e) => setNewPhase(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white/80 backdrop-blur-sm"
              >
                <option value="">Select phase...</option>
                {availablePhases.map((phase) => (
                  <option key={phase} value={phase}>
                    {phase}
                  </option>
                ))}
              </select>
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Phase Date
              </label>
              <input
                type="date"
                value={newPhaseDate}
                onChange={(e) => setNewPhaseDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white/80 backdrop-blur-sm"
              />
            </div>
          </div>

          <button
            onClick={handleAddPhase}
            disabled={isLoading || !newPhase || !newPhaseDate || projectPhases.length >= 7}
              className="w-full flex justify-center items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-2xl text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:transform-none"
          >
            {isLoading ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                  Adding Phase...
                </>
            ) : (
              <>
                  <Plus className="h-5 w-5 mr-3" />
                Add Phase ({projectPhases.length}/7)
              </>
            )}
          </button>
        </div>

        {/* Project Phases List */}
          <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-white/20">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center mr-4">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Project Phases Timeline</h3>
                <p className="text-gray-600">Track all phases for this project ({projectPhases.length}/7)</p>
              </div>
            </div>

            {projectPhases.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <p className="text-lg text-gray-500 font-medium">No phases added yet</p>
                <p className="text-sm text-gray-400 mt-2">Add your first phase above to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Phase List as Dropdown/Select */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg overflow-hidden">
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                    <h4 className="text-lg font-semibold text-indigo-800 flex items-center">
                      <Target className="h-5 w-5 mr-2" />
                      Project Phases Timeline
                    </h4>
                    <p className="text-sm text-indigo-600 mt-1">Click on any phase to view details</p>
                  </div>
                  
                  <div className="max-h-80 overflow-y-auto">
                    {projectPhases.map((phaseData, index) => {
                      const phaseColors = [
                        { bg: 'from-blue-500 to-cyan-500', text: 'text-blue-700', light: 'from-blue-50 to-cyan-50' },
                        { bg: 'from-green-500 to-emerald-500', text: 'text-green-700', light: 'from-green-50 to-emerald-50' },
                        { bg: 'from-yellow-500 to-orange-500', text: 'text-yellow-700', light: 'from-yellow-50 to-orange-50' },
                        { bg: 'from-purple-500 to-pink-500', text: 'text-purple-700', light: 'from-purple-50 to-pink-50' },
                        { bg: 'from-indigo-500 to-blue-500', text: 'text-indigo-700', light: 'from-indigo-50 to-blue-50' },
                        { bg: 'from-pink-500 to-rose-500', text: 'text-pink-700', light: 'from-pink-50 to-rose-50' },
                        { bg: 'from-teal-500 to-green-500', text: 'text-teal-700', light: 'from-teal-50 to-green-50' }
                      ];
                      const colorScheme = phaseColors[index % phaseColors.length];
                      const isCurrent = phaseData.isCurrent;
                      
                      return (
                        <div 
                          key={index} 
                          className={`group relative p-4 border-b border-gray-100 last:border-b-0 transition-all duration-300 hover:shadow-md ${
                            isCurrent 
                              ? `bg-gradient-to-r ${colorScheme.light} border-l-4 border-l-green-500` 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center flex-1">
                              {/* Phase Number Badge */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 ${
                                isCurrent 
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse' 
                                  : `bg-gradient-to-r ${colorScheme.bg}`
                              }`}>
                                {index + 1}
                              </div>
                              
                              {/* Phase Info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <h5 className={`text-lg font-semibold ${
                                    isCurrent ? 'text-green-800' : colorScheme.text
                                  }`}>
                                    {phaseData.phase}
                                  </h5>
                                  {isCurrent && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse">
                                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                      Current
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center mt-1 text-sm text-gray-600">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  <span>Added: {phaseData.dateSet}</span>
                                  {phaseData.timestamp && (
                                    <span className="ml-4 text-xs text-gray-500">
                                      {new Date(phaseData.timestamp).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={() => handleRemovePhase(index)}
                                disabled={isLoading}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                                title="Delete this phase"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Summary Footer */}
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        Total Phases: <span className="font-semibold text-gray-800">{projectPhases.length}/7</span>
                      </span>
                      <span className="text-gray-600">
                        Current: <span className="font-semibold text-green-600">{currentPhase || 'None'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* PDF Report Section */}
          <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-white/20">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-rose-500 rounded-lg flex items-center justify-center mr-4">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Project Report</h3>
                <p className="text-gray-600">Generate a comprehensive PDF report</p>
              </div>
            </div>


          <button
            onClick={handleGeneratePDF}
            disabled={isLoading || !currentPhase}
              className="w-full flex justify-center items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-2xl text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:transform-none"
          >
            {isLoading ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                  Generating Report...
                </>
            ) : (
              <>
                  <FileText className="h-5 w-5 mr-3" />
                Generate PDF Report
              </>
            )}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhaseManager;