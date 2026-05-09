import React from 'react';
import { 
  Clock, 
  Target, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { safeFormatCurrency } from '../utils/numberUtils';

const PlanCard = ({ plan, planLines, budgets, timesheets = [] }) => {
  // Calculate plan statistics
  const calculatePlanStats = () => {
    const totalPlannedHours = planLines.reduce((sum, line) => sum + (line.plannedHours || 0), 0);
    const totalPlannedQty = planLines.reduce((sum, line) => sum + (line.plannedOutputQty || 0), 0);
    const totalPlannedCost = planLines.reduce((sum, line) => {
      const budget = budgets.find(b => b.id === line.budgetId);
      const rate = budget?.unitPrice || 0;
      return sum + ((line.plannedHours || 0) * rate);
    }, 0);

    // Calculate actual from timesheets
    const planTimesheets = timesheets.filter(ts => ts.planId === plan.id);
    const totalActualHours = planTimesheets.reduce((sum, ts) => sum + (ts.totalHours || 0), 0);
    const totalActualQty = planTimesheets.reduce((sum, ts) => sum + (ts.totalQty || 0), 0);
    const totalActualCost = planTimesheets.reduce((sum, ts) => sum + (ts.totalCost || 0), 0);

    // Calculate remaining
    const remainingHours = Math.max(0, totalPlannedHours - totalActualHours);
    const remainingQty = Math.max(0, totalPlannedQty - totalActualQty);
    const remainingCost = Math.max(0, totalPlannedCost - totalActualCost);

    // Calculate percentages
    const hoursProgress = totalPlannedHours > 0 ? (totalActualHours / totalPlannedHours) * 100 : 0;
    const qtyProgress = totalPlannedQty > 0 ? (totalActualQty / totalPlannedQty) * 100 : 0;
    const costProgress = totalPlannedCost > 0 ? (totalActualCost / totalPlannedCost) * 100 : 0;

    // Overall progress (average of all metrics)
    const overallProgress = (hoursProgress + qtyProgress + costProgress) / 3;

    return {
      totalPlannedHours,
      totalActualHours,
      remainingHours,
      hoursProgress,
      
      totalPlannedQty,
      totalActualQty,
      remainingQty,
      qtyProgress,
      
      totalPlannedCost,
      totalActualCost,
      remainingCost,
      costProgress,
      
      overallProgress
    };
  };

  const stats = calculatePlanStats();

  // Get status color based on progress
  const getProgressColor = (progress) => {
    if (progress >= 100) return 'text-green-600';
    if (progress >= 75) return 'text-blue-600';
    if (progress >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get status icon
  const getStatusIcon = (progress) => {
    if (progress >= 100) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (progress >= 75) return <TrendingUp className="h-5 w-5 text-blue-600" />;
    if (progress >= 50) return <BarChart3 className="h-5 w-5 text-yellow-600" />;
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  };

  // Check for overruns
  const hasOverruns = stats.totalActualHours > stats.totalPlannedHours || 
                     stats.totalActualQty > stats.totalPlannedQty ||
                     stats.totalActualCost > stats.totalPlannedCost;

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${hasOverruns ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {getStatusIcon(stats.overallProgress)}
          <h3 className="text-lg font-semibold text-gray-900 ml-2">{plan.name}</h3>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Overall Progress</p>
          <p className={`text-2xl font-bold ${getProgressColor(stats.overallProgress)}`}>
            {Math.round(stats.overallProgress)}%
          </p>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-3 mb-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Hours</span>
            <span className="font-medium">{Math.round(stats.hoursProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${stats.hoursProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, stats.hoursProgress)}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Output Quantity</span>
            <span className="font-medium">{Math.round(stats.qtyProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${stats.qtyProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, stats.qtyProgress)}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Cost</span>
            <span className="font-medium">{Math.round(stats.costProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${stats.costProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, stats.costProgress)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Hours */}
        <div className="space-y-2">
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-gray-600">Hours</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Planned:</span>
              <span className="font-medium">{stats.totalPlannedHours.toFixed(1)}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Used:</span>
              <span className="font-medium">{stats.totalActualHours.toFixed(1)}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Remaining:</span>
              <span className={`font-medium ${stats.remainingHours < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.remainingHours.toFixed(1)}h
              </span>
            </div>
          </div>
        </div>

        {/* Output Quantity */}
        <div className="space-y-2">
          <div className="flex items-center">
            <Target className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-gray-600">Output</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Planned:</span>
              <span className="font-medium">{stats.totalPlannedQty.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Actual:</span>
              <span className="font-medium">{stats.totalActualQty.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Remaining:</span>
              <span className={`font-medium ${stats.remainingQty < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.remainingQty.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Cost */}
        <div className="space-y-2">
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-gray-600">Cost</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Planned:</span>
              <span className="font-medium">{safeFormatCurrency(stats.totalPlannedCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Actual:</span>
              <span className="font-medium">{safeFormatCurrency(stats.totalActualCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Remaining:</span>
              <span className={`font-medium ${stats.remainingCost < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {safeFormatCurrency(stats.remainingCost)}
              </span>
            </div>
          </div>
        </div>

        {/* Variance */}
        <div className="space-y-2">
          <div className="flex items-center">
            {hasOverruns ? (
              <TrendingUp className="h-4 w-4 text-red-600 mr-2" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-600 mr-2" />
            )}
            <span className="text-gray-600">Variance</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Hours:</span>
              <span className={`font-medium ${stats.totalActualHours > stats.totalPlannedHours ? 'text-red-600' : 'text-green-600'}`}>
                {stats.totalActualHours > stats.totalPlannedHours ? '+' : ''}{(stats.totalActualHours - stats.totalPlannedHours).toFixed(1)}h
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Output:</span>
              <span className={`font-medium ${stats.totalActualQty > stats.totalPlannedQty ? 'text-red-600' : 'text-green-600'}`}>
                {stats.totalActualQty > stats.totalPlannedQty ? '+' : ''}{(stats.totalActualQty - stats.totalPlannedQty).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cost:</span>
              <span className={`font-medium ${stats.totalActualCost > stats.totalPlannedCost ? 'text-red-600' : 'text-green-600'}`}>
                {stats.totalActualCost > stats.totalPlannedCost ? '+' : ''}{safeFormatCurrency(stats.totalActualCost - stats.totalPlannedCost)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Overrun Warning */}
      {hasOverruns && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-sm text-red-800 font-medium">Overrun Detected</span>
          </div>
          <p className="text-xs text-red-700 mt-1">
            Actual values exceed planned values. Review and adjust as needed.
          </p>
        </div>
      )}
    </div>
  );
};

export default PlanCard;
