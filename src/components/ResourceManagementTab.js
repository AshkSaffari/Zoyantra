import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Save, Edit, Trash2, Download, RefreshCw, Search, DollarSign, Users, Truck, Package, UserCheck, BarChart3, TrendingUp, AlertTriangle, CheckCircle, Target } from 'lucide-react';
import ResourceService from '../services/ResourceService';
import { safeToFixed } from '../utils/numberUtils';

const ResourceManagementTab = ({ selectedProject }) => {
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [optimizationData, setOptimizationData] = useState(null);
  const [utilizationMetrics, setUtilizationMetrics] = useState({});
  const [conflicts, setConflicts] = useState({});
  const [optimizationReport, setOptimizationReport] = useState(null);
  const [showOptimization, setShowOptimization] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const resourceService = new ResourceService();

  const [formData, setFormData] = useState({
    type: 'labour',
    name: '',
    description: '',
    defaultRate: '',
    extraHoursRate: '',
    unit: 'hour',
    projectId: selectedProject?.id || '',
    qualifications: [],
    status: 'active'
  });

  useEffect(() => {
    if (selectedProject) {
      loadResources();
    }
  }, [selectedProject]);

  useEffect(() => {
    applyFilters();
  }, [resources, searchTerm, typeFilter, statusFilter, showArchived]);

  // Load optimization data
  const loadOptimizationData = useCallback(async () => {
    if (!selectedProject) return;

    try {
      setIsLoading(true);
      
      // Load planned tasks, timesheets, and crews
      const plannedTasks = JSON.parse(localStorage.getItem('zoyantra_tasks') || '[]')
        .filter(task => task.selectedProjectId === selectedProject.id && !task.isArchived);
      
      const timesheets = JSON.parse(localStorage.getItem('zoyantra_timesheets') || '[]')
        .filter(ts => ts.projectId === selectedProject.id && !ts.isArchived);
      
      const crews = JSON.parse(localStorage.getItem('zoyantra_crews') || '[]')
        .filter(crew => crew.projectId === selectedProject.id);

      // Calculate utilization metrics
      const metrics = resourceService.calculateUtilizationMetrics(
        plannedTasks, 
        timesheets, 
        crews, 
        dateRange
      );

      // Identify conflicts
      const identifiedConflicts = resourceService.identifyConflicts(metrics);

      setUtilizationMetrics(metrics);
      setConflicts(identifiedConflicts);
      setOptimizationData({ plannedTasks, timesheets, crews });

      console.log('📊 Optimization data loaded:', {
        plannedTasks: plannedTasks.length,
        timesheets: timesheets.length,
        crews: crews.length,
        conflicts: identifiedConflicts.overloaded.length + identifiedConflicts.underloaded.length
      });

    } catch (error) {
      console.error('❌ Error loading optimization data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, dateRange]);

  // Run optimization
  const runOptimization = useCallback(async () => {
    if (!optimizationData) return;

    try {
      setIsOptimizing(true);
      
      const { plannedTasks, crews } = optimizationData;
      const optimizationResult = resourceService.autoLevelResources(
        plannedTasks, 
        crews, 
        conflicts
      );

      // Generate report
      const report = resourceService.generateOptimizationReport(
        utilizationMetrics,
        conflicts,
        optimizationResult
      );

      setOptimizationReport(report);
      console.log('✅ Optimization completed:', report.summary);

    } catch (error) {
      console.error('❌ Error running optimization:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [optimizationData, conflicts, utilizationMetrics]);

  // Load optimization data when project or date range changes
  useEffect(() => {
    if (selectedProject) {
      loadOptimizationData();
    }
  }, [selectedProject, loadOptimizationData]);

  const loadResources = () => {
    try {
      const allResources = resourceService.getAll();
      const projectResources = selectedProject 
        ? allResources.filter(resource => resource.projectId === selectedProject.id)
        : allResources;
      
      setResources(projectResources);
      console.log('📦 Loaded resources:', projectResources.length);
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };

  const applyFilters = () => {
    let filtered = resources;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(resource =>
        resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(resource => resource.type === typeFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(resource => resource.status === statusFilter);
    }

    // Filter by archived status
    if (showArchived) {
      filtered = filtered.filter(resource => resource.status === 'archived');
    } else {
      filtered = filtered.filter(resource => resource.status !== 'archived');
    }

    setFilteredResources(filtered);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a resource name');
      return;
    }

    setIsLoading(true);
    
    try {
      const resourceData = {
        ...formData,
        projectId: selectedProject?.id || null,
        defaultRate: parseFloat(formData.defaultRate) || 0,
        qualifications: formData.qualifications || []
      };

      if (editingId) {
        const updatedResource = resourceService.update(editingId, resourceData);
        setResources(prev => prev.map(r => r.id === editingId ? updatedResource : r));
        console.log('✅ Resource updated:', updatedResource);
      } else {
        const newResource = resourceService.create(resourceData);
        setResources(prev => [...prev, newResource]);
        console.log('✅ Resource created:', newResource);
      }

      // Reset form
      setFormData({
        type: 'labour',
        name: '',
        description: '',
        defaultRate: '',
        unit: 'hour',
        projectId: selectedProject?.id || '',
        qualifications: [],
        status: 'active'
      });
      setEditingId(null);
      setIsCreating(false);
      
    } catch (error) {
      console.error('Error saving resource:', error);
      alert('Error saving resource: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (resource) => {
    setFormData({
      type: resource.type,
      name: resource.name,
      description: resource.description,
      defaultRate: resource.defaultRate.toString(),
      unit: resource.unit,
      projectId: resource.projectId || '',
      qualifications: resource.qualifications || [],
      status: resource.status
    });
    setEditingId(resource.id);
    setIsCreating(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      try {
        resourceService.delete(id);
        setResources(prev => prev.filter(r => r.id !== id));
        console.log('🗑️ Resource deleted:', id);
      } catch (error) {
        console.error('Error deleting resource:', error);
        alert('Error deleting resource: ' + error.message);
      }
    }
  };

  const handleArchive = (id) => {
    if (window.confirm('Are you sure you want to archive this resource?')) {
      try {
        resourceService.update(id, { status: 'archived' });
        setResources(prev => prev.map(r => r.id === id ? { ...r, status: 'archived' } : r));
        console.log('📦 Resource archived:', id);
      } catch (error) {
        console.error('Error archiving resource:', error);
        alert('Error archiving resource: ' + error.message);
      }
    }
  };

  const handleRestore = (id) => {
    try {
      resourceService.update(id, { status: 'active' });
      setResources(prev => prev.map(r => r.id === id ? { ...r, status: 'active' } : r));
      console.log('🔄 Resource restored:', id);
    } catch (error) {
      console.error('Error restoring resource:', error);
      alert('Error restoring resource: ' + error.message);
    }
  };

  const handleExportCSV = () => {
    try {
      resourceService.exportToCSV(`resources-${selectedProject?.name || 'project'}-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('Error exporting resources:', error);
      alert('Error exporting resources: ' + error.message);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'labour': return <Users className="w-4 h-4" />;
      case 'equipment': return <Truck className="w-4 h-4" />;
      case 'material': return <Package className="w-4 h-4" />;
      case 'subcontractor': return <UserCheck className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'labour': return 'text-blue-600 bg-blue-100';
      case 'equipment': return 'text-orange-600 bg-orange-100';
      case 'material': return 'text-green-600 bg-green-100';
      case 'subcontractor': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!selectedProject) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Package className="w-5 h-5 text-yellow-600 mr-2" />
            <div>
              <p className="text-yellow-800 font-medium">Project Selection Required</p>
              <p className="text-yellow-700 text-sm mt-1">
                Please select a project to manage resources.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Resource Management</h2>
          <p className="text-gray-600">Manage labour, equipment, materials, and subcontractors</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOptimization(!showOptimization)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <BarChart3 className="w-4 h-4" />
            {showOptimization ? 'Hide Optimization' : 'Show Optimization'}
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {showArchived ? 'Show Active' : 'Show Archived'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="labour">Labour</option>
              <option value="equipment">Equipment</option>
              <option value="material">Material</option>
              <option value="subcontractor">Subcontractor</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadResources}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Optimization Panel */}
      {showOptimization && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Resource Optimization
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Date Range:</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <button
                onClick={runOptimization}
                disabled={isOptimizing || !optimizationData}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
                {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
              </button>
            </div>
          </div>

          {/* Optimization Metrics */}
          {Object.keys(utilizationMetrics).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Average Utilization</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {Object.values(utilizationMetrics).length > 0 ? 
                        safeToFixed(Object.values(utilizationMetrics).reduce((sum, m) => sum + m.weeklyStats.utilizationRate, 0) / Object.values(utilizationMetrics).length, 1) : 0}%
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Average Efficiency</p>
                    <p className="text-2xl font-bold text-green-900">
                      {Object.values(utilizationMetrics).length > 0 ? 
                        safeToFixed(Object.values(utilizationMetrics).reduce((sum, m) => sum + m.weeklyStats.efficiencyRate, 0) / Object.values(utilizationMetrics).length, 1) : 0}%
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">Overloaded Crews</p>
                    <p className="text-2xl font-bold text-red-900">
                      {conflicts.overloaded?.length || 0}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">Underloaded Crews</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {conflicts.underloaded?.length || 0}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-yellow-600" />
                </div>
              </div>
            </div>
          )}

          {/* Utilization Chart */}
          {Object.keys(utilizationMetrics).length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Crew Utilization</h4>
              <div className="space-y-3">
                {Object.entries(utilizationMetrics).map(([crewId, metrics]) => (
                  <div key={crewId} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{metrics.crewName}</span>
                        <span className="text-sm text-gray-600">
                          {safeToFixed(metrics.weeklyStats.utilizationRate, 1)}% utilization
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            metrics.weeklyStats.utilizationRate > 100 ? 'bg-red-500' :
                            metrics.weeklyStats.utilizationRate > 80 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(metrics.weeklyStats.utilizationRate, 120)}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {metrics.weeklyStats.utilizationRate > 100 && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Overloaded
                          </span>
                        )}
                        {metrics.weeklyStats.utilizationRate < 70 && metrics.weeklyStats.utilizationRate > 0 && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Underutilized
                          </span>
                        )}
                        {metrics.weeklyStats.utilizationRate >= 70 && metrics.weeklyStats.utilizationRate <= 100 && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Balanced
                          </span>
                        )}
                        {metrics.weeklyStats.efficiencyRate < 80 && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                            Low Efficiency
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Planned: {safeToFixed(metrics.weeklyStats.totalPlannedHours, 1)}h</span>
                        <span>Actual: {safeToFixed(metrics.weeklyStats.totalActualHours, 1)}h</span>
                        <span>Output: {safeToFixed(metrics.weeklyStats.totalOutput, 1)} units</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optimization Report */}
          {optimizationReport && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Optimization Results</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{optimizationReport.summary.optimizationChanges}</p>
                  <p className="text-sm text-gray-600">Changes Made</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{optimizationReport.summary.averageUtilization}%</p>
                  <p className="text-sm text-gray-600">Avg Utilization</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{optimizationReport.summary.resourceBalanceIndex}</p>
                  <p className="text-sm text-gray-600">Balance Index</p>
                </div>
              </div>
              
              {optimizationReport.changes.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Task Changes:</h5>
                  <div className="space-y-2">
                    {optimizationReport.changes.map((change, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm bg-white p-2 rounded">
                        <span className="text-blue-600">📋</span>
                        <span>{change.taskName}</span>
                        <span className="text-gray-500">moved from</span>
                        <span className="font-mono text-xs bg-gray-100 px-1 rounded">{change.fromDate}</span>
                        <span className="text-gray-500">to</span>
                        <span className="font-mono text-xs bg-gray-100 px-1 rounded">{change.toDate}</span>
                        <span className="text-gray-500">({change.hours}h)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recommendations */}
          {conflicts.recommendations && conflicts.recommendations.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h4>
              <div className="space-y-2">
                {conflicts.recommendations.map((rec, index) => (
                  <div key={index} className={`p-3 rounded-lg ${
                    rec.priority === 'high' ? 'bg-red-50 border border-red-200' :
                    rec.priority === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                        rec.priority === 'high' ? 'text-red-600' :
                        rec.priority === 'medium' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900">{rec.crewName}</p>
                        <p className="text-sm text-gray-700">{rec.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-blue-600">Labour</h3>
              <p className="text-2xl font-bold text-blue-900">
                {resources.filter(r => r.type === 'labour' && r.status !== 'archived').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Truck className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-orange-600">Equipment</h3>
              <p className="text-2xl font-bold text-orange-900">
                {resources.filter(r => r.type === 'equipment' && r.status !== 'archived').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-green-600">Materials</h3>
              <p className="text-2xl font-bold text-green-900">
                {resources.filter(r => r.type === 'material' && r.status !== 'archived').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-purple-600">Subcontractors</h3>
              <p className="text-2xl font-bold text-purple-900">
                {resources.filter(r => r.type === 'subcontractor' && r.status !== 'archived').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Edit Resource' : 'Create New Resource'}
            </h3>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingId(null);
                setFormData({
                  type: 'labour',
                  name: '',
                  description: '',
                  defaultRate: '',
                  unit: 'hour',
                  projectId: selectedProject?.id || '',
                  qualifications: [],
                  status: 'active'
                });
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="labour">Labour</option>
                  <option value="equipment">Equipment</option>
                  <option value="material">Material</option>
                  <option value="subcontractor">Subcontractor</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter resource name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter resource description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Rate</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    name="defaultRate"
                    value={formData.defaultRate}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Extra Hours Rate</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    name="extraHoursRate"
                    value={formData.extraHoursRate}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Rate for extra hours worked (typically 1.5x default rate)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="hour">Hour</option>
                  <option value="day">Day</option>
                  <option value="piece">Piece</option>
                  <option value="unit">Unit</option>
                  <option value="kg">Kilogram</option>
                  <option value="m">Meter</option>
                  <option value="m2">Square Meter</option>
                  <option value="m3">Cubic Meter</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingId(null);
                  setFormData({
                    type: 'labour',
                    name: '',
                    description: '',
                    defaultRate: '',
                    unit: 'hour',
                    projectId: selectedProject?.id || '',
                    qualifications: [],
                    status: 'active'
                  });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingId ? 'Update Resource' : 'Create Resource'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Create Resource
        </button>
      </div>

      {/* Resources Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {showArchived ? 'Archived Resources' : 'Active Resources'}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Package className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium">No resources found</p>
                      <p className="text-sm">Create your first resource to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredResources.map((resource) => (
                  <tr key={resource.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(resource.type)}`}>
                        {getTypeIcon(resource.type)}
                        {resource.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{resource.name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {resource.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${resource.defaultRate.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {resource.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        resource.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {resource.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(resource)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit resource"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {showArchived ? (
                          <button
                            onClick={() => handleRestore(resource.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Restore resource"
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchive(resource.id)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Archive resource"
                          >
                            Archive
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(resource.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete resource"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResourceManagementTab;