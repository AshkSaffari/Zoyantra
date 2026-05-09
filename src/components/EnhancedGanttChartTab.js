import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  Target, 
  Clock, 
  DollarSign, 
  Users, 
  Calendar,
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  Eye,
  EyeOff,
  Link,
  Unlink,
  Activity,
  PieChart
} from 'lucide-react';
import { safeFormatCurrency } from '../utils/numberUtils';
import AccService from '../services/AccService_old';
import TasksGanttView from './TasksGanttView';

const EnhancedGanttChartTab = ({ 
  selectedProject, 
  selectedHub, 
  projects, 
  members = [], 
  budgets = [], 
  archivedTimesheets = [],
  archivedExpenses = [],
  credentials 
}) => {
  const [tasks, setTasks] = useState([]);
  const [budgetMappings, setBudgetMappings] = useState([]);
  const [fallbackBudgets, setFallbackBudgets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingMapping, setEditingMapping] = useState(null);
  const [viewMode, setViewMode] = useState('timeline'); // timeline, budget-view, progress-view
  const [showTasksGantt, setShowTasksGantt] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedBudgetFilter, setSelectedBudgetFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(true);
  const [performanceData, setPerformanceData] = useState({});
  const [formData, setFormData] = useState({
    taskId: '',
    budgetId: '',
    physicalProgress: 0,
    plannedProgress: 0,
    startDate: '',
    endDate: '',
    notes: ''
  });

  // Load data when project changes
  useEffect(() => {
    if (selectedProject) {
      loadTasks();
      loadBudgetMappings();
      loadPerformanceData();
      if (!budgets || budgets.length === 0) {
        loadBudgetsFallback();
      }
    }
  }, [selectedProject, selectedHub]);

  const loadBudgetsFallback = async () => {
    if (!selectedProject || !credentials) return;
    try {
      setIsLoading(true);
      setError(null);
      // Use the prefixed projectId (same as CostManagementTab working flow)
      const projectId = selectedProject.projectId || selectedProject.id;
      const hubId = selectedHub?.id || selectedProject.hubId;
      const fetched = await AccService.getBudgets(projectId, hubId);
      const processed = (fetched || []).map(b => ({
        id: b.id,
        name: b.name || b.attributes?.name || 'Unknown Budget',
        revised: b.revised || b.amount || b.attributes?.amount || 0,
        amount: b.amount || b.revised || 0,
        unitPrice: b.unitPrice || b.attributes?.unitPrice || 0,
        quantity: b.quantity || b.attributes?.quantity || 0
      }));
      setFallbackBudgets(processed);
      console.log('💰 Fallback budgets loaded for Enhanced Gantt:', processed.length);
    } catch (e) {
      console.error('❌ Error loading fallback budgets:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Load tasks from unified Tasks storage with legacy fallback/migration
  const loadTasks = () => {
    if (!selectedProject) return;
    
    try {
      const mainKey = `tasks_${selectedProject.id}`;
      let stored = localStorage.getItem(mainKey);
      if (!stored) {
        // Legacy fallbacks
        const legacyEnhancedKey = `enhanced_tasks_${selectedProject.id}`;
        const legacyGlobalKey = 'tasks';
        const legacyEnhanced = localStorage.getItem(legacyEnhancedKey);
        const legacyGlobal = localStorage.getItem(legacyGlobalKey);
        const legacySource = legacyEnhanced || legacyGlobal;
        if (legacySource) {
          console.log('♻️ Migrating legacy tasks into', mainKey);
          localStorage.setItem(mainKey, legacySource);
          stored = legacySource;
        }
      }
      if (stored) {
        const tasksData = JSON.parse(stored);
        setTasks(tasksData);
        console.log('📊 Loaded tasks for Enhanced Gantt:', tasksData.length);
      } else {
        setTasks([]);
        console.log('📭 No tasks found for Enhanced Gantt');
      }
    } catch (error) {
      console.error('❌ Error loading tasks for Enhanced Gantt:', error);
      setTasks([]);
    }
  };

  // Load budget mappings from localStorage
  const loadBudgetMappings = () => {
    if (!selectedProject) return;
    
    try {
      const stored = localStorage.getItem(`budget_mappings_${selectedProject.id}`);
      if (stored) {
        const mappings = JSON.parse(stored);
        setBudgetMappings(mappings);
        console.log('🔗 Loaded budget mappings:', mappings.length);
      }
    } catch (error) {
      console.error('❌ Error loading budget mappings:', error);
    }
  };

  // Save budget mappings to localStorage
  const saveBudgetMappings = (mappings) => {
    if (!selectedProject) return;
    
    try {
      localStorage.setItem(`budget_mappings_${selectedProject.id}`, JSON.stringify(mappings));
      setBudgetMappings(mappings);
      console.log('💾 Saved budget mappings:', mappings.length);
    } catch (error) {
      console.error('❌ Error saving budget mappings:', error);
    }
  };

  // Reactively recalc performance when inputs change
  useEffect(() => {
    // Avoid initial call before project selected
    if (!selectedProject) return;
    loadPerformanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, budgetMappings, budgets, archivedTimesheets, archivedExpenses]);

  // Listen for localStorage changes from other tabs (tasks and mappings)
  useEffect(() => {
    if (!selectedProject) return;
    const handleStorage = (event) => {
      if (!event || !event.key) return;
      const taskKey = `tasks_${selectedProject.id}`;
      const mappingKey = `budget_mappings_${selectedProject.id}`;
      if (event.key === taskKey) {
        loadTasks();
      }
      if (event.key === mappingKey) {
        loadBudgetMappings();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [selectedProject]);

  // Load performance data from performance tracker
  const loadPerformanceData = async () => {
    if (!selectedProject || !credentials) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('📊 Loading performance data for Gantt Chart...');
      
      // This would integrate with performance tracker APIs
      // For now, we'll simulate performance data based on tasks and timesheets
      const performanceData = {
        budgetProgress: {},
        physicalProgress: {},
        scheduleProgress: {},
        costProgress: {}
      };

      // Calculate performance data for each budget
      budgets.forEach(budget => {
        const budgetTasks = tasks.filter(task => task.budgetId === budget.id);
        
        if (budgetTasks.length > 0) {
          const totalPlannedProgress = budgetTasks.reduce((sum, task) => sum + (task.progress || 0), 0);
          const avgPlannedProgress = totalPlannedProgress / budgetTasks.length;
          
          // Calculate physical progress from timesheets
          const timesheetHours = archivedTimesheets
            .filter(ts => budgetTasks.some(task => task.id === ts.taskId))
            .reduce((sum, ts) => sum + (ts.hours || 0), 0);
          
          const estimatedHours = budgetTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
          const physicalProgress = estimatedHours > 0 ? (timesheetHours / estimatedHours) * 100 : 0;
          
          performanceData.budgetProgress[budget.id] = {
            plannedProgress: avgPlannedProgress,
            physicalProgress: Math.min(100, physicalProgress),
            scheduleProgress: calculateScheduleProgress(budgetTasks),
            costProgress: calculateCostProgress(budgetTasks, budget)
          };
        }
      });

      setPerformanceData(performanceData);
      console.log('📊 Loaded performance data:', performanceData);
    } catch (error) {
      console.error('❌ Error loading performance data:', error);
      setError(`Failed to load performance data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };



  // Map task to budget with forecasting integration
  const mapTaskToBudgetWithForecasting = async (mappingData) => {
    try {
      setIsLoading(true);
      
      // Create the mapping
      const newMapping = {
        id: `mapping-${Date.now()}`,
        taskId: mappingData.taskId,
        budgetId: mappingData.budgetId,
        physicalProgress: mappingData.physicalProgress,
        plannedProgress: mappingData.plannedProgress,
        startDate: mappingData.startDate,
        endDate: mappingData.endDate,
        notes: mappingData.notes,
        createdAt: new Date().toISOString(),
        forecasting: {
          costRatio: 0,
          timeRatio: 0,
          riskLevel: 'low',
          recommendations: []
        }
      };

      // Add to budget mappings
      setBudgetMappings(prev => [...prev, newMapping]);
      
      setEditingMapping(null);
      setFormData({
        taskId: '',
        budgetId: '',
        physicalProgress: 0,
        plannedProgress: 0,
        startDate: '',
        endDate: '',
        notes: ''
      });
      
    } catch (error) {
      console.error('Error mapping task to budget:', error);
      setError('Failed to map task to budget');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate schedule progress for budget tasks
  const calculateScheduleProgress = (budgetTasks) => {
    if (!budgetTasks || budgetTasks.length === 0) return 0;
    
    const today = new Date();
    let totalProgress = 0;
    
    budgetTasks.forEach(task => {
      const startDate = new Date(task.startDate);
      const endDate = new Date(task.endDate);
      const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
      const timeProgress = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));
      totalProgress += timeProgress;
    });
    
    return totalProgress / budgetTasks.length;
  };

  // Calculate cost progress for budget tasks
  const calculateCostProgress = (budgetTasks, budget) => {
    if (!budgetTasks || budgetTasks.length === 0 || !budget) return 0;
    
    const totalActualCost = budgetTasks.reduce((sum, task) => sum + (task.actualCost || 0), 0);
    const totalBudget = budget.amount || budget.revised || 0;
    
    return totalBudget > 0 ? (totalActualCost / totalBudget) * 100 : 0;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Auto-fill task details when task is selected
    if (name === 'taskId') {
      const selectedTask = tasks.find(task => task.id === value);
      if (selectedTask) {
        setFormData(prev => ({
          ...prev,
          startDate: selectedTask.startDate,
          endDate: selectedTask.endDate,
          plannedProgress: selectedTask.progress || 0
        }));
      }
    }

    // Auto-fill budget details when budget is selected
    if (name === 'budgetId') {
      const selectedBudget = budgets.find(budget => budget.id === value);
      if (selectedBudget) {
        setFormData(prev => ({
          ...prev,
          budgetName: selectedBudget.name || 'Unknown Budget'
        }));
      }
    }
  };

  // Add or update budget mapping
  const handleSaveMapping = () => {
    if (!formData.taskId || !formData.budgetId) {
      setError('Please select both task and budget');
      return;
    }

    // Enforce one-to-one by task: block duplicates except when updating the same mapping
    const duplicate = budgetMappings.find(m => m.taskId === formData.taskId && (!editingMapping || m.id !== editingMapping.id));
    if (duplicate) {
      setError('This task is already mapped. Each task can only be mapped once.');
      return;
    }

    const newMapping = {
      id: (editingMapping?.id) || Date.now().toString(),
      taskId: formData.taskId,
      taskName: tasks.find(t => t.id === formData.taskId)?.name || 'Unknown Task',
      budgetId: formData.budgetId,
      budgetName: (() => {
        const list = (budgets?.length ? budgets : fallbackBudgets) || [];
        const b = list.find(b => b.id === formData.budgetId);
        return formData.budgetName || b?.name || 'Unknown Budget';
      })(),
      physicalProgress: parseFloat(formData.physicalProgress) || 0,
      plannedProgress: parseFloat(formData.plannedProgress) || 0,
      startDate: formData.startDate,
      endDate: formData.endDate,
      notes: formData.notes,
      createdAt: editingMapping?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let updatedMappings;
    if (editingMapping && editingMapping.id) {
      updatedMappings = budgetMappings.map(m => m.id === editingMapping.id ? newMapping : m);
    } else {
      updatedMappings = [...budgetMappings, newMapping];
    }

    saveBudgetMappings(updatedMappings);
    setError(null);
    // Ensure new mapping is visible if a budget filter was set
    setSelectedBudgetFilter('all');
    // Recalculate and reload view
    loadBudgetMappings();
    // Close the editor after successful save
    resetForm();
    console.log('✅ Budget mapping saved:', newMapping);
  };

  // Edit budget mapping
  const handleEditMapping = (mapping) => {
    setEditingMapping(mapping);
    setFormData({
      taskId: mapping.taskId,
      budgetId: mapping.budgetId,
      physicalProgress: mapping.physicalProgress || 0,
      plannedProgress: mapping.plannedProgress || 0,
      startDate: mapping.startDate,
      endDate: mapping.endDate,
      notes: mapping.notes
    });
  };

  // Delete budget mapping
  const handleDeleteMapping = (mappingId) => {
    if (window.confirm('Are you sure you want to delete this budget mapping?')) {
      const updatedMappings = budgetMappings.filter(m => m.id !== mappingId);
      saveBudgetMappings(updatedMappings);
      // Clear edit state if we deleted the active one
      if (editingMapping && editingMapping.id === mappingId) {
        setEditingMapping(null);
        resetForm();
      }
      // Reload list
      loadBudgetMappings();
      console.log('🗑️ Budget mapping deleted:', mappingId);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      taskId: '',
      budgetId: '',
      physicalProgress: 0,
      plannedProgress: 0,
      startDate: '',
      endDate: '',
      notes: ''
    });
    setEditingMapping(null);
    setError(null);
  };

  // Get filtered budget mappings
  const getFilteredMappings = () => {
    let filtered = budgetMappings;

    // Filter by budget
    if (selectedBudgetFilter !== 'all') {
      filtered = filtered.filter(m => m.budgetId === selectedBudgetFilter);
    }

    // Filter by status (based on progress)
    if (filterStatus !== 'all') {
      filtered = filtered.filter(m => {
        const progress = m.physicalProgress;
        switch (filterStatus) {
          case 'not-started':
            return progress === 0;
          case 'in-progress':
            return progress > 0 && progress < 100;
          case 'completed':
            return progress === 100;
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  // Get budget mapping statistics
  const getMappingStats = () => {
    const total = budgetMappings.length;
    const completed = budgetMappings.filter(m => m.physicalProgress === 100).length;
    const inProgress = budgetMappings.filter(m => m.physicalProgress > 0 && m.physicalProgress < 100).length;
    const notStarted = budgetMappings.filter(m => m.physicalProgress === 0).length;
    
    const totalPlannedProgress = budgetMappings.reduce((sum, m) => sum + m.plannedProgress, 0);
    const totalPhysicalProgress = budgetMappings.reduce((sum, m) => sum + m.physicalProgress, 0);
    const avgPlannedProgress = total > 0 ? totalPlannedProgress / total : 0;
    const avgPhysicalProgress = total > 0 ? totalPhysicalProgress / total : 0;
    
    return {
      total,
      completed,
      inProgress,
      notStarted,
      avgPlannedProgress: Math.round(avgPlannedProgress),
      avgPhysicalProgress: Math.round(avgPhysicalProgress)
    };
  };

  // Get task name
  const getTaskName = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.name : 'Unknown Task';
  };

  // Get budget name
  const getBudgetName = (budgetId) => {
    const budget = budgets.find(b => b.id === budgetId);
    return budget ? budget.name : 'Unknown Budget';
  };

  // Compute available tasks for mapping (hide already-mapped tasks when creating)
  const getAvailableTasksForMapping = () => {
    if (editingMapping && editingMapping.id) {
      // When editing, allow all tasks so user can see current selection
      return tasks;
    }
    const mappedIds = new Set(budgetMappings.map(m => m.taskId));
    return tasks.filter(t => !mappedIds.has(t.id));
  };

  // Get progress color
  const getProgressColor = (progress) => {
    if (progress === 0) return 'bg-gray-100';
    if (progress < 25) return 'bg-red-100';
    if (progress < 50) return 'bg-orange-100';
    if (progress < 75) return 'bg-yellow-100';
    if (progress < 100) return 'bg-blue-100';
    return 'bg-green-100';
  };

  // Get performance status
  const getPerformanceStatus = (physicalProgress, plannedProgress) => {
    const variance = physicalProgress - plannedProgress;
    if (variance > 10) return { status: 'ahead', color: 'text-green-600', icon: TrendingUp };
    if (variance < -10) return { status: 'behind', color: 'text-red-600', icon: TrendingDown };
    return { status: 'on-track', color: 'text-blue-600', icon: CheckCircle };
  };

  const stats = getMappingStats();
  const filteredMappings = getFilteredMappings();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          Gantt Chart
        </h2>
        {((budgets && budgets.length > 0) || (fallbackBudgets && fallbackBudgets.length > 0)) && (
          <div className="text-sm text-gray-700">
            Total Revised Budget: {`$${(budgets?.length ? budgets : fallbackBudgets).reduce((sum, b) => sum + (b.revised || b.amount || 0), 0).toLocaleString()}`}
          </div>
        )}
        <p className="text-gray-600">
          Budget mapping and physical progress tracking with performance integration.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Mappings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Link className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Physical Progress</p>
              <p className="text-2xl font-bold text-purple-600">{stats.avgPhysicalProgress}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {budgets.map(budget => {
          const budgetData = performanceData.budgetProgress?.[budget.id];
          if (!budgetData) return null;
          
          return (
            <div key={budget.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{budget.name}</h3>
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Physical Progress:</span>
                  <span className="font-medium">{budgetData.physicalProgress.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Planned Progress:</span>
                  <span className="font-medium">{budgetData.plannedProgress.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Schedule Progress:</span>
                  <span className="font-medium">{budgetData.scheduleProgress.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cost Progress:</span>
                  <span className="font-medium">{budgetData.costProgress.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">View:</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="timeline">Timeline</option>
                <option value="budget-view">Budget View</option>
                <option value="progress-view">Progress View</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Budget:</label>
              <select
                value={selectedBudgetFilter}
                onChange={(e) => setSelectedBudgetFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Budgets</option>
                {budgets.map(budget => (
                  <option key={budget.id} value={budget.id}>
                    {budget.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All</option>
                <option value="not-started">Not Started</option>;p[g]
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex space-x-3">
              <button
                onClick={() => setEditingMapping({})}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Map Task to Budget
              </button>
            </div>
            
            <button
              onClick={() => { loadTasks(); loadBudgetMappings(); loadPerformanceData(); }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tasks Gantt View Toggle */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div className="text-sm text-gray-700">Visualize project tasks on a Gantt chart</div>
        <button
          onClick={() => setShowTasksGantt(v => !v)}
          disabled={!selectedProject}
          className={`px-3 py-2 rounded-lg ${selectedProject ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
        >
          {showTasksGantt ? 'Hide Gantt' : 'Show Gantt'}
        </button>
      </div>

      {showTasksGantt && (
        <div className="mb-6">
          <TasksGanttView tasks={tasks} />
        </div>
      )}

      {/* Budget Mapping Form */}
      {editingMapping && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingMapping.id ? 'Edit Budget Mapping' : 'Map Task to Budget'}
          </h3>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task *
              </label>
              <select
                name="taskId"
                value={formData.taskId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Task</option>
                {getAvailableTasksForMapping().map(task => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget *
              </label>
              <select
                name="budgetId"
                value={formData.budgetId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Budget</option>
                {(budgets?.length ? budgets : fallbackBudgets).map(budget => (
                  <option key={budget.id} value={budget.id}>
                    {budget.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Physical Progress (%)
              </label>
              <input
                type="number"
                name="physicalProgress"
                value={formData.physicalProgress}
                onChange={handleInputChange}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Planned Progress (%)
              </label>
              <input
                type="number"
                name="plannedProgress"
                value={formData.plannedProgress}
                onChange={handleInputChange}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                min={formData.startDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes about this mapping"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveMapping}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Mapping
            </button>
          </div>
        </div>
      )}

      {/* Budget Mappings List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Budget Mappings ({filteredMappings.length})
          </h3>
        </div>
        
        {filteredMappings.length === 0 ? (
          <div className="text-center py-8">
            <Link className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-lg">No budget mappings found</p>
            <p className="text-gray-400">Map tasks to budgets to track physical progress</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredMappings.map(mapping => {
              const performance = getPerformanceStatus(0, 0);
              const PerformanceIcon = performance.icon;
              
              return (
                <div key={mapping.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">{mapping.taskName}</h4>
                        <span className="text-sm text-gray-500">→</span>
                        <h4 className="text-lg font-medium text-blue-600">{mapping.budgetName}</h4>
                        {(() => {
                          const list = budgets?.length ? budgets : fallbackBudgets;
                          const b = list.find(b => b.id === mapping.budgetId);
                          const revised = b?.revised || b?.amount || 0;
                          return revised > 0 ? (
                            <span className="text-sm text-gray-600">(${`$${revised.toLocaleString()}`})</span>
                          ) : null;
                        })()}
                        <PerformanceIcon className={`w-5 h-5 ${performance.color}`} />
                        <span className={`text-sm font-medium ${performance.color}`}>
                          {performance.status}
                        </span>
                        <button
                          onClick={() => handleEditMapping(mapping)}
                          className="ml-2 p-1 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                          title="Edit mapping"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMapping(mapping.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Delete mapping"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        {/* Progress details removed per request */}
                        <div>
                          <span className="text-gray-500">Duration:</span>
                          <p className="font-medium">
                            {mapping.startDate && mapping.endDate ? (
                              Math.ceil((new Date(mapping.endDate) - new Date(mapping.startDate)) / (1000 * 60 * 60 * 24)) + ' days'
                            ) : (
                              'Not set'
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress Bars */}
                      <div className="space-y-2 mb-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">Physical Progress</span>
                            <span className="text-sm font-medium">{mapping.physicalProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getProgressColor(mapping.physicalProgress)}`}
                              style={{ width: `${mapping.physicalProgress}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">Planned Progress</span>
                            <span className="text-sm font-medium">{mapping.plannedProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-blue-600"
                              style={{ width: `${mapping.plannedProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      {mapping.notes && (
                        <p className="text-sm text-gray-500 italic">{mapping.notes}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEditMapping(mapping)}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        title="Edit mapping"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMapping(mapping.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Delete mapping"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default EnhancedGanttChartTab;