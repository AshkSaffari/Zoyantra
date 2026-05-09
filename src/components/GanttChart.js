import React, { useState, useEffect, useRef } from 'react';
import AccService from '../services/AccService_old';

const GanttChart = ({ projectId, onDataLoad }) => {
  const [ganttData, setGanttData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [budgetData, setBudgetData] = useState([]);
  const [ganttConfig, setGanttConfig] = useState({
    showProgress: true,
    showCriticalPath: false,
    zoomLevel: 'weeks',
    groupBy: 'none',
    style: 'standard',
    theme: 'white',
    size: 'mini',
    scale: 100,
    contrast: 'default'
  });
  const [xmlData, setXmlData] = useState(null);
  
  const ganttRef = useRef(null);
  const [ejsTreeGrid, setEjsTreeGrid] = useState(null);

  // Load EJS TreeGrid library
  useEffect(() => {
    const loadEjsTreeGrid = async () => {
      try {
        console.log('📚 Loading EJS TreeGrid library...');
        
        // Check if already loaded
        if (window.ej2) {
          setEjsTreeGrid(window.ej2);
          console.log('✅ EJS TreeGrid already loaded');
          return;
        }
        
        // Load EJS TreeGrid CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://cdn.syncfusion.com/ej2/25.1.35/styles/material.css';
        cssLink.onload = () => console.log('✅ EJS TreeGrid CSS loaded');
        cssLink.onerror = () => console.error('❌ Failed to load EJS TreeGrid CSS');
        document.head.appendChild(cssLink);

        // Load EJS TreeGrid JS
        const script = document.createElement('script');
        script.src = 'https://cdn.syncfusion.com/ej2/25.1.35/dist/ej2.min.js';
        script.onload = () => {
          if (window.ej2) {
            setEjsTreeGrid(window.ej2);
            console.log('✅ EJS TreeGrid loaded successfully');
          } else {
            console.error('❌ EJS TreeGrid not available after loading');
            setError('Failed to load Gantt chart library - ej2 not available');
          }
        };
        script.onerror = () => {
          console.error('❌ Failed to load EJS TreeGrid script');
          setError('Failed to load Gantt chart library - script load failed');
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('❌ Error loading EJS TreeGrid:', error);
        setError('Failed to load Gantt chart library');
      }
    };

    loadEjsTreeGrid();
  }, []);

  // Fetch budget data from ACC Cost & Time module
  const fetchBudgetData = async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching budget data for project:', projectId);
      
      // Fetch budget data from ACC Cost & Time module
      const budgetItems = await AccService.getProjectBudgets(projectId);
      console.log('📊 Budget data received:', budgetItems);

      // Transform ACC budget data to Gantt chart format
      const transformedData = transformBudgetToGantt(budgetItems);
      console.log('📈 Transformed Gantt data:', transformedData);

      setBudgetData(budgetItems);
      setGanttData(transformedData);
      
      if (onDataLoad) {
        onDataLoad(transformedData);
      }
    } catch (error) {
      console.error('❌ Error fetching budget data:', error);
      setError(`Failed to fetch budget data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Transform ACC budget data to Gantt chart format
  const transformBudgetToGantt = (budgetItems) => {
    if (!budgetItems || !Array.isArray(budgetItems)) {
      return [];
    }

    const ganttTasks = budgetItems.map((item, index) => {
      // Calculate duration in days
      const startDate = new Date(item.plannedStartDate || item.startDate || new Date());
      const endDate = new Date(item.plannedEndDate || item.endDate || new Date());
      const duration = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));

      // Calculate progress percentage
      const progress = calculateProgress(item);
      
      // Determine if task is critical (overdue or high priority)
      const isCritical = isTaskCritical(item, startDate, endDate);

      return {
        TaskID: item.id || `task-${index}`,
        TaskName: item.name || item.title || `Budget Item ${index + 1}`,
        StartDate: startDate,
        EndDate: endDate,
        Duration: duration,
        Progress: progress,
        Predecessor: item.predecessor || '',
        ResourceInfo: item.responsible || item.assignedTo || 'Unassigned',
        EstimatedHours: item.estimatedHours || item.plannedHours || 0,
        BudgetAmount: item.budgetAmount || item.plannedAmount || 0,
        ActualAmount: item.actualAmount || item.spentAmount || 0,
        Complete: `${progress}%`,
        Parts: item.parts || item.workPackages || 1,
        Critical: isCritical,
        Notes: item.description || item.notes || '',
        // Additional ACC-specific fields
        BudgetCode: item.budgetCode || item.code || '',
        Category: item.category || item.type || 'Budget',
        Status: item.status || 'Planned',
        Priority: item.priority || 'Medium'
      };
    });

    // Add summary row
    const totalHours = ganttTasks.reduce((sum, task) => sum + (task.EstimatedHours || 0), 0);
    const totalProgress = ganttTasks.length > 0 
      ? ganttTasks.reduce((sum, task) => sum + task.Progress, 0) / ganttTasks.length 
      : 0;

    const summaryTask = {
      TaskID: 'summary',
      TaskName: 'Project Summary',
      StartDate: new Date(Math.min(...ganttTasks.map(t => t.StartDate))),
      EndDate: new Date(Math.max(...ganttTasks.map(t => t.EndDate))),
      Duration: 0,
      Progress: totalProgress,
      Predecessor: '',
      ResourceInfo: 'All',
      EstimatedHours: totalHours,
      BudgetAmount: ganttTasks.reduce((sum, task) => sum + (task.BudgetAmount || 0), 0),
      ActualAmount: ganttTasks.reduce((sum, task) => sum + (task.ActualAmount || 0), 0),
      Complete: `${totalProgress.toFixed(1)}%`,
      Parts: ganttTasks.length,
      Critical: false,
      Notes: 'Project summary',
      BudgetCode: 'SUMMARY',
      Category: 'Summary',
      Status: 'Active',
      Priority: 'High',
      isSummary: true
    };

    return [summaryTask, ...ganttTasks];
  };

  // Calculate progress percentage based on budget data
  const calculateProgress = (item) => {
    if (item.actualAmount && item.budgetAmount) {
      return Math.min(100, Math.round((item.actualAmount / item.budgetAmount) * 100));
    }
    
    if (item.actualHours && item.plannedHours) {
      return Math.min(100, Math.round((item.actualHours / item.plannedHours) * 100));
    }
    
    if (item.completionPercentage) {
      return Math.min(100, Math.round(item.completionPercentage));
    }
    
    // Default progress based on status
    switch (item.status?.toLowerCase()) {
      case 'completed':
      case 'finished':
        return 100;
      case 'in-progress':
      case 'active':
        return 50;
      case 'not-started':
      case 'planned':
        return 0;
      default:
        return 0;
    }
  };

  // Determine if task is critical
  const isTaskCritical = (item, startDate, endDate) => {
    const now = new Date();
    const isOverdue = endDate < now && item.status !== 'completed';
    const isHighPriority = item.priority === 'high' || item.priority === 'critical';
    const isOverBudget = item.actualAmount && item.budgetAmount && item.actualAmount > item.budgetAmount;
    
    return isOverdue || isHighPriority || isOverBudget;
  };

  // Initialize Gantt chart when data and library are ready
  useEffect(() => {
    if (ejsTreeGrid && ganttData.length > 0 && ganttRef.current) {
      initializeGanttChart();
    }
  }, [ejsTreeGrid, ganttData]);

  // Initialize EJS TreeGrid Gantt chart
  const initializeGanttChart = () => {
    try {
      console.log('🎯 Initializing Gantt chart with data:', ganttData.length, 'tasks');
      console.log('📊 Sample task data:', ganttData.slice(0, 2));
      
      if (ganttRef.current && ejsTreeGrid && ganttData.length > 0) {
        // Clear previous instance
        if (ganttRef.current.ej2_instances) {
          try {
            ganttRef.current.ej2_instances[0].destroy();
            console.log('✅ Previous chart instance destroyed');
          } catch (e) {
            console.log('⚠️ No previous chart instance to destroy');
          }
        }

        console.log('📊 Creating Gantt chart with data:', ganttData);
        
        // Validate data before creating chart
        const validTasks = ganttData.filter(task => {
          const hasValidDates = task.StartDate && task.EndDate;
          const hasValidName = task.TaskName && task.TaskName.trim() !== '';
          return hasValidDates && hasValidName;
        });
        
        if (validTasks.length === 0) {
          throw new Error('No valid tasks found for chart creation');
        }
        
        console.log(`✅ Found ${validTasks.length} valid tasks out of ${ganttData.length} total`);
        const ganttInstance = new ejsTreeGrid.Gantt({
          dataSource: ganttData,
          taskFields: {
            id: 'TaskID',
            name: 'TaskName',
            startDate: 'StartDate',
            endDate: 'EndDate',
            duration: 'Duration',
            progress: 'Progress',
            dependency: 'Predecessor',
            resourceInfo: 'ResourceInfo'
          },
          columns: [
            { field: 'TaskID', headerText: 'ID', width: 80 },
            { field: 'TaskName', headerText: 'Task Name', width: 200 },
            { field: 'EstimatedHours', headerText: 'Estimated Hours', width: 120 },
            { field: 'Complete', headerText: 'Complete %', width: 100 },
            { field: 'Parts', headerText: 'Parts', width: 80 },
            { field: 'StartDate', headerText: 'Start', width: 120, format: 'dd/MM/yyyy' },
            { field: 'EndDate', headerText: 'End', width: 120, format: 'dd/MM/yyyy' },
            { field: 'BudgetAmount', headerText: 'Budget Amount', width: 120, format: 'C2' },
            { field: 'ActualAmount', headerText: 'Actual Amount', width: 120, format: 'C2' },
            { field: 'Status', headerText: 'Status', width: 100 },
            { field: 'Priority', headerText: 'Priority', width: 100 }
          ],
          allowSelection: true,
          allowSorting: true,
          allowResizing: true,
          allowReordering: true,
          enableContextMenu: true,
          enableVirtualization: true,
          height: '450px',
          timelineSettings: {
            timelineUnitSize: ganttConfig.zoomLevel === 'days' ? 50 : 100,
            topTier: {
              unit: ganttConfig.zoomLevel === 'days' ? 'Day' : 'Week',
              format: ganttConfig.zoomLevel === 'days' ? 'MMM dd, yyyy' : 'MMM dd, yyyy'
            },
            bottomTier: {
              unit: ganttConfig.zoomLevel === 'days' ? 'Hour' : 'Day',
              count: ganttConfig.zoomLevel === 'days' ? 1 : 1
            }
          },
          labelSettings: {
            leftLabel: 'TaskName',
            rightLabel: 'Progress'
          },
          splitterSettings: {
            columnIndex: 5
          },
          projectStartDate: new Date(Math.min(...ganttData.map(t => new Date(t.StartDate).getTime()))),
          projectEndDate: new Date(Math.max(...ganttData.map(t => new Date(t.EndDate).getTime()))),
          highlightWeekends: true,
          showWeekend: true,
          showHolidays: true,
          holidays: [
            { from: new Date('2025-07-04'), to: new Date('2025-07-04'), label: 'Independence Day' },
            { from: new Date('2025-12-25'), to: new Date('2025-12-25'), label: 'Christmas' }
          ],
          eventMarkers: ganttConfig.showCriticalPath ? [
            {
              day: new Date(),
              label: 'Today'
            }
          ] : [],
          toolbar: [
            'Add', 'Edit', 'Update', 'Delete', 'Cancel', 'ExpandAll', 'CollapseAll', 'Search', 'ZoomIn', 'ZoomOut', 'ZoomToFit'
          ],
          editSettings: {
            allowAdding: true,
            allowEditing: true,
            allowDeleting: true,
            allowTaskbarEditing: true,
            showDeleteConfirmDialog: true
          },
          rowHeight: 40,
          taskbarHeight: 20,
          criticalPath: ganttConfig.showCriticalPath,
          showProgress: ganttConfig.showProgress,
          gridLines: 'Both',
          allowExcelExport: true,
          allowPdfExport: true,
          allowSelection: true,
          selectionSettings: {
            mode: 'Row',
            type: 'Multiple'
          }
        });

        ganttInstance.appendTo(ganttRef.current);
        console.log('✅ Gantt chart initialized successfully with', ganttData.length, 'tasks');
        
        // Add event listeners for debugging
        ganttInstance.dataBound = () => {
          console.log('📊 Gantt chart data bound successfully');
        };
        
        ganttInstance.render = () => {
          console.log('🎨 Gantt chart rendered successfully');
        };
        
      } else {
        console.warn('⚠️ Cannot initialize Gantt chart:', {
          hasRef: !!ganttRef.current,
          hasLibrary: !!ejsTreeGrid,
          hasData: ganttData.length > 0,
          dataLength: ganttData.length
        });
      }
    } catch (error) {
      console.error('❌ Error initializing Gantt chart:', error);
      setError(`Failed to initialize Gantt chart: ${error.message}`);
    }
  };

  // Handle configuration changes
  const handleConfigChange = (key, value) => {
    setGanttConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Refresh data
  const refreshData = () => {
    fetchBudgetData();
  };

  // Export data
  const exportData = (format) => {
    if (ganttRef.current && ganttRef.current.ej2_instances) {
      const ganttInstance = ganttRef.current.ej2_instances[0];
      if (format === 'excel') {
        ganttInstance.excelExport();
      } else if (format === 'pdf') {
        ganttInstance.pdfExport();
      }
    }
  };

  // Handle XML file loading
  const handleLoadXml = () => {
    console.log('📁 Opening file dialog for XML loading...');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml';
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        console.log('📄 File selected:', file.name, 'Size:', file.size);
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const xmlText = e.target.result;
            console.log('📄 XML content length:', xmlText.length);
            console.log('📄 XML preview:', xmlText.substring(0, 200) + '...');
            parseXmlData(xmlText);
          } catch (error) {
            console.error('❌ Error reading XML file:', error);
            setError('Failed to read XML file');
          }
        };
        reader.onerror = (error) => {
          console.error('❌ FileReader error:', error);
          setError('Failed to read XML file');
        };
        reader.readAsText(file);
      } else {
        console.log('📁 No file selected');
      }
    };
    input.click();
  };

  // Parse XML data and convert to Gantt format
  const parseXmlData = (xmlText) => {
    try {
      console.log('📄 Starting XML parsing...');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      // Check for parsing errors
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error('XML parsing failed: ' + parseError.textContent);
      }
      
      // Check if it's an MSP XML file
      const project = xmlDoc.querySelector('Project');
      if (!project) {
        throw new Error('Invalid XML format - not a Microsoft Project file');
      }

      console.log('✅ Valid MSP XML file detected');

      // Extract tasks from XML
      const tasks = [];
      const taskElements = xmlDoc.querySelectorAll('Task');
      
      console.log(`📊 Found ${taskElements.length} task elements`);
      
      taskElements.forEach((taskElement, index) => {
        try {
          // Get basic task information
          const uid = taskElement.getAttribute('UID') || `task-${index + 1}`;
          const name = taskElement.querySelector('Name')?.textContent || `Task ${index + 1}`;
          const startText = taskElement.querySelector('Start')?.textContent;
          const finishText = taskElement.querySelector('Finish')?.textContent;
          const durationText = taskElement.querySelector('Duration')?.textContent || '1d';
          const percentComplete = parseFloat(taskElement.querySelector('PercentComplete')?.textContent || '0');
          
          // Parse dates safely
          let startDate, endDate;
          try {
            startDate = startText ? new Date(startText).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            endDate = finishText ? new Date(finishText).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          } catch (dateError) {
            console.warn(`⚠️ Date parsing error for task ${uid}:`, dateError);
            startDate = new Date().toISOString().split('T')[0];
            endDate = new Date().toISOString().split('T')[0];
          }
          
          const task = {
            TaskID: uid,
            TaskName: name,
            StartDate: startDate,
            EndDate: endDate,
            Duration: durationText,
            Progress: percentComplete / 100,
            EstimatedHours: taskElement.querySelector('Work')?.textContent || '8',
            Complete: percentComplete,
            Parts: taskElement.querySelector('OutlineNumber')?.textContent || '1',
            BudgetAmount: 0,
            ActualAmount: 0,
            Status: percentComplete >= 100 ? 'Completed' : percentComplete > 0 ? 'In Progress' : 'Not Started',
            Priority: taskElement.querySelector('Priority')?.textContent || 'Normal',
            ResourceInfo: taskElement.querySelector('ResourceNames')?.textContent || '',
            Predecessor: taskElement.querySelector('PredecessorLink')?.textContent || ''
          };
          
          tasks.push(task);
          console.log(`✅ Parsed task ${uid}: ${name}`);
        } catch (taskError) {
          console.error(`❌ Error parsing task ${index}:`, taskError);
        }
      });

      console.log('✅ Parsed XML data:', tasks);
      console.log('📊 Number of tasks loaded:', tasks.length);
      
      if (tasks.length === 0) {
        throw new Error('No valid tasks found in XML file');
      }
      
      // Clear any existing chart instance first
      if (ganttRef.current && ganttRef.current.ej2_instances) {
        try {
          ganttRef.current.ej2_instances[0].destroy();
        } catch (e) {
          console.log('No existing chart to destroy');
        }
      }
      
      setGanttData(tasks);
      setXmlData(xmlText);
      setError(null);
      
      // Force re-render of the chart with new data
      setTimeout(() => {
        console.log('🔄 Reinitializing Gantt chart...');
        initializeGanttChart();
      }, 200);
      
    } catch (error) {
      console.error('❌ Error parsing XML:', error);
      setError(`Failed to parse XML: ${error.message}`);
    }
  };

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Gantt Chart
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Project Timeline & Resource Management
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleLoadXml}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Load XML
            </button>
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Refresh Data'}
            </button>
            <button
              onClick={() => exportData('excel')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Export Excel
            </button>
            <button
              onClick={() => exportData('pdf')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4 flex-wrap">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Group by:</label>
            <select
              value={ganttConfig.groupBy}
              onChange={(e) => handleConfigChange('groupBy', e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="none">None</option>
              <option value="category">Category</option>
              <option value="status">Status</option>
              <option value="priority">Priority</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Zoom:</label>
            <select
              value={ganttConfig.zoomLevel}
              onChange={(e) => handleConfigChange('zoomLevel', e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks and Days</option>
              <option value="months">Months</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={ganttConfig.showProgress}
                onChange={(e) => handleConfigChange('showProgress', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Progress</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={ganttConfig.showCriticalPath}
                onChange={(e) => handleConfigChange('showCriticalPath', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Show Critical Path</span>
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Style:</span>
            <select
              value={ganttConfig.style}
              onChange={(e) => handleConfigChange('style', e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="standard">Standard</option>
              <option value="modern">Modern</option>
              <option value="compact">Compact</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Theme:</span>
            <select
              value={ganttConfig.theme}
              onChange={(e) => handleConfigChange('theme', e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="white">White</option>
              <option value="dark">Dark</option>
              <option value="blue">Blue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="p-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading budget data...</p>
            </div>
          </div>
        ) : !ejsTreeGrid ? (
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded border-2 border-dashed border-gray-300">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading Gantt chart library...</p>
            </div>
          </div>
        ) : ganttData.length === 0 ? (
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded border-2 border-dashed border-gray-300">
            <div className="text-center">
              <p className="text-gray-600 mb-4">No data loaded</p>
              <button
                onClick={handleLoadXml}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Load XML File
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div ref={ganttRef} className="w-full" style={{ minHeight: '400px' }}></div>
          </div>
        )}
      </div>

    </div>
  );
};

export default GanttChart;
