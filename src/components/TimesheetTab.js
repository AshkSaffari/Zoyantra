import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  User, 
  Calendar, 
  Save, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  RefreshCw, 
  Plus, 
  Filter, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  DollarSign, 
  BarChart3, 
  FileText, 
  Users, 
  Target,
  Activity,
  TrendingUp,
  Eye,
  EyeOff,
  CalendarDays,
  PlusCircle,
  X
} from 'lucide-react';
import AccService from '../services/AccService_old';
import { safeFormatCurrency, safeParseFloat } from '../utils/numberUtils';

// PlanCard Component
const PlanCard = ({ plan, onCreateTimesheet, remainingHours, remainingOutputQty }) => {
  const percentComplete = plan.plannedHours ? Math.min(((plan.usedHours || 0) / plan.plannedHours) * 100, 100) : 0;
  
  return (
    <div className="p-4 bg-white rounded-2xl shadow-sm border">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="text-sm text-gray-600">Task: {plan.taskName} • Crew: {plan.crewName}</p>
        </div>
        <button 
          className="px-3 py-1 rounded-md text-sm border hover:bg-blue-50" 
          onClick={() => onCreateTimesheet(plan)}
        >
          Create Timesheet
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-500">Planned Hours</div>
          <div className="text-xl font-semibold">{plan.plannedHours?.toFixed(1) || 0}</div>
          <div className="text-sm text-gray-600">Used: {(plan.usedHours || 0).toFixed(1)}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-500">Remaining Hours</div>
          <div className="text-xl font-semibold">{remainingHours.toFixed(1)}</div>
          <div className="text-sm text-gray-600">Remaining Qty: {remainingOutputQty.toFixed(1)}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-500">Progress</div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
            <div 
              className="h-full rounded-full" 
              style={{ 
                width: `${percentComplete}%`, 
                background: percentComplete < 70 ? '#10b981' : percentComplete < 90 ? '#f59e0b' : '#ef4444' 
              }} 
            />
          </div>
          <div className="text-xs mt-1 text-gray-500">{percentComplete.toFixed(1)}% complete</div>
        </div>
      </div>
    </div>
  );
};

// Enhanced TimesheetEntryForm Component with multiple plans support
const TimesheetEntryForm = ({ onAddLine, budgetUnit, selectedPlans = [], plan, timesheetLines = [] }) => {
  const [formData, setFormData] = useState({
    description: '',
    hours: '', // This will be calculated from calendar days
    outputProgress: '',
    budgetOutputUnit: '', // Renamed from outputUnits, fetched from ACC
    actualOutputUnit: '', // New field: calculated from progress × budget unit
    date: new Date().toISOString().split('T')[0],
    planId: selectedPlans.length > 0 ? selectedPlans[0].id : '',
    userId: '',
    comments: ''
  });

  // Calculate total hours from all timesheet lines (calendar days)
  const calculatedHours = timesheetLines.reduce((sum, line) => sum + (line.hours || 0), 0);
  
  // Get budget output unit from plan
  const budgetOutputUnit = plan?.outputQuantity || plan?.quantity || plan?.outputQty || 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.description || !formData.date) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Create entry with calculated values
    const entryData = {
      ...formData,
      hours: calculatedHours,
      budgetOutputUnit: budgetOutputUnit,
      actualOutputUnit: (parseFloat(formData.outputProgress) || 0) / 100 * budgetOutputUnit
    };
    
    onAddLine(entryData);
    setFormData({
      description: '',
      hours: '',
      outputProgress: '',
      budgetOutputUnit: '',
      actualOutputUnit: '',
      date: new Date().toISOString().split('T')[0],
      planId: selectedPlans.length > 0 ? selectedPlans[0].id : '',
      userId: '',
      comments: ''
    });
  };

  return (
    <div className="p-3 bg-gray-50 rounded-lg border mb-4">
      <form onSubmit={handleSubmit} className="grid grid-cols-7 gap-3 items-end">
        <div className="col-span-2">
          <label className="text-xs text-gray-600">Description</label>
          <input 
            value={formData.description} 
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} 
            className="w-full border rounded p-2 text-sm" 
            placeholder="e.g. Excavation work" 
            required
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Hours (Calculated)</label>
          <input 
            type="number" 
            min="0" 
            step="0.25" 
            value={calculatedHours} 
            readOnly
            className="w-full border rounded p-2 text-sm bg-gray-100" 
          />
          <div className="text-xs text-gray-500 mt-1">Sum of all calendar days</div>
        </div>
        <div>
          <label className="text-xs text-gray-600">Output Progress %</label>
          <input 
            type="number" 
            min="0" 
            max="100" 
            step="1" 
            value={formData.outputProgress} 
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              if (value > 100) {
                alert('Output Progress cannot exceed 100%');
                return;
              }
              setFormData(prev => ({ ...prev, outputProgress: value }));
            }} 
            className="w-full border rounded p-2 text-sm" 
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Budget Output Unit</label>
          <input 
            type="number" 
            min="0" 
            step="0.1" 
            value={budgetOutputUnit} 
            readOnly
            className="w-full border rounded p-2 text-sm bg-gray-100" 
          />
          <div className="text-xs text-gray-500 mt-1">From ACC budget</div>
        </div>
        <div>
          <label className="text-xs text-gray-600">Actual Output Unit</label>
          <input 
            type="number" 
            min="0" 
            step="0.1" 
            value={(() => {
              const progress = parseFloat(formData.outputProgress) || 0;
              return (progress / 100) * budgetOutputUnit;
            })()} 
            readOnly
            className="w-full border rounded p-2 text-sm bg-gray-100" 
          />
          <div className="text-xs text-gray-500 mt-1">Progress % × Budget Unit</div>
        </div>
        <div>
          <label className="text-xs text-gray-600">Date</label>
          <input 
            type="date" 
            value={formData.date} 
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))} 
            className="w-full border rounded p-2 text-sm" 
            required
          />
        </div>
        <div className="flex justify-center">
          <button 
            type="submit" 
            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700"
          >
            <PlusCircle size={14}/>Add
          </button>
        </div>
      </form>
    </div>
  );
};

