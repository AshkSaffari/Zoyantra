import React, { useState, useEffect, useRef } from 'react';
import { 
  Target, 
  Calendar, 
  Users, 
  DollarSign, 
  BarChart3, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  RefreshCw, 
  Filter, 
  Search, 
  Eye, 
  EyeOff, 
  Activity, 
  PieChart,
  Link,
  Unlink,
  FileText,
  Building2
} from 'lucide-react';
import { safeFormatCurrency } from '../utils/numberUtils';
import AccService from '../services/AccService_old';

const EnhancedPlanWorkaheadTab = ({ 
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
  const [projectUsers, setProjectUsers] = useState([]);
  const [budgetMappings, setBudgetMappings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // overview, tasks, budgets, timeline
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedBudgetFilter, setSelectedBudgetFilter] = useState('all');
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const [performanceData, setPerformanceData] = useState({});

  const [formData, setFormData] = useState({
    taskId: '',
    budgetId: '',
    assignedTo: '',
    plannedStartDate: '',
    plannedEndDate: '',
    estimatedHours: 0,
    estimatedCost: 0,
    priority: 'medium',
    notes: ''
  });

  // Load data when project changes
  useEffect(() => {
    if (selectedProject) {
      loadTasks();
      loadProjectUsers();
      loadBudgetMappings();
      loadPerformanceData();
    }
  }, [selectedProject, selectedHub]);

  // Load tasks from localStorage
  const loadTasks = () => {
    if (!selectedProject) return;
    
    try {
      const stored = localStorage.getItem(`enhanced_tasks_${selectedProject.id}`);
      if (stored) {
        const tasksData = JSON.parse(stored);
        setTasks(tasksData);
        console.log('📋 Loaded tasks for planning:', tasksData.length);
      }
    } catch (error) {
      console.error('❌ Error loading tasks for planning:', error);
    }
  };

  // Load project users from ACC
  const loadProjectUsers = async () => {
    if (!selectedProject || !selectedHub || !credentials) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('👥 Loading project users for planning...');
      
      // Use the enhanced user fetching from AccService
      const users = await AccService.getProjectUsersReliable(selectedProject.id, selectedHub.id);
      
      if (users && users.length > 0) {
        setProjectUsers(users);
        console.log('✅ Loaded project users for planning:', users.length);
      } else {
        console.log('⚠️ No project users found, using members data');
        setProjectUsers(members);
      }
    } catch (error) {
      console.error('❌ Error loading project users for planning:', error);
      setError(`Failed to load project users: ${error.message}`);
      setProjectUsers(members);
    } finally {
      setIsLoading(false);
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
        console.log('🔗 Loaded budget mappings for planning:', mappings.length);
      }
    } catch (error) {
      console.error('❌ Error loading budget mappings for planning:', error);
    }
  };

  // Load performance data
  const loadPerformanceData = async () => {
    if (!selectedProject || !credentials) return;

    try {
      console.log('📊 Loading performance data for planning...');
      
      // Calculate performance data for planning
      const performanceData = {
        taskProgress: {},
        budgetUtilization: {},
        userWorkload: {},
        scheduleAdherence: {}
      };

      // Calculate task progress
      tasks.forEach(task => {
        const timesheetHours = archivedTimesheets
          .filter(ts => ts.taskId === task.id)
          .reduce((sum, ts) => sum + (ts.hours || 0), 0);
        
        const estimatedHours = task.estimatedHours || 0;
        const actualProgress = estimatedHours > 0 ? (timesheetHours / estimatedHours) * 100 : 0;
        
        performanceData.taskProgress[task.id] = {
          plannedProgress: task.progress || 0,
          actualProgress: Math.min(100, actualProgress),
          hoursWorked: timesheetHours,
          hoursEstimated: estimatedHours
        };
      });

      // Calculate budget utilization
      budgets.forEach(budget => {
        const budgetTasks = tasks.filter(task => task.budgetId === budget.id);
        const totalEstimatedCost = budgetTasks.reduce((sum, task) => sum + (task.estimatedCost || 0), 0);
        const totalActualCost = budgetTasks.reduce((sum, task) => sum + (task.actualCost || 0), 0);
        
        performanceData.budgetUtilization[budget.id] = {
          estimatedCost: totalEstimatedCost,
          actualCost: totalActualCost,
          utilization: budget.amount > 0 ? (totalActualCost / budget.amount) * 100 : 0,
          remaining: budget.amount - totalActualCost
        };
      });

      // Calculate user workload
      projectUsers.forEach(user => {
        const userTasks = tasks.filter(task => task.assignedTo === user.id);
        const totalEstimatedHours = userTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
        const totalActualHours = archivedTimesheets
          .filter(ts => userTasks.some(task => task.id === ts.taskId))
          .reduce((sum, ts) => sum + (ts.hours || 0), 0);
        
        performanceData.userWorkload[user.id] = {
          estimatedHours: totalEstimatedHours,
          actualHours: totalActualHours,
          utilization: totalEstimatedHours > 0 ? (totalActualHours / totalEstimatedHours) * 100 : 0,
          taskCount: userTasks.length
        };
      });

      setPerformanceData(performanceData);
      console.log('📊 Loaded performance data for planning:', performanceData);
    } catch (error) {
      console.error('❌ Error loading performance data for planning:', error);
    }
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
          plannedStartDate: selectedTask.startDate,
          plannedEndDate: selectedTask.endDate,
          estimatedHours: selectedTask.estimatedHours || 0,
          estimatedCost: selectedTask.estimatedCost || 0,
          assignedTo: selectedTask.assignedTo || '',
          budgetId: selectedTask.budgetId || ''
        }));
      }
    }

    // Auto-fill budget details when budget is selected
    if (name === 'budgetId') {
      const selectedBudget = budgets.find(budget => budget.id === value);
      if (selectedBudget) {
        setFormData(prev => ({
          ...prev,
          estimatedCost: selectedBudget.amount || selectedBudget.revised || 0
        }));
      }
    }
  };

  // Add or update plan
  const handleSavePlan = () => {
    if (!formData.taskId || !formData.budgetId || !formData.assignedTo) {
      setError('Please fill in all required fields');
      return;
    }

    const newPlan = {
      id: editingPlan?.id || Date.now().toString(),
      taskId: formData.taskId,
      taskName: tasks.find(t => t.id === formData.taskId)?.name || 'Unknown Task',
      budgetId: formData.budgetId,
      budgetName: budgets.find(b => b.id === formData.budgetId)?.name || 'Unknown Budget',
      assignedTo: formData.assignedTo,
      assignedToName: projectUsers.find(u => u.id === formData.assignedTo)?.name || 'Unknown User',
      plannedStartDate: formData.plannedStartDate,
      plannedEndDate: formData.plannedEndDate,
      estimatedHours: parseFloat(formData.estimatedHours) || 0,
      estimatedCost: parseFloat(formData.estimatedCost) || 0,
      priority: formData.priority,
      notes: formData.notes,
      createdAt: editingPlan?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let updatedMappings;
    if (editingPlan) {
      updatedMappings = budgetMappings.map(m => m.id === editingPlan.id ? newPlan : m);
    } else {
      updatedMappings = [...budgetMappings, newPlan];
    }

    setBudgetMappings(updatedMappings);
    saveBudgetMappings(updatedMappings);
    resetForm();
    console.log('✅ Plan saved:', newPlan);
  };

  // Edit plan
  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setFormData({
      taskId: plan.taskId,
      budgetId: plan.budgetId,
      assignedTo: plan.assignedTo,
      plannedStartDate: plan.plannedStartDate,
      plannedEndDate: plan.plannedEndDate,
      estimatedHours: plan.estimatedHours,
      estimatedCost: plan.estimatedCost,
      priority: plan.priority,
      notes: plan.notes
    });
  };

  // Delete plan
  const handleDeletePlan = (planId) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      const updatedMappings = budgetMappings.filter(m => m.id !== planId);
      setBudgetMappings(updatedMappings);
      saveBudgetMappings(updatedMappings);
      console.log('🗑️ Plan deleted:', planId);
    }
  };

  // Save budget mappings to localStorage
  const saveBudgetMappings = (mappings) => {
    if (!selectedProject) return;
    
    try {
      localStorage.setItem(`budget_mappings_${selectedProject.id}`, JSON.stringify(mappings));
      console.log('💾 Saved budget mappings for planning:', mappings.length);
    } catch (error) {
      console.error('❌ Error saving budget mappings for planning:', error);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      taskId: '',
      budgetId: '',
      assignedTo: '',
      plannedStartDate: '',
      plannedEndDate: '',
      estimatedHours: 0,
      estimatedCost: 0,
      priority: 'medium',
      notes: ''
    });
    setEditingPlan(null);
    setError(null);
  };

  // Get filtered plans
  const getFilteredPlans = () => {
    let filtered = budgetMappings;

    // Filter by budget
    if (selectedBudgetFilter !== 'all') {
      filtered = filtered.filter(m => m.budgetId === selectedBudgetFilter);
    }

    // Filter by user
    if (selectedUserFilter !== 'all') {
      filtered = filtered.filter(m => m.assignedTo === selectedUserFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(m => 
        m.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.budgetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.assignedToName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  // Get planning statistics
  const getPlanningStats = () => {
    const total = budgetMappings.length;
    const completed = budgetMappings.filter(m => {
      const task = tasks.find(t => t.id === m.taskId);
      return task && task.status === 'completed';
    }).length;
    
    const totalEstimatedHours = budgetMappings.reduce((sum, m) => sum + (m.estimatedHours || 0), 0);
    const totalEstimatedCost = budgetMappings.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);
    
    const totalBudget = budgets.reduce((sum, b) => sum + (b.amount || b.revised || 0), 0);
    const budgetUtilization = totalBudget > 0 ? (totalEstimatedCost / totalBudget) * 100 : 0;
    
    return {
      total,
      completed,
      totalEstimatedHours: Math.round(totalEstimatedHours * 100) / 100,
      totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
      budgetUtilization: Math.round(budgetUtilization * 100) / 100,
      remainingBudget: Math.round((totalBudget - totalEstimatedCost) * 100) / 100
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

  // Get user name
  const getUserName = (userId) => {
    const user = projectUsers.find(u => u.id === userId);
    return user ? (user.name || user.displayName) : 'Unknown User';
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const stats = getPlanningStats();
  const filteredPlans = getFilteredPlans();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-600" />
          Enhanced Work Planning Module
        </h2>
        <p className="text-gray-600">
          Comprehensive work planning with task-budget mapping, user assignment, and performance tracking.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Plans</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
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
              <p className="text-sm text-gray-600">Estimated Hours</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalEstimatedHours}h</p>
            </div>
            <Clock className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Budget Utilization</p>
              <p className="text-2xl font-bold text-orange-600">{stats.budgetUtilization}%</p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Budget Status</h3>
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Budget:</span>
              <span className="font-medium">{safeFormatCurrency(budgets.reduce((sum, b) => sum + (b.amount || b.revised || 0), 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated Cost:</span>
              <span className="font-medium">{safeFormatCurrency(stats.totalEstimatedCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Remaining:</span>
              <span className="font-medium">{safeFormatCurrency(stats.remainingBudget)}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Task Distribution</h3>
            <BarChart3 className="w-5 h-5 text-green-500" />
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Tasks:</span>
              <span className="font-medium">{tasks.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Planned:</span>
              <span className="font-medium">{budgetMappings.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unplanned:</span>
              <span className="font-medium">{tasks.length - budgetMappings.length}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Team Workload</h3>
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Users:</span>
              <span className="font-medium">{projectUsers.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Assigned:</span>
              <span className="font-medium">{new Set(budgetMappings.map(m => m.assignedTo)).size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Available:</span>
              <span className="font-medium">{projectUsers.length - new Set(budgetMappings.map(m => m.assignedTo)).size}</span>
            </div>
          </div>
        </div>
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
                <option value="overview">Overview</option>
                <option value="tasks">Tasks</option>
                <option value="budgets">Budgets</option>
                <option value="timeline">Timeline</option>
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
              <label className="text-sm font-medium text-gray-700">User:</label>
              <select
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Users</option>
                {projectUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={() => setEditingPlan({})}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Plan
            </button>
            
            <button
              onClick={loadPerformanceData}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Plan Form */}
      {editingPlan && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingPlan.id ? 'Edit Plan' : 'Create New Plan'}
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
                {tasks.map(task => (
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
                {budgets.map(budget => (
                  <option key={budget.id} value={budget.id}>
                    {budget.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned To *
              </label>
              <select
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select User</option>
                {projectUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.displayName}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Planned Start Date
              </label>
              <input
                type="date"
                name="plannedStartDate"
                value={formData.plannedStartDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Planned End Date
              </label>
              <input
                type="date"
                name="plannedEndDate"
                value={formData.plannedEndDate}
                onChange={handleInputChange}
                min={formData.plannedStartDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Hours
              </label>
              <input
                type="number"
                name="estimatedHours"
                value={formData.estimatedHours}
                onChange={handleInputChange}
                min="0"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Cost
              </label>
              <input
                type="number"
                name="estimatedCost"
                value={formData.estimatedCost}
                onChange={handleInputChange}
                min="0"
                step="0.01"
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
                placeholder="Additional planning notes"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePlan}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingPlan.id ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </div>
      )}

      {/* Plans List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Work Plans ({filteredPlans.length})
          </h3>
        </div>
        
        {filteredPlans.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-lg">No work plans found</p>
            <p className="text-gray-400">Create your first work plan to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPlans.map(plan => (
              <div key={plan.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{plan.taskName}</h4>
                      <span className="text-sm text-gray-500">→</span>
                      <h4 className="text-lg font-medium text-blue-600">{plan.budgetName}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(plan.priority)}`}>
                        {plan.priority}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Assigned To:</span>
                        <p className="font-medium">{plan.assignedToName}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Duration:</span>
                        <p className="font-medium">
                          {plan.plannedStartDate && plan.plannedEndDate ? (
                            Math.ceil((new Date(plan.plannedEndDate) - new Date(plan.plannedStartDate)) / (1000 * 60 * 60 * 24)) + ' days'
                          ) : (
                            'Not set'
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Estimated Hours:</span>
                        <p className="font-medium">{plan.estimatedHours}h</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Estimated Cost:</span>
                        <p className="font-medium">{safeFormatCurrency(plan.estimatedCost)}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Start Date:</span>
                        <p className="font-medium">
                          {plan.plannedStartDate ? new Date(plan.plannedStartDate).toLocaleDateString() : 'Not set'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">End Date:</span>
                        <p className="font-medium">
                          {plan.plannedEndDate ? new Date(plan.plannedEndDate).toLocaleDateString() : 'Not set'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <p className="font-medium">
                          {new Date(plan.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Updated:</span>
                        <p className="font-medium">
                          {new Date(plan.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    {plan.notes && (
                      <p className="text-sm text-gray-500 italic">{plan.notes}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEditPlan(plan)}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                      title="Edit plan"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Delete plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedPlanWorkaheadTab;
