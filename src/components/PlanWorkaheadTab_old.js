import React, { useState, useEffect } from "react";
import { Plus, Calendar as CalendarIcon, User, Users, Target, Download, Upload, Clock, Link as LinkIcon } from "lucide-react";
import CalendarTab from "./CalendarTab";
import * as XLSX from 'xlsx';
import { safeParseFloat, safeToFixed, safeFormatCurrency, extractBudgetAmount } from '../utils/numberUtils';
import LocalTimesheetService from '../services/LocalTimesheetService';
import TaskBudgetLinkService from '../services/TaskBudgetLinkService';
import AccService from '../services/AccService';

const PlanWorkaheadTab = ({ selectedProject, selectedHub, projects, members = [], budgets = [], credentials }) => {
  const [tasks, setTasks] = useState([]);
  const [crews, setCrews] = useState([]);
  const [selectedProjectBudgets, setSelectedProjectBudgets] = useState([]);
  const [projectUsers, setProjectUsers] = useState([]);
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
    plannedDate: new Date().toISOString().split('T')[0],
    startDate: "",
    endDate: "",
    plannedHours: "",
    plannedOutput: "",
    outputUnit: "units",
    outputUnitCost: "",
    taskValue: "",
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
      loadProjectUsers();
      loadAvailableCalendars();
    }
  }, [selectedProject, budgets]);

  // Clear budget state when hub changes to prevent cross-hub data pollution
  useEffect(() => {
    console.log('🔄 Hub changed in PlanWorkaheadTab, clearing budget state to prevent cross-hub data pollution');
    setSelectedProjectBudgets([]);
    setProjectUsers([]);
    
    // Force clear any cached data
    if (window.localStorage) {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('budget') || key.includes('user') || key.includes('project'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('🧹 Cleared cached budget/user data from localStorage in PlanWorkaheadTab');
    }
  }, [selectedHub]);

  // Listen for calendar and crew updates
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (selectedProject) {
        if (e.key === 'zoyantra_calendars') {
        console.log('🔄 Calendar storage changed, reloading calendars...');
        loadAvailableCalendars();
        } else if (e.key === `crews_${selectedProject?.id}`) {
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
        console.log('🔍 Selected project ID:', selectedProject?.id);
        
        // Filter calendars allocated to the selected project
        const projectCalendars = calendarsData.filter(cal => {
        // Validate calendar structure
        if (!cal || typeof cal !== 'object' || !cal.id || !cal.name) {
          console.warn('⚠️ Invalid calendar structure:', cal);
          return false;
        }

        const hasAllocation = cal.allocatedProjects && 
                             Array.isArray(cal.allocatedProjects) && 
                             selectedProject?.id &&
                             cal.allocatedProjects.includes(selectedProject.id);
          console.log(`🔍 Calendar "${cal.name}" allocated to project:`, hasAllocation, cal.allocatedProjects);
          return hasAllocation;
        });
        
        setAvailableCalendars(projectCalendars);
        console.log(`📅 Loaded ${projectCalendars.length} calendars for project ${selectedProject?.name || 'Unknown'}`);
        
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
      'Status': task.status,
      'Work Type': task.workType === 'member' ? 'Individual Member' : 'Crew',
      'Assigned To': task.workType === 'member' ? task.assignedMemberName : task.assignedCrewName,
      'Budget': task.budgetName,
      'Budget Amount': task.budgetAmount,
      'Planned Date': task.plannedDate,
      'Start Date': task.startDate,
      'End Date': task.endDate,
      'Planned Hours': task.plannedHours,
      'Planned Output': task.plannedOutput,
      'Output Unit': task.outputUnit || task.budgetUnit,
      'Output Unit Cost': task.outputUnitCost,
      'Task Value': task.taskValue
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
      'Description': 'Enter task description',
      'Status': 'planned',
      'Work Type': 'Individual Member',
      'Assigned To': 'John Doe',
      'Budget': 'Construction',
      'Budget Amount': 10000,
      'Planned Date': '2025-01-15',
      'Start Date': '2025-01-15',
      'End Date': '2025-01-20',
      'Planned Hours': 40,
      'Planned Output': 100,
      'Output Unit': 'units',
      'Output Unit Cost': 25.50,
      'Task Value': 2550.00
    }];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks Template');
    
    XLSX.writeFile(wb, 'tasks_template.xlsx');
  };

  // Calculate duration between two dates
  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Import from Excel
  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const importedTasks = jsonData.map((row, index) => ({
          id: `imported-${Date.now()}-${index}`,
          taskName: row['Task Name'] || '',
          description: row['Description'] || '',
          status: row['Status'] || 'planned',
          workType: row['Work Type'] === 'Crew' ? 'crew' : 'member',
          assignedMemberName: row['Assigned To'] || '',
          assignedCrewName: row['Assigned To'] || '',
          budgetName: row['Budget'] || '',
          budgetAmount: parseFloat(row['Budget Amount']) || 0,
          plannedDate: row['Planned Date'] || '',
          startDate: row['Start Date'] || '',
          endDate: row['End Date'] || '',
          plannedHours: parseFloat(row['Planned Hours']) || 0,
          plannedOutput: parseFloat(row['Planned Output']) || 0,
          outputUnit: row['Output Unit'] || 'units',
          budgetUnit: row['Output Unit'] || 'units',
          outputUnitCost: parseFloat(row['Output Unit Cost']) || 0,
          taskValue: parseFloat(row['Task Value']) || 0,
          createdAt: new Date().toISOString()
        }));

        const updatedTasks = [...tasks, ...importedTasks];
        saveTasks(updatedTasks);
        alert(`Successfully imported ${importedTasks.length} tasks`);
        
        // Reset file input
        event.target.value = '';
      } catch (error) {
        console.error('Error importing file:', error);
        alert('Error importing file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Load crews from localStorage
  const loadCrews = () => {
    try {
      if (selectedProject?.id) {
        const stored = localStorage.getItem(`crews_${selectedProject?.id}`);
      if (stored) {
        const crewsData = JSON.parse(stored);
          setCrews(crewsData);
          console.log(`👥 Loaded ${crewsData.length} crews for planning:`, crewsData);
        } else {
          console.log('👥 No crews found for project:', selectedProject?.id);
          setCrews([]);
        }
      } else {
        console.log('👥 No project selected, clearing crews');
        setCrews([]);
      }
    } catch (error) {
      console.error('❌ Error loading crews:', error);
    }
  };

  // Validate task against budget limits
  const validateTaskAgainstBudget = (taskData) => {
    if (!taskData.budgetId) return { isValid: true, message: '' };
    
    const budget = selectedProjectBudgets.find(b => b.id === taskData.budgetId);
    if (!budget) return { isValid: true, message: '' };
    
    const plannedHours = parseFloat(taskData.plannedHours) || 0;
    const plannedOutput = parseFloat(taskData.plannedOutput) || 0;
    
    // Check if adding this task would exceed budget limits
    const currentUsedHours = budget.usedInputHours || 0;
    const currentUsedOutput = budget.usedOutputUnits || 0;
    
    const totalHoursAfterTask = currentUsedHours + plannedHours;
    const totalOutputAfterTask = currentUsedOutput + plannedOutput;
    
    if (totalHoursAfterTask > budget.maxInputHours) {
      return {
        isValid: false,
        message: `Cannot add task: would exceed budget hours limit (${budget.maxInputHours}h). Current: ${currentUsedHours}h, Adding: ${plannedHours}h, Total: ${totalHoursAfterTask}h`
      };
    }
    
    if (totalOutputAfterTask > budget.maxOutputUnits) {
      return {
        isValid: false,
        message: `Cannot add task: would exceed budget output limit (${budget.maxOutputUnits} units). Current: ${currentUsedOutput} units, Adding: ${plannedOutput} units, Total: ${totalOutputAfterTask} units`
      };
    }
    
    return { isValid: true, message: '' };
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

  // Calculate remaining values for a specific budget with current form data
  const calculateRemainingForBudget = (budgetId, plannedHours = 0, plannedOutput = 0) => {
    const budget = selectedProjectBudgets.find(b => b.id === budgetId);
    if (!budget) return { remainingHours: 0, remainingOutput: 0 };

    // Get current tasks for this budget
    const budgetTasks = tasks.filter(task => task.budgetId === budgetId);
    const currentUsedHours = budgetTasks.reduce((sum, task) => sum + (parseFloat(task.plannedHours) || 0), 0);
    const currentUsedOutput = budgetTasks.reduce((sum, task) => sum + (parseFloat(task.plannedOutput) || 0), 0);

    // Add the planned values from the form
    const totalUsedHours = currentUsedHours + parseFloat(plannedHours);
    const totalUsedOutput = currentUsedOutput + parseFloat(plannedOutput);

    // Calculate remaining
    const remainingHours = Math.max(0, budget.maxInputHours - totalUsedHours);
    const remainingOutput = Math.max(0, budget.maxOutputUnits - totalUsedOutput);

    return {
      remainingHours,
      remainingOutput,
      maxHours: budget.maxInputHours,
      maxOutput: budget.maxOutputUnits,
      currentUsed: currentUsedHours,
      currentUsedOutput: currentUsedOutput
    };
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
    console.log('💰 Starting loadProjectBudgets:', {
      hasBudgets: !!budgets,
      budgetsLength: budgets?.length,
      hasCredentials: !!credentials,
      hasToken: !!credentials?.threeLegToken,
      selectedProject: !!selectedProject
    });

    if (budgets && budgets.length > 0) {
      try {
        // Fetch ACC budget data to get original limits
        const AccService = require('../services/AccService').default;
        const accService = new AccService();
        if (credentials) {
          console.log('🔑 Initializing AccService with credentials');
          accService.initialize(credentials);
          
          console.log('📊 Fetching ACC budget data for project:', selectedProject?.id);
          // Get ACC budget data for limits
          const accBudgets = await accService.getBudgets(selectedProject?.id, {
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
          console.log('⚠️ No ACC budget data available');
          setSelectedProjectBudgets([]);
        }
      } catch (error) {
        console.error('❌ Error loading ACC budget limits:', error);
        console.error('❌ Budget loading error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          projectId: selectedProject?.id,
          hasCredentials: !!credentials,
          hasToken: !!credentials?.threeLegToken
        });
        // No fallback - only use real ACC data
        setSelectedProjectBudgets([]);
        console.log('❌ No budgets available - ACC API failed');
      }
    } else {
      setSelectedProjectBudgets([]);
      console.log('💰 No budgets available for planning');
    }
  };

  // Load ACC project users
  const loadProjectUsers = async () => {
    if (!selectedProject || !selectedHub || !credentials) {
      console.log('❌ Missing required data for loadProjectUsers:', {
        selectedProject: !!selectedProject,
        selectedHub: !!selectedHub,
        credentials: !!credentials,
        threeLegToken: !!credentials?.threeLegToken
      });
      return;
    }
    
    try {
      console.log('👥 Loading ACC project users for:', selectedProject.name);
      
      // Get project users from ACC with fallback to account users
      const users = await AccService.getProjectMembers(selectedProject.id, selectedHub.id);
      console.log('👥 Loaded ACC project users:', users.length);
      console.log('👥 Processed users:', users);
      
      // Update the members prop or store in state if needed
      // Note: This will update the local state, but the parent component's members prop won't be updated
      // You might want to emit an event or use a callback to update the parent
      
    } catch (error) {
      console.error('❌ Error loading ACC project users:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
  };

  const loadTasks = () => {
    const stored = JSON.parse(localStorage.getItem("zoyantra_tasks") || "[]");
    console.log('📋 All stored tasks:', stored);
    const projectTasks = stored.filter(
      (t) => t.selectedProjectId === selectedProject?.id
    );
    console.log('📋 Filtered project tasks (including archived):', projectTasks);
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

  const createTimesheetFromTask = (task) => {
    if (!selectedProject) {
      alert('Please select a project first');
      return;
    }

    // Check if timesheet already exists for this task today
    const today = new Date().toISOString().split('T')[0];
    const existingTimesheets = timesheetService.getAll();
    const isDuplicate = existingTimesheets.some(t => 
      t.date === today && 
      t.taskId === task.id && 
      ((task.assignedMemberId && t.userId === task.assignedMemberId) || (task.assignedCrewId && t.crewId === task.assignedCrewId))
    );

    if (isDuplicate) {
      alert('❌ A timesheet already exists for this task today!');
      return;
    }

    // Create timesheet data from task
    const timesheetData = {
      id: Date.now().toString(),
      projectId: selectedProject?.id,
      projectName: selectedProject.name,
      taskId: task.id,
      taskName: task.taskName,
      budgetId: task.budgetId,
      budgetName: task.budgetName,
      budgetUnit: task.budgetUnit || task.outputUnit,
      plannedHours: task.plannedHours || 0,
      plannedOutput: task.plannedOutput || 0,
      date: today,
      hours: task.plannedHours || 0,
      extraHours: 0,
      outputUnits: task.plannedOutput || 0,
      outputUnitCost: task.outputUnitCost || 0,
      taskValue: task.taskValue || 0,
      description: task.description || '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Set user/crew data based on task assignment
    if (task.workType === 'member' && task.assignedMemberId) {
      const member = members.find(m => m.id === task.assignedMemberId);
      if (member) {
        timesheetData.userId = member.id;
        timesheetData.userName = member.name || `${member.firstName} ${member.lastName}`;
        timesheetData.email = member.email;
      }
    } else if (task.workType === 'crew' && task.assignedCrewId) {
      const crew = crews.find(c => c.id === task.assignedCrewId);
      if (crew) {
        timesheetData.crewId = crew.id;
        timesheetData.crewName = crew.name;
        timesheetData.crewAverageRate = crew.averageRate || 0;
      }
    }

    // Create the timesheet
    try {
      timesheetService.create(timesheetData);
      
      // Archive the task since it's now being tracked via timesheet
      const updatedTasks = tasks.map(t => 
        t.id === task.id 
          ? { ...t, status: 'archived', archivedAt: new Date().toISOString() }
          : t
      );
      setTasks(updatedTasks);
      
      // Save updated tasks to localStorage
      const allTasks = JSON.parse(localStorage.getItem('zoyantra_tasks') || '[]');
      const updatedAllTasks = allTasks.map(t => 
        t.id === task.id 
          ? { ...t, status: 'archived', archivedAt: new Date().toISOString() }
          : t
      );
      localStorage.setItem('zoyantra_tasks', JSON.stringify(updatedAllTasks));
      
      alert(`✅ Timesheet created and task archived: ${task.taskName}`);
      console.log('✅ Timesheet created from task and task archived:', timesheetData);
    } catch (error) {
      console.error('❌ Error creating timesheet from task:', error);
      alert('Error creating timesheet: ' + error.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Date validation logic
      if (name === 'plannedDate') {
        // If planned date is set, ensure start date is not before it
        if (value && newData.startDate && new Date(value) > new Date(newData.startDate)) {
          newData.startDate = value; // Auto-update start date to planned date
        }
        // If planned date is set, ensure end date is not before it
        if (value && newData.endDate && new Date(value) > new Date(newData.endDate)) {
          newData.endDate = value; // Auto-update end date to planned date
        }
      }
      
      if (name === 'startDate') {
        // If start date is set, ensure it's not before planned date
        if (value && newData.plannedDate && new Date(value) < new Date(newData.plannedDate)) {
          alert('Start date cannot be before planned date');
          return prev; // Don't update if validation fails
        }
        // If start date is set, ensure end date is not before it
        if (value && newData.endDate && new Date(value) > new Date(newData.endDate)) {
          newData.endDate = value; // Auto-update end date to start date
        }
      }
      
      if (name === 'endDate') {
        // If end date is set, ensure it's not before start date
        if (value && newData.startDate && new Date(value) < new Date(newData.startDate)) {
          alert('End date cannot be before start date');
          return prev; // Don't update if validation fails
        }
        // If end date is set, ensure it's not before planned date
        if (value && newData.plannedDate && new Date(value) < new Date(newData.plannedDate)) {
          alert('End date cannot be before planned date');
          return prev; // Don't update if validation fails
        }
      }
      
      // Auto-fill budget name, unit, and unit cost when budget is selected
      if (name === 'budgetId') {
        const selectedBudget = selectedProjectBudgets.find(budget => budget.id === value);
        console.log('💰 Selected budget:', selectedBudget); // Debug: show selected budget
        console.log('💰 Budget unit field:', selectedBudget?.unit); // Debug: show unit field specifically
        if (selectedBudget) {
          // Calculate unit cost from budget: Budget Amount ÷ Output Units
          const budgetAmount = extractBudgetAmount(selectedBudget);
          const outputUnits = safeParseFloat(selectedBudget.outputQuantity || selectedBudget.quantity || selectedBudget.outputUnits, 0);
          const unitCost = outputUnits > 0 ? budgetAmount / outputUnits : 0;
          
          console.log('💰 Budget calculation:', {
            budgetAmount,
            outputUnits,
            unitCost,
            selectedBudget
          });
            
          newData.budgetName = selectedBudget.name || 'Unnamed Budget';
          newData.outputUnit = selectedBudget.unit || 'units';
          newData.budgetAmount = extractBudgetAmount(selectedBudget);
          newData.outputUnitCost = unitCost.toFixed(4);
          console.log('💰 Auto-filled unit:', newData.outputUnit); // Debug: show auto-filled unit
          console.log('💰 Auto-filled amount:', newData.budgetAmount); // Debug: show auto-filled amount
          console.log('💰 Auto-filled unit cost:', newData.outputUnitCost); // Debug: show auto-filled unit cost
          console.log('💰 Final form data outputUnit:', newData.outputUnit); // Debug: show final value
        } else {
          // Budget was cleared - reset to defaults
          newData.budgetName = '';
          newData.outputUnit = 'units';
          newData.budgetAmount = 0;
          newData.outputUnitCost = '';
          console.log('💰 Budget cleared - reset unit to default');
        }
      }
      
      // Auto-fill user/crew names when selected
      if (name === 'userId') {
        const selectedMember = members.find(member => member.id === value);
        if (selectedMember) {
          newData.userName = selectedMember.name || `${selectedMember.firstName} ${selectedMember.lastName}`;
        }
      }
      
      if (name === 'crewId') {
        const selectedCrew = crews.find(crew => crew.id === value);
        if (selectedCrew) {
          newData.crewName = selectedCrew.name;
        }
      }
      
      return newData;
    });
  };

  // Check for duplicate task names across all tasks (active and archived)
  const checkForDuplicateTaskName = (taskName) => {
    if (!taskName || !selectedProject) return false;
    
    // Check active tasks
    const activeTasks = tasks || [];
    const activeDuplicate = activeTasks.some(task => 
      task.taskName && task.taskName.toLowerCase().trim() === taskName.toLowerCase().trim()
    );
    
    if (activeDuplicate) {
      console.log('🔍 Found duplicate in active tasks:', taskName);
      return true;
    }
    
    // Check archived tasks
    const archivedTasks = JSON.parse(localStorage.getItem('zoyantra_archived_tasks') || '[]');
    const archivedDuplicate = archivedTasks.some(task => 
      task.taskName && task.taskName.toLowerCase().trim() === taskName.toLowerCase().trim()
    );
    
    if (archivedDuplicate) {
      console.log('🔍 Found duplicate in archived tasks:', taskName);
      return true;
    }
    
    // Check imported tasks from Gantt Chart
    const ganttTasks = JSON.parse(localStorage.getItem(`gantt_data_${selectedProject.id}`) || '[]');
    const importedDuplicate = ganttTasks.some(task => 
      (task.text || task.name) && (task.text || task.name).toLowerCase().trim() === taskName.toLowerCase().trim()
    );
    
    if (importedDuplicate) {
      console.log('🔍 Found duplicate in imported tasks:', taskName);
      return true;
    }
    
    console.log('✅ Task name is unique:', taskName);
    return false;
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!formData.taskName || !formData.plannedDate) {
      alert("Please enter a task name and planned date.");
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

    if (formData.workType === 'member' && !formData.userId) {
      alert("Please select a team member.");
      return;
    }

    if (formData.workType === 'crew' && !formData.crewId) {
      alert("Please select a crew.");
      return;
    }

    // Validate unique task name across all tasks (active and archived)
    const isDuplicateName = checkForDuplicateTaskName(formData.taskName);
    if (isDuplicateName) {
      alert(`❌ Task name "${formData.taskName}" already exists. Please choose a different name.`);
      return;
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
      selectedProjectId: selectedProject?.id,
      taskName: formData.taskName,
      description: formData.description,
      plannedDate: formData.plannedDate,
      startDate: formData.startDate || formData.plannedDate,
      endDate: formData.endDate || formData.plannedDate,
      plannedHours: parseFloat(formData.plannedHours) || 0,
      plannedOutput: parseFloat(formData.plannedOutput) || 0,
      outputUnit: formData.outputUnit,
      outputUnitCost: parseFloat(formData.outputUnitCost) || 0,
      taskValue: (() => {
        const plannedHours = parseFloat(formData.plannedHours) || 0;
        const unitCost = parseFloat(formData.outputUnitCost) || 0;
        return parseFloat((plannedHours * unitCost).toFixed(4));
      })(),
      workType: formData.workType,
      assignedMemberId: formData.workType === 'member' ? formData.userId : '',
      assignedMemberName: formData.workType === 'member' ? formData.userName : '',
      assignedCrewId: formData.workType === 'crew' ? formData.crewId : '',
      assignedCrewName: formData.workType === 'crew' ? formData.crewName : '',
      budgetId: formData.budgetId,
      budgetName: formData.budgetName,
      budgetAmount: formData.budgetAmount || 0,
      budgetUnit: formData.outputUnit,
      status: formData.status,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };
    
    console.log('📋 Creating new task with outputUnit:', formData.outputUnit); // Debug: show unit being saved
    console.log('📋 Full form data:', formData); // Debug: show full form data

    const updated = [...tasks, newTask];
    saveTasks(updated);

    // reset form
    setFormData({
      taskName: "",
      description: "",
      plannedDate: new Date().toISOString().split('T')[0],
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
  };


  // Early return if no project selected
  if (!selectedProject) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please select a project to view the planner.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
          Planner
        </h2>
        
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-gray-600" />
            <select
              value={selectedCalendar || ''}
              onChange={(e) => setSelectedCalendar(e.target.value)}
              className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                !selectedCalendar ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              required
            >
              {availableCalendars.length === 0 ? (
                <option value="">No calendars allocated to this project</option>
              ) : (
                <>
                  <option value="">Select Calendar *</option>
                  {availableCalendars.map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            {!selectedCalendar && (
              <span className="text-red-500 text-sm">* Required for load balance</span>
            )}
          </div>
          
          {/* Excel Export/Import Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportToExcel}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
            
            <label className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer focus:ring-2 focus:ring-green-500 focus:border-transparent">
              <Upload className="w-4 h-4" />
              Import Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Budget Information Card */}

      {/* Budget Information Cards - Moved to Bottom */}
      {selectedProject && selectedProjectBudgets.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Budget Information</h3>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Filter by Budget:</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search budgets..."
                  value={budgetSearchTerm}
                  onChange={(e) => setBudgetSearchTerm(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-48"
                />
                {budgetSearchTerm && (
                  <button
                    onClick={() => setBudgetSearchTerm('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              <select
                value={filteredBudget}
                onChange={(e) => setFilteredBudget(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Show All Budgets</option>
                {getFilteredBudgets().map(budget => (
                  <option key={budget.id} value={budget.id}>
                    {budget.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedProjectBudgets
              .filter(budget => !filteredBudget || budget.id === filteredBudget)
              .map(budget => {
              // Calculate used quantities from tasks AND timesheets
              const budgetTasks = tasks.filter(task => task.budgetId === budget.id);
              
              // Get timesheet data for this budget
              const timesheetService = new (require('../services/LocalTimesheetService')).default();
              const allTimesheets = timesheetService.getAll();
              const budgetTimesheets = allTimesheets.filter(timesheet => timesheet.budgetId === budget.id);
              
              // Calculate from tasks (planned)
              const plannedInput = budgetTasks.reduce((sum, task) => sum + (parseFloat(task.plannedHours) || 0), 0);
              const plannedOutput = budgetTasks.reduce((sum, task) => sum + (parseFloat(task.plannedOutput) || 0), 0);
              
              // Calculate from timesheets (actual)
              const actualInput = budgetTimesheets.reduce((sum, timesheet) => sum + (parseFloat(timesheet.hours) || 0), 0);
              const actualOutput = budgetTimesheets.reduce((sum, timesheet) => sum + (parseFloat(timesheet.outputUnits) || 0), 0);
              
              // Get ACC limits from enhanced budget first
              const maxInputHours = budget.maxInputHours || 1;
              const maxOutputUnits = budget.maxOutputUnits || budget.quantity || budget.outputQuantity || 1;
              
              // Use actual timesheet data if available, otherwise use planned
              // But NEVER exceed the original ACC budget limits
              const usedInput = Math.min(actualInput > 0 ? actualInput : plannedInput, maxInputHours);
              const usedOutput = Math.min(actualOutput > 0 ? actualOutput : plannedOutput, maxOutputUnits);
              
              // Calculate remaining values
              const remainingInputHours = Math.max(0, maxInputHours - usedInput);
              const remainingOutputUnits = Math.max(0, maxOutputUnits - usedOutput);
              
              // Calculate budget hourly rate from budget data
              const budgetHourlyRate = safeParseFloat(budget.inputQuantity, 0) > 0
                ? extractBudgetAmount(budget) / safeParseFloat(budget.inputQuantity, 0)
                : 0;
              
              // Calculate amount from timesheets (actual) and tasks (planned)
              const actualAmount = budgetTimesheets.reduce((sum, timesheet) => {
                return sum + (parseFloat(timesheet.amount) || 0);
              }, 0);
              
              const plannedAmount = budgetTasks.reduce((sum, task) => {
                const taskAmount = (parseFloat(task.plannedHours) || 0) * budgetHourlyRate;
                return sum + taskAmount;
              }, 0);
              
              // Use actual timesheet amount if available, otherwise use planned
              const usedAmount = actualAmount > 0 ? actualAmount : plannedAmount;
              
              // Use ACC limits instead of local budget values
              const originalInput = maxInputHours;
              const originalOutput = maxOutputUnits;
              const originalAmount = budget.maxAmount || extractBudgetAmount(budget);
              
              const remainingInput = remainingInputHours;
              const remainingOutput = remainingOutputUnits;
              const remainingAmount = Math.max(0, originalAmount - usedAmount);
              
              // Check if budget limits are exceeded
              const isOverLimit = usedInput > maxInputHours || usedOutput > maxOutputUnits;
              const isNearLimit = usedInput > maxInputHours * 0.8 || usedOutput > maxOutputUnits * 0.8;
              
              return (
                <div key={budget.id} className={`border rounded-lg p-4 ${
                  isOverLimit ? 'border-red-300 bg-red-50' : 
                  isNearLimit ? 'border-yellow-300 bg-yellow-50' : 
                  'border-gray-200'
                }`}>
                  <h4 className="font-medium text-gray-900 mb-3">{budget.name}</h4>
                  {isOverLimit && (
                    <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                      ⚠️ Budget limits exceeded!
                    </div>
                  )}
                  {isNearLimit && !isOverLimit && (
                    <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-700 text-sm">
                      ⚠️ Approaching budget limits
                    </div>
                  )}
                  {originalOutput === 0 && (
                    <div className="mb-3 p-2 bg-blue-100 border border-blue-300 rounded text-blue-700 text-sm">
                      ℹ️ No output units planned for this budget
                    </div>
                  )}
                  {originalAmount === 0 && (
                    <div className="mb-3 p-2 bg-gray-100 border border-gray-300 rounded text-gray-700 text-sm">
                      ℹ️ No budget amount set for this budget
                    </div>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Input (Hours):</span>
                      <span className="font-medium">{safeToFixed(usedInput, 1)} / {safeToFixed(originalInput, 1)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${originalInput > 0 ? (usedInput / originalInput) * 100 : 0}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Output ({budget.unit || 'units'}):</span>
                      <span className="font-medium">{safeToFixed(usedOutput, 1)} / {safeToFixed(originalOutput, 1)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${originalOutput > 0 ? (usedOutput / originalOutput) * 100 : 0}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">{safeFormatCurrency(usedAmount, '$', 0)} / {safeFormatCurrency(originalAmount, '$', 0)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ width: `${originalAmount > 0 ? (usedAmount / originalAmount) * 100 : 0}%` }}
                      ></div>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Remaining:</span>
                        <span>{safeToFixed(remainingInput, 1)}h, {safeToFixed(remainingOutput, 1)} units, {safeFormatCurrency(remainingAmount, '$', 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
        {!selectedCalendar && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-red-600" />
              <span className="text-red-800 text-sm font-medium">
                Calendar selection is required for team load balance calculations
              </span>
            </div>
          </div>
        )}
        
        {/* Imported Tasks Section */}
        {(() => {
          const importedTasks = JSON.parse(localStorage.getItem(`gantt_data_${selectedProject?.id}`) || '[]');
          console.log('📋 Loaded imported tasks:', importedTasks);
          console.log('📋 Sample task structure:', importedTasks[0]);
          return importedTasks.length > 0 ? (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-3">Load from Imported Tasks (Excel)</h4>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Select Imported Task:</label>
                <select
                  onChange={(e) => {
                    const selectedTask = importedTasks.find(task => task.id === e.target.value);
                    if (selectedTask) {
                      // Find the budget for this task
                      const budget = selectedTask.budgetId ? 
                        selectedProjectBudgets.find(b => b.id === selectedTask.budgetId) : null;
                      
                      setFormData(prev => ({
                        ...prev,
                        taskName: selectedTask.text || selectedTask.name || '',
                        description: selectedTask.notes || selectedTask.description || '',
                        plannedDate: selectedTask.start_date || '',
                        startDate: selectedTask.start_date || '',
                        endDate: selectedTask.end_date || '',
                        duration: selectedTask.duration || calculateDuration(selectedTask.start_date, selectedTask.end_date),
                        status: selectedTask.status || 'planned',
                        budgetId: selectedTask.budgetId || '',
                        budgetName: budget?.name || selectedTask.budgetName || ''
                      }));
                      
                      console.log('🎯 Selected imported task:', {
                        taskName: selectedTask.text || selectedTask.name,
                        budgetId: selectedTask.budgetId,
                        budgetName: budget?.name || selectedTask.budgetName
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose an imported task...</option>
                  {importedTasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.text || task.name} 
                      {task.start_date && task.end_date && ` (${task.start_date} - ${task.end_date})`}
                      {task.budgetId && ' [Budget Linked]'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600">
                  Select a task to auto-populate the form fields with imported data
                </p>
              </div>
            </div>
          ) : null;
        })()}
        
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
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Work Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="text-red-500">*</span> Work Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="workType"
                  value="member"
                  checked={formData.workType === 'member'}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <User className="w-4 h-4 mr-1" />
                Individual Member
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="workType"
                  value="crew"
                  checked={formData.workType === 'crew'}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <Users className="w-4 h-4 mr-1" />
                Crew
              </label>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="planned">Planned</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* User/Crew Selection */}
          {formData.workType === 'member' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Select Team Member
              </label>
              <select
                name="userId"
                value={formData.userId}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a team member...</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name || `${member.firstName} ${member.lastName}`}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Select Crew
              </label>
              <select
                name="crewId"
                value={formData.crewId}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a crew...</option>
                {crews.map(crew => (
                  <option key={crew.id} value={crew.id}>
                    {crew.name} ({crew.memberIds?.length || 0} members)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Budget Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget *
            </label>
            <select
              name="budgetId"
              value={formData.budgetId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose a budget...</option>
              {selectedProjectBudgets.map(budget => (
                <option key={budget.id} value={budget.id}>
                  {budget.name || 'Unnamed Budget'}
                </option>
              ))}
            </select>
          </div>

          {/* Planned Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="text-red-500">*</span> Planned Date
            </label>
            <input
              type="date"
              name="plannedDate"
              value={formData.plannedDate || new Date().toISOString().split('T')[0]}
              onChange={handleInputChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date *
            </label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Planned Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Planned Hours
            </label>
            <input
              type="number"
              name="plannedHours"
              value={formData.plannedHours}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              step="0.0001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {(() => {
              const warnings = getBudgetValidationWarnings();
              return warnings.hoursWarning && (
                <div className={`mt-1 text-xs p-2 rounded ${warnings.hoursWarning.includes('❌') ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-yellow-100 text-yellow-700 border border-yellow-300'}`}>
                  {warnings.hoursWarning}
                </div>
              );
            })()}
          </div>

          {/* Planned Output */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Planned Output Quantity
              {formData.budgetId && (
                <span className="ml-2 text-xs text-blue-600 font-normal">
                  (Unit auto-set from budget)
                </span>
              )}
            </label>
            <div className="flex">
              <input
                type="number"
                name="plannedOutput"
                value={formData.plannedOutput}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                step="0.0001"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                name="outputUnit"
                value={formData.outputUnit}
                onChange={handleInputChange}
                disabled={!!formData.budgetId}
                className={`px-3 py-2 border border-l-0 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formData.budgetId 
                    ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
                title={formData.budgetId ? 'Unit is automatically set from selected budget' : 'Select output unit'}
              >
                <option value="units">units</option>
                <option value="sqft">sqft</option>
                <option value="cubic yards">cubic yards</option>
                <option value="linear feet">linear feet</option>
                <option value="each">each</option>
                <option value="hours">hours</option>
              </select>
            </div>
            {(() => {
              const warnings = getBudgetValidationWarnings();
              return warnings.outputWarning && (
                <div className={`mt-1 text-xs p-2 rounded ${warnings.outputWarning.includes('❌') ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-yellow-100 text-yellow-700 border border-yellow-300'}`}>
                  {warnings.outputWarning}
                </div>
              );
            })()}
          </div>

        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          {(() => {
            const warnings = getBudgetValidationWarnings();
            const isCalendarRequired = !selectedCalendar;
            const isBudgetRequired = !formData.budgetId;
            const isPlannedDateRequired = !formData.plannedDate;
            const isStartDateRequired = !formData.startDate;
            const isEndDateRequired = !formData.endDate;
            const isRequiredFieldsMissing = isBudgetRequired || isPlannedDateRequired || isStartDateRequired || isEndDateRequired;
            const isDisabled = warnings.isOverLimit || isCalendarRequired || isRequiredFieldsMissing;
            return (
          <button 
            type="submit" 
            disabled={isDisabled}
            className={`px-6 py-2 rounded-lg flex items-center gap-2 focus:outline-none focus:ring-2 ${
              isDisabled 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
            }`}
            title={
              isCalendarRequired 
                ? 'Please select a calendar first' 
                : isRequiredFieldsMissing
                  ? 'Please fill in all required fields (Budget, Planned Date, Start Date, End Date)'
                  : isDisabled 
                    ? 'Cannot create task: would exceed budget limits' 
                    : 'Add new task'
            }
          >
            <Plus className="w-4 h-4" /> 
            {isCalendarRequired 
              ? 'Select Calendar First' 
              : isRequiredFieldsMissing
                ? 'Fill Required Fields'
                : isDisabled 
                  ? 'Budget Limit Exceeded' 
                  : 'Add Task'
            }
          </button>
            );
          })()}
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
              {tasks.map((task) => (
                <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">{task.taskName}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          task.status === 'completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {task.status?.replace('-', ' ').toUpperCase() || 'PLANNED'}
                        </span>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Assigned to:</span>
                          <p className="text-gray-600">
                            {task.workType === 'crew' ? (
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {task.assignedCrewName || 'Unknown Crew'}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {task.assignedMemberName || 'Unknown Member'}
                              </span>
                            )}
                          </p>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-700">Budget:</span>
                          <p className="text-gray-600">
                            {task.budgetName || 'No budget assigned'}
                            {task.budgetAmount > 0 && (
                              <span className="ml-2 text-sm text-blue-600">
                                ({safeFormatCurrency(task.budgetAmount)} {task.budgetUnit || task.outputUnit || 'units'})
                              </span>
                            )}
                          </p>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-700">Planned Date:</span>
                          <p className="text-gray-600">{task.plannedDate}</p>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-700">Hours:</span>
                          <p className="text-gray-600">{task.plannedHours || 0}h</p>
                        </div>
                        
                        {task.plannedOutput > 0 && (
                          <div>
                            <span className="font-medium text-gray-700">Output:</span>
                            <p className="text-gray-600">{task.plannedOutput} {task.budgetUnit || task.outputUnit || 'units'}</p>
                          </div>
                        )}
                        
                        <div>
                          <span className="font-medium text-gray-700">Unit Cost:</span>
                          <p className="text-gray-600">${(task.outputUnitCost || 0).toFixed(4)}</p>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-700">Task Value:</span>
                          <p className="text-gray-600 font-semibold text-green-600">${(task.taskValue || 0).toFixed(4)}</p>
                        </div>
                        
                        {task.startDate && (
                          <div>
                            <span className="font-medium text-gray-700">Start:</span>
                            <p className="text-gray-600">{task.startDate}</p>
                          </div>
                        )}
                        
                        {task.endDate && (
                          <div>
                            <span className="font-medium text-gray-700">End:</span>
                            <p className="text-gray-600">{task.endDate}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      {task.status !== 'archived' ? (
                        <button 
                          onClick={() => createTimesheetFromTask(task)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                          title="Create timesheet for this task"
                        >
                          <Clock className="w-4 h-4" />
                          Create Timesheet
                        </button>
                      ) : (
                        <div className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4" />
                          Task Archived
                        </div>
                      )}
                      <button 
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this task?')) {
                            const updated = tasks.filter(t => t.id !== task.id);
                            saveTasks(updated);
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                        title="Delete this task"
                      >
                        <Target className="w-4 h-4" />
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
                  
      {/* Calendar View */}
      {selectedCalendar && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Calendar View</h3>
            <button
              onClick={() => setShowCalendarView(!showCalendarView)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <CalendarIcon className="w-4 h-4" />
              {showCalendarView ? 'Hide Calendar' : 'Show Calendar'}
            </button>
          </div>
          
          {showCalendarView && (
            <CalendarTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              credentials={credentials}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default PlanWorkaheadTab;
