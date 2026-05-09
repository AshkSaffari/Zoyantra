import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Target, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Download,
  Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import TasksGanttView from './TasksGanttView';

const Tasks = ({ 
  selectedProject, 
  credentials 
}) => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [xmlLoading, setXmlLoading] = useState(false);
  const [xmlError, setXmlError] = useState('');
  const [showGantt, setShowGantt] = useState(false);
  const projectReady = !!(selectedProject && selectedProject.id);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'not-started'
  });

  // Load data when component mounts or project changes
  useEffect(() => {
    if (selectedProject) {
      loadTasks();
    }
  }, [selectedProject]);

  // Lomad tasks with legacy fallback/migration to per-project key
  const loadTasks = () => {
    try {
      if (!selectedProject || !selectedProject.id) {
        console.log('⚠️ No selected project, cannot load tasks');
        setTasks([]);
        return;
      }
      
      const mainKey = `tasks_${selectedProject.id}`;
      let savedTasks = localStorage.getItem(mainKey);
      if (!savedTasks) {
        const legacyEnhancedKey = `enhanced_tasks_${selectedProject.id}`;
        const legacyGlobalKey = 'tasks';
        const legacyEnhanced = localStorage.getItem(legacyEnhancedKey);
        const legacyGlobal = localStorage.getItem(legacyGlobalKey);
        const legacySource = legacyEnhanced || legacyGlobal;
        if (legacySource) {
          console.log('♻️ Migrating legacy tasks into', mainKey);
          localStorage.setItem(mainKey, legacySource);
          savedTasks = legacySource;
        }
      }
      console.log('📂 Loading tasks for Tasks Tab:', !!savedTasks);
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        console.log('✅ Tasks loaded for Tasks Tab:', parsedTasks.length, 'tasks');
        setTasks(parsedTasks);
      } else {
        setTasks([]);
        console.log('📭 No tasks found for Tasks Tab');
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    }
  };

  // Clear all tasks function
  const clearAllTasks = () => {
    if (window.confirm('Are you sure you want to clear all tasks?')) {
      setTasks([]);
      if (selectedProject && selectedProject.id) {
        localStorage.removeItem(`tasks_${selectedProject.id}`);
        console.log('🧹 Cleared all tasks from Tasks Tab');
      }
    }
  };

  // Save tasks to localStorage
  const saveTasks = (tasksToSave) => {
    try {
      if (!selectedProject || !selectedProject.id) {
        console.log('⚠️ No selected project, cannot save tasks');
        setTasks(tasksToSave); // Still update the state for immediate display
        return;
      }
      
      console.log('💾 Saving tasks to localStorage:', tasksToSave);
      localStorage.setItem(`tasks_${selectedProject.id}`, JSON.stringify(tasksToSave));
      setTasks(tasksToSave);
      console.log('✅ Tasks state updated:', tasksToSave.length, 'tasks');
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  };

  // Clear all local data for this project (tasks only for this tab)
  const clearProjectLocalData = () => {
    if (!selectedProject || !selectedProject.id) return;
    if (!window.confirm('This will delete all Tasks for the selected project. Continue?')) return;
    try {
      // Current scoped key
      localStorage.removeItem(`tasks_${selectedProject.id}`);
      // Legacy keys (fallbacks)
      localStorage.removeItem(`enhanced_tasks_${selectedProject.id}`);
      // Very old global key (non-scoped)
      localStorage.removeItem('tasks');
      setTasks([]);
      // Ensure UI re-evaluates
      loadTasks();
      alert('Local Tasks data cleared for this project.');
    } catch (e) {
      console.error('Failed clearing local Tasks data', e);
      alert('Could not clear local data. See console for details.');
    }
  };

  // --- MSP XML IMPORT ---
  const parseMspdi = (xmlText) => {
    try {
      const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
      const get = (el, tag) => el.getElementsByTagName(tag)[0]?.textContent ?? '';
      const items = Array.from(doc.getElementsByTagName('Task'))
        .map(t => {
          const uid = get(t, 'UID');
          const name = get(t, 'Name') || `Task ${uid}`;
          const start = get(t, 'Start');
          const finish = get(t, 'Finish');
          const status = (Number(get(t, 'PercentComplete') || 0) >= 100) ? 'completed' : 'not-started';
          return {
            id: `msp-${uid}`,
            name,
            description: '[Imported from MSP XML]',
            startDate: start || '',
            endDate: finish || '',
            status
          };
        })
        .filter(r => r.id !== 'msp-0' && r.name);
      return items;
    } catch (e) {
      console.error('MSP XML parse failed', e);
      return [];
    }
  };

  const handleImportXmlFile = async (e) => {
    setXmlError('');
    setXmlLoading(true);
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const imported = parseMspdi(text);
      if (imported.length === 0) {
        setXmlError('No tasks found in XML.');
      } else {
        const next = [...tasks, ...imported];
        saveTasks(next);
      }
    } catch (err) {
      setXmlError(String(err?.message || err));
    } finally {
      setXmlLoading(false);
      // reset input value so same file can be chosen again
      e.target.value = '';
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log('🔄 Input change:', name, '=', value);
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };
      console.log('🔄 Updated form data:', updated);
      return updated;
    });
  };

  // Check for duplicate task names
  const isTaskNameDuplicate = (name) => {
    if (!name.trim()) return false;
    return tasks.some(task => 
      task.name.toLowerCase() === name.toLowerCase().trim() && 
      task.id !== editingId
    );
  };

  // Add or update task
  const handleSaveTask = () => {
    if (!selectedProject || !selectedProject.id) {
      setError('Please select a project first');
      return;
    }
    
    if (!formData.name || !formData.startDate || !formData.endDate) {
      setError('Please fill in all required fields');
      return;
    }

    // Check for duplicate task names (case-insensitive)
    const trimmedName = formData.name.trim();
    const existingTask = tasks.find(t => 
      t.name.toLowerCase() === trimmedName.toLowerCase() && 
      t.id !== editingId
    );
    
    if (existingTask) {
      setError(`A task with the name "${trimmedName}" already exists. Please choose a different name.`);
      return;
    }

    const newTask = {
      id: editingId || Date.now().toString(),
      name: trimmedName,
      description: formData.description,
      startDate: formData.startDate,
      endDate: formData.endDate,
      status: formData.status || 'not-started',
      createdAt: editingId ? tasks.find(t => t.id === editingId)?.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let updatedTasks;
    if (editingId) {
      updatedTasks = tasks.map(t => t.id === editingId ? newTask : t);
    } else {
      updatedTasks = [...tasks, newTask];
    }

    saveTasks(updatedTasks);
    console.log('✅ Task saved:', newTask);
    console.log('📊 Total tasks after save:', updatedTasks.length);
    console.log('🔄 Form data status:', formData.status);
    console.log('🔄 Task status:', newTask.status);
    resetForm();
  };

  // Edit task
  const handleEditTask = (task) => {
    setFormData({
      id: task.id,
      name: task.name,
      description: task.description || '',
      startDate: task.startDate,
      endDate: task.endDate,
      status: task.status || 'not-started'
    });
    setEditingId(task.id);
    setIsCreating(true);
  };

  // Delete task
  const handleDeleteTask = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      saveTasks(updatedTasks);
    }
  };

  // Handle task selection
  const handleTaskSelect = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  // Select all tasks
  const handleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map(task => task.id));
    }
  };

  // Delete selected tasks
  const handleDeleteSelected = () => {
    if (selectedTasks.length === 0) return;
    
    const taskNames = selectedTasks.map(id => 
      tasks.find(t => t.id === id)?.name
    ).join(', ');
    
    if (window.confirm(`Are you sure you want to delete ${selectedTasks.length} task(s): ${taskNames}?`)) {
      const updatedTasks = tasks.filter(t => !selectedTasks.includes(t.id));
      saveTasks(updatedTasks);
      setSelectedTasks([]);
    }
  };

  // Handle status change
  const handleStatusChange = (taskId, newStatus) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId 
        ? { ...task, status: newStatus, updatedAt: new Date().toISOString() } 
        : task
    );
    saveTasks(updatedTasks);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'not-started'
    });
    setEditingId(null);
    setIsCreating(false);
    setError(null);
  };

  // Get filtered tasks
  const getFilteredTasks = () => {
    let filtered = tasks;
    console.log('🔍 Starting with', tasks.length, 'tasks');

    // Filter by status
    if (selectedStatusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === selectedStatusFilter);
      console.log('🔍 After status filter:', filtered.length, 'tasks');
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(task => 
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      console.log('🔍 After search filter:', filtered.length, 'tasks');
    }

    // Filter by completion status
    if (!showCompleted) {
      filtered = filtered.filter(task => task.status !== 'completed');
      console.log('🔍 After completion filter:', filtered.length, 'tasks');
    }

    console.log('🔍 Final filtered tasks:', filtered.length, 'tasks');
    return filtered;
  };

  // Get task statistics
  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const notStarted = tasks.filter(t => t.status === 'not-started').length;

    return { total, completed, inProgress, notStarted };
  };

  // Check if task is overdue
  const isTaskOverdue = (task) => {
    if (task.status === 'completed') return false;
    return new Date(task.endDate) < new Date();
  };

  // Calculate task duration
  const getTaskDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'on-hold':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Target className="w-5 h-4 text-gray-500" />;
    }
  };

  // Download Excel template - SPECIFIC FOR TASKS TAB ONLY
  const downloadTemplate = () => {
    const templateData = [
      {
        'Task Name': 'Foundation Excavation',
        'Description': 'Excavate foundation area for building construction',
        'Start Date': '2024-01-01',
        'End Date': '2024-01-15'
      },
      {
        'Task Name': 'Steel Reinforcement', 
        'Description': 'Install steel reinforcement for concrete structure',
        'Start Date': '2024-01-16',
        'End Date': '2024-01-30'
      },
      {
        'Task Name': 'Electrical Installation',
        'Description': 'Install electrical systems and wiring',
        'Start Date': '2024-02-01',
        'End Date': '2024-02-28'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks Template');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, 'Tasks_Template.xlsx');
  };

  // Handle Excel import
  const handleExcelImport = (event) => {
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
          name: row['Task Name'] || '',
          description: row['Description'] || '',
          startDate: row['Start Date'] || '',
          endDate: row['End Date'] || '',
          status: 'not-started',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })).filter(task => task.name);

        if (importedTasks.length > 0) {
          // ALWAYS REPLACE all existing tasks
          saveTasks(importedTasks);
          alert(`Successfully imported ${importedTasks.length} tasks! (Replaced all existing tasks)`);
        } else {
          alert('No valid tasks found in the Excel file.');
        }
      } catch (error) {
        console.error('Error importing Excel file:', error);
        alert('Error importing Excel file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset the file input so the same file can be imported again
    event.target.value = '';
  };

  // Export to Excel
  const exportToExcel = () => {
    const exportData = tasks.map(task => ({
      'Task Name': task.name,
      'Description': task.description,
      'Start Date': task.startDate,
      'End Date': task.endDate,
      'Status': task.status,
      'Created At': task.createdAt,
      'Updated At': task.updatedAt
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `Tasks_${selectedProject.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredTasks = getFilteredTasks();
  const stats = getTaskStats();
  
  console.log('🔍 Current tasks state:', tasks.length, 'tasks');
  console.log('🔍 Filtered tasks:', filteredTasks.length, 'tasks');
  console.log('🔍 Selected project:', selectedProject?.id);

  return (
    <div className="p-6">
      {/* No Project Selected Warning */}
      {(!selectedProject || !selectedProject.id) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
            <p className="text-yellow-800">
              <strong>No project selected.</strong> Please select a project from the project selector to create and manage tasks.
            </p>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
          <div className="flex gap-2">
            {/* Moved clear local to bottom */}
            <button
              onClick={projectReady ? downloadTemplate : undefined}
              disabled={!projectReady}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 ${projectReady ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
            <label className={`px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2 ${projectReady ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}` }>
              <Upload className="w-4 h-4" />
              Import Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={projectReady ? handleExcelImport : undefined}
                className="hidden"
                disabled={!projectReady}
              />
            </label>
            <button
              onClick={projectReady ? exportToExcel : undefined}
              disabled={!projectReady || tasks.length === 0}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 ${projectReady && tasks.length>0 ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
            <label className={`px-3 py-2 rounded-lg flex items-center gap-2 cursor-pointer ${projectReady ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}` }>
              <Upload className="w-4 h-4" />
              Import MSP XML
              <input
                type="file"
                accept=".xml"
                onChange={projectReady ? handleImportXmlFile : undefined}
                className="hidden"
                disabled={!projectReady}
              />
            </label>
            {/* Gantt view moved to Gantt Chart tab */}
            <button
              onClick={clearAllTasks}
              disabled={!selectedProject || !selectedProject.id || tasks.length === 0}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
                !selectedProject || !selectedProject.id || tasks.length === 0
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
            <button
              onClick={() => setIsCreating(true)}
              disabled={!selectedProject || !selectedProject.id}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                !selectedProject || !selectedProject.id
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mt-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">Project-scoped actions</div>
          <button
            onClick={projectReady ? clearProjectLocalData : undefined}
            disabled={!projectReady || tasks.length === 0}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 ${(!projectReady || tasks.length===0) ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
          >
            Clear Local Tasks Data
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-blue-800 font-medium">
                {selectedTasks.length} task(s) selected
              </span>
            </div>
            <div className="flex gap-2">
                <button
                onClick={handleDeleteSelected}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                Delete Selected
                      </button>
              <button
                onClick={() => setSelectedTasks([])}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* XML Import State */}
      {(xmlLoading || xmlError) && (
        <div className="mb-4">
          {xmlLoading && <div className="text-sm text-gray-600">Importing XML…</div>}
          {xmlError && <div className="text-sm text-red-600">{xmlError}</div>}
        </div>
      )}

      {/* Gantt View */}
      {showGantt && (
        <div className="mb-6">
          <TasksGanttView tasks={tasks} />
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tasks</p>
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
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
                </div>
                
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
                <div>
              <p className="text-sm text-gray-600">Not Started</p>
              <p className="text-2xl font-bold text-gray-600">{stats.notStarted}</p>
            </div>
            <Target className="w-8 h-8 text-gray-500" />
          </div>
                </div>
              </div>
              
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
                  <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
                  </select>
                </div>
                
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Search:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search tasks..."
            />
          </div>
          
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show Completed</span>
            </label>
          </div>
                </div>
              </div>

      {/* Task Form */}
      {isCreating && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Task' : 'Add New Task'}
          </h3>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                  isTaskNameDuplicate(formData.name) 
                    ? 'border-red-300 focus:ring-red-500 bg-red-50' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Enter task name"
                required
              />
              {isTaskNameDuplicate(formData.name) && (
                <p className="mt-1 text-sm text-red-600">
                  A task with this name already exists. Please choose a different name.
                </p>
                  )}
                </div>
                
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
                required
              />
              </div>
              
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                min={formData.startDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              </div>
              
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
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Enter task description"
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
              onClick={handleSaveTask}
              disabled={isTaskNameDuplicate(formData.name)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isTaskNameDuplicate(formData.name)
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Save className="w-4 h-4" />
              {editingId ? 'Update Task' : 'Add Task'}
              </button>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Tasks ({filteredTasks.length})
          </h3>
          {filteredTasks.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <input
                  type="checkbox"
                  checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4"
                />
                <span>Select All</span>
              </button>
              {selectedTasks.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Selected ({selectedTasks.length})</span>
                </button>
              )}
            </div>
          )}
            </div>
            
        {filteredTasks.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No tasks found. Create your first task to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTasks.map(task => (
              <div key={task.id} className={`p-6 hover:bg-gray-50 ${selectedTasks.includes(task.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedTasks.includes(task.id)}
                      onChange={() => handleTaskSelect(task.id)}
                      className="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(task.status)}
                        <h4 className="text-lg font-medium text-gray-900">{task.name}</h4>
                      {isTaskOverdue(task) && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
                          Overdue
                        </span>
                )}
              </div>
                    
                    {task.description && (
                      <p className="text-gray-600 mb-3">{task.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Start Date:</span>
                        <p className="font-medium">{formatDate(task.startDate)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">End Date:</span>
                        <p className="font-medium">{formatDate(task.endDate)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Duration:</span>
                        <p className="font-medium">{getTaskDuration(task.startDate, task.endDate)} days</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="mt-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="not-started">Not Started</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                    </div>
            </div>
            
                  <div className="flex items-center gap-2 ml-4">
              <button
                      onClick={() => handleEditTask(task)}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                      title="Edit task"
              >
                      <Edit className="w-4 h-4" />
              </button>
              <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Delete task"
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

export default Tasks;