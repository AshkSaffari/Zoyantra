/**
 * Cost Management Demo Component
 * Demonstrates the deep dive Cost Management API functionality
 */

import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Building2, FileText, RefreshCw } from 'lucide-react';
// import CostManagementService from '../services/CostManagementService';

const CostManagementDemo = ({ selectedProject, selectedHub, credentials }) => {
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [costService, setCostService] = useState(null);

  useEffect(() => {
    if (credentials && selectedHub) {
      // const service = new CostManagementService();
      // service.initialize(credentials);
      // setCostService(service);
      console.log('Cost Management Service initialization skipped - service not available');
    }
  }, [credentials, selectedHub]);

  const loadBudgets = async () => {
    if (!costService || !selectedHub) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🏢 Starting deep dive Cost Management for hub:', selectedHub.id);
      
      // Get all budgets from hub level
      const allBudgets = await costService.getAllBudgetsFromHub(selectedHub.id, {
        include: ['subitems', 'attributes', 'revisions']
      });

      // Get budget summary
      const budgetSummary = await costService.getBudgetSummary(selectedHub.id);

      setBudgets(allBudgets);
      setSummary(budgetSummary);

      console.log('✅ Deep dive complete:', {
        totalBudgets: allBudgets.length,
        summary: budgetSummary
      });

    } catch (err) {
      console.error('❌ Error in deep dive:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getBudgetStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-blue-600 bg-blue-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!selectedHub) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <div className="text-center text-gray-500">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Please select a hub to view Cost Management data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <DollarSign className="h-8 w-8 text-green-600 mr-3" />
              Cost Management Deep Dive
            </h2>
            <p className="text-gray-600 mt-1">
              Hub: {selectedHub.attributes?.name || selectedHub.name}
            </p>
          </div>
          <button
            onClick={loadBudgets}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Loading...' : 'Deep Dive'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-600">
              <p className="font-medium">Error loading budgets</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Budgets</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalBudgets}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summary.totalValue, summary.currency)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FileText className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Revised</p>
                <p className="text-2xl font-bold text-gray-900">{summary.revisedBudgets}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Projects</p>
                <p className="text-2xl font-bold text-gray-900">{summary.projectsWithBudgets}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budgets List */}
      {budgets.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Budgets ({budgets.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {budgets.map((budget, index) => (
              <div key={budget.id || index} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-medium text-gray-900">
                        {budget.revisedName || budget.name}
                      </h4>
                      {budget.isRevised && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Revised
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBudgetStatusColor(budget.status)}`}>
                        {budget.status || 'Active'}
                      </span>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Project:</span>
                        <span className="ml-2 font-medium">{budget.projectName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Container:</span>
                        <span className="ml-2 font-medium">{budget.containerName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Revisions:</span>
                        <span className="ml-2 font-medium">{budget.revisionCount}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(budget.currentValue, budget.currency)}
                    </div>
                    {budget.originalValue !== budget.currentValue && (
                      <div className="text-sm text-gray-500">
                        Original: {formatCurrency(budget.originalValue, budget.currency)}
                      </div>
                    )}
                  </div>
                </div>
                
                {budget.lastModified && (
                  <div className="mt-3 text-xs text-gray-500">
                    Last modified: {new Date(budget.lastModified).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && budgets.length === 0 && !error && (
        <div className="text-center py-12">
          <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Budgets Found</h3>
          <p className="text-gray-500">Click "Deep Dive" to search for budgets in this hub</p>
        </div>
      )}
    </div>
  );
};

export default CostManagementDemo;
