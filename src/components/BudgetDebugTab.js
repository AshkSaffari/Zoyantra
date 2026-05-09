import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, RefreshCw, AlertCircle, CheckCircle, 
  Search, Filter, Download, Eye, EyeOff, Bug
} from 'lucide-react';
import AccService from '../services/AccService_old';

const BudgetDebugTab = ({ 
  selectedProject, 
  selectedHub, 
  projects = [], 
  credentials 
}) => {
  const [budgets, setBudgets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [showDebug, setShowDebug] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(selectedProject?.id || '');
  const [apiCalls, setApiCalls] = useState([]);

  // Load budgets when project changes
  const loadBudgets = useCallback(async (projectId, hubId) => {
    if (!projectId || !hubId || !credentials) {
      setError('Please select a project, hub, and ensure you are authenticated.');
      setBudgets([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setDebugInfo({});
    setApiCalls([]);

    console.log('🔍 Budget Debug - Loading budgets for:', {
      projectId,
      hubId,
      hasCredentials: !!credentials.threeLegToken
    });

    try {
      // Step 1: Check Cost Management availability
      console.log('🔍 Step 1: Checking Cost Management availability...');
      const hasCostManagement = await AccService.checkCostManagementAvailability(projectId, hubId);
      setApiCalls(prev => [...prev, {
        step: 1,
        action: 'Check Cost Management Availability',
        success: hasCostManagement,
        details: hasCostManagement ? 'Cost Management is available' : 'Cost Management not available'
      }]);

      if (!hasCostManagement) {
        setError('Cost Management is not available for this project.');
        setBudgets([]);
        setIsLoading(false);
        return;
      }

      // Step 2: Get project details to find cost container ID
      console.log('🔍 Step 2: Getting project details...');
      const projectUrl = `https://developer.api.autodesk.com/project/v1/hubs/${hubId}/projects/${projectId}`;
      console.log('🔍 Project URL:', projectUrl);

      const projectResponse = await fetch(projectUrl, {
        method: 'GET',
        headers: AccService.getHeaders()
      });

      setApiCalls(prev => [...prev, {
        step: 2,
        action: 'Get Project Details',
        success: projectResponse.ok,
        status: projectResponse.status,
        url: projectUrl,
        details: projectResponse.ok ? 'Project details retrieved' : `Failed with status ${projectResponse.status}`
      }]);

      let costContainerId = projectId; // Default to project ID

      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        console.log('🔍 Project data:', projectData);
        
        if (projectData.data?.relationships?.cost?.data?.id) {
          costContainerId = projectData.data.relationships.cost.data.id;
          console.log('✅ Found cost container ID:', costContainerId);
        } else {
          console.log('⚠️ No cost container ID found, using project ID');
        }
      } else {
        const errorText = await projectResponse.text();
        console.log('❌ Project details failed:', errorText);
      }

      // Step 3: Get hub region
      console.log('🔍 Step 3: Detecting hub region...');
      const selectedHubData = JSON.parse(localStorage.getItem('selectedHub') || '{}');
      const region = selectedHubData.attributes?.region || 'US';
      console.log('🌍 Hub region:', region);

      setApiCalls(prev => [...prev, {
        step: 3,
        action: 'Detect Hub Region',
        success: true,
        region: region,
        details: `Region detected: ${region}`
      }]);

      // Step 4: Call budget API
      console.log('🔍 Step 4: Calling budget API...');
      const budgetUrl = `https://developer.api.autodesk.com/cost/v1/containers/${costContainerId}/budgets`;
      console.log('💰 Budget API URL:', budgetUrl);

      const budgetResponse = await fetch(budgetUrl, {
        method: 'GET',
        headers: {
          ...AccService.getHeaders(),
          'region': region
        }
      });

      setApiCalls(prev => [...prev, {
        step: 4,
        action: 'Call Budget API',
        success: budgetResponse.ok,
        status: budgetResponse.status,
        url: budgetUrl,
        region: region,
        details: budgetResponse.ok ? 'Budget API call successful' : `Failed with status ${budgetResponse.status}`
      }]);

      if (budgetResponse.ok) {
        const budgetData = await budgetResponse.json();
        console.log('💰 Budget API response:', budgetData);
        
        const budgets = budgetData.results || budgetData.data || [];
        console.log(`✅ Found ${budgets.length} budgets`);
        
        setBudgets(budgets);
        setDebugInfo({
          totalBudgets: budgets.length,
          costContainerId,
          region,
          apiUrl: budgetUrl,
          responseData: budgetData
        });
      } else {
        const errorText = await budgetResponse.text();
        console.error('❌ Budget API error:', errorText);
        setError(`Budget API failed: ${budgetResponse.status} - ${errorText}`);
        setBudgets([]);
      }

    } catch (err) {
      console.error('❌ Error loading budgets:', err);
      setError(`Error: ${err.message}`);
      setBudgets([]);
    } finally {
      setIsLoading(false);
    }
  }, [credentials]);

  // Auto-load when component mounts or project changes
  useEffect(() => {
    if (selectedProjectId && selectedHub?.id) {
      loadBudgets(selectedProjectId, selectedHub.id);
    }
  }, [selectedProjectId, selectedHub, loadBudgets]);

  const handleProjectChange = (projectId) => {
    setSelectedProjectId(projectId);
    setBudgets([]);
    setError(null);
  };

  const handleRefresh = () => {
    if (selectedProjectId && selectedHub?.id) {
      loadBudgets(selectedProjectId, selectedHub.id);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Bug className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Budget Debug Tool</h1>
          </div>
          <p className="text-gray-600">
            Debug and test budget API calls for ACC projects. Select a project to see detailed API call information.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.attributes?.name || project.name || 'Unnamed Project'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hub Information
              </label>
              <div className="px-3 py-2 bg-gray-100 rounded-md text-sm">
                {selectedHub ? (
                  <div>
                    <div className="font-medium">{selectedHub.attributes?.name || selectedHub.name}</div>
                    <div className="text-gray-600">Region: {selectedHub.attributes?.region || 'Unknown'}</div>
                  </div>
                ) : (
                  <span className="text-gray-500">No hub selected</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actions
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={isLoading || !selectedProjectId}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  {showDebug ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showDebug ? 'Hide' : 'Show'} Debug
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Information */}
        {showDebug && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">🔍 Debug Information</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-yellow-700 mb-2">API Call Sequence:</h4>
                <div className="space-y-2">
                  {apiCalls.map((call, index) => (
                    <div key={index} className={`p-3 rounded-md border ${
                      call.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Step {call.step}:</span>
                        <span>{call.action}</span>
                        {call.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {call.details}
                        {call.url && <div className="mt-1 font-mono text-xs">{call.url}</div>}
                        {call.status && <div className="mt-1">Status: {call.status}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {Object.keys(debugInfo).length > 0 && (
                <div>
                  <h4 className="font-medium text-yellow-700 mb-2">Debug Details:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Budget Results</h3>
              <div className="flex items-center gap-2">
                {isLoading && <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />}
                {error && <AlertCircle className="h-4 w-4 text-red-600" />}
                {!error && !isLoading && budgets.length > 0 && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            {isLoading && (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600">Loading budgets...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <h4 className="font-medium text-red-800">Error</h4>
                </div>
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {!isLoading && !error && budgets.length === 0 && (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Budgets Found</h3>
                <p className="text-gray-600">
                  No budget data was returned from the ACC Cost Management API.
                </p>
              </div>
            )}

            {!isLoading && !error && budgets.length > 0 && (
              <div>
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Found {budgets.length} budget(s)
                  </h4>
                </div>
                
                <div className="space-y-4">
                  {budgets.map((budget, index) => (
                    <div key={budget.id || index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h5 className="font-medium text-gray-900">{budget.name || 'Unnamed Budget'}</h5>
                          <p className="text-sm text-gray-600">{budget.description || 'No description'}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            ${budget.originalAmount?.toLocaleString() || '0'}
                          </div>
                          <div className="text-sm text-gray-500">Original Amount</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Revised</div>
                          <div className="font-medium">${budget.revised?.toLocaleString() || '0'}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Actual Cost</div>
                          <div className="font-medium">${budget.actualCost?.toLocaleString() || '0'}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Projected Cost</div>
                          <div className="font-medium">${budget.projectedCost?.toLocaleString() || '0'}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Variance</div>
                          <div className={`font-medium ${(budget.varianceTotal || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${budget.varianceTotal?.toLocaleString() || '0'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetDebugTab;
