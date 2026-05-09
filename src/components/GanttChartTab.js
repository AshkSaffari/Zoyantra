import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Clock, Target, BarChart3, Save, RefreshCw, Plus, Edit, Trash2, CheckCircle, DollarSign, CheckSquare } from 'lucide-react';
import { safeFormatCurrency } from '../utils/numberUtils';
import { gantt } from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import AccService from '../services/AccService_old';

const GanttChartTab = ({ selectedProject, selectedHub, projects, members = [], budgets = [], credentials }) => {
  const ganttContainer = useRef(null);
  const [projectDates, setProjectDates] = useState(null);
  const [budgetSchedules, setBudgetSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    taskId: '',
    budgetId: '',
    startDate: '',
    finishDate: '',
    progress: 0,
    notes: ''
  });
  const [progressHistory, setProgressHistory] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskFormData, setTaskFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    progress: 0,
    budgetId: '',
    assignedTo: '',
    priority: 'medium',
    status: 'planned'
  });
  const [viewMode, setViewMode] = useState('timeline');
  const [selectedBudget, setSelectedBudget] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [performanceData, setPerformanceData] = useState({});
  const [physicalProgress, setPhysicalProgress] = useState({});
  const [revisedBudgets, setRevisedBudgets] = useState([]);

  // Load project dates and budget schedules
  useEffect(() => {
    if (selectedProject && credentials) {
      loadProjectData();
      loadProgressHistory();
      loadTasks();
      loadPerformanceData();
    }
  }, [selectedProject, credentials]);

  // Load tasks from localStorage
  const loadTasks = () => {
    if (!selectedProject) return;
    
    try {
      const storedTasks = localStorage.getItem(`tasks_${selectedProject.id}`);
      if (storedTasks) {
        const tasksData = JSON.parse(storedTasks);
        setTasks(tasksData);
        console.log('📋 Loaded tasks from Tasks tab:', tasksData.length);
        
        // Map tasks to budgets and calculate progress
        mapTasksToBudgets(tasksData);
      } else {
        console.log('📭 No tasks found in Tasks tab');
        setTasks([]);
      }
    } catch (error) {
      console.error('❌ Error loading tasks:', error);
    }
  };

  // Map tasks to budgets and calculate budget progress
  const mapTasksToBudgets = (tasksData) => {
    if (!revisedBudgets.length) {
      console.log('⚠️ No budgets available for mapping');
      return;
    }

    console.log('🗺️ Mapping tasks to budgets...');
    
    // Group tasks by budget (if they have budgetId) or assign to first budget
    const budgetTaskMap = {};
    
    tasksData.forEach(task => {
      const budgetId = task.budgetId || (revisedBudgets.length > 0 ? revisedBudgets[0].id : null);
      if (budgetId) {
        if (!budgetTaskMap[budgetId]) {
          budgetTaskMap[budgetId] = [];
        }
        budgetTaskMap[budgetId].push(task);
      }
    });

    // Calculate budget progress and duration
    const budgetProgress = {};
    
    Object.keys(budgetTaskMap).forEach(budgetId => {
      const budgetTasks = budgetTaskMap[budgetId];
      const budget = revisedBudgets.find(b => b.id === budgetId);
      
      if (budget && budgetTasks.length > 0) {
        // Calculate overall progress based on task status
        const completedTasks = budgetTasks.filter(t => t.status === 'completed').length;
        const inProgressTasks = budgetTasks.filter(t => t.status === 'in-progress').length;
        const totalTasks = budgetTasks.length;
        
        // Calculate progress: completed = 100%, in-progress = 50%, not-started = 0%
        const progress = totalTasks > 0 ? 
          ((completedTasks * 100) + (inProgressTasks * 50)) / totalTasks : 0;
        
        // Calculate budget duration from task dates
        const startDates = budgetTasks.map(t => new Date(t.startDate)).filter(d => !isNaN(d));
        const endDates = budgetTasks.map(t => new Date(t.endDate)).filter(d => !isNaN(d));
        
        const earliestStart = startDates.length > 0 ? new Date(Math.min(...startDates)) : null;
        const latestEnd = endDates.length > 0 ? new Date(Math.max(...endDates)) : null;
        
        const duration = earliestStart && latestEnd ? 
          Math.ceil((latestEnd - earliestStart) / (1000 * 60 * 60 * 24)) : 0;
        
        budgetProgress[budgetId] = {
          budget,
          tasks: budgetTasks,
          progress: Math.round(progress),
          duration,
          startDate: earliestStart,
          endDate: latestEnd,
          completedTasks,
          inProgressTasks,
          totalTasks
        };
        
        console.log(`📊 Budget ${budget.name}: ${progress.toFixed(1)}% progress, ${duration} days, ${totalTasks} tasks`);
      }
    });
    
    setBudgetSchedules(Object.values(budgetProgress));
    console.log('✅ Budget mapping completed:', Object.keys(budgetProgress).length, 'budgets mapped');
  };

  // Load budgets using the same robust method as CostManagementTab
  const loadBudgets = async () => {
    if (!selectedProject || !selectedHub || !credentials) return [];

    try {
      console.log('💰 Loading budgets for GanttChartTab...');
      const fetchedBudgets = await AccService.getBudgets(selectedProject.id, selectedHub.id);
      console.log('💰 Loaded budgets for Gantt Chart:', fetchedBudgets.length);
      
      // Process budget data with revised amounts like CostManagementTab
      const processedBudgets = fetchedBudgets.map(budget => {
        // Helper function to safely convert to number
        const safeNumber = (value, defaultValue = 0) => {
          if (value === null || value === undefined || value === '') return defaultValue;
          const num = parseFloat(value);
          return isNaN(num) ? defaultValue : num;
        };

        return {
          id: budget.id,
          name: budget.name || 'Unnamed Budget',
          code: budget.code || '',
          description: budget.description || '',
          originalAmount: safeNumber(budget.originalAmount || budget.originalBudget),
          revised: safeNumber(budget.revised),
          projectedCost: safeNumber(budget.projectedCost || budget.projectedBudget),
          actualCost: safeNumber(budget.actualCost),
          variance: safeNumber(budget.varianceTotal || budget.forecastVariance),
          status: budget.status || 'active',
          unit: budget.unit || 'units',
          quantity: safeNumber(budget.quantity),
          unitPrice: safeNumber(budget.unitPrice),
          scope: budget.scope || 'budgetAndCost',
          externalSystem: budget.externalSystem,
          integrationState: budget.integrationState,
          createdAt: budget.createdAt,
          updatedAt: budget.updatedAt
        };
      });
      
      setRevisedBudgets(processedBudgets);
      console.log('💰 Processed revised budgets:', processedBudgets.length);
      return processedBudgets;
    } catch (error) {
      console.error('❌ Error loading budgets for Gantt Chart:', error);
      return [];
    }
  };

  // Load performance data from ACC Performance Tracker
  const loadPerformanceData = async () => {
    if (!selectedProject || !selectedHub || !credentials) return;

    try {
      console.log('📊 Loading performance data from ACC Performance Tracker...');
      
      // Get performance tracking data from ACC
      const performanceData = await AccService.getPerformanceTrackerData(selectedProject.id);
      console.log('📊 Loaded performance data:', performanceData);
      
      setPerformanceData(performanceData);
      
      // Extract physical progress for each budget
      const physicalProgressData = {};
      Object.keys(performanceData).forEach(budgetId => {
        const data = performanceData[budgetId];
        physicalProgressData[budgetId] = {
          outputProgress: data.outputProgress || 0,
          inputProgress: data.inputProgress || 0,
          lastUpdated: data.lastUpdated
        };
      });
      
      setPhysicalProgress(physicalProgressData);
      console.log('📊 Physical progress data:', physicalProgressData);
      
    } catch (error) {
      console.error('❌ Error loading performance data:', error);
      // Set empty data on error
      setPerformanceData({});
      setPhysicalProgress({});
    }
  };

  // Initialize Gantt chart
  useEffect(() => {
    if (ganttContainer.current && selectedProject) {
      initializeGanttChart();
    }
    
    return () => {
      if (gantt.destroy) {
        gantt.destroy();
      }
    };
  }, [selectedProject, budgetSchedules]);

  // Re-parse Gantt data when tasks or performance progress change
  useEffect(() => {
    if (!ganttContainer.current || !selectedProject) return;
    try {
      if (typeof gantt.clearAll === 'function') {
        gantt.clearAll();
      }
      loadGanttData();
    } catch (e) {
      console.error('❌ Error refreshing Gantt on data change:', e);
    }
  }, [tasks, physicalProgress]);

  // Listen for localStorage updates from other tabs/components and refresh
  useEffect(() => {
    if (!selectedProject) return;
    const handleStorage = (event) => {
      if (!event || !event.key) return;
      const taskKey = `tasks_${selectedProject.id}`;
      const schedulesKey = `gantt_schedules_${selectedProject.id}`;
      if (event.key === taskKey) {
        loadTasks();
      }
      if (event.key === schedulesKey) {
        loadBudgetSchedules();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [selectedProject]);

  // Initialize DHTMLX Gantt chart
  const initializeGanttChart = () => {
    try {
      // Configure Gantt with date-based columns
      gantt.config.date_format = "%Y-%m-%d";
      gantt.config.scale_unit = "day";
      gantt.config.date_scale = "%d %M";
      gantt.config.subscales = [
        { unit: "day", step: 1, date: "%d" }
      ];
      gantt.config.subscales = [
        { unit: "day", step: 1, date: "%j, %M %d" }
      ];
      
      // Configure columns
      gantt.config.columns = [
        { name: "text", label: "Task Name", tree: true, width: 200 },
        { name: "start_date", label: "Start Date", align: "center", width: 100 },
        { name: "end_date", label: "End Date", align: "center", width: 100 },
        { name: "progress", label: "Progress", align: "center", width: 80, template: (task) => `${Math.round(task.progress * 100)}%` },
        { name: "revisedAmount", label: "Revised $", align: "right", width: 120, template: (task) => {
          const budget = revisedBudgets.find(b => b.id === task.budgetId);
          const val = budget?.revised || 0;
          return val > 0 ? `$${val.toLocaleString()}` : '—';
        }}
      ];

      // Configure timeline
      gantt.config.scale_height = 50;
      gantt.config.row_height = 30;
      gantt.config.grid_width = 500;
      
      // Enable features
      gantt.config.drag_progress = true;
      gantt.config.drag_resize = true;
      gantt.config.drag_move = true;
      gantt.config.drag_links = true;
      gantt.config.show_links = true;
      gantt.config.show_grid = true;
      gantt.config.show_task_cells = true;
      
      // Initialize Gantt
      gantt.init(ganttContainer.current);
      
      // Load data
      loadGanttData();
      
      // Event handlers
      gantt.attachEvent("onAfterTaskAdd", (id, item) => {
        handleGanttTaskAdd(id, item);
      });
      
      gantt.attachEvent("onAfterTaskUpdate", (id, item) => {
        handleGanttTaskUpdate(id, item);
      });
      
      gantt.attachEvent("onAfterTaskDelete", (id) => {
        handleGanttTaskDelete(id);
      });
      
      gantt.attachEvent("onAfterLinkAdd", (id, item) => {
        handleGanttLinkAdd(id, item);
      });
      
      gantt.attachEvent("onAfterLinkDelete", (id) => {
        handleGanttLinkDelete(id);
      });
      
      console.log('📊 Gantt chart initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Gantt chart:', error);
      setError('Failed to initialize Gantt chart: ' + error.message);
    }
  };

  // Load progress history from localStorage
  const loadProgressHistory = () => {
    if (!selectedProject) return;
    
    try {
      const stored = localStorage.getItem(`progress_history_${selectedProject.id}`);
      if (stored) {
        const history = JSON.parse(stored);
        setProgressHistory(history);
        console.log('📊 Loaded progress history:', history);
      }
    } catch (error) {
      console.error('❌ Error loading progress history:', error);
    }
  };

  // Save progress history to localStorage
  const saveProgressHistory = (history) => {
    if (!selectedProject) return;
    
    try {
      localStorage.setItem(`progress_history_${selectedProject.id}`, JSON.stringify(history));
      setProgressHistory(history);
      console.log('💾 Saved progress history:', history);
    } catch (error) {
      console.error('❌ Error saving progress history:', error);
    }
  };

  // Add progress entry to history
  const addProgressEntry = (scheduleId, progress, date = new Date().toISOString()) => {
    const newEntry = {
      id: Date.now().toString(),
      scheduleId,
      progress: parseFloat(progress),
      date,
      createdAt: new Date().toISOString()
    };

    const updatedHistory = [...progressHistory, newEntry];
    saveProgressHistory(updatedHistory);
    console.log('📈 Added progress entry:', newEntry);
  };

  // Get progress history for a specific schedule
  const getProgressHistoryForSchedule = (scheduleId) => {
    return progressHistory
      .filter(entry => entry.scheduleId === scheduleId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Get progress data for EVM calculations
  const getProgressDataForEVM = () => {
    const progressData = {};
    
    budgetSchedules.forEach(schedule => {
      const history = getProgressHistoryForSchedule(schedule.id);
      const latestProgress = history.length > 0 ? history[history.length - 1].progress : schedule.progress;
      
      progressData[schedule.budgetId] = {
        scheduleId: schedule.id,
        budgetId: schedule.budgetId,
        currentProgress: latestProgress,
        progressHistory: history,
        startDate: schedule.startDate,
        finishDate: schedule.finishDate,
        lastUpdated: history.length > 0 ? history[history.length - 1].date : new Date().toISOString()
      };
    });
    
    return progressData;
  };

  // Export progress data for EVM
  const exportProgressForEVM = () => {
    const progressData = getProgressDataForEVM();
    console.log('📊 Progress data for EVM:', progressData);
    
    // Dispatch custom event for EVM integration
    window.dispatchEvent(new CustomEvent('scheduleProgressUpdated', {
      detail: { progressData }
    }));
    
    return progressData;
  };

  // Load Gantt data from tasks
  const loadGanttData = () => {
    try {
      const ganttData = tasks.map(task => {
        // Get physical progress from performance tracker
        const physicalProgressData = task.budgetId ? physicalProgress[task.budgetId] : null;
        const physicalProgressValue = physicalProgressData ? physicalProgressData.outputProgress : 0;
        
        return {
          id: task.id,
          text: task.name,
          start_date: task.startDate,
          end_date: task.endDate,
          progress: task.progress / 100,
          budgetId: task.budgetId,
          assignedTo: task.assignedTo,
          priority: task.priority,
          status: task.status,
          physicalProgress: physicalProgressValue,
          // Use physical progress if available, otherwise use task progress
          actualProgress: physicalProgressValue > 0 ? physicalProgressValue / 100 : task.progress / 100
        };
      });
      
      gantt.parse({ data: ganttData });
      console.log('📊 Loaded Gantt data from tasks with physical progress:', ganttData);
    } catch (error) {
      console.error('❌ Error loading Gantt data:', error);
    }
  };

  // Handle Gantt task events
  const handleGanttTaskAdd = (id, item) => {
    console.log('📊 Task added:', id, item);
    // Save to localStorage
    const data = gantt.serialize();
    localStorage.setItem(`gantt_data_${selectedProject.id}`, JSON.stringify(data.data));
  };

  const handleGanttTaskUpdate = (id, item) => {
    console.log('📊 Task updated:', id, item);
    // Save to localStorage
    const data = gantt.serialize();
    localStorage.setItem(`gantt_data_${selectedProject.id}`, JSON.stringify(data.data));
  };

  const handleGanttTaskDelete = (id) => {
    console.log('📊 Task deleted:', id);
    // Save to localStorage
    const data = gantt.serialize();
    localStorage.setItem(`gantt_data_${selectedProject.id}`, JSON.stringify(data.data));
  };

  const handleGanttLinkAdd = (id, item) => {
    console.log('📊 Link added:', id, item);
    // Save to localStorage
    const data = gantt.serialize();
    localStorage.setItem(`gantt_data_${selectedProject.id}`, JSON.stringify(data.data));
  };

  const handleGanttLinkDelete = (id) => {
    console.log('📊 Link deleted:', id);
    // Save to localStorage
    const data = gantt.serialize();
    localStorage.setItem(`gantt_data_${selectedProject.id}`, JSON.stringify(data.data));
  };

  // Load project dates from ACC
  const loadProjectData = async () => {
    if (!selectedProject || !credentials) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load budgets using the same robust method as CostManagementTab
      const fetchedBudgets = await loadBudgets();
      
      // Fetch project details from ACC
      AccService.initialize(credentials);

      // Get project details including start/finish dates
      const projectDetails = await AccService.getProjectDetails(selectedProject.id);
      
      if (projectDetails) {
        setProjectDates({
          startDate: projectDetails.startDate || projectDetails.attributes?.startDate,
          finishDate: projectDetails.finishDate || projectDetails.attributes?.finishDate,
          projectName: projectDetails.name || selectedProject.name
        });
        console.log('📅 Project dates loaded:', projectDetails);
      }

      // Load existing budget schedules using fetched budgets
      loadBudgetSchedules(fetchedBudgets);

    } catch (err) {
      console.error('❌ Error loading project data:', err);
      setError(`Failed to load project data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load budget schedules from localStorage
  const loadBudgetSchedules = (fetchedBudgets = []) => {
    const stored = localStorage.getItem(`gantt_schedules_${selectedProject.id}`);
    const schedules = stored ? JSON.parse(stored) : [];
    
    // Use fetched budgets if available, otherwise fall back to props
    const budgetsToUse = fetchedBudgets.length > 0 ? fetchedBudgets : budgets;
    console.log('💰 Using budgets for Gantt Chart:', budgetsToUse.length);
    
    setBudgetSchedules(schedules);
    console.log('📊 Loaded budget schedules:', schedules);
  };

  // Save budget schedules to localStorage
  const saveBudgetSchedules = (schedules) => {
    localStorage.setItem(`gantt_schedules_${selectedProject.id}`, JSON.stringify(schedules));
    setBudgetSchedules(schedules);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // If user selects a task, auto-populate dates from the task
    if (name === 'taskId') {
      const selected = tasks.find(t => t.id === value);
      if (selected) {
        setFormData(prev => ({
          ...prev,
          startDate: selected.startDate || prev.startDate,
          finishDate: selected.endDate || prev.finishDate
        }));
      }
    }
  };

  // Handle task form input changes
  const handleTaskInputChange = (e) => {
    const { name, value } = e.target;
    setTaskFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add new task
  const handleAddTask = () => {
    setEditingTask(null);
    setTaskFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      progress: 0,
      budgetId: '',
      assignedTo: '',
      priority: 'medium',
      status: 'planned'
    });
    setShowTaskForm(true);
  };

  // Edit task
  const handleEditTask = (task) => {
    setEditingTask(task);
    setTaskFormData({
      name: task.name || '',
      description: task.description || '',
      startDate: task.startDate || '',
      endDate: task.endDate || '',
      progress: task.progress || 0,
      budgetId: task.budgetId || '',
      assignedTo: task.assignedTo || '',
      priority: task.priority || 'medium',
      status: task.status || 'planned'
    });
    setShowTaskForm(true);
  };

  // Delete task
  const handleDeleteTask = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      setTasks(updatedTasks);
      localStorage.setItem(`tasks_${selectedProject.id}`, JSON.stringify(updatedTasks));
    }
  };

  // Save task
  const handleSaveTask = () => {
    if (!taskFormData.name || !taskFormData.startDate || !taskFormData.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    const taskData = {
      id: editingTask ? editingTask.id : `task-${Date.now()}`,
      name: taskFormData.name,
      description: taskFormData.description,
      startDate: taskFormData.startDate,
      endDate: taskFormData.endDate,
      progress: taskFormData.progress,
      budgetId: taskFormData.budgetId,
      assignedTo: taskFormData.assignedTo,
      priority: taskFormData.priority,
      status: taskFormData.status
    };

    if (editingTask) {
      // Update existing task
      const updatedTasks = tasks.map(t => t.id === editingTask.id ? taskData : t);
      setTasks(updatedTasks);
      localStorage.setItem(`tasks_${selectedProject.id}`, JSON.stringify(updatedTasks));
    } else {
      // Add new task
      const updatedTasks = [...tasks, taskData];
      setTasks(updatedTasks);
      localStorage.setItem(`tasks_${selectedProject.id}`, JSON.stringify(updatedTasks));
    }

    setShowTaskForm(false);
    setEditingTask(null);
  };

  // Get filtered tasks
  const getFilteredTasks = () => {
    return tasks.filter(task => {
      const budgetMatch = selectedBudget === 'all' || task.budgetId === selectedBudget;
      const statusMatch = selectedStatus === 'all' || task.status === selectedStatus;
      return budgetMatch && statusMatch;
    });
  };

  // Get task statistics
  const getTaskStats = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
    const avgProgress = totalTasks > 0 ? tasks.reduce((sum, t) => sum + t.progress, 0) / totalTasks : 0;
    
    // Calculate physical progress from ACC Performance Tracker
    const physicalProgressValues = Object.values(physicalProgress);
    const avgPhysicalProgress = physicalProgressValues.length > 0 
      ? physicalProgressValues.reduce((sum, p) => sum + (p.outputProgress || 0), 0) / physicalProgressValues.length 
      : 0;
    
    return {
      total: totalTasks,
      completed: completedTasks,
      inProgress: inProgressTasks,
      avgProgress: Math.round(avgProgress),
      avgPhysicalProgress: Math.round(avgPhysicalProgress)
    };
  };

  // Add or update budget schedule
  const handleSaveSchedule = () => {
    if (!formData.budgetId || !formData.startDate || !formData.finishDate) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate budget assignment
    const budgetValidation = validateBudgetAssignment(formData.budgetId);
    if (!budgetValidation.isValid) {
      alert(budgetValidation.message);
      return;
    }

    // Validate dates are within project range
    if (projectDates) {
      const startDate = new Date(formData.startDate);
      const finishDate = new Date(formData.finishDate);
      const projectStart = new Date(projectDates.startDate);
      const projectFinish = new Date(projectDates.finishDate);

      if (startDate < projectStart || finishDate > projectFinish) {
        alert(`Dates must be within project range: ${projectDates.startDate} to ${projectDates.finishDate}`);
        return;
      }

      if (startDate >= finishDate) {
        alert('Start date must be before finish date');
        return;
      }
    }

    const newSchedule = {
      id: editingSchedule?.id || Date.now().toString(),
      budgetId: formData.budgetId,
      budgetName: budgets.find(b => b.id === formData.budgetId)?.name || 'Unknown Budget',
      startDate: formData.startDate,
      finishDate: formData.finishDate,
      progress: parseFloat(formData.progress) || 0,
      notes: formData.notes,
      createdAt: editingSchedule?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let updatedSchedules;
    if (editingSchedule) {
      // Update existing schedule
      updatedSchedules = budgetSchedules.map(s => 
        s.id === editingSchedule.id ? newSchedule : s
      );
    } else {
      // Add new schedule
      updatedSchedules = [...budgetSchedules, newSchedule];
    }

    saveBudgetSchedules(updatedSchedules);
    
    // Record progress in history
    addProgressEntry(newSchedule.id, newSchedule.progress);
    
    // Export progress data for EVM
    exportProgressForEVM();
    
    resetForm();
    console.log('✅ Budget schedule saved:', newSchedule);
  };

  // Edit existing schedule
  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      budgetId: schedule.budgetId,
      startDate: schedule.startDate,
      finishDate: schedule.finishDate,
      progress: schedule.progress,
      notes: schedule.notes
    });
  };

  // Delete schedule
  const handleDeleteSchedule = (scheduleId) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      const updatedSchedules = budgetSchedules.filter(s => s.id !== scheduleId);
      saveBudgetSchedules(updatedSchedules);
      console.log('🗑️ Schedule deleted:', scheduleId);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      budgetId: '',
      startDate: '',
      finishDate: '',
      progress: 0,
      notes: ''
    });
    setEditingSchedule(null);
  };

  // Calculate schedule progress for EVM
  const calculateScheduleProgress = (schedule) => {
    // Use the actual progress value from the schedule, not time-based calculation
    return parseFloat(schedule.progress) || 0;
  };

  // Calculate time-based progress for comparison
  const calculateTimeBasedProgress = (schedule) => {
    if (!projectDates || !schedule.startDate || !schedule.finishDate) return 0;

    const projectStart = new Date(projectDates.startDate);
    const projectFinish = new Date(projectDates.finishDate);
    const scheduleStart = new Date(schedule.startDate);
    const scheduleFinish = new Date(schedule.finishDate);
    const today = new Date();

    // Calculate total project duration
    const totalProjectDays = Math.ceil((projectFinish - projectStart) / (1000 * 60 * 60 * 24));
    const totalScheduleDays = Math.ceil((scheduleFinish - scheduleStart) / (1000 * 60 * 60 * 24));

    // Calculate progress based on time
    if (today < scheduleStart) return 0;
    if (today > scheduleFinish) return 100;

    const elapsedDays = Math.ceil((today - scheduleStart) / (1000 * 60 * 60 * 24));
    const timeProgress = Math.min(100, (elapsedDays / totalScheduleDays) * 100);

    return Math.round(timeProgress);
  };

  // Get budget by ID
  const getBudgetById = (budgetId) => {
    return budgets.find(b => b.id === budgetId);
  };

  // Calculate total project duration
  const getProjectDuration = () => {
    if (!projectDates) return 0;
    const start = new Date(projectDates.startDate);
    const finish = new Date(projectDates.finishDate);
    return Math.ceil((finish - start) / (1000 * 60 * 60 * 24));
  };

  // Calculate timeline position for Gantt chart
  const getTimelinePosition = (date) => {
    if (!projectDates) return 0;
    const projectStart = new Date(projectDates.startDate);
    const targetDate = new Date(date);
    const totalDays = getProjectDuration();
    const daysFromStart = Math.ceil((targetDate - projectStart) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));
  };

  // Calculate task complexity based on duration
  const getTaskComplexity = (startDate, endDate) => {
    if (!startDate || !endDate) return 'low';
    const duration = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    if (duration <= 3) return 'low';
    if (duration <= 7) return 'medium';
    if (duration <= 14) return 'high';
    return 'critical';
  };

  // Get complexity color classes
  const getComplexityColors = (complexity) => {
    switch (complexity) {
      case 'low':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  // Get progress color classes
  const getProgressColors = (progress) => {
    if (progress === 0) return 'bg-gray-100';
    if (progress < 25) return 'bg-red-100';
    if (progress < 50) return 'bg-orange-100';
    if (progress < 75) return 'bg-yellow-100';
    if (progress < 100) return 'bg-blue-100';
    return 'bg-green-100';
  };

  // Get available budgets (not already assigned to other tasks)
  const getAvailableBudgets = () => {
    if (!budgets || budgets.length === 0) return [];
    
    // Get budgets that are already assigned to other tasks
    const assignedBudgetIds = budgetSchedules
      .filter(schedule => schedule.id !== editingSchedule?.id) // Exclude current task if editing
      .map(schedule => schedule.budgetId)
      .filter(Boolean);
    
    // Return budgets that are not assigned
    return budgets.filter(budget => !assignedBudgetIds.includes(budget.id));
  };

  // Validate budget assignment
  const validateBudgetAssignment = (budgetId) => {
    if (!budgetId) return { isValid: true, message: '' };
    
    // Check if budget is already assigned to another task
    const existingAssignment = budgetSchedules.find(
      schedule => schedule.budgetId === budgetId && schedule.id !== editingSchedule?.id
    );
    
    if (existingAssignment) {
      return {
        isValid: false,
        message: `Budget "${budgets.find(b => b.id === budgetId)?.name}" is already assigned to another task`
      };
    }
    
    return { isValid: true, message: '' };
  };

  // Delete budget schedule
  const handleDelete = (scheduleId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      const updatedSchedules = budgetSchedules.filter(schedule => schedule.id !== scheduleId);
      saveBudgetSchedules(updatedSchedules);
      setBudgetSchedules(updatedSchedules);
      console.log('🗑️ Deleted task:', scheduleId);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          Project Schedule
        </h2>
        <p className="text-gray-600">
          Visual timeline with color-coded task complexity based on duration.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Project Timeline */}
      {projectDates && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Timeline</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {projectDates.startDate ? new Date(projectDates.startDate).toLocaleDateString() : 'Not Set'}
              </div>
              <div className="text-sm text-gray-600">Start Date</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {projectDates.finishDate ? new Date(projectDates.finishDate).toLocaleDateString() : 'Not Set'}
              </div>
              <div className="text-sm text-gray-600">Finish Date</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {projectDates.startDate && projectDates.finishDate 
                  ? Math.ceil((new Date(projectDates.finishDate) - new Date(projectDates.startDate)) / (1000 * 60 * 60 * 24))
                  : 0
                }
              </div>
              <div className="text-sm text-gray-600">Duration (Days)</div>
            </div>
          </div>
        </div>
      )}

      {/* Task Schedule Grid */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Project Tasks</h3>
          <div className="flex gap-2">
            <button
              onClick={loadProjectData}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={() => setEditingSchedule({})}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </button>
          </div>
        </div>

        {/* Complexity Legend */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
              <span>Low Complexity (≤3 days)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
              <span>Medium Complexity (4-7 days)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded"></div>
              <span>High Complexity (8-14 days)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
              <span>Critical Complexity (&gt;14 days)</span>
            </div>
          </div>
        </div>

        {/* Budget Assignment Summary */}
        {budgetSchedules.length > 0 && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-800">
                <span className="font-medium">{budgetSchedules.length}</span> tasks assigned • 
                <span className="font-medium ml-1">{getAvailableBudgets().length}</span> budgets available
              </div>
              <div className="text-xs text-blue-600">
                Each budget can only be assigned to one task
              </div>
            </div>
          </div>
        )}

        {/* Tasks Grid */}
        <div className="p-6">
          {budgetSchedules.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 text-lg">No tasks scheduled</p>
              <p className="text-gray-400">Click "Add Task" to create your first task</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {budgetSchedules.map(schedule => {
                const complexity = getTaskComplexity(schedule.startDate, schedule.finishDate);
                const complexityColors = getComplexityColors(complexity);
                const progressColors = getProgressColors(schedule.progress);
                
                return (
                  <div
                    key={schedule.id}
                    className={`border rounded-lg p-4 ${complexityColors} hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{schedule.budgetName || 'Unnamed Task'}</h4>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                            Budget Assigned
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          {schedule.startDate && schedule.finishDate ? (
                            <>
                              {new Date(schedule.startDate).toLocaleDateString()} - {new Date(schedule.finishDate).toLocaleDateString()}
                            </>
                          ) : (
                            'No dates set'
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingSchedule(schedule)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium">Progress</span>
                        <span className="text-xs font-bold">{schedule.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${progressColors}`}
                          style={{ width: `${schedule.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Task Details */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">
                          {schedule.startDate && schedule.finishDate ? (
                            Math.ceil((new Date(schedule.finishDate) - new Date(schedule.startDate)) / (1000 * 60 * 60 * 24)) + ' days'
                          ) : (
                            'Not set'
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Complexity:</span>
                        <span className={`font-medium px-2 py-1 rounded text-xs ${complexityColors}`}>
                          {complexity.charAt(0).toUpperCase() + complexity.slice(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Budget:</span>
                        <span className="font-medium text-blue-600">
                          {schedule.budgetName || 'Unassigned'}
                        </span>
                      </div>
                      {schedule.notes && (
                        <div className="text-gray-600 italic">
                          "{schedule.notes}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Project Timeline Header */}
      {projectDates && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Project Timeline
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Project Start</p>
              <p className="text-lg font-semibold text-blue-600">
                {new Date(projectDates.startDate).toLocaleDateString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Project Finish</p>
              <p className="text-lg font-semibold text-red-600">
                {new Date(projectDates.finishDate).toLocaleDateString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Duration</p>
              <p className="text-lg font-semibold text-green-600">
                {getProjectDuration()} days
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Budget Schedule Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          {editingSchedule ? 'Edit Budget Schedule' : 'Add Budget Schedule'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="text-red-500">*</span> Task
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
              <span className="text-red-500">*</span> Budget
            </label>
            <select
              name="budgetId"
              value={formData.budgetId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Budget</option>
              {getAvailableBudgets().map(budget => (
                <option key={budget.id} value={budget.id}>
                  {budget.name}
                </option>
              ))}
            </select>
            {getAvailableBudgets().length === 0 && budgetSchedules.length > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ All budgets are already assigned to other tasks
              </p>
            )}
            {getAvailableBudgets().length > 0 && (
              <p className="text-xs text-green-600 mt-1">
                ✅ {getAvailableBudgets().length} budget(s) available for assignment
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="text-red-500">*</span> Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              min={projectDates?.startDate}
              max={projectDates?.finishDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="text-red-500">*</span> Finish Date
            </label>
            <input
              type="date"
              name="finishDate"
              value={formData.finishDate}
              onChange={handleInputChange}
              min={formData.startDate || projectDates?.startDate}
              max={projectDates?.finishDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Progress (%)
            </label>
            <input
              type="number"
              name="progress"
              value={formData.progress}
              onChange={handleInputChange}
              min="0"
              max="100"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <input
              type="text"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Optional notes about this schedule"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-4">
          {editingSchedule && (
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSaveSchedule}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            {editingSchedule ? 'Update Schedule' : 'Add Schedule'}
          </button>
        </div>
      </div>

      {/* Budget Schedules List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Budget Schedules ({budgetSchedules.length})
        </h3>

        {budgetSchedules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No budget schedules created yet.</p>
            <p className="text-sm">Add schedules above to create your Gantt chart.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {budgetSchedules.map(schedule => {
              const budget = getBudgetById(schedule.budgetId);
              const scheduleProgress = calculateScheduleProgress(schedule);
              const startPosition = getTimelinePosition(schedule.startDate);
              const finishPosition = getTimelinePosition(schedule.finishDate);
              const width = finishPosition - startPosition;

              return (
                <div key={schedule.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{schedule.budgetName}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(schedule.startDate).toLocaleDateString()} - {new Date(schedule.finishDate).toLocaleDateString()}
                      </p>
                      {schedule.notes && (
                        <p className="text-sm text-gray-500 mt-1">{schedule.notes}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditSchedule(schedule)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                        title="Edit schedule"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                        title="Delete schedule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Gantt Bar */}
                  <div className="relative">
                    <div className="h-8 bg-gray-200 rounded-lg relative overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-blue-500 rounded-lg flex items-center justify-center text-white text-xs font-medium"
                        style={{
                          left: `${startPosition}%`,
                          width: `${width}%`
                        }}
                      >
                        {scheduleProgress}%
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Start: {new Date(schedule.startDate).toLocaleDateString()}</span>
                      <span>Progress: {scheduleProgress}%</span>
                      <span>Finish: {new Date(schedule.finishDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Budget Details */}
                  {budget && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Budget Amount:</span>
                        <p className="font-medium">{safeFormatCurrency(budget.amount || budget.revised || 0)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Input Hours:</span>
                        <p className="font-medium">{budget.inputQuantity || 0}h</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Output Units:</span>
                        <p className="font-medium">{budget.quantity || 0} units</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Schedule Progress:</span>
                        <p className="font-medium text-blue-600">{scheduleProgress}%</p>
                      </div>
                    </div>
                  )}

                  {/* Progress History */}
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Progress History</h5>
                    <div className="space-y-2">
                      {getProgressHistoryForSchedule(schedule.id).length > 0 ? (
                        getProgressHistoryForSchedule(schedule.id).map((entry, index) => (
                          <div key={entry.id} className="flex justify-between items-center text-xs bg-gray-50 px-3 py-2 rounded">
                            <span>{new Date(entry.date).toLocaleDateString()}</span>
                            <span className="font-medium">{entry.progress}%</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500">No progress history recorded</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Task Management Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Task Management</h3>
            <div className="flex items-center space-x-4">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="timeline">Timeline</option>
                <option value="list">List</option>
              </select>
              <select
                value={selectedBudget}
                onChange={(e) => setSelectedBudget(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Budgets</option>
                {revisedBudgets.map(budget => (
                  <option key={budget.id} value={budget.id}>
                    {budget.name} - {budget.revised > 0 ? `$${budget.revised.toLocaleString()}` : 'No Revised Amount'}
                  </option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="planned">Planned</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <button
                onClick={handleAddTask}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </button>
              <button
                onClick={loadTasks}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Tasks
              </button>
              <button
                onClick={loadPerformanceData}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Performance
              </button>
            </div>
          </div>

          {/* Performance Data Status */}
          {Object.keys(physicalProgress).length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-green-800">Performance Data Loaded</p>
                  <p className="text-xs text-green-600">
                    Physical progress data from ACC Performance Tracker for {Object.keys(physicalProgress).length} budget(s)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Revised Budget Summary */}
          {revisedBudgets.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Revised Budget Summary</p>
                    <p className="text-xs text-blue-600">
                      Total Revised Amount: ${revisedBudgets.reduce((sum, b) => sum + b.revised, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-800">{revisedBudgets.length} Budgets</p>
                  <p className="text-xs text-blue-600">Loaded from Cost Management</p>
                </div>
              </div>
            </div>
          )}

          {/* Task Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-blue-600">Total Tasks</p>
                  <p className="text-2xl font-bold text-blue-900">{getTaskStats().total}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <CheckSquare className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-green-600">Completed</p>
                  <p className="text-2xl font-bold text-green-900">{getTaskStats().completed}</p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm text-yellow-600">In Progress</p>
                  <p className="text-2xl font-bold text-yellow-900">{getTaskStats().inProgress}</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm text-purple-600">Physical Progress</p>
                  <p className="text-2xl font-bold text-purple-900">{getTaskStats().avgPhysicalProgress}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-4">
            {getFilteredTasks().map((task) => (
              <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-medium text-gray-900">{task.name}</h4>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status}
                    </span>
                    <button
                      onClick={() => handleEditTask(task)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Start Date:</span>
                    <p className="font-medium">{task.startDate}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">End Date:</span>
                    <p className="font-medium">{task.endDate}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Progress:</span>
                    <p className="font-medium">{task.progress}%</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Physical Progress:</span>
                    <p className="font-medium text-blue-600">
                      {task.budgetId && physicalProgress[task.budgetId] 
                        ? `${physicalProgress[task.budgetId].outputProgress || 0}%`
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Budget Amount:</span>
                    <p className="font-medium text-green-600">
                      {task.budgetId && revisedBudgets.find(b => b.id === task.budgetId) 
                        ? `$${revisedBudgets.find(b => b.id === task.budgetId).revised.toLocaleString()}`
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Priority:</span>
                    <p className="font-medium capitalize">{task.priority}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Form Modal */}
        {showTaskForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingTask ? 'Edit Task' : 'Create Task'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={taskFormData.name}
                    onChange={handleTaskInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={taskFormData.description}
                    onChange={handleTaskInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      name="startDate"
                      value={taskFormData.startDate}
                      onChange={handleTaskInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                    <input
                      type="date"
                      name="endDate"
                      value={taskFormData.endDate}
                      onChange={handleTaskInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                  <select
                    name="budgetId"
                    value={taskFormData.budgetId}
                    onChange={handleTaskInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Budget</option>
                    {revisedBudgets.map(budget => (
                      <option key={budget.id} value={budget.id}>
                        {budget.name} - {budget.revised > 0 ? `$${budget.revised.toLocaleString()}` : 'No Revised Amount'}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Progress (%)</label>
                    <input
                      type="number"
                      name="progress"
                      value={taskFormData.progress}
                      onChange={handleTaskInputChange}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      name="priority"
                      value={taskFormData.priority}
                      onChange={handleTaskInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={taskFormData.status}
                    onChange={handleTaskInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="planned">Planned</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                  <input
                    type="text"
                    name="assignedTo"
                    value={taskFormData.assignedTo}
                    onChange={handleTaskInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowTaskForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTask}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingTask ? 'Update' : 'Create'} Task
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GanttChartTab;
