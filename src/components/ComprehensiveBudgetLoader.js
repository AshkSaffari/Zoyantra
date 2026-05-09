/**
 * Comprehensive Budget Loader
 * Shows progress while loading ALL budgets with pagination
 */

import React, { useState, useEffect } from 'react';
import { DollarSign, RefreshCw, CheckCircle, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react';
import AccService from '../services/AccService';

const ComprehensiveBudgetLoader = ({ selectedProject, selectedHub, onBudgetsLoaded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, page: 0 });
  const [budgets, setBudgets] = useState([]);
  const [error, setError] = useState(null);
  const [loadingStrategy, setLoadingStrategy] = useState('');

  const loadAllBudgets = async () => {
    if (!selectedProject) return;

    setIsLoading(true);
    setError(null);
    setBudgets([]);
    setProgress({ current: 0, total: 0, page: 0 });

    try {
      console.log('🚀 Starting comprehensive budget loading...');
      
      // Initialize AccService
      const credentials = JSON.parse(localStorage.getItem('credentials') || '{}');
      AccService.initialize(credentials);
      
      // Create a custom budget loader with progress tracking
      const allBudgets = await loadBudgetsWithProgress(selectedProject.id);
      
      console.log(`🎯 Comprehensive loading complete: ${allBudgets.length} budgets loaded`);
      
      setBudgets(allBudgets);
      onBudgetsLoaded?.(allBudgets);
      
    } catch (err) {
      console.error('❌ Comprehensive budget loading failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBudgetsWithProgress = async (projectId) => {
    const url = `https://developer.api.autodesk.com/cost/v1/containers/${projectId}/budgets`;
    const allBudgets = [];
    let offset = 0;
    const limit = 200;
    let hasMore = true;
    let page = 0;
    
    setLoadingStrategy('Direct Cost Management API with Pagination');
    
    while (hasMore) {
      page++;
      setProgress({ current: allBudgets.length, total: allBudgets.length + limit, page });
      
      const params = new URLSearchParams();
      params.append('include', 'subitems,attributes,revisions,amount,totalAmount,originalAmount,unitPrice,inputQuantity,quantity');
      params.append('offset', offset.toString());
      params.append('limit', limit.toString());
      params.append('sort', 'name');
      params.append('filter[status]', 'active,pending,approved,rejected');
      
      const fullUrl = `${url}?${params.toString()}`;
      console.log(`🔍 Loading page ${page} (offset: ${offset}, limit: ${limit})`);
      
      try {
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: AccService.getHeaders()
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API failed: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        const pageBudgets = data.results || [];
        
        console.log(`✅ Page ${page} loaded ${pageBudgets.length} budgets`);
        
        if (pageBudgets.length === 0) {
          hasMore = false;
        } else {
          allBudgets.push(...pageBudgets);
          offset += limit;
          
          if (pageBudgets.length < limit) {
            hasMore = false;
          }
        }
        
        // Safety check
        if (offset > 10000) {
          console.log('⚠️ Reached safety limit');
          hasMore = false;
        }
        
      } catch (error) {
        console.error(`❌ Page ${page} failed:`, error);
        throw error;
      }
    }
    
    setProgress({ current: allBudgets.length, total: allBudgets.length, page });
    return allBudgets;
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getBudgetSummary = (budgets) => {
    const totalValue = budgets.reduce((sum, budget) => sum + (budget.amount || budget.totalAmount || budget.originalAmount || 0), 0);
    const revisedCount = budgets.filter(budget => budget.revisions && budget.revisions.length > 0).length;
    const statusBreakdown = budgets.reduce((acc, budget) => {
      const status = budget.status || 'active';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalValue,
      revisedCount,
      statusBreakdown
    };
  };

  if (!selectedProject) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <div className="text-center text-gray-500">
          <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Select a project to load budgets</p>
        </div>
      </div>
    );
  }

  const summary = budgets.length > 0 ? getBudgetSummary(budgets) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <DollarSign className="h-8 w-8 text-green-600 mr-3" />
              Comprehensive Budget Loading
            </h2>
            <p className="text-gray-600 mt-1">
              Project: {selectedProject.name}
            </p>
            {loadingStrategy && (
              <p className="text-sm text-blue-600 mt-1">
                Strategy: {loadingStrategy}
              </p>
            )}
          </div>
          <button
            onClick={loadAllBudgets}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Loading...' : 'Load ALL Budgets'}
          </button>
        </div>
      </div>

      {/* Progress */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Loading Progress</h3>
            <span className="text-sm text-gray-600">
              Page {progress.page} • {progress.current} budgets loaded
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' 
              }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Loading budgets with pagination to ensure we get ALL available budgets...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
            <div>
              <p className="font-medium text-red-800">Error loading budgets</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {budgets.length > 0 && summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Budgets</p>
                <p className="text-2xl font-bold text-gray-900">{budgets.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summary.totalValue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <RefreshCw className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Revised</p>
                <p className="text-2xl font-bold text-gray-900">{summary.revisedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Status Types</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(summary.statusBreakdown).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget List Preview */}
      {budgets.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              All Budgets ({budgets.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {budgets.slice(0, 20).map((budget, index) => (
              <div key={budget.id || index} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">
                      {budget.name || budget.attributes?.name || 'Unnamed Budget'}
                    </h4>
                    <div className="mt-1 text-sm text-gray-500">
                      <span>Status: {budget.status || 'active'}</span>
                      {budget.revisions && budget.revisions.length > 0 && (
                        <span className="ml-4">
                          Revisions: {budget.revisions.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(budget.amount || budget.totalAmount || budget.originalAmount || 0)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {budgets.length > 20 && (
              <div className="p-4 text-center text-gray-500">
                ... and {budgets.length - 20} more budgets
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && budgets.length === 0 && !error && (
        <div className="text-center py-12">
          <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Budgets Loaded</h3>
          <p className="text-gray-500">Click "Load ALL Budgets" to start comprehensive loading</p>
        </div>
      )}
    </div>
  );
};

export default ComprehensiveBudgetLoader;
