import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Target, 
  DollarSign, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Download, 
  Filter, 
  Search, 
  Calendar, 
  Users, 
  Activity,
  FileText,
  PieChart,
  LineChart,
  TrendingDown,
  Minus,
  Plus
} from 'lucide-react';
import AccService from '../services/AccService_old';
import { safeFormatCurrency, safeParseFloat } from '../utils/numberUtils';

const EarnedValueTab = ({ 
  selectedProject, 
  selectedHub, 
  projects, 
  members = [], 
  budgets = [], 
  archivedTimesheets = [],
  archivedExpenses = [],
  credentials 
}) => {
  const [evmData, setEvmData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [viewMode, setViewMode] = useState('overview'); // overview, detailed, trends
  const [selectedMetrics, setSelectedMetrics] = useState(['cpi', 'spi', 'cpi_trend', 'spi_trend']);
  const [evmStats, setEvmStats] = useState({});
  const [performanceData, setPerformanceData] = useState([]);
  const [forecastData, setForecastData] = useState({});

  // Load data when project changes
  useEffect(() => {
    if (selectedProject && selectedHub && credentials) {
      loadEVMData();
      loadPerformanceData();
      loadForecastData();
    }
  }, [selectedProject, selectedHub, credentials, archivedTimesheets]);

  // Load budgets using the same robust method as CostManagementTab
  const loadBudgets = async () => {
    if (!selectedProject || !selectedHub || !credentials) return [];

    try {
      console.log('💰 Loading comprehensive cost data for project:', selectedProject.id);
      
      // Load budgets using the enhanced getBudgets method (same as CostManagementTab)
      const fetchedBudgets = await AccService.getBudgets(selectedProject.id, selectedHub.id);
      console.log('💰 Loaded budgets:', fetchedBudgets.length);
      
      // Process budget data exactly like CostManagementTab
      const processedBudgets = fetchedBudgets.map(budget => {
        // Helper function to safely convert to number
        const safeNumber = (value, defaultValue = 0) => {
          if (value === null || value === undefined || value === '') return defaultValue;
          const num = parseFloat(value);
          return isNaN(num) ? defaultValue : num;
        };

        return {
          id: budget.id,
          name: budget.name || budget.attributes?.name || 'Unknown Budget',
          code: budget.code || '',
          description: budget.description || '',
          originalAmount: safeNumber(budget.originalAmount || budget.originalBudget),
          revisedAmount: safeNumber(budget.revised || budget.revisedAmount),
          spentAmount: safeNumber(budget.spent || budget.spentAmount),
          remainingAmount: safeNumber(budget.remaining || budget.remainingAmount),
          unit: budget.unit || 'units',
          quantity: safeNumber(budget.quantity || budget.outputQuantity),
          inputQuantity: safeNumber(budget.inputQuantity || budget.inputQty),
          outputQuantity: safeNumber(budget.outputQuantity || budget.quantity),
          status: budget.status || 'active',
          createdAt: budget.createdAt || new Date().toISOString(),
          updatedAt: budget.updatedAt || new Date().toISOString()
        };
      });
      
      console.log('💰 Processed budgets for EVM:', processedBudgets.length);
      return processedBudgets;
    } catch (error) {
      console.error('❌ Error loading budgets for EVM:', error);
      return [];
    }
  };

  // Load EVM data from ACC or calculate from project data
  const loadEVMData = async () => {
    if (!selectedProject || !selectedHub || !credentials) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('💰 Loading comprehensive cost data for project:', selectedProject.id);
      
      // Load budgets using the enhanced getBudgets method (same as CostManagementTab)
      const fetchedBudgets = await AccService.getBudgets(selectedProject.id, selectedHub.id);
      console.log('💰 Loaded budgets:', fetchedBudgets.length);

      // Process budget data for display with proper numeric conversion (same as CostManagementTab)
      const processedBudgets = fetchedBudgets.map(budget => {
        // Helper function to safely convert to number
        const safeNumber = (value, defaultValue = 0) => {
          if (value === null || value === undefined || value === '') return defaultValue;
          const num = parseFloat(value);
          return isNaN(num) ? defaultValue : num;
        };

        return {
          id: budget.id,
          name: budget.name || budget.attributes?.name || 'Unknown Budget',
          code: budget.code || '',
          description: budget.description || '',
          originalAmount: safeNumber(budget.originalAmount || budget.originalBudget),
          revisedAmount: safeNumber(budget.revised || budget.revisedAmount),
          spentAmount: safeNumber(budget.spent || budget.spentAmount),
          remainingAmount: safeNumber(budget.remaining || budget.remainingAmount),
          unit: budget.unit || 'units',
          quantity: safeNumber(budget.quantity || budget.outputQuantity),
          inputQuantity: safeNumber(budget.inputQuantity || budget.inputQty),
          outputQuantity: safeNumber(budget.outputQuantity || budget.quantity),
          status: budget.status || 'active',
          createdAt: budget.createdAt || new Date().toISOString(),
          updatedAt: budget.updatedAt || new Date().toISOString()
        };
      });
      
      console.log('💰 Processed budgets for EVM:', processedBudgets.length);
      
      // Try to load from ACC API first
      let evmData = {};
      try {
        evmData = await AccService.getProjectEVMData(selectedProject.id, selectedHub.id);
        console.log('✅ Loaded EVM data from ACC:', evmData);
      } catch (apiError) {
        console.log('⚠️ ACC API not available, calculating from project data');
        // Fallback to calculation from project data using processed budgets
        evmData = calculateEVMFromProjectData(processedBudgets);
      }

      setEvmData(evmData);
      calculateEVMStats(evmData);
      
    } catch (error) {
      console.error('❌ Error loading EVM data:', error);
      setError(`Failed to load EVM data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate EVM from project data
  const calculateEVMFromProjectData = (fetchedBudgets = []) => {
    console.log('📊 Calculating EVM from project data with budgets:', fetchedBudgets.length);
    console.log('📊 Sample budget data:', fetchedBudgets.slice(0, 2));
    
    const evmData = {
      budgets: {},
      overall: {
        plannedValue: 0,
        earnedValue: 0,
        actualCost: 0,
        budgetAtCompletion: 0,
        estimateAtCompletion: 0,
        varianceAtCompletion: 0,
        costPerformanceIndex: 0,
        schedulePerformanceIndex: 0,
        costVariance: 0,
        scheduleVariance: 0,
        costVariancePercentage: 0,
        scheduleVariancePercentage: 0
      }
    };

    // Calculate EVM for each budget using fetched budgets
    const budgetsToUse = fetchedBudgets.length > 0 ? fetchedBudgets : budgets;
    console.log('📊 Using budgets for EVM calculation:', budgetsToUse.length);
    budgetsToUse.forEach(budget => {
      const budgetEVM = calculateBudgetEVM(budget);
      evmData.budgets[budget.id] = budgetEVM;
      
      // Add to overall totals
      evmData.overall.plannedValue += budgetEVM.plannedValue;
      evmData.overall.earnedValue += budgetEVM.earnedValue;
      evmData.overall.actualCost += budgetEVM.actualCost;
      evmData.overall.budgetAtCompletion += budgetEVM.budgetAtCompletion;
    });

    // Calculate overall metrics
    const overall = evmData.overall;
    overall.estimateAtCompletion = overall.actualCost + (overall.budgetAtCompletion - overall.earnedValue);
    overall.varianceAtCompletion = overall.budgetAtCompletion - overall.estimateAtCompletion;
    overall.costPerformanceIndex = overall.earnedValue > 0 ? overall.earnedValue / overall.actualCost : 0;
    overall.schedulePerformanceIndex = overall.plannedValue > 0 ? overall.earnedValue / overall.plannedValue : 0;
    overall.costVariance = overall.earnedValue - overall.actualCost;
    overall.scheduleVariance = overall.earnedValue - overall.plannedValue;
    overall.costVariancePercentage = overall.actualCost > 0 ? (overall.costVariance / overall.actualCost) * 100 : 0;
    overall.scheduleVariancePercentage = overall.plannedValue > 0 ? (overall.scheduleVariance / overall.plannedValue) * 100 : 0;

    return evmData;
  };

  // Calculate EVM for a specific budget
  const calculateBudgetEVM = (budget) => {
    const budgetAmount = safeParseFloat(budget.originalAmount || budget.revisedAmount || budget.amount) || 0;
    console.log('📊 Calculating EVM for budget:', budget.name, 'Amount:', budgetAmount, 'Fields:', {
      originalAmount: budget.originalAmount,
      revisedAmount: budget.revisedAmount,
      amount: budget.amount
    });
    const startDate = new Date(budget.startDate || selectedProject.startDate);
    const endDate = new Date(budget.endDate || selectedProject.endDate);
    const currentDate = new Date();
    
    // Calculate planned value (PV) - budgeted cost of work scheduled
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((currentDate - startDate) / (1000 * 60 * 60 * 24));
    const plannedValue = Math.max(0, Math.min(budgetAmount, (elapsedDays / totalDays) * budgetAmount));
    
    // Calculate earned value (EV) - budgeted cost of work performed
    // This would typically come from task completion data
    const earnedValue = calculateEarnedValueFromTasks(budget);
    
    // Calculate actual cost (AC) - actual cost of work performed
    const actualCost = calculateActualCostFromTimesheets(budget);
    
    // Calculate EVM metrics
    const costVariance = earnedValue - actualCost;
    const scheduleVariance = earnedValue - plannedValue;
    const costPerformanceIndex = actualCost > 0 ? earnedValue / actualCost : 0;
    const schedulePerformanceIndex = plannedValue > 0 ? earnedValue / plannedValue : 0;
    const costVariancePercentage = actualCost > 0 ? (costVariance / actualCost) * 100 : 0;
    const scheduleVariancePercentage = plannedValue > 0 ? (scheduleVariance / plannedValue) * 100 : 0;
    
    // Calculate forecast metrics
    const estimateAtCompletion = actualCost + (budgetAmount - earnedValue);
    const varianceAtCompletion = budgetAmount - estimateAtCompletion;
    
    return {
      budgetId: budget.id,
      budgetName: budget.name,
      budgetAmount,
      plannedValue,
      earnedValue,
      actualCost,
      budgetAtCompletion: budgetAmount,
      estimateAtCompletion,
      varianceAtCompletion,
      costPerformanceIndex,
      schedulePerformanceIndex,
      costVariance,
      scheduleVariance,
      costVariancePercentage,
      scheduleVariancePercentage,
      startDate: budget.startDate,
      endDate: budget.endDate
    };
  };

  // Calculate earned value from task completion
  const calculateEarnedValueFromTasks = (budget) => {
    // This would typically integrate with task management system
    // For now, we'll simulate based on timesheet data
    const budgetTimesheets = archivedTimesheets.filter(ts => ts.budgetId === budget.id);
    const totalHours = budgetTimesheets.reduce((sum, ts) => sum + (ts.hours || 0), 0);
    const averageHourlyRate = budgetTimesheets.reduce((sum, ts) => sum + (ts.hourlyRate || 0), 0) / budgetTimesheets.length || 0;
    
    // Simulate task completion based on hours worked
    const estimatedTotalHours = 100; // This would come from task estimates
    const completionPercentage = Math.min(100, (totalHours / estimatedTotalHours) * 100);
    
    return (completionPercentage / 100) * safeParseFloat(budget.originalAmount || budget.revisedAmount || budget.amount);
  };

  // Calculate actual cost from timesheets
  const calculateActualCostFromTimesheets = (budget) => {
    const budgetTimesheets = archivedTimesheets.filter(ts => ts.budgetId === budget.id);
    return budgetTimesheets.reduce((sum, ts) => sum + ((ts.hours || 0) * (ts.hourlyRate || 0)), 0);
  };

  // Calculate EVM statistics
  const calculateEVMStats = (evmData) => {
    const stats = {
      totalBudgets: Object.keys(evmData.budgets || {}).length,
      onTrackBudgets: 0,
      overBudgetBudgets: 0,
      behindScheduleBudgets: 0,
      averageCPI: 0,
      averageSPI: 0,
      totalVariance: 0,
      overallHealth: 'Good'
    };

    let totalCPI = 0;
    let totalSPI = 0;
    let validBudgets = 0;

    Object.values(evmData.budgets || {}).forEach(budget => {
      if (budget.costPerformanceIndex > 0) {
        totalCPI += budget.costPerformanceIndex;
        validBudgets++;
      }
      if (budget.schedulePerformanceIndex > 0) {
        totalSPI += budget.schedulePerformanceIndex;
      }
      
      if (budget.costPerformanceIndex >= 1.0) stats.onTrackBudgets++;
      if (budget.costPerformanceIndex < 1.0) stats.overBudgetBudgets++;
      if (budget.schedulePerformanceIndex < 1.0) stats.behindScheduleBudgets++;
      
      stats.totalVariance += budget.costVariance + budget.scheduleVariance;
    });

    stats.averageCPI = validBudgets > 0 ? totalCPI / validBudgets : 0;
    stats.averageSPI = validBudgets > 0 ? totalSPI / validBudgets : 0;

    // Determine overall health
    if (stats.averageCPI < 0.8 || stats.averageSPI < 0.8) {
      stats.overallHealth = 'Critical';
    } else if (stats.averageCPI < 1.0 || stats.averageSPI < 1.0) {
      stats.overallHealth = 'At Risk';
    } else if (stats.averageCPI < 1.1 || stats.averageSPI < 1.1) {
      stats.overallHealth = 'Good';
    } else {
      stats.overallHealth = 'Excellent';
    }

    setEvmStats(stats);
  };

  // Load performance data for trends
  const loadPerformanceData = async () => {
    if (!selectedProject || !selectedHub) return;

    try {
      console.log('📈 Loading performance data for trends...');
      
      // Generate performance data over time
      const performanceData = [];
      const startDate = new Date(selectedProject.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
      const endDate = new Date(selectedProject.endDate || new Date());
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
        const date = new Date(d);
        const weekData = {
          date: date.toISOString().split('T')[0],
          plannedValue: Math.random() * 100000, // This would be calculated from project schedule
          earnedValue: Math.random() * 100000, // This would be calculated from task completion
          actualCost: Math.random() * 100000, // This would be calculated from timesheets
          cpi: 0.8 + Math.random() * 0.4, // Simulated CPI
          spi: 0.8 + Math.random() * 0.4  // Simulated SPI
        };
        
        weekData.costVariance = weekData.earnedValue - weekData.actualCost;
        weekData.scheduleVariance = weekData.earnedValue - weekData.plannedValue;
        
        performanceData.push(weekData);
      }
      
      setPerformanceData(performanceData);
      console.log('✅ Loaded performance data:', performanceData.length, 'data points');
    } catch (error) {
      console.error('❌ Error loading performance data:', error);
    }
  };

  // Load forecast data
  const loadForecastData = async () => {
    if (!selectedProject || !evmData.overall) return;

    try {
      console.log('🔮 Loading forecast data...');
      
      const forecast = {
        estimateAtCompletion: evmData.overall.estimateAtCompletion,
        budgetAtCompletion: evmData.overall.budgetAtCompletion,
        varianceAtCompletion: evmData.overall.varianceAtCompletion,
        estimateToComplete: evmData.overall.estimateAtCompletion - evmData.overall.actualCost,
        completionDate: calculateForecastCompletionDate(),
        confidenceLevel: calculateConfidenceLevel()
      };
      
      setForecastData(forecast);
      console.log('✅ Loaded forecast data:', forecast);
    } catch (error) {
      console.error('❌ Error loading forecast data:', error);
    }
  };

  // Calculate forecast completion date
  const calculateForecastCompletionDate = () => {
    if (!selectedProject || !evmData.overall) return null;
    
    const startDate = new Date(selectedProject.startDate || new Date());
    const endDate = new Date(selectedProject.endDate || new Date());
    const currentDate = new Date();
    
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((currentDate - startDate) / (1000 * 60 * 60 * 24));
    const remainingDays = totalDays - elapsedDays;
    
    // Adjust based on SPI
    const adjustedRemainingDays = evmData.overall.schedulePerformanceIndex > 0 
      ? remainingDays / evmData.overall.schedulePerformanceIndex 
      : remainingDays;
    
    const forecastDate = new Date(currentDate.getTime() + adjustedRemainingDays * 24 * 60 * 60 * 1000);
    return forecastDate.toISOString().split('T')[0];
  };

  // Calculate confidence level
  const calculateConfidenceLevel = () => {
    if (!evmData.overall) return 'Low';
    
    const cpi = evmData.overall.costPerformanceIndex;
    const spi = evmData.overall.schedulePerformanceIndex;
    
    if (cpi >= 1.0 && spi >= 1.0) return 'High';
    if (cpi >= 0.9 && spi >= 0.9) return 'Medium';
    return 'Low';
  };

  // Get health color
  const getHealthColor = (health) => {
    switch (health) {
      case 'Excellent': return 'text-green-600 bg-green-100';
      case 'Good': return 'text-blue-600 bg-blue-100';
      case 'At Risk': return 'text-yellow-600 bg-yellow-100';
      case 'Critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get performance indicator
  const getPerformanceIndicator = (value, threshold = 1.0) => {
    if (value >= threshold) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (value >= threshold * 0.9) {
      return <Minus className="w-4 h-4 text-yellow-500" />;
    } else {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
  };

  const filteredBudgets = selectedBudget 
    ? Object.values(evmData.budgets || {}).filter(b => b.budgetId === selectedBudget)
    : Object.values(evmData.budgets || {});

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          Earned Value Management Module
        </h2>
        <p className="text-gray-600">
          Comprehensive project performance analysis with EVM metrics and forecasting.
        </p>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overall Health</p>
              <p className={`text-2xl font-bold ${getHealthColor(evmStats.overallHealth).split(' ')[0]}`}>
                {evmStats.overallHealth}
              </p>
            </div>
            <div className={`p-2 rounded-full ${getHealthColor(evmStats.overallHealth).split(' ')[1]}`}>
              {evmStats.overallHealth === 'Excellent' || evmStats.overallHealth === 'Good' ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <AlertCircle className="w-6 h-6" />
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average CPI</p>
              <p className="text-2xl font-bold text-blue-600 flex items-center">
                {evmStats.averageCPI?.toFixed(2) || '0.00'}
                {getPerformanceIndicator(evmStats.averageCPI)}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average SPI</p>
              <p className="text-2xl font-bold text-green-600 flex items-center">
                {evmStats.averageSPI?.toFixed(2) || '0.00'}
                {getPerformanceIndicator(evmStats.averageSPI)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Variance</p>
              <p className={`text-2xl font-bold ${evmStats.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {safeFormatCurrency(evmStats.totalVariance || 0)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
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
                <option value="detailed">Detailed</option>
                <option value="trends">Trends</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Budget:</label>
              <select
                value={selectedBudget}
                onChange={(e) => setSelectedBudget(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Budgets</option>
                {budgets.map(budget => (
                  <option key={budget.id} value={budget.id}>
                    {budget.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={loadEVMData}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            
            <button
              onClick={() => {/* Export EVM data */}}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* EVM Overview */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Overall EVM Metrics */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Overall EVM Metrics
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Planned Value (PV):</span>
                <span className="font-medium">{safeFormatCurrency(evmData.overall?.plannedValue || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Earned Value (EV):</span>
                <span className="font-medium">{safeFormatCurrency(evmData.overall?.earnedValue || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Actual Cost (AC):</span>
                <span className="font-medium">{safeFormatCurrency(evmData.overall?.actualCost || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Budget at Completion (BAC):</span>
                <span className="font-medium">{safeFormatCurrency(evmData.overall?.budgetAtCompletion || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Estimate at Completion (EAC):</span>
                <span className="font-medium">{safeFormatCurrency(evmData.overall?.estimateAtCompletion || 0)}</span>
              </div>
            </div>
          </div>

          {/* Performance Indices */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Performance Indices
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cost Performance Index (CPI):</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{evmData.overall?.costPerformanceIndex?.toFixed(2) || '0.00'}</span>
                  {getPerformanceIndicator(evmData.overall?.costPerformanceIndex)}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Schedule Performance Index (SPI):</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{evmData.overall?.schedulePerformanceIndex?.toFixed(2) || '0.00'}</span>
                  {getPerformanceIndicator(evmData.overall?.schedulePerformanceIndex)}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cost Variance:</span>
                <span className={`font-medium ${(evmData.overall?.costVariance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {safeFormatCurrency(evmData.overall?.costVariance || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Schedule Variance:</span>
                <span className={`font-medium ${(evmData.overall?.scheduleVariance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {safeFormatCurrency(evmData.overall?.scheduleVariance || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Budget View */}
      {viewMode === 'detailed' && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Budget Performance Details
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    EV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AC
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPI
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SPI
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBudgets.map(budget => (
                  <tr key={budget.budgetId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{budget.budgetName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {safeFormatCurrency(budget.plannedValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {safeFormatCurrency(budget.earnedValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {safeFormatCurrency(budget.actualCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <span>{budget.costPerformanceIndex.toFixed(2)}</span>
                        {getPerformanceIndicator(budget.costPerformanceIndex)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <span>{budget.schedulePerformanceIndex.toFixed(2)}</span>
                        {getPerformanceIndicator(budget.schedulePerformanceIndex)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={budget.costVariance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {safeFormatCurrency(budget.costVariance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={budget.scheduleVariance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {safeFormatCurrency(budget.scheduleVariance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        budget.costPerformanceIndex >= 1.0 && budget.schedulePerformanceIndex >= 1.0
                          ? 'text-green-600 bg-green-100'
                          : budget.costPerformanceIndex >= 0.9 && budget.schedulePerformanceIndex >= 0.9
                          ? 'text-yellow-600 bg-yellow-100'
                          : 'text-red-600 bg-red-100'
                      }`}>
                        {budget.costPerformanceIndex >= 1.0 && budget.schedulePerformanceIndex >= 1.0
                          ? 'On Track'
                          : budget.costPerformanceIndex >= 0.9 && budget.schedulePerformanceIndex >= 0.9
                          ? 'At Risk'
                          : 'Off Track'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Forecast Data */}
      {forecastData && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Project Forecast
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Estimate at Completion</p>
              <p className="text-xl font-bold text-blue-600">
                {safeFormatCurrency(forecastData.estimateAtCompletion || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Variance at Completion</p>
              <p className={`text-xl font-bold ${(forecastData.varianceAtCompletion || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {safeFormatCurrency(forecastData.varianceAtCompletion || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Estimate to Complete</p>
              <p className="text-xl font-bold text-purple-600">
                {safeFormatCurrency(forecastData.estimateToComplete || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Confidence Level</p>
              <p className={`text-xl font-bold ${getHealthColor(forecastData.confidenceLevel).split(' ')[0]}`}>
                {forecastData.confidenceLevel}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <div>
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EarnedValueTab;
