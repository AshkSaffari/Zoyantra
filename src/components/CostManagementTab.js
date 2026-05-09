import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  RefreshCw, 
  Download, 
  Filter, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  Building2,
  FileText,
  Calendar,
  Users,
  Target,
  Activity,
  TrendingDown,
  Minus,
  Plus
} from 'lucide-react';
import AccService from '../services/AccService_old';

const CostManagementTab = ({ 
  selectedProject, 
  selectedHub, 
  projects, 
  members = [], 
  budgets = [], 
  archivedTimesheets = [], 
  archivedExpenses = [], 
  credentials 
}) => {
  const [costData, setCostData] = useState({
    budgets: [],
    summary: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState('');
  const [viewMode, setViewMode] = useState('overview'); // overview, detailed
  const [filters, setFilters] = useState({
    dateRange: { start: '', end: '' },
    status: 'all',
    category: 'all'
  });
  const [showDetails, setShowDetails] = useState(false);

  // Load cost data when project changes
  useEffect(() => {
    if (selectedProject && selectedHub && credentials) {
      loadCostData();
    }
  }, [selectedProject, selectedHub, credentials]);

  // Load comprehensive cost data from ACC Cost Management API
  const loadCostData = async () => {
    if (!selectedProject || !selectedHub || !credentials) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('💰 Loading comprehensive cost data for project:', selectedProject.id);
      
      // Load budgets using the enhanced getBudgets method
      const budgetsData = await AccService.getBudgets(selectedProject.id, selectedHub.id);
      console.log('💰 Loaded budgets:', budgetsData.length);

      // Process budget data for display with proper numeric conversion
      const processedBudgets = budgetsData.map(budget => {
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
          updatedAt: budget.updatedAt,
          // Performance tracking data
          performanceTracking: budget.performanceTracking || {},
          // Contract associations
          mainContractId: budget.mainContractId,
          contractIds: budget.contractIds || [],
          // Location data
          locations: budget.locations || [],
          locationPaths: budget.locationPaths || []
        };
      });

      // Calculate summary data with safe numeric operations
      const summary = {
        totalBudgets: processedBudgets.length,
        totalOriginalAmount: processedBudgets.reduce((sum, b) => {
          const amount = typeof b.originalAmount === 'number' && !isNaN(b.originalAmount) ? b.originalAmount : 0;
          return sum + amount;
        }, 0),
        totalRevised: processedBudgets.reduce((sum, b) => {
          const amount = typeof b.revised === 'number' && !isNaN(b.revised) ? b.revised : 0;
          return sum + amount;
        }, 0),
        totalProjectedCost: processedBudgets.reduce((sum, b) => {
          const amount = typeof b.projectedCost === 'number' && !isNaN(b.projectedCost) ? b.projectedCost : 0;
          return sum + amount;
        }, 0),
        totalActualCost: processedBudgets.reduce((sum, b) => {
          const amount = typeof b.actualCost === 'number' && !isNaN(b.actualCost) ? b.actualCost : 0;
          return sum + amount;
        }, 0),
        totalVariance: processedBudgets.reduce((sum, b) => {
          const amount = typeof b.variance === 'number' && !isNaN(b.variance) ? b.variance : 0;
          return sum + amount;
        }, 0),
        activeBudgets: processedBudgets.filter(b => b.status === 'active').length,
        integratedBudgets: processedBudgets.filter(b => b.integrationState === 'integrated').length
      };

      setCostData({
        budgets: processedBudgets,
        summary
      });

      console.log('✅ Cost data loaded successfully:', {
        budgets: processedBudgets.length,
        summary
      });

    } catch (err) {
      console.error('❌ Error loading cost data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    // Handle NaN, null, undefined, and non-numeric values
    const numericAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(numericAmount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'locked': return 'text-yellow-600 bg-yellow-100';
      case 'integrated': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getVarianceColor = (variance) => {
    if (variance > 0) return 'text-green-600';
    if (variance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getVarianceIcon = (variance) => {
    if (variance > 0) return <TrendingUp className="h-4 w-4" />;
    if (variance < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading cost management data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error loading cost data</h3>
            <p className="text-sm text-red-600 mt-1">{error}</p>
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
          <h2 className="text-2xl font-bold text-gray-900">Cost Management</h2>
          <p className="text-gray-600">Advanced cost analysis and budget management</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadCostData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {costData.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Budgets</p>
                <p className="text-2xl font-bold text-gray-900">{costData.summary.totalBudgets}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Original</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(costData.summary.totalOriginalAmount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revised</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(costData.summary.totalRevised)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Variance</p>
                <p className={`text-2xl font-bold ${getVarianceColor(costData.summary.totalVariance)}`}>
                  {formatCurrency(costData.summary.totalVariance)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="flex items-center space-x-4">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {['overview', 'detailed'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Budgets Table */}
      {viewMode === 'overview' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Project Budgets</h3>
            <p className="text-sm text-gray-600">Comprehensive budget analysis and tracking</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Original Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revised
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actual Cost
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {costData.budgets.map((budget) => (
                  <tr key={budget.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{budget.name}</div>
                        <div className="text-sm text-gray-500">{budget.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {budget.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(budget.originalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(budget.revised)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(budget.actualCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed View */}
      {viewMode === 'detailed' && (
        <div className="space-y-4">
          {costData.budgets.map((budget) => (
            <div key={budget.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{budget.name}</h3>
                  <p className="text-sm text-gray-600">{budget.description}</p>
                </div>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(budget.status)}`}>
                  {budget.status}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Financial Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Original:</span>
                      <span className="text-sm font-medium">{formatCurrency(budget.originalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Revised:</span>
                      <span className="text-sm font-medium">{formatCurrency(budget.revised)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Actual:</span>
                      <span className="text-sm font-medium">{formatCurrency(budget.actualCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Variance:</span>
                      <span className={`text-sm font-medium ${getVarianceColor(budget.variance)}`}>
                        {formatCurrency(budget.variance)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Project Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Code:</span>
                      <span className="text-sm font-medium">{budget.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Scope:</span>
                      <span className="text-sm font-medium">{budget.scope}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Quantity:</span>
                      <span className="text-sm font-medium">{budget.quantity} {budget.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Unit Price:</span>
                      <span className="text-sm font-medium">{formatCurrency(budget.unitPrice)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Integration</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">State:</span>
                      <span className="text-sm font-medium">{budget.integrationState || 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">System:</span>
                      <span className="text-sm font-medium">{budget.externalSystem || 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Contracts:</span>
                      <span className="text-sm font-medium">{budget.contractIds.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Locations:</span>
                      <span className="text-sm font-medium">{budget.locations.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {costData.budgets.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No budget data</h3>
          <p className="mt-1 text-sm text-gray-500">
            No budget information found for this project. This may indicate that Cost Management is not enabled or accessible.
          </p>
          <div className="mt-6">
            <button
              onClick={loadCostData}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostManagementTab;
