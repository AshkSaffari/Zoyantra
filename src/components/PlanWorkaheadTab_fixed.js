import React, { useState, useEffect } from "react";
import { Plus, Calendar as CalendarIcon, User, Users, Target, Download, Upload, Clock, Link as LinkIcon } from "lucide-react";
import CalendarTab from "./CalendarTab";
import * as XLSX from 'xlsx';
import { safeParseFloat, safeToFixed, safeFormatCurrency, extractBudgetAmount } from '../utils/numberUtils';
import LocalTimesheetService from '../services/LocalTimesheetService';
import TaskBudgetLinkService from '../services/TaskBudgetLinkService';

const PlanWorkaheadTab = ({ selectedProject, selectedHub, projects, members = [], budgets = [], credentials }) => {
  const [tasks, setTasks] = useState([]);
  const [crews, setCrews] = useState([]);
  const [selectedProjectBudgets, setSelectedProjectBudgets] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [availableCalendars, setAvailableCalendars] = useState([]);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [timesheetService] = useState(new LocalTimesheetService());
  const [linkService] = useState(() => new TaskBudgetLinkService());
  const [linkedTasks, setLinkedTasks] = useState([]);
  const [filteredBudget, setFilteredBudget] = useState(''); // For filtering budget cards
  const [budgetSearchTerm, setBudgetSearchTerm] = useState(''); // For searching budgets
  const [formData, setFormData] = useState({
    taskName: "",
    description: "",
    plannedDate: "",
    startDate: "",
    endDate: "",
    plannedHours: "",
    plannedOutput: "",
    outputUnit: "units",
    workType: "member", // 'member' or 'crew'
    userId: "",
    userName: "",
    crewId: "",
    crewName: "",
    budgetId: "",
    budgetName: "",
    budgetAmount: 0,
    status: "planned" // planned, in-progress, completed
  });

  // Load tasks when project changes
  useEffect(() => {
    if (selectedProject) {
      loadTasks();
      loadCrews();
      loadProjectBudgets();
      loadAvailableCalendars();
    }
  }, [selectedProject, budgets]);

  // Listen for calendar and crew updates
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (selectedProject) {
        if (e.key === 'zoyantra_calendars') {
        console.log('🔄 Calendar storage changed, reloading calendars...');
        loadAvailableCalendars();
        } else if (e.key === `crews_${selectedProject.id}`) {
          console.log('🔄 Crew storage changed, reloading crews...');
          loadCrews();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events (for same-tab updates)
    const handleCalendarUpdate = () => {
      console.log('🔄 Calendar updated event received, reloading calendars...');
      loadAvailableCalendars();
    };

    const handleCrewUpdate = () => {
      console.log('🔄 Crew updated event received, reloading crews...');
      loadCrews();
    };

    const handleTasksUpdated = (event) => {
      if (event.detail.projectId === selectedProject?.id) {
        console.log('📋 Tasks updated event received, reloading tasks...');
        loadTasks();
      }
    };
    
    window.addEventListener('calendarUpdated', handleCalendarUpdate);
    window.addEventListener('crewUpdated', handleCrewUpdate);
    window.addEventListener('tasksUpdated', handleTasksUpdated);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('calendarUpdated', handleCalendarUpdate);
      window.removeEventListener('crewUpdated', handleCrewUpdate);
      window.removeEventListener('tasksUpdated', handleTasksUpdated);
    };
  }, [selectedProject]);

  // Load available calendars for the selected project
  const loadAvailableCalendars = () => {
    try {
      const stored = localStorage.getItem('zoyantra_calendars');
      console.log('🔍 Raw calendar data from localStorage:', stored);
      
      if (!selectedProject) {
        console.log('📅 No project selected');
        setAvailableCalendars([]);
        return;
      }

      if (!stored) {
        console.log('📅 No calendars stored in localStorage');
        setAvailableCalendars([]);
        return;
      }

      const calendarsData = JSON.parse(stored);
      
      // Validate calendar data structure
      if (!Array.isArray(calendarsData)) {
        console.error('❌ Invalid calendar data structure');
        setAvailableCalendars([]);
        return;
      }

      console.log('🔍 All calendars:', calendarsData);
      console.log('🔍 Selected project ID:', selectedProject.id);
      
      // Filter calendars allocated to the selected project
      const projectCalendars = calendarsData.filter(cal => {
        // Validate calendar structure
        if (!cal || typeof cal !== 'object' || !cal.id || !cal.name) {
          console.warn('⚠️ Invalid calendar structure:', cal);
          return false;
        }

        const hasAllocation = cal.allocatedProjects && 
                             Array.isArray(cal.allocatedProjects) && 
                             cal.allocatedProjects.includes(selectedProject.id);
        console.log(`🔍 Calendar "${cal.name}" allocated to project:`, hasAllocation, cal.allocatedProjects);
        return hasAllocation;
      });
      
      setAvailableCalendars(projectCalendars);
      console.log(`📅 Loaded ${projectCalendars.length} calendars for project ${selectedProject.name}`);
      
      // Auto-select first calendar if available
      if (projectCalendars.length > 0 && !selectedCalendar) {
        setSelectedCalendar(projectCalendars[0].id);
        console.log(`📅 Auto-selected calendar: ${projectCalendars[0].name}`);
      }
    } catch (error) {
      console.error('❌ Error loading calendars:', error);
      setAvailableCalendars([]);
    }
  };

  // Export tasks to Excel
  const exportToExcel = () => {
    if (tasks.length === 0) {
      alert('No tasks to export');
      return;
    }

    const exportData = tasks.map(task => ({
      'Task Name': task.taskName,
      'Description': task.description,
      'Planned Date': task.plannedDate,
      'Start Date': task.startDate,
      'End Date': task.endDate,
      'Planned Hours': task.plannedHours,
      'Planned Output': task.plannedOutput,
      'Output Unit': task.outputUnit,
      'Work Type': task.workType,
      'User/Crew': task.workType === 'member' ? task.userName : task.crewName,
      'Budget': task.budgetName,
      'Status': task.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    
    const fileName = `tasks_${selectedProject?.name || 'project'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Download template
  const downloadTemplate = () => {
    const templateData = [{
      'Task Name': 'Sample Task',
      'Description': 'Sample description',
      'Planned Date': '2024-01-01',
      'Start Date': '2024-01-01',
      'End Date': '2024-01-02',
      'Planned Hours': '8',
      'Planned Output': '1',
      'Output Unit': 'units',
      'Work Type': 'member',
      'User/Crew': 'John Doe',
      'Budget': 'Sample Budget',
      'Status': 'planned'
    }];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks Template');
    
    const fileName = 'tasks_template.xlsx';
    XLSX.writeFile(wb, fileName);
  };

  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log('📊 Imported data:', jsonData);
        
        // Convert imported data to task format
        const importedTasks = jsonData.map((row, index) => ({
          id: `imported-${Date.now()}-${index}`,
          taskName: row['Task Name'] || '',
          description: row['Description'] || '',
          plannedDate: row['Planned Date'] || '',
          startDate: row['Start Date'] || '',
          endDate: row['End Date'] || '',
          plannedHours: row['Planned Hours'] || '',
          plannedOutput: row['Planned Output'] || '',
          outputUnit: row['Output Unit'] || 'units',
          workType: row['Work Type'] || 'member',
          userId: row['User/Crew'] || '',
          userName: row['User/Crew'] || '',
          crewId: '',
          crewName: '',
          budgetId: '',
          budgetName: row['Budget'] || '',
          budgetAmount: 0,
          status: row['Status'] || 'planned',
          createdAt: new Date().toISOString()
        }));

        // Add imported tasks to existing tasks
        const updatedTasks = [...tasks, ...importedTasks];
        saveTasks(updatedTasks);
        
        alert(`Successfully imported ${importedTasks.length} tasks`);
      } catch (error) {
        console.error('❌ Error importing file:', error);
        alert('Error importing file. Please check the file format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Load crews from localStorage
  const loadCrews = () => {
    try {
      if (selectedProject?.id) {
        const stored = localStorage.getItem(`crews_${selectedProject.id}`);
        if (stored) {
          const crewsData = JSON.parse(stored);
          setCrews(crewsData);
          console.log(`👥 Loaded ${crewsData.length} crews for project ${selectedProject.name}`);
        } else {
          setCrews([]);
          console.log('👥 No crews found for this project');
        }
      }
    } catch (error) {
      console.error('❌ Error loading crews:', error);
      setCrews([]);
    }
  };

  // Update budget usage when tasks change
  const updateBudgetUsage = () => {
    if (!selectedProjectBudgets.length) return;
    
    const updatedBudgets = selectedProjectBudgets.map(budget => {
      const budgetTasks = tasks.filter(task => task.budgetId === budget.id);
      const budgetTimesheets = timesheetService.getAll().filter(timesheet => timesheet.budgetId === budget.id);
      
      // Calculate used values
      const usedInputHours = budgetTasks.reduce((sum, task) => sum + (parseFloat(task.plannedHours) || 0), 0);
      const usedOutputUnits = budgetTasks.reduce((sum, task) => sum + (parseFloat(task.plannedOutput) || 0), 0);
      
      // Calculate remaining values
      const remainingInputHours = Math.max(0, budget.maxInputHours - usedInputHours);
      const remainingOutputUnits = Math.max(0, budget.maxOutputUnits - usedOutputUnits);
      
      return {
        ...budget,
        usedInputHours,
        usedOutputUnits,
        remainingInputHours,
        remainingOutputUnits
      };
    });
    
    setSelectedProjectBudgets(updatedBudgets);
  };

  // Get budget validation warnings for current form data
  const getBudgetValidationWarnings = () => {
    if (!formData.budgetId) return { hoursWarning: '', outputWarning: '', isOverLimit: false };
    
    const budget = selectedProjectBudgets.find(b => b.id === formData.budgetId);
    if (!budget) return { hoursWarning: '', outputWarning: '', isOverLimit: false };
    
    const plannedHours = parseFloat(formData.plannedHours) || 0;
    const plannedOutput = parseFloat(formData.plannedOutput) || 0;
    
    // Get current usage
    const budgetTasks = tasks.filter(task => task.budgetId === formData.budgetId);
    const currentUsedHours = budgetTasks.reduce((sum, task) => sum + (parseFloat(task.plannedHours) || 0), 0);
    const currentUsedOutput = budgetTasks.reduce((sum, task) => sum + (parseFloat(task.plannedOutput) || 0), 0);
    
    // Calculate totals after this task
    const totalHoursAfterTask = currentUsedHours + plannedHours;
    const totalOutputAfterTask = currentUsedOutput + plannedOutput;
    
    const hoursWarning = totalHoursAfterTask > budget.maxInputHours 
      ? `❌ Would exceed limit (${budget.maxInputHours}h). Current: ${currentUsedHours}h, Adding: ${plannedHours}h = ${totalHoursAfterTask}h`
      : totalHoursAfterTask > budget.maxInputHours * 0.9 
        ? `⚠️ Approaching limit (${budget.maxInputHours}h). Current: ${currentUsedHours}h, Adding: ${plannedHours}h = ${totalHoursAfterTask}h`
        : '';
        
    const outputWarning = totalOutputAfterTask > budget.maxOutputUnits
      ? `❌ Would exceed limit (${budget.maxOutputUnits} units). Current: ${currentUsedOutput} units, Adding: ${plannedOutput} units = ${totalOutputAfterTask} units`
      : totalOutputAfterTask > budget.maxOutputUnits * 0.9
        ? `⚠️ Approaching limit (${budget.maxOutputUnits} units). Current: ${currentUsedOutput} units, Adding: ${plannedOutput} units = ${totalOutputAfterTask} units`
        : '';
    
    const isOverLimit = totalHoursAfterTask > budget.maxInputHours || totalOutputAfterTask > budget.maxOutputUnits;
    
    return { hoursWarning, outputWarning, isOverLimit };
  };

  // Filter budgets based on search term
  const getFilteredBudgets = () => {
    if (!selectedProjectBudgets || selectedProjectBudgets.length === 0) return [];
    
    if (!budgetSearchTerm.trim()) {
      return selectedProjectBudgets;
    }
    
    const searchTerm = budgetSearchTerm.toLowerCase().trim();
    return selectedProjectBudgets.filter(budget => 
      budget.name.toLowerCase().includes(searchTerm)
    );
  };

  // Load project budgets with ACC limits
  const loadProjectBudgets = async () => {
    if (budgets && budgets.length > 0) {
      try {
        // Fetch ACC budget data to get original limits
        const AccService = require('../services/AccService').default;
        const accService = new AccService();
        if (credentials) {
          AccService.initialize(credentials);
          
          // Get ACC budget data for limits
          const accBudgets = await accService.getBudgets(selectedProject.id, {
            include: ['subitems', 'attributes'],
            limit: 1000
          });
          
          console.log('🏗️ ACC Budget data for limits:', accBudgets);
          
          // Enhance budgets with ACC limits
          const enhancedBudgets = budgets.map(budget => {
            // Find corresponding ACC budget
            const accBudget = accBudgets.find(acc => acc.id === budget.id);
            
            if (accBudget) {
              // Get original ACC values with better field mapping
              const originalInputHours = parseFloat(
                accBudget.inputQuantity || 
                accBudget.attributes?.inputQuantity || 
                accBudget.plannedInput || 
                accBudget.inputHours || 
                0
              );
              
              const originalOutputUnits = parseFloat(
                accBudget.quantity || 
                accBudget.attributes?.quantity || 
                accBudget.outputQuantity || 
                accBudget.plannedOutput || 
                accBudget.outputUnits || 
                0
              );
              
              const originalAmount = parseFloat(
                accBudget.amount || 
                accBudget.attributes?.amount || 
                accBudget.revised || 
                accBudget.originalAmount || 
                accBudget.budgetAmount || 
                0
              );
              
              // Use 1 hour as default if input hours is empty
              const maxInputHours = originalInputHours > 0 ? originalInputHours : 1;
              
              // Log budget data for debugging
              console.log(`🔍 Budget ${accBudget.name} data:`, {
                inputHours: originalInputHours,
                outputUnits: originalOutputUnits,
                amount: originalAmount,
                rawData: accBudget
              });
              
              return {
                ...budget,
                // ACC original limits
                maxInputHours,
                maxOutputUnits: originalOutputUnits > 0 ? originalOutputUnits : 1, // Default to 1 if no output planned
                maxAmount: originalAmount > 0 ? originalAmount : 1000, // Default to $1000 if no amount
                // Current usage (will be calculated in budget cards)
                usedInputHours: 0,
                usedOutputUnits: 0,
                usedAmount: 0,
                remainingInputHours: maxInputHours,
                remainingOutputUnits: originalOutputUnits > 0 ? originalOutputUnits : 1,
                remainingAmount: originalAmount > 0 ? originalAmount : 1000
              };
            } else {
              // Fallback to local budget data
              const localInputHours = parseFloat(budget.inputQuantity || 0);
              const localOutputUnits = parseFloat(budget.quantity || 0);
              
              return {
                ...budget,
                maxInputHours: localInputHours > 0 ? localInputHours : 1,
                maxOutputUnits: localOutputUnits > 0 ? localOutputUnits : 1,
                maxAmount: parseFloat(budget.amount || budget.revised || 1000),
                usedInputHours: 0,
                usedOutputUnits: 0,
                usedAmount: 0,
                remainingInputHours: localInputHours > 0 ? localInputHours : 1,
                remainingOutputUnits: localOutputUnits > 0 ? localOutputUnits : 1,
                remainingAmount: parseFloat(budget.amount || budget.revised || 1000)
              };
            }
          });
          
          setSelectedProjectBudgets(enhancedBudgets);
          console.log(`💰 Loaded ${enhancedBudgets.length} budgets with ACC limits`);
          console.log('💰 Enhanced budget sample:', enhancedBudgets[0]);
        } else {
          // Fallback to local budgets without ACC data
          setSelectedProjectBudgets(budgets);
          console.log(`💰 Loaded ${budgets.length} budgets (no ACC credentials)`);
        }
      } catch (error) {
        console.error('❌ Error loading ACC budget limits:', error);
        // Fallback to local budgets
        setSelectedProjectBudgets(budgets);
        console.log(`💰 Fallback: Loaded ${budgets.length} local budgets`);
      }
    } else {
      setSelectedProjectBudgets([]);
      console.log('💰 No budgets available for planning');
    }
  };

  const loadTasks = () => {
    const stored = JSON.parse(localStorage.getItem("zoyantra_tasks") || "[]");
    console.log('📋 All stored tasks:', stored);
    
    // Filter tasks for the selected project
    const projectTasks = stored.filter(task => task.projectId === selectedProject?.id);
    console.log(`📋 Found ${projectTasks.length} tasks for project ${selectedProject?.name}`);
    
    setTasks(projectTasks);
    
    // Update budget usage after loading tasks
    setTimeout(() => updateBudgetUsage(), 100);
  };

  const saveTasks = (newTasks) => {
    localStorage.setItem("zoyantra_tasks", JSON.stringify(newTasks));
    setTasks(newTasks);
    
    // Update budget usage after saving tasks
    setTimeout(() => updateBudgetUsage(), 100);
    
    // Notify other tabs that tasks have been updated
    window.dispatchEvent(new CustomEvent('tasksUpdated', {
      detail: { projectId: selectedProject?.id, tasks: newTasks }
    }));
    console.log('📋 Tasks updated, notifying other tabs');
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!formData.taskName || !formData.plannedDate) {
      alert("Please enter a task name and planned date.");
      return;
    }

    // Check if timesheet already exists for this task today
    const today = new Date().toISOString().split('T')[0];
    const existingTimesheets = timesheetService.getAll();
    const isDuplicate = existingTimesheets.some(t => 
      t.date === today && 
      t.taskName === formData.taskName && 
      t.userId === formData.userId
    );

    if (isDuplicate) {
      alert("A timesheet entry already exists for this task today. Please choose a different task or date.");
      return;
    }

    // Validate date order
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (startDate >= endDate) {
        alert("Start date must be before end date.");
        return;
      }
    }

    // Validate budget limits
    if (formData.budgetId) {
      const budget = selectedProjectBudgets.find(b => b.id === formData.budgetId);
      if (budget) {
        const plannedHours = parseFloat(formData.plannedHours) || 0;
        const plannedOutput = parseFloat(formData.plannedOutput) || 0;
        
        // Get current usage for this budget
        const budgetTasks = tasks.filter(task => task.budgetId === formData.budgetId);
        const currentUsedHours = budgetTasks.reduce((sum, task) => sum + (parseFloat(task.plannedHours) || 0), 0);
        const currentUsedOutput = budgetTasks.reduce((sum, task) => sum + (parseFloat(task.plannedOutput) || 0), 0);
        
        // Check if adding this task would exceed budget limits
        const totalHoursAfterTask = currentUsedHours + plannedHours;
        const totalOutputAfterTask = currentUsedOutput + plannedOutput;
        
        if (totalHoursAfterTask > budget.maxInputHours) {
          alert(`❌ Cannot create task: would exceed budget hours limit (${budget.maxInputHours}h).\nCurrent: ${currentUsedHours}h, Adding: ${plannedHours}h, Total: ${totalHoursAfterTask}h\nRemaining: ${budget.maxInputHours - currentUsedHours}h`);
          return;
        }
        
        if (totalOutputAfterTask > budget.maxOutputUnits) {
          alert(`❌ Cannot create task: would exceed budget output limit (${budget.maxOutputUnits} units).\nCurrent: ${currentUsedOutput} units, Adding: ${plannedOutput} units, Total: ${totalOutputAfterTask} units\nRemaining: ${budget.maxOutputUnits - currentUsedOutput} units`);
          return;
        }
        
        console.log(`✅ Budget validation passed for ${budget.name}:`, {
          plannedHours,
          plannedOutput,
          currentUsedHours,
          currentUsedOutput,
          totalHoursAfterTask,
          totalOutputAfterTask,
          maxInputHours: budget.maxInputHours,
          maxOutputUnits: budget.maxOutputUnits
        });
      }
    }

    const newTask = {
      id: Date.now().toString(),
      projectId: selectedProject.id,
      taskName: formData.taskName,
      description: formData.description,
      plannedDate: formData.plannedDate,
      startDate: formData.startDate,
      endDate: formData.endDate,
      plannedHours: formData.plannedHours,
      plannedOutput: formData.plannedOutput,
      outputUnit: formData.outputUnit,
      workType: formData.workType,
      userId: formData.userId,
      userName: formData.userName,
      crewId: formData.crewId,
      crewName: formData.crewName,
      budgetId: formData.budgetId,
      budgetName: formData.budgetName,
      budgetAmount: formData.budgetAmount,
      status: formData.status,
      createdAt: new Date().toISOString()
    };

    const updatedTasks = [...tasks, newTask];
    saveTasks(updatedTasks);
    
    // Reset form
    setFormData({
      taskName: "",
      description: "",
      plannedDate: "",
      startDate: "",
      endDate: "",
      plannedHours: "",
      plannedOutput: "",
      outputUnit: "units",
      workType: "member",
      userId: "",
      userName: "",
      crewId: "",
      crewName: "",
      budgetId: "",
      budgetName: "",
      budgetAmount: 0,
      status: "planned"
    });

    alert("Task created successfully!");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value || ''
    }));
  };

  const handleDelete = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      saveTasks(updatedTasks);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-600" />
        </h2>
        <p className="text-gray-600">
          Plan and schedule tasks for your project with budget tracking and resource allocation.
        </p>
      </div>

      {/* Calendar Selection */}
      {availableCalendars.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Available Calendars</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableCalendars.map(calendar => (
              <div
                key={calendar.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedCalendar === calendar.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedCalendar(calendar.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{calendar.name}</h4>
                  {selectedCalendar === calendar.id && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{calendar.description || 'No description'}</p>
                <div className="text-xs text-gray-500">
                  Daily Limit: {calendar.dailyHoursLimit || 8}h
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Creation Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Task</h3>
        <form onSubmit={handleAddTask}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Task Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Task Name
              </label>
              <input
                type="text"
                name="taskName"
                value={formData.taskName}
                onChange={handleInputChange}
                placeholder="Enter task name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter task description"
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Submit Button */}
            <div className="md:col-span-2 flex justify-end">
              {(() => {
                const warnings = getBudgetValidationWarnings();
                const isDisabled = warnings.isOverLimit;
                return (
                  <button 
                    type="submit" 
                    disabled={isDisabled}
                    className={`px-6 py-2 rounded-lg flex items-center gap-2 focus:outline-none focus:ring-2 ${
                      isDisabled 
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                    }`}
                    title={isDisabled ? 'Cannot create task: would exceed budget limits' : 'Add new task'}
                  >
                    <Plus className="w-4 h-4" /> 
                    {isDisabled ? 'Budget Limit Exceeded' : 'Add Task'}
                  </button>
                );
              })()}
            </div>
          </div>
        </form>
      </div>

      {/* Enhanced Task List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Planned Tasks</h3>
        </div>
        <div className="p-6">
          {tasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No planned tasks yet. Create your first task above.</p>
          ) : (
            <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{task.taskName}</h4>
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>📅 {task.plannedDate}</span>
                        <span>⏱️ {task.plannedHours}h</span>
                        <span>📊 {task.plannedOutput} {task.outputUnit}</span>
                        <span>👤 {task.workType === 'member' ? task.userName : task.crewName}</span>
                        <span>💰 {task.budgetName}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(task.id)}
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
        </div>
      </div>
    </div>
  );
};

export default PlanWorkaheadTab;