// TimesheetCalendar Component
const TimesheetCalendar = ({ 
  plan, 
  timesheetLines, 
  calendarDays, 
  onAddLine, 
  onSubmit, 
  onCancel, 
  remainingHours, 
  remainingOutputQty,
  adminSettings 
}) => {
  const totalHours = timesheetLines.reduce((sum, line) => sum + line.hours, 0);
  const totalOutputUnits = timesheetLines.reduce((sum, line) => sum + line.outputUnits, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Check if total hours exceed planned hours
    if (totalHours > remainingHours) {
      if (adminSettings.allowExtraHours) {
        const confirmExtra = window.confirm(
          `Total hours (${totalHours.toFixed(1)}) exceed planned hours (${remainingHours.toFixed(1)}). ` +
          `This will create ${(totalHours - remainingHours).toFixed(1)} extra hours. Continue?`
        );
        if (!confirmExtra) return;
      } else {
        alert(`Total hours (${totalHours.toFixed(1)}) cannot exceed planned hours (${remainingHours.toFixed(1)}). Please reduce hours or contact admin to enable extra hours.`);
        return;
      }
    }
    
    // Check if total output units exceed planned output
    if (totalOutputUnits > remainingOutputQty) {
      if (adminSettings.allowExtraHours) {
        const confirmExtra = window.confirm(
          `Total output units (${totalOutputUnits.toFixed(1)}) exceed planned output (${remainingOutputQty.toFixed(1)}). ` +
          `This will create ${(totalOutputUnits - remainingOutputQty).toFixed(1)} extra units. Continue?`
        );
        if (!confirmExtra) return;
      } else {
        alert(`Total output units (${totalOutputUnits.toFixed(1)}) cannot exceed planned output (${remainingOutputQty.toFixed(1)}). Please reduce output or contact admin to enable extra units.`);
        return;
      }
    }
    
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-2xl shadow-sm border">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays size={18} />
        <h4 className="text-md font-semibold">Timesheet Calendar for: {plan.name}</h4>
        <button 
          type="button" 
          onClick={onCancel}
          className="ml-auto text-gray-500 hover:text-gray-700"
        >
          <X size={16} />
        </button>
      </div>
      
      <TimesheetEntryForm 
        onAddLine={onAddLine} 
        budgetUnit={plan.unit} 
        plan={plan}
        timesheetLines={timesheetLines}
      />

      <div className="grid grid-cols-7 gap-2 text-center mb-4">
        {calendarDays.map((day, i) => (
          <div key={i} className="p-2 border rounded-md bg-gray-50">
            <div className="text-xs text-gray-600">{day.date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}</div>
            <div className="text-lg font-semibold">{day.hours.toFixed(1)}</div>
            {day.outputProgress > 0 && (
              <div className="text-xs text-green-600">{day.outputProgress}%</div>
            )}
            {day.outputUnits > 0 && (
              <div className="text-xs text-blue-600">{day.outputUnits.toFixed(1)}</div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
        <div>
          Total: {totalHours.toFixed(1)} hrs • Remaining: {remainingHours.toFixed(1)} hrs
          <br />
          Output: {totalOutputUnits.toFixed(1)} units • Remaining: {remainingOutputQty.toFixed(1)} units
        </div>
        <div className="flex gap-2">
          <button 
            type="button" 
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Submit Timesheet
          </button>
        </div>
      </div>
    </form>
  );
};

const TimesheetTab = ({ 
  selectedProject, 
  selectedHub, 
  projects, 
  members = [], 
  budgets = [], 
  archivedTimesheets = [],
  archivedExpenses = [],
  credentials 
}) => {
  const [timesheets, setTimesheets] = useState([]);
  const [costBudgets, setCostBudgets] = useState([]);
  const [crews, setCrews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [approvalRegistry, setApprovalRegistry] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // list, calendar, summary, plans
  const [selectedTimesheets, setSelectedTimesheets] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [timesheetStats, setTimesheetStats] = useState({});
  const [plans, setPlans] = useState([]);
  const [adminSettings, setAdminSettings] = useState({
    allowExtraHours: false,
    overtimeEnabled: false
  });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPlans, setSelectedPlans] = useState([]); // Multiple plans support
  const [timesheetLines, setTimesheetLines] = useState([]);
  const [calendarDays, setCalendarDays] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [budgetSearchTerm, setBudgetSearchTerm] = useState('');
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);

  // Form data for creating/editing timesheets
  const [formData, setFormData] = useState({
    userId: '',
    crewId: '',
    workType: 'member', // member or crew
    budgetId: '',
    taskId: '',
    planId: '', // New: Plan selection
    date: new Date().toISOString().split('T')[0],
    hours: 0,
    outputProgress: 0, // New: Output progress percentage
    outputUnits: 0, // New: Output units from budget
    description: '',
    extraHours: 0, // New: Extra hours for overtime
    notes: '',
    // Planned values for reference
    plannedHours: 0,
    plannedOutput: 0
  });

  // Load data when project changes
  useEffect(() => {
    if (selectedProject && selectedHub && credentials) {
      loadTimesheets();
      loadTimesheetStats();
      loadPlans();
      loadAdminSettings();
      loadCostBudgets();
      loadCrews();
      loadApprovalRegistry();
    }
  }, [selectedProject, selectedHub, credentials, members]);

  // Load plans from localStorage
  const loadPlans = () => {
    if (!selectedProject) return;
    
    try {
      const plansKey = `plans_${selectedProject.id}`;
      const scoped = JSON.parse(localStorage.getItem(plansKey) || '[]');
      const legacy = JSON.parse(localStorage.getItem('plans') || '[]');
      const data = Array.isArray(scoped) && scoped.length > 0 ? scoped : (Array.isArray(legacy) ? legacy : []);
      setPlans(data);
      console.log('📋 Loaded plans for timesheets:', { plansKey, count: data.length });
    } catch (error) {
      console.error('❌ Error loading plans for timesheets:', error);
      setPlans([]);
    }
  };

  // Close budget dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showBudgetDropdown && !event.target.closest('.budget-dropdown-container')) {
        setShowBudgetDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBudgetDropdown]);

  // Load budgets using the same comprehensive method as CostManagementTab
  const loadCostBudgets = async () => {
    if (!selectedProject || !selectedHub || !credentials) return;

    try {
      console.log('💰 [TimesheetTab] Loading comprehensive cost data for project:', selectedProject.id);
      
      // Load budgets using the enhanced getBudgets method (same as CostManagementTab)
      const budgetsData = await AccService.getBudgets(selectedProject.id, selectedHub.id);
      console.log('💰 [TimesheetTab] Loaded budgets:', budgetsData.length);

      // Process budget data for display with proper numeric conversion (same as CostManagementTab)
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
          updatedAt: budget.updatedAt
        };
      });
      
      setCostBudgets(processedBudgets);
      console.log('✅ [TimesheetTab] Cost data loaded successfully:', {budgets: processedBudgets.length});
    } catch (error) {
      console.error('❌ [TimesheetTab] Failed to load budgets:', error);
      setCostBudgets([]);
    }
  };



  // Load admin settings
  const loadAdminSettings = async () => {
    if (!selectedProject) return;
    
    try {
      const storedSettings = localStorage.getItem(`admin_settings_${selectedProject.id}`);
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        setAdminSettings(settings);
        console.log('⚙️ Loaded admin settings:', settings);
      }
    } catch (error) {
      console.error('❌ Error loading admin settings:', error);
    }
  };

  // Load crews for timesheet creation
  const loadCrews = async () => {
    if (!selectedProject) return;
    
    try {
      const projectKey = selectedProject?.id ? `crews_${selectedProject.id}` : 'crews';
      const scoped = JSON.parse(localStorage.getItem(projectKey) || '[]');
      const legacy = JSON.parse(localStorage.getItem('crews') || '[]');
      const data = Array.isArray(scoped) && scoped.length > 0 ? scoped : (Array.isArray(legacy) ? legacy : []);
      setCrews(data);
      console.log('👥 Loaded crews for timesheets:', { projectKey, count: data.length });
    } catch (error) {
      console.error('❌ Error loading crews for timesheets:', error);
      setCrews([]);
    }
  };

  // Load approval registry
  const loadApprovalRegistry = () => {
    if (!selectedProject) return;
    
    try {
      const registryKey = `timesheet_approval_${selectedProject.id}`;
      const data = JSON.parse(localStorage.getItem(registryKey) || '[]');
      setApprovalRegistry(data);
      console.log('📋 Loaded approval registry:', { registryKey, count: data.length });
    } catch (error) {
      console.error('❌ Error loading approval registry:', error);
      setApprovalRegistry([]);
    }
  };

  // Save timesheet to approval registry
  const saveTimesheetToRegistry = async (timesheetData) => {
    if (!selectedProject) return;
    
    try {
      const registryKey = `timesheet_approval_${selectedProject.id}`;
      const existingRegistry = JSON.parse(localStorage.getItem(registryKey) || '[]');
      
      const registryEntry = {
        ...timesheetData,
        approvalStatus: 'pending',
        submittedAt: new Date().toISOString(),
        submittedBy: credentials.accountId
      };
      
      existingRegistry.push(registryEntry);
      localStorage.setItem(registryKey, JSON.stringify(existingRegistry));
      
      console.log('✅ Timesheet submitted for approval:', registryEntry.id);
      return registryEntry;
    } catch (error) {
      console.error('❌ Error saving to approval registry:', error);
      throw error;
    }
  };

  // Approve timesheet and sync to performance tracker
  const approveTimesheet = async (timesheetId) => {
    if (!selectedProject) return;
    
    try {
      const registryKey = `timesheet_approval_${selectedProject.id}`;
      const existingRegistry = JSON.parse(localStorage.getItem(registryKey) || '[]');
      
      const timesheetIndex = existingRegistry.findIndex(ts => ts.id === timesheetId);
      if (timesheetIndex === -1) return;
      
      // Update approval status
      existingRegistry[timesheetIndex].approvalStatus = 'approved';
      existingRegistry[timesheetIndex].approvedAt = new Date().toISOString();
      existingRegistry[timesheetIndex].approvedBy = credentials.accountId;
      
      // Move to approved timesheets
      const approvedTimesheet = existingRegistry[timesheetIndex];
      const timesheetKey = `timesheets_${selectedProject.id}`;
      const existingTimesheets = JSON.parse(localStorage.getItem(timesheetKey) || '[]');
      existingTimesheets.push(approvedTimesheet);
      localStorage.setItem(timesheetKey, JSON.stringify(existingTimesheets));
      
      // Remove from registry
      existingRegistry.splice(timesheetIndex, 1);
      localStorage.setItem(registryKey, JSON.stringify(existingRegistry));
      
      // Update budget cards by reloading data
      loadCostBudgets();
      loadPlans();
      loadTimesheets();
      loadApprovalRegistry();
      
      console.log('✅ Timesheet approved and synced to performance tracker:', timesheetId);
    } catch (error) {
      console.error('❌ Error approving timesheet:', error);
    }
  };

  // Reject timesheet
  const rejectTimesheet = async (timesheetId, reason) => {
    if (!selectedProject) return;
    
    try {
      const registryKey = `timesheet_approval_${selectedProject.id}`;
      const existingRegistry = JSON.parse(localStorage.getItem(registryKey) || '[]');
      
      const timesheetIndex = existingRegistry.findIndex(ts => ts.id === timesheetId);
      if (timesheetIndex === -1) return;
      
      // Update approval status
      existingRegistry[timesheetIndex].approvalStatus = 'rejected';
      existingRegistry[timesheetIndex].rejectedAt = new Date().toISOString();
      existingRegistry[timesheetIndex].rejectedBy = credentials.accountId;
      existingRegistry[timesheetIndex].rejectionReason = reason;
      
      localStorage.setItem(registryKey, JSON.stringify(existingRegistry));
      loadApprovalRegistry();
      
      console.log('❌ Timesheet rejected:', timesheetId, reason);
    } catch (error) {
      console.error('❌ Error rejecting timesheet:', error);
    }
  };

  // Filter budgets based on search term
  const getFilteredBudgets = () => {
    const budgetList = (costBudgets?.length ? costBudgets : budgets) || [];
    if (!budgetSearchTerm) return budgetList;
    
    return budgetList.filter(budget => 
      budget.name.toLowerCase().includes(budgetSearchTerm.toLowerCase()) ||
      budget.code?.toLowerCase().includes(budgetSearchTerm.toLowerCase()) ||
      budget.description?.toLowerCase().includes(budgetSearchTerm.toLowerCase())
    );
  };

  // Get selected budget name
  const getSelectedBudgetName = () => {
    const budgetList = (costBudgets?.length ? costBudgets : budgets) || [];
    const selected = budgetList.find(b => b.id === formData.budgetId);
    return selected ? selected.name : 'Select Budget';
  };

  // Handle plan selection for timesheet creation
  const handleCreateTimesheetFromPlan = (plan) => {
    setSelectedPlan(plan);
    setTimesheetLines([]);
    
    // Auto-populate form with plan data
    setFormData(prev => ({
      ...prev,
      planId: plan.id,
      budgetId: plan.budgetId || '',
      userId: plan.userId || '',
      crewId: plan.crewId || '',
      workType: plan.workType || 'member',
      hours: plan.plannedHours || 0,
      outputUnits: plan.plannedOutputQty || 0,
      description: plan.description || '',
      // Set planned values for reference
      plannedHours: plan.plannedHours || 0,
      plannedOutput: plan.plannedOutputQty || 0
    }));

    // Auto-populate output units from budget if plan has budget
    if (plan.budgetId) {
      const budgetList = (costBudgets?.length ? costBudgets : budgets) || [];
      const selectedBudget = budgetList.find(b => b.id === plan.budgetId);
      if (selectedBudget) {
        setFormData(prev => ({
          ...prev,
          outputUnits: selectedBudget.unit || selectedBudget.outputUnit || 'units'
        }));
      }
    }
    
    // Initialize calendar days based on plan dates
    const startDate = new Date(plan.startDate || Date.now());
    const endDate = new Date(plan.endDate || Date.now());
    const days = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push({ 
        date: new Date(d), 
        hours: 0,
        outputProgress: 0,
        outputUnits: 0,
        description: ''
      });
    }
    
    setCalendarDays(days);
    console.log('📅 Initialized calendar for plan:', plan.name);
    console.log('📋 Auto-populated form with plan data:', plan);
  };

  // Add timesheet line
  const handleAddTimesheetLine = (line) => {
    if (!line.description || !line.hours || !line.date) {
      setError('Please fill in all required fields');
      return;
    }

    const newLine = {
      id: `line-${Date.now()}`,
      ...line,
      hours: parseFloat(line.hours),
      outputProgress: parseFloat(line.outputProgress || 0),
      outputUnits: parseFloat(line.outputUnits || 0)
    };

    setTimesheetLines(prev => [...prev, newLine]);
    
    // Update calendar day
    const dayIndex = calendarDays.findIndex(d => 
      d.date.toISOString().slice(0, 10) === line.date
    );
    
    if (dayIndex !== -1) {
      const updatedDays = [...calendarDays];
      updatedDays[dayIndex] = {
        ...updatedDays[dayIndex],
        hours: updatedDays[dayIndex].hours + newLine.hours,
        outputProgress: Math.max(updatedDays[dayIndex].outputProgress, newLine.outputProgress),
        outputUnits: updatedDays[dayIndex].outputUnits + newLine.outputUnits,
        description: newLine.description
      };
      setCalendarDays(updatedDays);
    }
  };

  // Calculate remaining hours for plan
  const getRemainingHours = (plan) => {
    const usedHours = timesheetLines.reduce((sum, line) => sum + line.hours, 0);
    return Math.max((plan.plannedHours || 0) - usedHours, 0);
  };

  // Calculate remaining output quantity for plan
  const getRemainingOutputQty = (plan) => {
    const usedQty = timesheetLines.reduce((sum, line) => sum + line.outputUnits, 0);
    return Math.max((plan.plannedOutputQty || 0) - usedQty, 0);
  };

  // Submit timesheet from plan
  const handleSubmitTimesheetFromPlan = async () => {
    if (!selectedPlan) return;

    const totalHours = timesheetLines.reduce((sum, line) => sum + line.hours, 0);
    const remainingHours = getRemainingHours(selectedPlan);
    
    if (totalHours > remainingHours && !adminSettings.allowExtraHours) {
      setError(`Total hours (${totalHours}) exceed remaining planned hours (${remainingHours})`);
      return;
    }

    const timesheetData = {
      id: `ts-${Date.now()}`,
      planId: selectedPlan.id,
      budgetId: selectedPlan.budgetId,
      taskId: selectedPlan.taskId,
      userId: credentials.accountId,
      projectId: selectedProject.id,
      hubId: selectedHub.id,
      startDate: selectedPlan.startDate,
      endDate: selectedPlan.endDate,
      totalHours,
      totalOutputUnits: timesheetLines.reduce((sum, line) => sum + line.outputUnits, 0),
      lines: timesheetLines,
      calendarDays,
      status: 'submitted', // Changed to submitted for approval
      createdAt: new Date().toISOString(),
      createdBy: credentials.accountId,
      submittedAt: new Date().toISOString(),
      approvalStatus: 'pending' // New: Approval workflow
    };

    try {
      // Save to approval registry instead of direct timesheet
      await saveTimesheetToRegistry(timesheetData);
      
      // Update budget cards by reloading data
      loadCostBudgets();
      loadPlans();
      
      setSelectedPlan(null);
      setTimesheetLines([]);
      setCalendarDays([]);
      setError(null);
      
      alert('Timesheet submitted for approval. Budget cards will be updated once approved.');
      console.log('✅ Timesheet submitted for approval:', timesheetData.id);
    } catch (error) {
      setError(`Failed to submit timesheet: ${error.message}`);
    }
  };

  // Load timesheets from ACC or local storage
  const loadTimesheets = async () => {
    if (!selectedProject || !selectedHub || !credentials) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('⏰ Loading timesheets for project:', selectedProject.id);
      
      // Try to load from ACC API first
      let timesheetData = [];
      try {
        timesheetData = await AccService.getProjectTimesheets(selectedProject.id, selectedHub.id);
        console.log('✅ Loaded timesheets from ACC:', timesheetData.length);
      } catch (apiError) {
        console.log('⚠️ ACC API not available, using local storage');
        // Fallback to local storage
        const localTimesheets = localStorage.getItem(`timesheets_${selectedProject.id}`);
        if (localTimesheets) {
          timesheetData = JSON.parse(localTimesheets);
        }
      }

      // Merge with archived timesheets
      const allTimesheets = [...timesheetData, ...archivedTimesheets];
      setTimesheets(allTimesheets);
      
      console.log('✅ Total timesheets loaded:', allTimesheets.length);
    } catch (error) {
      console.error('❌ Error loading timesheets:', error);
      setError(`Failed to load timesheets: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load timesheet statistics
  const loadTimesheetStats = async () => {
    if (!selectedProject || !members || !budgets) return;

    try {
      const stats = {
        totalHours: 0,
        totalCost: 0,
        userCount: 0,
        budgetCount: 0,
        averageHoursPerUser: 0,
        averageCostPerHour: 0,
        completionRate: 0
      };

      // Calculate stats from timesheets
      timesheets.forEach(timesheet => {
        if (timesheet.status === 'approved') {
          stats.totalHours += timesheet.hours || 0;
          stats.totalCost += (timesheet.hours || 0) * (timesheet.hourlyRate || 0);
        }
      });

      // Calculate user and budget counts
      const uniqueUsers = new Set(timesheets.map(t => t.userId).filter(Boolean));
      const uniqueBudgets = new Set(timesheets.map(t => t.budgetId).filter(Boolean));
      
      stats.userCount = uniqueUsers.size;
      stats.budgetCount = uniqueBudgets.size;
      stats.averageHoursPerUser = stats.userCount > 0 ? stats.totalHours / stats.userCount : 0;
      stats.averageCostPerHour = stats.totalHours > 0 ? stats.totalCost / stats.totalHours : 0;
      
      // Calculate completion rate (approved vs total)
      const approvedCount = timesheets.filter(t => t.status === 'approved').length;
      stats.completionRate = timesheets.length > 0 ? (approvedCount / timesheets.length) * 100 : 0;

      setTimesheetStats(stats);
    } catch (error) {
      console.error('❌ Error calculating timesheet stats:', error);
    }
  };

  // Save timesheet to ACC or local storage
  const saveTimesheet = async (timesheetData) => {
    try {
      console.log('💾 Saving timesheet:', timesheetData);
      
      // Try to save to ACC API first
      try {
        const savedTimesheet = await AccService.saveProjectTimesheet(
          selectedProject.id, 
          selectedHub.id, 
          timesheetData
        );
        console.log('✅ Timesheet saved to ACC:', savedTimesheet);
      } catch (apiError) {
        console.log('⚠️ ACC API not available, saving to local storage');
        // Fallback to local storage
        const localTimesheets = JSON.parse(localStorage.getItem(`timesheets_${selectedProject.id}`) || '[]');
        const updatedTimesheets = editingId 
          ? localTimesheets.map(t => t.id === editingId ? { ...timesheetData, id: editingId } : t)
          : [...localTimesheets, { ...timesheetData, id: Date.now().toString() }];
        
        localStorage.setItem(`timesheets_${selectedProject.id}`, JSON.stringify(updatedTimesheets));
      }

      // Refresh timesheets
      await loadTimesheets();
      await loadTimesheetStats();
      
      // Reset form
      resetForm();
      setEditingId(null);
      setIsCreating(false);
      
    } catch (error) {
      console.error('❌ Error saving timesheet:', error);
      setError(`Failed to save timesheet: ${error.message}`);
    }
  };

  // Delete timesheet
  const deleteTimesheet = async (timesheetId) => {
    if (!window.confirm('Are you sure you want to delete this timesheet?')) return;

    try {
      console.log('🗑️ Deleting timesheet:', timesheetId);
      
      // Try to delete from ACC API first
      try {
        await AccService.deleteProjectTimesheet(selectedProject.id, selectedHub.id, timesheetId);
        console.log('✅ Timesheet deleted from ACC');
      } catch (apiError) {
        console.log('⚠️ ACC API not available, deleting from local storage');
        // Fallback to local storage
        const localTimesheets = JSON.parse(localStorage.getItem(`timesheets_${selectedProject.id}`) || '[]');
        const updatedTimesheets = localTimesheets.filter(t => t.id !== timesheetId);
        localStorage.setItem(`timesheets_${selectedProject.id}`, JSON.stringify(updatedTimesheets));
      }

      // Refresh timesheets
      await loadTimesheets();
      await loadTimesheetStats();
      
    } catch (error) {
      console.error('❌ Error deleting timesheet:', error);
      setError(`Failed to delete timesheet: ${error.message}`);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle plan selection and auto-populate budget data
  const handlePlanSelection = (planId) => {
    const selectedPlan = plans.find(p => p.id === planId);
    if (!selectedPlan) return;

    // Get plan lines for the selected plan
    const planLines = JSON.parse(localStorage.getItem(`planLines_${selectedProject.id}`) || '[]')
      .filter(pl => pl.planId === planId);

    if (planLines.length > 0) {
      // Auto-populate with first plan line data
      const firstPlanLine = planLines[0];
      const budget = budgets.find(b => b.id === firstPlanLine.budgetId);
      
      setFormData(prev => ({
        ...prev,
        planId: planId,
        budgetId: firstPlanLine.budgetId,
        taskId: firstPlanLine.taskId,
        // Set the working date to the plan start (user can change later)
        date: selectedPlan.startDate || prev.date,
        // Auto-populate planned quantities from plan
        plannedInputHours: firstPlanLine.plannedHours || 0,
        plannedOutputQty: firstPlanLine.plannedOutputQty || 0,
        // Set budget units
        outputUnits: budget?.unit || 'units'
      }));
    }
  };

  // Compute remaining allowances for a selected plan
  const getPlanStats = (planId) => {
    if (!planId || !selectedProject) return { usedHours: 0, usedOutput: 0 };
    try {
      const key = `timesheets_${selectedProject.id}`;
      const all = JSON.parse(localStorage.getItem(key) || '[]');
      const relevant = all.filter(t => t.planId === planId);
      const usedHours = relevant.reduce((s, t) => s + (parseFloat(t.totalHours || t.hours || 0) || 0), 0);
      const usedOutput = relevant.reduce((s, t) => s + (parseFloat(t.totalOutputUnits || t.outputUnits || 0) || 0), 0);
      return { usedHours, usedOutput };
    } catch (e) {
      console.error('❌ Error computing plan stats:', e);
      return { usedHours: 0, usedOutput: 0 };
    }
  };

  // Get budget info for validation
  const getBudgetInfo = (budgetId) => {
    return budgets.find(b => b.id === budgetId);
  };

  // Validate timesheet entry against budget limits
  const validateTimesheetEntry = () => {
    const budget = getBudgetInfo(formData.budgetId);
    if (!budget) return { isValid: true, errors: [] };

    const errors = [];
    const warnings = [];

    // Check hours against planned input hours
    if (formData.hours > (formData.plannedInputHours || budget.inputHours || 0)) {
      if (adminSettings.allowExtraHours) {
        warnings.push(`Hours (${formData.hours}) exceed planned input hours (${formData.plannedInputHours || budget.inputHours || 0})`);
      } else {
        errors.push(`Hours cannot exceed planned input hours (${formData.plannedInputHours || budget.inputHours || 0})`);
      }
    }

    // Check output units against planned output qty
    if (formData.outputUnits > (formData.plannedOutputQty || budget.inputQty || 0)) {
      if (adminSettings.allowExtraHours) {
        warnings.push(`Output units (${formData.outputUnits}) exceed planned output quantity (${formData.plannedOutputQty || budget.inputQty || 0})`);
      } else {
        errors.push(`Output units cannot exceed planned output quantity (${formData.plannedOutputQty || budget.inputQty || 0})`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.budgetId || !formData.date || formData.hours <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate work type specific fields
    if (formData.workType === 'member' && !formData.userId) {
      setError('Please select a user for individual member timesheet');
      return;
    }

    if (formData.workType === 'crew' && !formData.crewId) {
      setError('Please select a crew for crew timesheet');
      return;
    }

    // If a plan is selected, enforce remaining allowances
    if (formData.planId) {
      const plan = plans.find(p => p.id === formData.planId);
      const stats = getPlanStats(formData.planId);
      const plannedHours = parseFloat(plan?.plannedHours || 0) || 0;
      const plannedOutput = parseFloat(plan?.plannedOutputQty || 0) || 0;
      const remainingHours = Math.max(0, plannedHours - stats.usedHours);
      const remainingOutput = Math.max(0, plannedOutput - stats.usedOutput);

      // hours line cannot exceed remaining hours
      if (parseFloat(formData.hours || 0) > remainingHours && !adminSettings.allowExtraHours) {
        setError(`Hours exceed remaining plan hours. Remaining: ${remainingHours}`);
        return;
      }
      // If user enters output units (optional), clamp to remaining
      if (parseFloat(formData.outputUnits || 0) > remainingOutput && !adminSettings.allowExtraHours) {
        setError(`Output units exceed remaining plan output. Remaining: ${remainingOutput}`);
        return;
      }
    }

    // Validate against budget limits
    const validation = validateTimesheetEntry();
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      const proceed = window.confirm(`${validation.warnings.join(', ')}\n\nDo you want to proceed?`);
      if (!proceed) return;
    }

    // Calculate total cost (using budget unit price if available)
    const budget = getBudgetInfo(formData.budgetId);
    const unitPrice = budget?.unitPrice || 0;
    const totalCost = formData.hours * unitPrice;
    
    const timesheetData = {
      ...formData,
      projectId: selectedProject.id,
      hubId: selectedHub.id,
      totalCost,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveTimesheet(timesheetData);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      userId: '',
      crewId: '',
      workType: 'member', // member or crew
      budgetId: '',
      taskId: '',
      planId: '', // New: Plan selection
      date: new Date().toISOString().split('T')[0],
      hours: 0,
      outputProgress: 0, // New: Output progress percentage
      outputUnits: 0, // New: Output units from budget
      description: '',
      extraHours: 0, // New: Extra hours for overtime
      notes: '',
      // Planned values for reference
      plannedHours: 0,
      plannedOutput: 0
    });
  };

  // Start editing
  const startEditing = (timesheet) => {
    setFormData({
      userId: timesheet.userId || '',
      crewId: timesheet.crewId || '',
      workType: timesheet.workType || 'member',
      budgetId: timesheet.budgetId || '',
      taskId: timesheet.taskId || '',
      planId: timesheet.planId || '',
      date: timesheet.date || '',
      hours: timesheet.hours || 0,
      outputProgress: timesheet.outputProgress || 0,
      outputUnits: timesheet.outputUnits || 0,
      description: timesheet.description || '',
      extraHours: timesheet.extraHours || 0,
      notes: timesheet.notes || ''
    });
    setEditingId(timesheet.id);
    setIsCreating(true);
  };

  // Cancel editing
  const cancelEditing = () => {
    resetForm();
    setEditingId(null);
    setIsCreating(false);
  };

  // Get filtered timesheets
  const getFilteredTimesheets = () => {
    let filtered = timesheets;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    // Filter by user
    if (selectedUser) {
      filtered = filtered.filter(t => t.userId === selectedUser);
    }

    // Filter by budget
    if (selectedBudget) {
      filtered = filtered.filter(t => t.budgetId === selectedBudget);
    }

    // Filter by date range
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(t => {
        const timesheetDate = new Date(t.date);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return timesheetDate >= startDate && timesheetDate <= endDate;
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter archived
    if (!showArchived) {
      filtered = filtered.filter(t => !t.archived);
    }

    return filtered;
  };

  // Get user/crew name by ID
  const getUserName = (userId, workType = 'member', crewId = null) => {
    if (workType === 'crew' && crewId) {
      const crew = crews.find(c => c.id === crewId);
      return crew ? (crew.name || crew.crewName) : 'Unknown Crew';
    } else {
      const user = members.find(m => m.id === userId);
      return user ? user.name : 'Unknown User';
    }
  };

  // Get budget name by ID
  const getBudgetName = (budgetId) => {
    const budget = budgets.find(b => b.id === budgetId);
    return budget ? budget.name : 'Unknown Budget';
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-100';
      case 'submitted': return 'text-blue-600 bg-blue-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredTimesheets = getFilteredTimesheets();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Clock className="w-6 h-6 text-blue-600" />
          Timesheets Module
        </h2>
        <p className="text-gray-600">
          Time tracking and management with real project users and budget integration.
        </p>
      </div>

      {/* Plan-based Timesheet Creation */}
      {!selectedPlan && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Timesheet from Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(plan => (
              <PlanCard 
                key={plan.id} 
                plan={plan} 
                onCreateTimesheet={handleCreateTimesheetFromPlan}
                remainingHours={getRemainingHours(plan)}
                remainingOutputQty={getRemainingOutputQty(plan)}
              />
            ))}
          </div>
          {plans.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CalendarDays className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No plans available. Create a plan first to generate timesheets.</p>
            </div>
          )}
        </div>
      )}

      {/* Timesheet Calendar for Selected Plan */}
      {selectedPlan && (
        <div className="mb-8">
          <TimesheetCalendar 
            plan={selectedPlan}
            timesheetLines={timesheetLines}
            calendarDays={calendarDays}
            onAddLine={handleAddTimesheetLine}
            onSubmit={handleSubmitTimesheetFromPlan}
            onCancel={() => setSelectedPlan(null)}
            remainingHours={getRemainingHours(selectedPlan)}
            remainingOutputQty={getRemainingOutputQty(selectedPlan)}
            adminSettings={adminSettings}
          />
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-blue-600">{(() => {
                const totalHours = timesheets.reduce((sum, ts) => sum + (ts.totalHours || ts.hours || 0), 0);
                return totalHours.toFixed(1);
              })()}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-green-600">${(() => {
                const budgetList = (costBudgets?.length ? costBudgets : budgets) || [];
                const totalBudget = budgetList.reduce((sum, budget) => {
                  const amount = parseFloat(budget.revised || budget.originalAmount || budget.amount || 0) || 0;
                  return sum + amount;
                }, 0);
                return totalBudget.toLocaleString();
              })()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-purple-600">{(() => {
                const totalUsers = members.length + crews.length;
                return totalUsers;
              })()}</p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-orange-600">{(() => {
                const totalPlannedHours = plans.reduce((sum, plan) => sum + (plan.plannedHours || 0), 0);
                const totalActualHours = timesheets.reduce((sum, ts) => sum + (ts.totalHours || ts.hours || 0), 0);
                const completionRate = totalPlannedHours > 0 ? (totalActualHours / totalPlannedHours) * 100 : 0;
                return Math.min(100, completionRate).toFixed(1);
              })()}%</p>
            </div>
            <Target className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Approval Registry */}
      {approvalRegistry.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="w-5 h-5 text-orange-500 mr-2" />
            Timesheet Approval Registry ({approvalRegistry.length})
          </h3>
          <div className="space-y-4">
            {approvalRegistry.map((timesheet) => (
              <div key={timesheet.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{timesheet.planName || 'Timesheet'}</h4>
                      <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                        Pending Approval
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Total Hours:</span>
                        <span className="ml-1">{timesheet.totalHours?.toFixed(1) || 0}h</span>
                      </div>
                      <div>
                        <span className="font-medium">Output Units:</span>
                        <span className="ml-1">{timesheet.totalOutputUnits?.toFixed(1) || 0}</span>
                      </div>
                      <div>
                        <span className="font-medium">Submitted:</span>
                        <span className="ml-1">{new Date(timesheet.submittedAt).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="font-medium">Plan:</span>
                        <span className="ml-1">{timesheet.planName || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => approveTimesheet(timesheet.id)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Rejection reason:');
                        if (reason) rejectTimesheet(timesheet.id, reason);
                      }}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Timesheet
            </button>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">View:</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="list">List</option>
                <option value="calendar">Calendar</option>
                <option value="summary">Summary</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search timesheets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={() => { loadTimesheets(); loadTimesheetStats(); loadCostBudgets(); loadPlans(); loadAdminSettings(); }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Timesheet' : 'Create New Timesheet'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan
                </label>
                <select
                  name="planId"
                  value={formData.planId}
                  onChange={(e) => { handlePlanSelection(e.target.value); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Plan (optional)</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative budget-dropdown-container">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search budgets..."
                    value={budgetSearchTerm}
                    onChange={(e) => {
                      setBudgetSearchTerm(e.target.value);
                      setShowBudgetDropdown(true);
                    }}
                    onFocus={() => setShowBudgetDropdown(true)}
                    className="w-full p-2 border rounded-lg pr-8"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  
                  {showBudgetDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2">
                        <div className="text-xs text-gray-500 mb-2">
                          {getFilteredBudgets().length} budgets found
                        </div>
                        {getFilteredBudgets().slice(0, 10).map(budget => (
                          <div
                            key={budget.id}
                            onClick={() => {
                              setFormData(prev => ({ 
                                ...prev, 
                                budgetId: budget.id,
                                // Auto-populate output units from budget
                                outputUnits: budget.unit || budget.outputUnit || 'units'
                              }));
                              setBudgetSearchTerm(budget.name);
                              setShowBudgetDropdown(false);
                            }}
                            className="p-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                          >
                            <div className="font-medium text-gray-900">{budget.name}</div>
                            <div className="text-xs text-gray-500">
                              {budget.code && `${budget.code} • `}
                              ${(budget.revised || budget.originalAmount || 0).toLocaleString()}
                              {budget.unit && ` • ${budget.unit}`}
                            </div>
                          </div>
                        ))}
                        {getFilteredBudgets().length === 0 && (
                          <div className="p-2 text-sm text-gray-500">No budgets found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Selected Budget Display */}
                {formData.budgetId && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                    <div className="font-medium text-blue-900">{getSelectedBudgetName()}</div>
                    <div className="text-xs text-blue-600">
                      {(() => {
                        const selected = (costBudgets?.length ? costBudgets : budgets).find(b => b.id === formData.budgetId);
                        return selected ? `$${(selected.revised || selected.originalAmount || 0).toLocaleString()}` : '';
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Type *
                </label>
                <select
                  name="workType"
                  value={formData.workType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="member">Individual Member</option>
                  <option value="crew">Crew</option>
                </select>
              </div>

              {formData.workType === 'member' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User *
                  </label>
                  <select
                    name="userId"
                    value={formData.userId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select User</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.workType === 'crew' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Crew *
                  </label>
                  <select
                    name="crewId"
                    value={formData.crewId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Crew</option>
                    {crews.map(crew => (
                      <option key={crew.id} value={crew.id}>
                        {crew.name || crew.crewName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recorded Hours *
                </label>
                <input
                  type="number"
                  name="hours"
                  value={formData.hours}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    // Get budget input quantity for validation
                    const budgetList = (costBudgets?.length ? costBudgets : budgets) || [];
                    const selectedBudget = budgetList.find(b => b.id === formData.budgetId);
                    const budgetInput = parseFloat(selectedBudget?.inputQuantity || selectedBudget?.inputQty || selectedBudget?.inputHours || 0) || 0;
                    
                    if (value > budgetInput) {
                      alert(`Hours cannot exceed budget input quantity (${budgetInput.toFixed(1)} hours)`);
                      return;
                    }
                    setFormData(prev => ({ ...prev, hours: value }));
                  }}
                  min="0"
                  step="0.25"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formData.plannedHours > 0 && (
                  <div className="mt-1 text-xs text-gray-500">
                    Planned: {formData.plannedHours} hours
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Output Progress %
                </label>
                <input
                  type="number"
                  name="outputProgress"
                  value={formData.outputProgress}
                  onChange={(e) => {
                    const progress = parseFloat(e.target.value) || 0;
                    
                    // Validate percentage cannot exceed 100%
                    if (progress > 100) {
                      alert('Output Progress cannot exceed 100%');
                      return;
                    }
                    
                    setFormData(prev => {
                      // Calculate output units based on progress and budget output
                      const budgetList = (costBudgets?.length ? costBudgets : budgets) || [];
                      const selectedBudget = budgetList.find(b => b.id === prev.budgetId);
                      const budgetOutput = parseFloat(selectedBudget?.outputQuantity || selectedBudget?.quantity || selectedBudget?.outputQty || 0) || 0;
                      const calculatedOutputUnits = (progress / 100) * budgetOutput;
                      
                      return { 
                        ...prev, 
                        outputProgress: progress,
                        outputUnits: calculatedOutputUnits
                      };
                    });
                  }}
                  min="0"
                  max="100"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formData.outputProgress > 0 && (
                  <div className="mt-1 text-xs text-blue-600">
                    Auto-calculating output units based on {formData.outputProgress}% progress
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recorded Output Qty {(() => {
                    const budgetList = (costBudgets?.length ? costBudgets : budgets) || [];
                    const selectedBudget = budgetList.find(b => b.id === formData.budgetId);
                    const unit = selectedBudget?.unit || selectedBudget?.outputUnit || 'units';
                    return `(${unit})`;
                  })()}
                </label>
                <input
                  type="number"
                  name="outputUnits"
                  value={formData.outputUnits}
                  onChange={handleInputChange}
                  min="0"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formData.plannedOutput > 0 && (
                  <div className="mt-1 text-xs text-gray-500">
                    Planned: {formData.plannedOutput} {(() => {
                      const budgetList = (costBudgets?.length ? costBudgets : budgets) || [];
                      const selectedBudget = budgetList.find(b => b.id === formData.budgetId);
                      return selectedBudget?.unit || selectedBudget?.outputUnit || 'units';
                    })()}
                  </div>
                )}
                {formData.outputProgress > 0 && (
                  <div className="mt-1 text-xs text-green-600">
                    Auto-calculated: {formData.outputUnits.toFixed(1)} units ({formData.outputProgress}% of budget)
                  </div>
                )}
              </div>
              
              
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the work performed..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes..."
              />
            </div>
            
            
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Update Timesheet' : 'Create Timesheet'}
              </button>
              
              <button
                type="button"
                onClick={cancelEditing}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Timesheets List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Timesheets ({filteredTimesheets.length})
          </h3>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
            <span className="text-gray-600">Loading timesheets...</span>
          </div>
        ) : filteredTimesheets.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-lg">No timesheets found</p>
            <p className="text-gray-400">Create your first timesheet to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Output Units
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTimesheets.map(timesheet => (
                  <tr key={timesheet.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {getUserName(timesheet.userId, timesheet.workType, timesheet.crewId)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(timesheet.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {timesheet.hours} hrs
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {timesheet.outputUnits || 0} units
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(timesheet.status)}`}>
                        {timesheet.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {timesheet.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditing(timesheet)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTimesheet(timesheet.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

export default TimesheetTab;
