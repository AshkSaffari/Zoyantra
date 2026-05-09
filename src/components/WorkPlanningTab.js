import React, { useState, useEffect, useContext } from 'react';
import { 
  Calendar, 
  Clock, 
  Target, 
  BarChart3, 
  Save, 
  RefreshCw, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  DollarSign, 
  Users,
  Building2,
  FileText,
  Activity,
  TrendingUp,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Archive
} from 'lucide-react';
import { AppDataContext } from '../context/AppDataContext';
import AccService from '../services/AccService_old';
import ValidationService from '../services/ValidationService';
import WorkflowService from '../services/WorkflowService';
import { PLAN_STATUS, STATUS_DISPLAY_NAMES, STATUS_COLORS } from '../utils/statusEnums';
import { safeFormatCurrency } from '../utils/numberUtils';

const WorkPlanningTab = ({ selectedProject, selectedHub, credentials }) => {
  const { state, dispatch } = useContext(AppDataContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('plans'); // plans, create, edit
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planFormData, setPlanFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    finishDate: '',
    status: PLAN_STATUS.DRAFT,
    budgetId: '',
    plannedHours: '',
    plannedQty: '',
    crewId: '',
    allowExtraHours: false
  });

  // Load data when project changes
  useEffect(() => {
    if (selectedProject && selectedHub && credentials) {
      loadPlans();
      loadBudgets();
      loadCrews();
    }
  }, [selectedProject, selectedHub, credentials]);

  // Load plans
  const loadPlans = async () => {
    if (!selectedProject) return;
    
    try {
      const storedPlans = localStorage.getItem(`plans_${selectedProject.id}`);
      if (storedPlans) {
        const plansData = JSON.parse(storedPlans);
        dispatch({ type: 'SET_PLANS', payload: plansData });
        console.log('📋 Loaded plans:', plansData.length);
      }
    } catch (error) {
      console.error('❌ Error loading plans:', error);
    }
  };

  // Load crews
  const loadCrews = async () => {
    if (!selectedProject) return;
    
    try {
      const storedCrews = localStorage.getItem(`crews_${selectedProject.id}`);
      if (storedCrews) {
        const crewsData = JSON.parse(storedCrews);
        console.log('👥 Loaded crews:', crewsData.length);
      }
    } catch (error) {
      console.error('❌ Error loading crews:', error);
    }
  };

  // Load budgets
  const loadBudgets = async () => {
    if (!selectedProject || !selectedHub || !credentials) return;

    try {
      console.log('💰 Loading budgets for Work Planning...');
      const fetchedBudgets = await AccService.getBudgets(selectedProject.id, selectedHub.id);
      console.log('💰 Loaded budgets for Work Planning:', fetchedBudgets.length);
      
      // Process budget data exactly like CostManagementTab
      const processedBudgets = fetchedBudgets.map(budget => {
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
          inputHours: safeNumber(budget.inputHours),
          inputQty: safeNumber(budget.inputQty)
        };
      });
      
      dispatch({ type: 'SET_BUDGETS', payload: processedBudgets });
      console.log('💰 Processed budgets for Work Planning:', processedBudgets.length);
    } catch (error) {
      console.error('❌ Error loading budgets for Work Planning:', error);
    }
  };

  // Handle plan form input changes
  const handlePlanInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPlanFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Reset form
  const resetForm = () => {
    setPlanFormData({
      name: '',
      description: '',
      startDate: '',
      finishDate: '',
      status: PLAN_STATUS.DRAFT,
      budgetId: '',
      plannedHours: '',
      plannedQty: '',
      crewId: '',
      allowExtraHours: false
    });
    setEditingPlan(null);
    setShowPlanForm(false);
  };

  // Add new plan
  const handleAddPlan = () => {
    resetForm();
    setShowPlanForm(true);
  };

  // Edit plan
  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanFormData({
      name: plan.name || '',
      description: plan.description || '',
      startDate: plan.startDate || '',
      finishDate: plan.finishDate || '',
      status: plan.status || PLAN_STATUS.DRAFT,
      budgetId: plan.budgetId || '',
      plannedHours: plan.plannedHours || '',
      plannedQty: plan.plannedQty || '',
      crewId: plan.crewId || '',
      allowExtraHours: plan.allowExtraHours || false
    });
    setShowPlanForm(true);
  };

  // Save plan
  const handleSavePlan = () => {
    if (!planFormData.name || !planFormData.startDate || !planFormData.finishDate) {
      alert('Please fill in all required fields');
      return;
    }

    const planData = {
      ...planFormData,
      id: editingPlan ? editingPlan.id : `plan-${Date.now()}`,
      projectId: selectedProject.id,
      createdAt: editingPlan ? editingPlan.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to localStorage
    const updatedPlans = editingPlan 
      ? state.plans.map(p => p.id === editingPlan.id ? planData : p)
      : [...state.plans, planData];
    
    localStorage.setItem(`plans_${selectedProject.id}`, JSON.stringify(updatedPlans));
    dispatch({ type: 'SET_PLANS', payload: updatedPlans });

    resetForm();
  };


  // Delete plan
  const handleDeletePlan = (planId) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      dispatch({ type: 'DELETE_PLAN', payload: planId });
      
      // Update localStorage
      const updatedPlans = state.plans.filter(p => p.id !== planId);
      localStorage.setItem(`plans_${selectedProject.id}`, JSON.stringify(updatedPlans));
    }
  };

  // Archive plan
  const handleArchivePlan = (planId) => {
    if (window.confirm('Are you sure you want to archive this plan?')) {
      dispatch({ type: 'ARCHIVE_PLAN', payload: planId });
      
      // Update localStorage
      const updatedPlans = state.plans.filter(p => p.id !== planId);
      localStorage.setItem(`plans_${selectedProject.id}`, JSON.stringify(updatedPlans));
    }
  };

  // Create timesheet from plan
  const handleCreateTimesheetFromPlan = async (planId) => {
    if (window.confirm('This will archive the plan and create a timesheet. Proceed?')) {
      const result = await WorkflowService.createTimesheetFromPlan(planId, { state, dispatch });
      if (result.success) {
        alert('Timesheet created successfully from plan');
        // Update localStorage
        const updatedPlans = state.plans.filter(p => p.id !== planId);
        localStorage.setItem(`plans_${selectedProject.id}`, JSON.stringify(updatedPlans));
      } else {
        alert(`Error: ${result.error}`);
      }
    }
  };

  // Get plan statistics
  const getPlanStats = () => {
    const totalPlans = state.plans.length;
    const draftPlans = state.plans.filter(p => p.status === PLAN_STATUS.DRAFT).length;
    const approvedPlans = state.plans.filter(p => p.status === PLAN_STATUS.APPROVED).length;
    const archivedPlans = state.archivedPlans.length;
    
    return {
      total: totalPlans,
      draft: draftPlans,
      approved: approvedPlans,
      archived: archivedPlans
    };
  };

  // Get plan lines for a plan
  const getPlanLines = (planId) => {
    return state.planLines.filter(pl => pl.planId === planId);
  };

  // Get status color
  const getStatusColor = (status) => {
    return STATUS_COLORS[status] || 'gray';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            Work Planning
          </h1>
          <p className="text-gray-600 mt-1">Plan and manage project work with task assignments and budget tracking</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="plans">All Plans</option>
            <option value="draft">Draft Plans</option>
            <option value="approved">Approved Plans</option>
            <option value="archived">Archived Plans</option>
          </select>
          <button
            onClick={handleAddPlan}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Plan
          </button>
        </div>
      </div>

      {/* Plan Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <Target className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-blue-600">Total Plans</p>
              <p className="text-2xl font-bold text-blue-900">{getPlanStats().total}</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-yellow-600">Draft</p>
              <p className="text-2xl font-bold text-yellow-900">{getPlanStats().draft}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-green-600">Approved</p>
              <p className="text-2xl font-bold text-green-900">{getPlanStats().approved}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center">
            <Archive className="h-8 w-8 text-gray-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Archived</p>
              <p className="text-2xl font-bold text-gray-900">{getPlanStats().archived}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plans List */}
      {viewMode === 'plans' && (
        <div className="space-y-4">
          {state.plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Calendar className="h-6 w-6 text-blue-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                    <p className="text-sm text-gray-600">{plan.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${getStatusColor(plan.status)}-100 text-${getStatusColor(plan.status)}-800`}>
                    {STATUS_DISPLAY_NAMES[plan.status]}
                  </span>
                  <button
                    onClick={() => handleEditPlan(plan)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Start Date:</span>
                  <p className="font-medium">{plan.startDate}</p>
                </div>
                <div>
                  <span className="text-gray-600">Finish Date:</span>
                  <p className="font-medium">{plan.finishDate}</p>
                </div>
                <div>
                  <span className="text-gray-600">Plan Lines:</span>
                  <p className="font-medium">{getPlanLines(plan.id).length}</p>
                </div>
                <div>
                  <span className="text-gray-600">Created:</span>
                  <p className="font-medium">{new Date(plan.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {plan.status === PLAN_STATUS.APPROVED && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleCreateTimesheetFromPlan(plan.id)}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Create Timesheet
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Plan Form Modal */}
      {showPlanForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingPlan ? 'Edit Plan' : 'Create Plan'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
                <input
                  type="text"
                  name="name"
                  value={planFormData.name}
                  onChange={handlePlanInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={planFormData.description}
                  onChange={handlePlanInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={planFormData.startDate}
                    onChange={handlePlanInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Finish Date *</label>
                  <input
                    type="date"
                    name="finishDate"
                    value={planFormData.finishDate}
                    onChange={handlePlanInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget *</label>
                <select
                  name="budgetId"
                  value={planFormData.budgetId}
                  onChange={handlePlanInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Budget</option>
                  {state.budgets.map(budget => (
                    <option key={budget.id} value={budget.id}>
                      {budget.name} - ${safeFormatCurrency(budget.revised)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours *</label>
                  <input
                    type="number"
                    name="plannedHours"
                    value={planFormData.plannedHours}
                    onChange={handlePlanInputChange}
                    min="0"
                    step="0.25"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Quantity *</label>
                  <input
                    type="number"
                    name="plannedQty"
                    value={planFormData.plannedQty}
                    onChange={handlePlanInputChange}
                    min="0"
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Crew</label>
                <select
                  name="crewId"
                  value={planFormData.crewId}
                  onChange={handlePlanInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Crew</option>
                  {/* Crew options would be loaded from state.crews */}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="allowExtraHours"
                  checked={planFormData.allowExtraHours}
                  onChange={handlePlanInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Allow Extra Hours
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingPlan ? 'Update' : 'Create'} Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkPlanningTab;
