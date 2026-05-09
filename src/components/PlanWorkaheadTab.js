import React, { useState, useEffect } from 'react';
import { Plus, Calendar as CalendarIcon, User, Users, Target, Download, Upload, Clock, Link as LinkIcon, Search, X } from "lucide-react";
import CalendarTab from "./CalendarTab";
import * as XLSX from 'xlsx';
import { safeParseFloat, safeToFixed, safeFormatCurrency } from '../utils/numberUtils';
import LocalTimesheetService from '../services/LocalTimesheetService';
import AccService from '../services/AccService_old';

const PlanWorkaheadTab = ({ selectedProject, selectedHub, projects, members = [], budgets = [], credentials }) => {
  const [tasks, setTasks] = useState([]);
  const [crews, setCrews] = useState([]);
  const [projectUsers, setProjectUsers] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [availableCalendars, setAvailableCalendars] = useState([]);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [timesheetService] = useState(new LocalTimesheetService());
  const [formData, setFormData] = useState({
    taskName: "",
    description: "",
    plannedDate: new Date().toISOString().split('T')[0], // Auto-set to today
    startDate: "",
    endDate: "",
    plannedHours: "",
    plannedOutput: "",
    outputUnit: "units",
    outputUnitCost: "",
    taskValue: "",
    workType: "member", // member or crew
    assignedMemberId: "",
    assignedCrewId: "",
    userName: "",
    crewId: "",
    crewName: "",
    status: "planned",
    budgetId: "",
    customTaskName: "" // Add custom task name field
  });
  const [fallbackBudgets, setFallbackBudgets] = useState([]);
  const [budgetStats, setBudgetStats] = useState(null);
  const [budgetSearchTerm, setBudgetSearchTerm] = useState('');
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  
  // Calendar-based planning states
  const [showCalendarPlanner, setShowCalendarPlanner] = useState(false);
  const [selectedBudgetForCalendar, setSelectedBudgetForCalendar] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);
  const [planLines, setPlanLines] = useState([]);

  // Load data when project changes
  useEffect(() => {
    if (selectedProject) {
      loadTasks();
      loadCrews();
      loadProjectUsers();
      loadAvailableCalendars();
      if (!budgets || budgets.length === 0) {
        loadBudgetsFallback();
      }
    }
  }, [selectedProject]);

  // Close budget dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showBudgetDropdown && !event.target.closest('.budget-dropdown-container')) {
        setShowBudgetDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBudgetDropdown]);

  // Clear user state when hub changes
  useEffect(() => {
    console.log('🔄 Hub changed in PlanWorkaheadTab, clearing user state');
    setProjectUsers([]);
    
    // Force clear any cached data
    if (typeof localStorage !== 'undefined') {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('user') || key.includes('project'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('🧹 Cleared cached user data from localStorage in PlanWorkaheadTab');
    }
  }, [selectedHub]);

  // Load the correct people source based on work type selection
  useEffect(() => {
    if (!selectedProject) return;
    if (formData.workType === 'crew') {
      loadCrews();
    } else {
      loadProjectUsers();
    }
  }, [formData.workType, selectedProject, selectedHub]);

  // Re-compute budget stats when budget or project changes (independent of task)
  useEffect(() => {
    if (!selectedProject || !formData.budgetId) {
      setBudgetStats(null);
      return;
    }
    try {
      const list = (budgets && budgets.length > 0 ? budgets : fallbackBudgets) || [];
      const budget = list.find(b => b.id === formData.budgetId);
      if (!budget) { 
        setBudgetStats(null); 
        return; 
      }

      const totalInput = parseFloat(budget.inputQuantity || budget.inputQty || budget.inputHours || 0) || 0; // hours
      const totalOutput = parseFloat(budget.outputQuantity || budget.quantity || budget.outputQty || 0) || 0; // output units

      const plansKey = `plans_${selectedProject.id}`;
      const existingPlans = JSON.parse(localStorage.getItem(plansKey) || '[]')
        .filter(p => p.budgetId === formData.budgetId);
      const usedInput = existingPlans.reduce((s, p) => s + (parseFloat(p.plannedHours) || 0), 0);
      const usedOutput = existingPlans.reduce((s, p) => s + (parseFloat(p.plannedOutputQty) || 0), 0);

      const remainingInput = Math.max(0, totalInput - usedInput);
      const remainingOutput = Math.max(0, totalOutput - usedOutput);

      setBudgetStats({
        budget,
        totalInput,
        totalOutput,
        usedInput,
        usedOutput,
        remainingInput,
        remainingOutput,
        // Add original quantities tracking
        originalInput: parseFloat(budget.originalAmount || budget.originalBudget || 0),
        originalOutput: parseFloat(budget.quantity || budget.outputQuantity || 0),
        // Add sum of plans tracking
        sumOfPlans: existingPlans.length,
        averagePlanHours: existingPlans.length > 0 ? usedInput / existingPlans.length : 0,
        averagePlanOutput: existingPlans.length > 0 ? usedOutput / existingPlans.length : 0
      });
      
      console.log('💰 Budget stats updated for:', budget.name, {
        totalInput,
        totalOutput,
        usedInput,
        usedOutput,
        remainingInput,
        remainingOutput
      });
    } catch (e) {
      console.error('❌ Error computing budget stats:', e);
      setBudgetStats(null);
    }
  }, [formData.budgetId, selectedProject, budgets, fallbackBudgets]);

  // Clamp values so they cannot exceed remaining
  useEffect(() => {
    if (!budgetStats) return;
    if (parseFloat(formData.plannedHours || 0) > budgetStats.remainingInput) {
      setFormData(prev => ({ ...prev, plannedHours: budgetStats.remainingInput }));
    }
  }, [budgetStats, formData.plannedHours]);

  useEffect(() => {
    if (!budgetStats) return;
    if (parseFloat(formData.plannedOutput || 0) > budgetStats.remainingOutput) {
      setFormData(prev => ({ ...prev, plannedOutput: budgetStats.remainingOutput }));
    }
  }, [budgetStats, formData.plannedOutput]);

  // Enhanced budget loading with comprehensive ACC data
  const loadBudgetsFallback = async () => {
    try {
      const projectId = selectedProject?.projectId || selectedProject?.id;
      const hubId = selectedHub?.id || selectedProject?.hubId;
      if (!projectId || !hubId) return;
      
      console.log('💰 Loading comprehensive budget data from ACC for planner...');
      const fetched = await AccService.getBudgets(projectId, hubId);
      
      const processed = (fetched || []).map(b => {
        // Helper function to safely convert to number
        const safeNumber = (value, defaultValue = 0) => {
          if (value === null || value === undefined || value === '') return defaultValue;
          const num = parseFloat(value);
          return isNaN(num) ? defaultValue : num;
        };

        return {
        id: b.id,
        name: b.name || b.attributes?.name || 'Unknown Budget',
          code: b.code || '',
          description: b.description || '',
          originalAmount: safeNumber(b.originalAmount || b.originalBudget),
          revised: safeNumber(b.revised),
          projectedCost: safeNumber(b.projectedCost || b.projectedBudget),
          actualCost: safeNumber(b.actualCost),
          variance: safeNumber(b.varianceTotal || b.forecastVariance),
          status: b.status || 'active',
          unit: b.unit || 'units',
          quantity: safeNumber(b.quantity),
          unitPrice: safeNumber(b.unitPrice),
          // Add input/output quantities for planner cards
          inputQuantity: safeNumber(b.inputQuantity || b.inputQty),
          outputQuantity: safeNumber(b.outputQuantity || b.quantity),
          inputHours: safeNumber(b.inputHours || b.inputQuantity),
          outputQty: safeNumber(b.outputQty || b.quantity),
          scope: b.scope || 'budgetAndCost',
          externalSystem: b.externalSystem,
          integrationState: b.integrationState,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt
        };
      });
      
      console.log('💰 Processed comprehensive budget data for planner:', processed.length);
      setFallbackBudgets(processed);
    } catch (e) {
      console.error('❌ Planner comprehensive budget load failed:', e);
      setFallbackBudgets([]);
    }
  };


  const loadProjectUsers = async () => {
    if (!selectedProject) {
      console.warn('⚠️ No selected project for user load');
      setProjectUsers([]);
      return;
    }
    
    try {
      const hubId = selectedHub?.id || selectedProject.hubId;
      const projectId = selectedProject.projectId || selectedProject.id;
      
      console.log('👥 Loading project users for', { 
        projectId, 
        hubId, 
        hasCredentials: !!credentials,
        selectedProject: selectedProject.id 
      });
      
      if (!hubId || !projectId) {
        console.warn('⚠️ Missing hubId/projectId for user load');
        setProjectUsers([]);
        return;
      }
      
      console.log('👥 Loading project users (reliable) for', { projectId, hubId });
      let users = await AccService.getProjectUsersReliable(projectId, hubId);
      
      if (!users || users.length === 0) {
        console.log('🔄 Falling back to admin user API');
        users = await AccService.getProjectUsersAdmin(projectId, hubId);
      }
      
      setProjectUsers(users || []);
      console.log('👥 Loaded project users:', users?.length || 0);
      
      // If still no users, show empty state
      if (!users || users.length === 0) {
        console.log('🔄 No users found for Planner');
        setProjectUsers([]);
      }
      
    } catch (error) {
      console.error('Error loading project users:', error);
      
      // Show empty state on error
      setProjectUsers([]);
    }
  };

  const loadTasks = () => {
    if (!selectedProject || !selectedProject.id) {
      console.log('⚠️ No selected project, cannot load tasks for Planner');
      setTasks([]);
      return;
    }
    
    const savedTasks = JSON.parse(localStorage.getItem(`tasks_${selectedProject.id}`) || '[]');
    console.log('📋 Loading tasks for Planner from Tasks tab:', savedTasks.length, 'tasks');
    setTasks(savedTasks);
  };

  const loadCrews = () => {
    try {
      const projectKey = selectedProject?.id ? `crews_${selectedProject.id}` : 'crews';
      const scoped = JSON.parse(localStorage.getItem(projectKey) || '[]');
      const legacy = JSON.parse(localStorage.getItem('crews') || '[]');
      const data = Array.isArray(scoped) && scoped.length > 0 ? scoped : (Array.isArray(legacy) ? legacy : []);
      setCrews(data);
      console.log('👥 Loaded crews for planner:', { projectKey, count: data.length });
    } catch (e) {
      console.error('❌ Error loading crews for planner:', e);
      setCrews([]);
    }
  };

  const loadAvailableCalendars = () => {
    const savedCalendars = JSON.parse(localStorage.getItem('calendars') || '[]');
    setAvailableCalendars(savedCalendars);
  };

  // Filter budgets based on search term
  const getFilteredBudgets = () => {
    const budgetList = (budgets?.length ? budgets : fallbackBudgets) || [];
    if (!budgetSearchTerm) return budgetList;
    
    return budgetList.filter(budget => 
      budget.name.toLowerCase().includes(budgetSearchTerm.toLowerCase()) ||
      budget.code?.toLowerCase().includes(budgetSearchTerm.toLowerCase()) ||
      budget.description?.toLowerCase().includes(budgetSearchTerm.toLowerCase())
    );
  };

  // Get selected budget name
  const getSelectedBudgetName = () => {
    const budgetList = (budgets?.length ? budgets : fallbackBudgets) || [];
    const selected = budgetList.find(b => b.id === formData.budgetId);
    return selected ? selected.name : 'Select Budget';
  };

  const saveTasks = (newTasks) => {
    // Persist tasks per project so other tabs (e.g., Gantt) read the same source
    if (selectedProject && selectedProject.id) {
      localStorage.setItem(`tasks_${selectedProject.id}`, JSON.stringify(newTasks));
    } else {
      localStorage.setItem('tasks', JSON.stringify(newTasks));
    }
    setTasks(newTasks);
  };

  const saveCrews = (newCrews) => {
    localStorage.setItem('crews', JSON.stringify(newCrews));
    setCrews(newCrews);
  };

  const saveCalendars = (newCalendars) => {
    localStorage.setItem('calendars', JSON.stringify(newCalendars));
    setAvailableCalendars(newCalendars);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Prevent planning the same task more than once
    try {
      const selectedTask = tasks.find(t => t.name === formData.taskName || t.taskName === formData.taskName);
      
      // Check if the task is already planned by status
      if (selectedTask && (selectedTask.status || 'not-started') === 'planned') {
        alert('This task has already been planned. A task can only be planned once.');
        return;
      }
      
      // Also check existing plans in localStorage
      const plansKey = selectedProject ? `plans_${selectedProject.id}` : 'plans';
      const existingPlans = JSON.parse(localStorage.getItem(plansKey) || '[]');
      const duplicatePlan = existingPlans.find(p => 
        (p.taskId && selectedTask?.id && p.taskId === selectedTask.id) || 
        (!p.taskId && p.name === formData.taskName)
      );
      if (duplicatePlan) {
        alert('This task has already been planned. A task can only be planned once.');
        return;
      }
    } catch (e1) {
      console.error('❌ Error checking duplicate plan:', e1);
    }
    // Validate against budget remaining if a budget is chosen (independent of task)
    if (formData.budgetId && budgetStats) {
      const hours = parseFloat(formData.plannedHours || 0) || 0;
      const output = parseFloat(formData.plannedOutput || 0) || 0;
      if (hours > budgetStats.remainingInput) {
        alert(`Planned hours exceed remaining input hours for this budget. Remaining: ${budgetStats.remainingInput}`);
        return;
      }
      if (output > budgetStats.remainingOutput) {
        alert(`Planned output exceeds remaining output quantity for this budget. Remaining: ${budgetStats.remainingOutput}`);
        return;
      }
    }
    
    const newTask = {
      id: Date.now().toString(),
      ...formData,
      createdAt: new Date().toISOString()
    };
    
    const updatedTasks = [...tasks, newTask];
    saveTasks(updatedTasks);

    // Also persist a lightweight Plan record for Timesheet module consumption
    try {
      const selectedTask = tasks.find(t => t.name === formData.taskName) || {};
      const projectPlansKey = selectedProject ? `plans_${selectedProject.id}` : 'plans';
      const existingPlans = JSON.parse(localStorage.getItem(projectPlansKey) || '[]');
      const newPlan = {
        id: `plan-${Date.now()}`,
        name: formData.taskName,
        taskId: selectedTask.id || '',
        plannedHours: parseFloat(formData.plannedHours || 0),
        plannedOutputQty: parseFloat(formData.plannedOutput || 0),
        startDate: formData.startDate || formData.plannedDate || '',
        endDate: formData.endDate || '',
        unit: formData.outputUnit || 'units',
        userId: formData.assignedMemberId || '',
        crewId: formData.assignedCrewId || '',
        workType: formData.workType,
        description: formData.description || '',
        budgetId: formData.budgetId || ''
      };
      localStorage.setItem(projectPlansKey, JSON.stringify([...existingPlans, newPlan]));
      console.log('✅ Saved plan for TimesheetTab:', newPlan);
    } catch (planSaveError) {
      console.error('❌ Error saving plan for TimesheetTab:', planSaveError);
    }
    
    // Reset form
    setFormData({
      taskName: "",
      description: "",
      plannedDate: new Date().toISOString().split('T')[0], // Keep auto-set to today
      startDate: "",
      endDate: "",
      plannedHours: "",
      plannedOutput: "",
      outputUnit: "units",
      outputUnitCost: "",
      taskValue: "",
      workType: "member",
      assignedMemberName: "",
      assignedCrewName: "",
      userName: "",
      crewId: "",
      crewName: "",
      status: "planned",
      budgetId: "",
      customTaskName: "" // Reset custom task name
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle budget selection and auto-populate planner
  const handleBudgetSelection = (budgetId) => {
    setFormData(prev => ({ ...prev, budgetId }));
    
    // Auto-populate planner with budget data
    const budgetList = (budgets?.length ? budgets : fallbackBudgets) || [];
    const selectedBudget = budgetList.find(b => b.id === budgetId);
    
    if (selectedBudget) {
      console.log('💰 Auto-populating planner with budget data:', selectedBudget.name);
      
      // Auto-populate with budget quantities if available
      setFormData(prev => ({
        ...prev,
        budgetId,
        // Auto-populate planned hours from budget input quantity
        plannedHours: selectedBudget.inputQuantity || selectedBudget.inputQty || selectedBudget.inputHours || '',
        // Auto-populate planned output from budget output quantity
        plannedOutput: selectedBudget.outputQuantity || selectedBudget.quantity || selectedBudget.outputQty || '',
        // Auto-populate output unit from budget
        outputUnit: selectedBudget.unit || 'units',
        // Auto-populate output unit cost from budget
        outputUnitCost: selectedBudget.unitPrice || '',
        // Auto-populate task value from budget amount
        taskValue: selectedBudget.revised || selectedBudget.originalAmount || ''
      }));
    }
  };

  // Handle task input change and auto-populate dates when existing task is selected
  const handleTaskInputChange = (e) => {
    const taskName = e.target.value;
    const selectedTask = tasks.find(task => task.name === taskName);
    
    setFormData(prev => ({
      ...prev,
      taskName: taskName
    }));
    
    // Check if the task is already planned
    if (selectedTask && (selectedTask.status || 'not-started') === 'planned') {
      console.log('⚠️ Task is already planned:', selectedTask.name);
      // You could show a warning here or clear the field
      // For now, we'll just log it and not auto-populate
      return;
    }
    
    // Auto-populate dates if an existing task is selected and not planned
    if (selectedTask && (selectedTask.status || 'not-started') !== 'planned') {
      console.log('📋 Existing task selected:', selectedTask.name);
      console.log('📅 Auto-populating dates:', selectedTask.startDate, 'to', selectedTask.endDate);
      
      setFormData(prev => ({
        ...prev,
        taskName: taskName,
        description: selectedTask.description || prev.description,
        startDate: selectedTask.startDate,
        endDate: selectedTask.endDate,
        plannedDate: selectedTask.startDate // Set planned date to start date
      }));
      
      // Check if task has a mapped budget in Gantt chart
      if (selectedTask.budgetId) {
        console.log('💰 Task has mapped budget:', selectedTask.budgetId);
      setFormData(prev => ({
        ...prev,
          budgetId: selectedTask.budgetId
      }));
      }
    }
  };

  const deleteTask = (taskId) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    saveTasks(updatedTasks);
  };

  const updateTask = (taskId, updates) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    );
    saveTasks(updatedTasks);
  };

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Planner</h2>
        <button
          onClick={() => { loadTasks(); loadCrews(); loadProjectUsers(); loadAvailableCalendars(); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Target className="w-4 h-4" />
          Refresh Tasks ({tasks.length})
        </button>
      </div>
      
      {/* Calendar-based Planning Toggle */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Calendar Planning</h3>
            <p className="text-sm text-gray-600">Create detailed plans with daily input/output across multiple days</p>
          </div>
          <button
            onClick={() => setShowCalendarPlanner(!showCalendarPlanner)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <CalendarIcon className="w-4 h-4" />
            {showCalendarPlanner ? 'Hide Calendar' : 'Show Calendar Planner'}
          </button>
        </div>
      </div>

      {/* Calendar Planner */}
      {showCalendarPlanner && (
        <CalendarPlanner
          selectedProject={selectedProject}
          budgets={budgets}
          fallbackBudgets={fallbackBudgets}
          members={members}
          crews={crews}
          projectUsers={projectUsers}
          onClose={() => setShowCalendarPlanner(false)}
        />
      )}

      {/* Selected Budget Details - Show when budget is selected */}
      {formData.budgetId && budgetStats && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Selected Budget: {budgetStats.budget.name}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-3 border border-green-200">
              <h4 className="font-medium text-sm text-gray-800">Hours Remaining</h4>
              <div className="mt-2">
                <div className="text-2xl font-bold text-green-600">{budgetStats.remainingInput.toFixed(1)}h</div>
                <div className="text-xs text-gray-500">
                  {budgetStats.usedInput.toFixed(1)}h used of {budgetStats.totalInput.toFixed(1)}h total
                    </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, budgetStats.totalInput > 0 ? (budgetStats.usedInput / budgetStats.totalInput) * 100 : 0)}%` }}
                  ></div>
                    </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <h4 className="font-medium text-sm text-gray-800">Units Remaining</h4>
              <div className="mt-2">
                <div className="text-2xl font-bold text-blue-600">{budgetStats.remainingOutput.toFixed(1)}</div>
                <div className="text-xs text-gray-500">
                  {budgetStats.usedOutput.toFixed(1)} used of {budgetStats.totalOutput.toFixed(1)} total
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, budgetStats.totalOutput > 0 ? (budgetStats.usedOutput / budgetStats.totalOutput) * 100 : 0)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
            
            <div className="bg-white rounded-lg p-3 border border-purple-200">
              <h4 className="font-medium text-sm text-gray-800">Plans Summary</h4>
              <div className="mt-2">
                <div className="text-2xl font-bold text-purple-600">{budgetStats.sumOfPlans}</div>
                <div className="text-xs text-gray-500">Total plans for this budget</div>
                <div className="text-xs text-gray-500 mt-1">
                  Avg: {budgetStats.averagePlanHours.toFixed(1)}h per plan
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-orange-200">
              <h4 className="font-medium text-sm text-gray-800">Budget Amount</h4>
              <div className="mt-2">
                <div className="text-2xl font-bold text-orange-600">
                  ${(budgetStats.budget.revised || budgetStats.budget.originalAmount || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Available budget</div>
              </div>
            </div>
          </div>
        </div>
      )}


      <div className="bg-white rounded-lg shadow p-6">
        

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Name *
              </label>
              <div className="space-y-2">
                <div className="relative">
              <select
                name="taskName"
                value={formData.taskName}
                    onChange={handleTaskInputChange}
                required
                    className="w-full p-2 border rounded-lg pr-8 appearance-none bg-white"
              >
                    <option value="">Select from existing tasks...</option>
                {tasks
                      .filter(task => {
                        const taskStatus = task.status || 'not-started';
                        // Exclude tasks that are already planned
                        return taskStatus !== 'planned';
                      })
                  .map(task => (
                  <option key={task.id} value={task.name}>
                    {task.name} ({task.status || 'not-started'})
                  </option>
                ))}
              </select>
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                <div className="text-center text-sm text-gray-500">
                  <span className="text-gray-400">or</span>
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    name="customTaskName"
                    value={formData.customTaskName || ''}
                    onChange={(e) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        customTaskName: e.target.value,
                        taskName: e.target.value // Also update taskName
                      }));
                    }}
                    placeholder="Type custom task name..."
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Select from existing tasks or type a custom task name
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Type *
              </label>
              <select
                name="workType"
                value={formData.workType}
                onChange={handleInputChange}
                required
                className="w-full p-2 border rounded-lg"
              >
                <option value="member">Individual Member</option>
                <option value="crew">Crew</option>
              </select>
            </div>

            <div className="relative budget-dropdown-container">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search budgets..."
                  value={budgetSearchTerm}
                  onChange={(e) => {
                    setBudgetSearchTerm(e.target.value);
                    setShowBudgetDropdown(true);
                  }}
                  onFocus={() => setShowBudgetDropdown(true)}
                  className="w-full p-2 border rounded-lg pr-8"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {showBudgetDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2">
                      <div className="text-xs text-gray-500 mb-2">
                        {getFilteredBudgets().length} budgets found
                      </div>
                      {getFilteredBudgets().slice(0, 10).map(budget => (
                        <div
                          key={budget.id}
                          onClick={() => {
                            handleBudgetSelection(budget.id);
                            setBudgetSearchTerm(budget.name);
                            setShowBudgetDropdown(false);
                          }}
                          className="p-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                        >
                          <div className="font-medium text-gray-900">{budget.name}</div>
                          <div className="text-xs text-gray-500">
                            {budget.code && `${budget.code} • `}
                            ${(budget.revised || budget.originalAmount || 0).toLocaleString()}
                            {budget.unit && ` • ${budget.unit}`}
                          </div>
                        </div>
                      ))}
                      {getFilteredBudgets().length === 0 && (
                        <div className="p-2 text-sm text-gray-500">No budgets found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Selected Budget Display */}
              {formData.budgetId && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                  <div className="font-medium text-blue-900">{getSelectedBudgetName()}</div>
                  <div className="text-xs text-blue-600">
                    {(() => {
                      const selected = (budgets?.length ? budgets : fallbackBudgets).find(b => b.id === formData.budgetId);
                      return selected ? `$${(selected.revised || selected.originalAmount || 0).toLocaleString()}` : '';
                    })()}
                  </div>
                </div>
              )}
              {/* Enhanced Budget Statistics Display */}
              {budgetStats && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Budget Status:</span>
                      <span className="text-xs text-blue-600">{budgetStats.budget.name}</span>
                    </div>
                    

                    {/* Sum of Plans Tracking */}
                    <div className="mb-3 p-2 bg-white rounded border">
                      <div className="text-xs font-medium text-gray-700 mb-1">Plans Summary</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">Total Plans:</span>
                          <span className="ml-1 font-medium">{budgetStats.sumOfPlans}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Avg Hours/Plan:</span>
                          <span className="ml-1 font-medium">{budgetStats.averagePlanHours.toFixed(1)}h</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Avg Output/Plan:</span>
                          <span className="ml-1 font-medium">{budgetStats.averagePlanOutput.toFixed(1)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Utilization:</span>
                          <span className="ml-1 font-medium">
                            {budgetStats.totalInput > 0 ? ((budgetStats.usedInput / budgetStats.totalInput) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Usage Progress */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-blue-600">Hours:</span>
                        <div className="flex justify-between">
                          <span>Used: {budgetStats.usedInput.toFixed(1)}h</span>
                          <span className="font-medium text-green-600">Remaining: {budgetStats.remainingInput.toFixed(1)}h</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(100, budgetStats.totalInput > 0 ? (budgetStats.usedInput / budgetStats.totalInput) * 100 : 0)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <span className="text-blue-600">Units:</span>
                        <div className="flex justify-between">
                          <span>Used: {budgetStats.usedOutput.toFixed(1)}</span>
                          <span className="font-medium text-green-600">Remaining: {budgetStats.remainingOutput.toFixed(1)}</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(100, budgetStats.totalOutput > 0 ? (budgetStats.usedOutput / budgetStats.totalOutput) * 100 : 0)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {formData.workType === 'member' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
                <select
                  name="assignedMemberId"
                  value={formData.assignedMemberId}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Choose a user…</option>
                  {projectUsers?.map(u => (
                    <option key={u.id || u.userId} value={u.id || u.userId}>
                      {u.name || u.displayName || u.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.workType === 'crew' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Crew</label>
                <select
                  name="assignedCrewId"
                  value={formData.assignedCrewId}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Choose a crew…</option>
                  {crews?.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.crewName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Planned Date *
              </label>
              <input
                type="date"
                name="plannedDate"
                value={formData.plannedDate}
                onChange={handleInputChange}
                required
                readOnly
                className="w-full p-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                title="Planned date is automatically set to today's date"
              />
              <div className="mt-1 text-xs text-gray-500">
                Automatically set to today's date
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                min={formData.startDate}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Planned Hours
                {budgetStats && (
                  <span className="text-sm text-gray-500 ml-2">
                    (Max: {budgetStats.remainingInput.toFixed(1)}h remaining)
                  </span>
                )}
              </label>
              <input
                type="number"
                name="plannedHours"
                value={formData.plannedHours}
                onChange={handleInputChange}
                className={`w-full p-2 border rounded-lg ${
                  budgetStats && parseFloat(formData.plannedHours || 0) > budgetStats.remainingInput 
                    ? 'border-red-300 bg-red-50' 
                    : ''
                }`}
                placeholder="0"
                min="0"
                max={budgetStats ? budgetStats.remainingInput : undefined}
                step="0.1"
              />
              {budgetStats && parseFloat(formData.plannedHours || 0) > budgetStats.remainingInput && (
                <p className="text-red-600 text-xs mt-1">
                  ⚠️ Exceeds remaining budget hours ({budgetStats.remainingInput.toFixed(1)}h)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Planned Output
                {budgetStats && (
                  <span className="text-sm text-gray-500 ml-2">
                    (Max: {budgetStats.remainingOutput.toFixed(1)} units remaining)
                  </span>
                )}
              </label>
              <input
                type="number"
                name="plannedOutput"
                value={formData.plannedOutput}
                onChange={handleInputChange}
                className={`w-full p-2 border rounded-lg ${
                  budgetStats && parseFloat(formData.plannedOutput || 0) > budgetStats.remainingOutput 
                    ? 'border-red-300 bg-red-50' 
                    : ''
                }`}
                placeholder="0"
                min="0"
                max={budgetStats ? budgetStats.remainingOutput : undefined}
                step="0.1"
              />
              {budgetStats && parseFloat(formData.plannedOutput || 0) > budgetStats.remainingOutput && (
                <p className="text-red-600 text-xs mt-1">
                  ⚠️ Exceeds remaining budget units ({budgetStats.remainingOutput.toFixed(1)})
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-lg"
              rows="3"
              placeholder="Enter task description"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Plan
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Plans ({(() => {
          const plansKey = selectedProject ? `plans_${selectedProject.id}` : 'plans';
          const existingPlans = JSON.parse(localStorage.getItem(plansKey) || '[]');
          return existingPlans.length;
        })()})</h3>
        
        {(() => {
          const plansKey = selectedProject ? `plans_${selectedProject.id}` : 'plans';
          const existingPlans = JSON.parse(localStorage.getItem(plansKey) || '[]');
          return existingPlans.length === 0;
        })() ? (
          <p className="text-gray-500">No tasks planned yet.</p>
        ) : (
          <div className="space-y-4">
            {(() => {
              const plansKey = selectedProject ? `plans_${selectedProject.id}` : 'plans';
              const existingPlans = JSON.parse(localStorage.getItem(plansKey) || '[]');
              return existingPlans;
            })().map((plan) => (
              <div key={plan.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    {(() => {
                      const displayName = plan.name || 'Untitled';
                      const plannedDate = plan.startDate || '';

                      return (
                        <>
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold">{displayName}</h4>
                            <span className="px-2 py-0.5 text-xs rounded-full border bg-green-50 text-green-800 border-green-200">
                              Planned
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">{plan.description}</p>
                          <div className="flex gap-4 mt-2 text-sm text-gray-500">
                            <span>Planned: {plannedDate || '—'}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // Delete plan from localStorage
                        const plansKey = selectedProject ? `plans_${selectedProject.id}` : 'plans';
                        const existingPlans = JSON.parse(localStorage.getItem(plansKey) || '[]');
                        const updatedPlans = existingPlans.filter(p => p.id !== plan.id);
                        localStorage.setItem(plansKey, JSON.stringify(updatedPlans));
                        // Force re-render by updating state
                        setFormData(prev => ({ ...prev }));
                      }}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              if (!selectedProject || !selectedProject.id) return;
              if (!window.confirm('This will delete all Planner plans for the selected project. Continue?')) return;
              const plansKey = `plans_${selectedProject.id}`;
              localStorage.removeItem(plansKey);
              // force refresh
              setFormData(prev => ({ ...prev }));
            }}
            disabled={!selectedProject}
            className={`px-3 py-2 rounded-lg ${selectedProject ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
          >
            Clear Local Data
          </button>
        </div>
      </div>
    </div>
  );
};

// Calendar-based Planner Component
const CalendarPlanner = ({ selectedProject, budgets, fallbackBudgets, members, crews, projectUsers, onClose }) => {
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarDays, setCalendarDays] = useState([]);
  const [workType, setWorkType] = useState('member');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [assignedCrewId, setAssignedCrewId] = useState('');
  const [budgetSearchTerm, setBudgetSearchTerm] = useState('');
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  
  // Task loading states
  const [tasks, setTasks] = useState([]);
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [customTaskName, setCustomTaskName] = useState('');

  // Load tasks from Tasks tab
  const loadTasks = () => {
    if (!selectedProject) return;
    
    try {
      const savedTasks = JSON.parse(localStorage.getItem(`tasks_${selectedProject.id}`) || '[]');
      console.log('📋 Loading tasks for Calendar Planner:', savedTasks.length, 'tasks');
      setTasks(savedTasks);
    } catch (error) {
      console.error('❌ Error loading tasks for Calendar Planner:', error);
      setTasks([]);
    }
  };

  // Initialize calendar days when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const days = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push({
          date: new Date(d),
          hours: 0,
          outputProgress: 0,
          outputUnits: 0,
          description: ''
        });
      }
      setCalendarDays(days);
    }
  }, [startDate, endDate]);

  // Load tasks when component mounts
  useEffect(() => {
    if (selectedProject) {
      loadTasks();
    }
  }, [selectedProject]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTaskDropdown && !event.target.closest('.task-dropdown-container')) {
        setShowTaskDropdown(false);
      }
      if (showBudgetDropdown && !event.target.closest('.budget-dropdown-container')) {
        setShowBudgetDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTaskDropdown, showBudgetDropdown]);

  // Get budget list
  const budgetList = (budgets?.length ? budgets : fallbackBudgets) || [];
  
  // Filter budgets based on search
  const getFilteredBudgets = () => {
    if (!budgetSearchTerm) return budgetList;
    return budgetList.filter(budget => 
      budget.name.toLowerCase().includes(budgetSearchTerm.toLowerCase()) ||
      budget.code?.toLowerCase().includes(budgetSearchTerm.toLowerCase())
    );
  };

  // Get selected budget name
  const getSelectedBudgetName = () => {
    const selected = budgetList.find(b => b.id === selectedBudget?.id);
    return selected ? selected.name : 'Select Budget';
  };

  // Filter tasks based on search
  const getFilteredTasks = () => {
    if (!Array.isArray(tasks) || tasks.length === 0) return [];
    if (!taskSearchTerm) return tasks.filter(t => t && (t.name || t.description));
    const q = (taskSearchTerm || '').toLowerCase();
    return tasks.filter(task => {
      if (!task) return false;
      const name = (task.name || task.taskName || '').toString().toLowerCase();
      const desc = (task.description || '').toString().toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  };

  // Get selected task name
  const getSelectedTaskName = () => {
    return selectedTask ? selectedTask.name : 'Select Task';
  };

  // Handle task selection
  const handleTaskSelection = (task) => {
    setSelectedTask(task);
    setTaskSearchTerm(task?.name || task?.taskName || '');
    setShowTaskDropdown(false);
    
    // Auto-populate plan name and description from task
    if (!planName) {
      setPlanName(task?.name || task?.taskName || '');
    }
    if (!planDescription) {
      setPlanDescription(task?.description || '');
    }
    
    // If task has dates, auto-populate them
    if (task?.startDate && !startDate) {
      setStartDate(task.startDate);
    }
    if (task?.endDate && !endDate) {
      setEndDate(task.endDate);
    }
  };

  // Handle custom task name input
  const handleCustomTaskName = (value) => {
    setCustomTaskName(value);
    setPlanName(value);
    setSelectedTask(null); // Clear selected task when typing custom name
  };

  // Calculate totals
  const totalHours = calendarDays.reduce((sum, day) => sum + day.hours, 0);
  const totalOutputUnits = calendarDays.reduce((sum, day) => sum + day.outputUnits, 0);
  const totalOutputProgress = calendarDays.reduce((sum, day) => sum + day.outputProgress, 0) / calendarDays.length;

  // Get budget limits
  const budgetInputLimit = selectedBudget ? (selectedBudget.inputQuantity || selectedBudget.inputQty || selectedBudget.inputHours || 0) : 0;
  const budgetOutputLimit = selectedBudget ? (selectedBudget.outputQuantity || selectedBudget.quantity || selectedBudget.outputQty || 0) : 0;

  // Check if totals exceed budget limits
  const exceedsInputLimit = totalHours > budgetInputLimit;
  const exceedsOutputLimit = totalOutputUnits > budgetOutputLimit;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedBudget) {
      alert('Please select a budget');
      return;
    }
    
    if (!planName.trim()) {
      alert('Please enter a plan name');
      return;
    }
    
    if (exceedsInputLimit) {
      alert(`Total hours (${totalHours.toFixed(1)}) exceed budget input limit (${budgetInputLimit.toFixed(1)} hours)`);
      return;
    }
    
    if (exceedsOutputLimit) {
      alert(`Total output units (${totalOutputUnits.toFixed(1)}) exceed budget output limit (${budgetOutputLimit.toFixed(1)} units)`);
      return;
    }

    // Check existing plans for this budget
    const plansKey = `plans_${selectedProject.id}`;
    const existingPlans = JSON.parse(localStorage.getItem(plansKey) || '[]');
    const budgetPlans = existingPlans.filter(p => p.budgetId === selectedBudget.id);
    const budgetTotalHours = budgetPlans.reduce((sum, p) => sum + (p.plannedHours || 0), 0);
    const budgetTotalOutput = budgetPlans.reduce((sum, p) => sum + (p.plannedOutput || 0), 0);

    if (budgetTotalHours + totalHours > budgetInputLimit) {
      alert(`Adding this plan would exceed budget input limit. Current plans: ${budgetTotalHours.toFixed(1)}h, This plan: ${totalHours.toFixed(1)}h, Budget limit: ${budgetInputLimit.toFixed(1)}h`);
      return;
    }

    if (budgetTotalOutput + totalOutputUnits > budgetOutputLimit) {
      alert(`Adding this plan would exceed budget output limit. Current plans: ${budgetTotalOutput.toFixed(1)} units, This plan: ${totalOutputUnits.toFixed(1)} units, Budget limit: ${budgetOutputLimit.toFixed(1)} units`);
      return;
    }

    // Create the plan
    const newPlan = {
      id: `plan-${Date.now()}`,
      name: planName,
      description: planDescription,
      budgetId: selectedBudget.id,
      budgetName: selectedBudget.name,
      startDate,
      endDate,
      plannedHours: totalHours,
      plannedOutput: totalOutputUnits,
      workType,
      userId: assignedUserId,
      crewId: assignedCrewId,
      status: 'planned',
      createdAt: new Date().toISOString(),
      calendarDays: calendarDays,
      // Task information
      taskId: selectedTask?.id || null,
      taskName: selectedTask?.name || customTaskName || planName,
      taskDescription: selectedTask?.description || planDescription,
      // Budget validation data
      budgetInputLimit,
      budgetOutputLimit,
      remainingInput: budgetInputLimit - budgetTotalHours - totalHours,
      remainingOutput: budgetOutputLimit - budgetTotalOutput - totalOutputUnits
    };

    // Save to localStorage
    existingPlans.push(newPlan);
    localStorage.setItem(plansKey, JSON.stringify(existingPlans));

    alert(`Plan "${planName}" created successfully!`);
    
    // Reset form
    setPlanName('');
    setPlanDescription('');
    setSelectedBudget(null);
    setCalendarDays([]);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Calendar-based Planning</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Plan Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Name *
            </label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Steel Reinforcement Phase 1"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={planDescription}
              onChange={(e) => setPlanDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of the work"
            />
          </div>
        </div>

        {/* Task Selection */}
        <div className="relative task-dropdown-container">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task (Optional)
          </label>
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search tasks..."
                value={taskSearchTerm}
                onChange={(e) => {
                  setTaskSearchTerm(e.target.value);
                  setShowTaskDropdown(true);
                }}
                onFocus={() => setShowTaskDropdown(true)}
                className="w-full p-2 border rounded-lg pr-8"
              />
              <Search className="absolute right-2 top-2.5 w-4 h-4 text-gray-400" />
              {showTaskDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {getFilteredTasks().map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleTaskSelection(task)}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                    >
                    <div className="font-medium text-gray-900">{task.name || task.taskName || 'Untitled Task'}</div>
                    <div className="text-sm text-gray-500">{task.description || ''}</div>
                      <div className="text-xs text-gray-400">
                        Status: {task.status || 'not-started'} | 
                        {task.startDate && `Start: ${task.startDate}`}
                        {task.endDate && ` | End: ${task.endDate}`}
                      </div>
                    </div>
                  ))}
                  {getFilteredTasks().length === 0 && (
                    <div className="p-3 text-gray-500 text-sm">No tasks found</div>
                  )}
                </div>
              )}
            </div>
            
            <div className="text-center text-sm text-gray-500">
              <span className="text-gray-400">or</span>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Type custom task name..."
                value={customTaskName}
                onChange={(e) => handleCustomTaskName(e.target.value)}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Select from existing tasks or type a custom task name
          </div>
        </div>

        {/* Budget Selection */}
        <div className="relative budget-dropdown-container">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Budget *
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search budgets..."
              value={budgetSearchTerm}
              onChange={(e) => {
                setBudgetSearchTerm(e.target.value);
                setShowBudgetDropdown(true);
              }}
              onFocus={() => setShowBudgetDropdown(true)}
              className="w-full p-2 border rounded-lg pr-8"
            />
            <Search className="absolute right-2 top-2.5 w-4 h-4 text-gray-400" />
            {showBudgetDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {getFilteredBudgets().map((budget) => (
                  <div
                    key={budget.id}
                    onClick={() => {
                      setSelectedBudget(budget);
                      setBudgetSearchTerm(budget.name);
                      setShowBudgetDropdown(false);
                    }}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                  >
                    <div className="font-medium text-gray-900">{budget.name}</div>
                    <div className="text-sm text-gray-500">
                      Input: {budget.inputQuantity || budget.inputQty || budget.inputHours || 0}h | 
                      Output: {budget.outputQuantity || budget.quantity || budget.outputQty || 0} units
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedBudget && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Selected:</strong> {selectedBudget.name}
                <br />
                <strong>Budget Limits:</strong> {budgetInputLimit.toFixed(1)}h input, {budgetOutputLimit.toFixed(1)} units output
              </div>
            </div>
          )}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date *
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Work Type and Assignment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Work Type *
            </label>
            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="member">Individual Member</option>
              <option value="crew">Crew</option>
            </select>
          </div>
          
          {workType === 'member' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to Member
              </label>
              <select
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Member</option>
                {projectUsers?.map(member => (
                  <option key={member.id || member.userId} value={member.id || member.userId}>
                    {member.name || member.displayName || member.email} {member.email ? `(${member.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {workType === 'crew' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to Crew
              </label>
              <select
                value={assignedCrewId}
                onChange={(e) => setAssignedCrewId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Crew</option>
                {crews.map(crew => (
                  <option key={crew.id} value={crew.id}>
                    {crew.name || crew.crewName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Calendar Grid */}
        {calendarDays.length > 0 && (
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">Daily Planning</h4>
            <div className="grid grid-cols-7 gap-2 text-center mb-4">
              {calendarDays.map((day, i) => (
                <div key={i} className="p-2 border rounded-md bg-gray-50">
                  <div className="text-xs text-gray-600 mb-1">
                    {day.date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-600 font-medium">Hours</div>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={day.hours}
                      onChange={(e) => {
                        const newDays = [...calendarDays];
                        newDays[i].hours = parseFloat(e.target.value) || 0;
                        setCalendarDays(newDays);
                      }}
                      className="w-full text-xs border rounded p-1"
                      placeholder="0"
                    />
                    <div className="text-xs text-gray-600 font-medium">Progress %</div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={day.outputProgress}
                      onChange={(e) => {
                        const progress = parseFloat(e.target.value) || 0;
                        const newDays = [...calendarDays];
                        newDays[i].outputProgress = progress;
                        newDays[i].outputUnits = (progress / 100) * (selectedBudget?.outputQuantity || selectedBudget?.quantity || 0);
                        setCalendarDays(newDays);
                      }}
                      className="w-full text-xs border rounded p-1"
                      placeholder="0"
                    />
                    <div className="text-xs text-blue-600 font-medium">
                      {day.outputUnits.toFixed(1)} units
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary and Validation */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-md font-semibold text-gray-800 mb-2">Plan Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Hours:</span>
              <span className={`ml-1 font-medium ${exceedsInputLimit ? 'text-red-600' : 'text-green-600'}`}>
                {totalHours.toFixed(1)}h
              </span>
            </div>
            <div>
              <span className="text-gray-600">Total Output:</span>
              <span className={`ml-1 font-medium ${exceedsOutputLimit ? 'text-red-600' : 'text-green-600'}`}>
                {totalOutputUnits.toFixed(1)} units
              </span>
            </div>
            <div>
              <span className="text-gray-600">Duration:</span>
              <span className="ml-1 font-medium">{calendarDays.length} days</span>
            </div>
            <div>
              <span className="text-gray-600">Avg Progress:</span>
              <span className="ml-1 font-medium">{totalOutputProgress.toFixed(1)}%</span>
            </div>
          </div>
          
          {selectedBudget && (
            <div className="mt-3 text-sm">
              <span className="text-gray-600">Budget Limits:</span>
              <span className="ml-1">
                {budgetInputLimit.toFixed(1)}h input, {budgetOutputLimit.toFixed(1)} units output
              </span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Plan
          </button>
        </div>
      </form>
    </div>
  );
};

export default PlanWorkaheadTab;
