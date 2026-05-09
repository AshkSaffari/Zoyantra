import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Upload, CheckCircle, AlertCircle, Clock, RefreshCw, X, DollarSign, User, Calendar, Target } from 'lucide-react';
import AccService from '../services/AccService';
import LocalTimesheetService from '../services/LocalTimesheetService';

const ExpenseTab = ({ selectedProject, credentials, archivedTimesheets, budgets, members, refreshArchivedTimesheets }) => {
  const [expenseList, setExpenseList] = useState([]);
  const [archivedExpenseList, setArchivedExpenseList] = useState([]);
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState('');
  const [showContractSelection, setShowContractSelection] = useState(false);


  // Load contracts for the project
  const loadContracts = useCallback(async () => {
    if (!selectedProject || !credentials) return;
    
    try {
      console.log('📋 Loading contracts for project:', selectedProject.name);
      console.log('📋 Project ID:', selectedProject.id);
      console.log('📋 Credentials available:', !!credentials);
      
      const projectContracts = await AccService.getMainContracts(selectedProject.id);
      console.log('📋 Raw contracts response:', projectContracts);
      
      setContracts(projectContracts || []);
      console.log('📋 Set contracts in state:', projectContracts?.length || 0);
      console.log('📋 Contracts array:', projectContracts);
    } catch (error) {
      console.error('❌ Error loading contracts:', error);
      console.error('❌ Error details:', error.message);
      setContracts([]);
    }
  }, [selectedProject, credentials]);

  // Load contracts when component mounts
  useEffect(() => {
    if (selectedProject) {
      loadContracts();
    }
  }, [selectedProject, loadContracts]);

  // Load expense data
  const loadExpenseData = useCallback(() => {
    if (!selectedProject) return;

    try {
      console.log('💰 Loading expense data for project:', selectedProject.name);
      
      // Get archived timesheets for this project
      const archivedTimesheetsForProject = archivedTimesheets.filter(timesheet => 
        timesheet.projectId === selectedProject.id
      );
      
      console.log('💰 Found archived timesheets:', archivedTimesheetsForProject.length);

      // Get synced expenses from local storage
      const syncedExpenses = JSON.parse(localStorage.getItem('zoyantra_created_expenses') || '[]')
        .filter(expense => 
          expense.projectId === selectedProject.id && 
          expense.isSynced
        );

      console.log('💰 Found synced expenses:', syncedExpenses.length);

      // Filter out already synced timesheets from active section
      const syncedTimesheetIds = new Set();
      syncedExpenses.forEach(expense => {
        if (expense.timesheetId) {
          syncedTimesheetIds.add(expense.timesheetId);
        }
      });

      // Active expenses: archived timesheets that haven't been synced yet
      const activeExpenses = archivedTimesheetsForProject.filter(timesheet => 
        !syncedTimesheetIds.has(timesheet.id)
      );

      console.log('💰 Active expenses (non-synced):', activeExpenses.length);

      // Convert active expenses to display format
      const expenses = activeExpenses.map(timesheet => {
        // Ensure timesheet has budget information
        if (!timesheet.budgetId) {
          console.warn('⚠️ Timesheet missing budget ID:', timesheet);
          
          // Try to get budget information from the task if available
          if (timesheet.taskId) {
            // Load tasks to find budget information
            const storedTasks = localStorage.getItem('zoyantra_tasks');
            const ganttTasks = localStorage.getItem(`gantt_data_${selectedProject.id}`);
            
            let taskBudgetId = null;
            let taskBudgetName = null;
            
            // Check regular tasks
            if (storedTasks) {
              const tasksData = JSON.parse(storedTasks);
              const task = tasksData.find(t => t.id === timesheet.taskId);
              if (task && task.budgetId) {
                taskBudgetId = task.budgetId;
                taskBudgetName = task.budgetName;
              }
            }
            
            // Check imported tasks
            if (!taskBudgetId && ganttTasks) {
              const importedTasks = JSON.parse(ganttTasks);
              const task = importedTasks.find(t => t.id === timesheet.taskId);
              if (task && task.budgetId) {
                taskBudgetId = task.budgetId;
                taskBudgetName = task.budgetName;
              }
            }
            
            if (taskBudgetId) {
              console.log('🔧 Found budget info from task:', { taskBudgetId, taskBudgetName });
              timesheet.budgetId = taskBudgetId;
              timesheet.budgetName = taskBudgetName;
            }
          }
        }
        
        const budget = budgets.find(b => b.id === timesheet.budgetId);
        
        // Find member name
        let memberName = 'Unknown Member';
        let member = timesheet.memberId ? members.find(m => m.id === timesheet.memberId) : null;
        
        if (member) {
          memberName = member.name || member.displayName || member.email || 'Unknown Member';
        } else if (timesheet.memberName) {
          memberName = timesheet.memberName;
        } else if (timesheet.userName) {
          memberName = timesheet.userName;
        } else if (timesheet.crewName) {
          memberName = timesheet.crewName;
        }
        
        // Calculate amount from timesheet data using user/crew rates
        let calculatedAmount = timesheet.amount || 0;
        const regularHours = parseFloat(timesheet.hours) || 0;
        const extraHours = parseFloat(timesheet.extraHours) || 0;
        let hourlyRate = parseFloat(timesheet.hourlyRate) || 0;
        
        if (calculatedAmount === 0 && timesheet.hours) {
          // If no rate in timesheet, try to get from user/crew rate
          if (hourlyRate === 0) {
            // Try to get rate from member data
            if (timesheet.memberId) {
              const member = members.find(m => m.id === timesheet.memberId);
              if (member && member.rates && member.rates.length > 0) {
                hourlyRate = parseFloat(member.rates[member.rates.length - 1].rate) || 0;
              }
            }
            
            // If still no rate, use average crew rate
            if (hourlyRate === 0) {
              const allMembers = members.filter(m => m.rates && m.rates.length > 0);
              if (allMembers.length > 0) {
                const totalRate = allMembers.reduce((sum, member) => {
                  const memberRate = parseFloat(member.rates[member.rates.length - 1].rate) || 0;
                  return sum + memberRate;
                }, 0);
                hourlyRate = totalRate / allMembers.length;
              }
            }
            
            // Default rate if still no rate found
            if (hourlyRate === 0) {
              hourlyRate = 50; // Default hourly rate
            }
          }
          
          const extraHoursRate = parseFloat(timesheet.extraHoursRate) || (hourlyRate * 1.5);
          
          const regularAmount = regularHours * hourlyRate;
          const extraAmount = extraHours * extraHoursRate;
          calculatedAmount = regularAmount + extraAmount;
        }
                
                return {
          id: timesheet.id,
          name: timesheet.taskName || timesheet.description || 'Unnamed Task',
          description: timesheet.description || '',
          amount: calculatedAmount,
          hours: timesheet.hours || 0,
          hourlyRate: hourlyRate,
          date: timesheet.date,
          memberName: memberName,
          budgetName: timesheet.budgetName || budget?.name || 'Unknown Budget',
          isSynced: timesheet.isSynced || false,
          syncedAt: timesheet.syncedAt,
          status: timesheet.status || 'pending',
          userName: memberName,
          taskName: timesheet.taskName || 'Unknown Task',
          timesheetAmount: calculatedAmount,
          expenseAmount: timesheet.expenseAmount || calculatedAmount,
          budgetId: timesheet.budgetId,
          budgetCode: timesheet.budgetCode
        };
      });
      
      setExpenseList(expenses);
      
      // Process synced expenses for the archived section
      setArchivedExpenseList(syncedExpenses);
      
      console.log('💰 Loaded expenses:', expenses.length);
      console.log('💰 Loaded archived expenses:', syncedExpenses.length);
      
    } catch (error) {
      console.error('❌ Error loading expense data:', error);
      setError('Failed to load expense data');
    }
  }, [selectedProject, archivedTimesheets, budgets, members]);

  // Load expense data when component mounts or dependencies change
  useEffect(() => {
      loadExpenseData();
  }, [loadExpenseData]);

  // Filter expenses based on search term
  const filteredExpenses = useMemo(() => {
    if (!searchTerm) return expenseList;
    
    return expenseList.filter(expense => 
      expense.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.budgetName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [expenseList, searchTerm]);

  // Handle expense selection
  const handleSelectExpense = (expenseId) => {
    setSelectedExpenses(prev => 
      prev.includes(expenseId) 
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    );
  };


  // Create selected expenses
  const createSelectedExpenses = async (contractId = null) => {
    if (selectedExpenses.length === 0) {
      setError('Please select at least one expense to sync');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('💰 Syncing selected expenses:', selectedExpenses.length);
      
      let successCount = 0;
      let errorCount = 0;

      for (const expenseId of selectedExpenses) {
        try {
          const timesheet = expenseList.find(e => e.id === expenseId);
          if (!timesheet) {
            console.error('❌ Timesheet not found:', expenseId);
            errorCount++;
            continue;
          }

          // Ensure timesheet has budget information before syncing
          if (!timesheet.budgetId) {
            console.error('❌ Timesheet missing budget information:', timesheet);
            setError(`Timesheet "${timesheet.taskName || 'Unknown Task'}" is missing budget information. Please assign a budget before syncing.`);
            errorCount++;
            continue;
          }

          console.log('💰 Timesheet budget info for sync:', {
            budgetId: timesheet.budgetId,
            budgetName: timesheet.budgetName,
            budgetCode: timesheet.budgetCode
          });

          // Create expense in ACC
          const result = await AccService.createExpenseFromTimesheet(
            selectedProject.id, 
            timesheet, 
            contractId
          );
          
          console.log('✅ Expense created in ACC:', result);

          // Add a delay to allow ACC to process the expense data
          console.log('⏳ Waiting 2 seconds before attempting approval...');
          await new Promise(resolve => setTimeout(resolve, 2000));

          let approvalStatus = 'synced'; // Default to synced
          try {
            const updateData = {
              status: 'approved',
              budgetId: timesheet.budgetId,
              budgetName: timesheet.budgetName,
              budgetCode: timesheet.budgetCode
            };
            
            console.log('🔄 Attempting to approve expense after delay...', updateData);
            console.log('🔄 Project ID:', selectedProject.id);
            console.log('🔄 Expense ID:', result.expense.id);
            
            const approvalResult = await AccService.updateExpense(selectedProject.id, result.expense.id, updateData);
            console.log('✅ Approval result:', approvalResult);
            
            approvalStatus = 'approved';
            console.log('✅ Expense approved successfully after delay');
          } catch (approvalError) {
            console.warn('⚠️ Could not approve expense after delay:', approvalError.message);
            console.warn('⚠️ Approval error details:', approvalError);
            
            // Show the actual error message to help debug
            setError(`Expense synced but approval failed: ${approvalError.message || 'Unknown error'}`);
            setTimeout(() => setError(null), 5000);
            // Keep as 'synced' if approval fails
          }
          
          console.log('📊 Final approval status for expense:', approvalStatus);
          
          // Archive the timesheet
          try {
            await LocalTimesheetService.archive(timesheet.id);
            console.log('✅ Timesheet archived:', timesheet.id);
            } catch (archiveError) {
            console.warn('⚠️ Could not archive timesheet:', archiveError.message);
            // Continue even if archiving fails
          }


          // Calculate proper amount using user/crew rates
          const regularHours = parseFloat(timesheet.hours) || 0;
          const extraHours = parseFloat(timesheet.extraHours) || 0;
          let hourlyRate = parseFloat(timesheet.hourlyRate) || 0;
          
          // If no rate in timesheet, try to get from user/crew rate
          if (hourlyRate === 0) {
            // Try to get rate from member data
            if (timesheet.memberId) {
              const member = members.find(m => m.id === timesheet.memberId);
              if (member && member.rates && member.rates.length > 0) {
                hourlyRate = parseFloat(member.rates[member.rates.length - 1].rate) || 0;
              }
            }
            
            // If still no rate, use average crew rate
            if (hourlyRate === 0) {
              const allMembers = members.filter(m => m.rates && m.rates.length > 0);
              if (allMembers.length > 0) {
                const totalRate = allMembers.reduce((sum, member) => {
                  const memberRate = parseFloat(member.rates[member.rates.length - 1].rate) || 0;
                  return sum + memberRate;
                }, 0);
                hourlyRate = totalRate / allMembers.length;
              }
            }
            
            // Default rate if still no rate found
            if (hourlyRate === 0) {
              hourlyRate = 50; // Default hourly rate
            }
          }
          
          const extraHoursRate = parseFloat(timesheet.extraHoursRate) || (hourlyRate * 1.5);
          const regularAmount = regularHours * hourlyRate;
          const extraAmount = extraHours * extraHoursRate;
          const calculatedAmount = regularAmount + extraAmount;
          
          // Create expense record in localStorage for archived section
          const expenseRecord = {
            id: `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            projectId: selectedProject.id,
            projectName: selectedProject.name,
            timesheetId: timesheet.id,
            accExpenseId: result.expense.id,
            name: timesheet.taskName || timesheet.name || 'Timesheet Work',
            description: timesheet.description || '',
            amount: calculatedAmount,
            timesheetAmount: timesheet.amount || calculatedAmount,
            expenseAmount: timesheet.expenseAmount || calculatedAmount,
            hours: regularHours,
              extraHours: extraHours,
              hourlyRate: hourlyRate,
            extraHoursRate: extraHoursRate,
            date: timesheet.date,
              memberName: timesheet.memberName || timesheet.userName,
            taskName: timesheet.taskName || 'Unknown Task',
              budgetId: timesheet.budgetId,
            budgetName: timesheet.budgetName,
            budgetCode: timesheet.budgetCode,
            isSynced: true,
              syncedAt: new Date().toISOString(),
            status: approvalStatus,
            contractId: contractId
          };

          // Save expense record to localStorage
          const existingExpenses = JSON.parse(localStorage.getItem('zoyantra_created_expenses') || '[]');
          existingExpenses.push(expenseRecord);
          localStorage.setItem('zoyantra_created_expenses', JSON.stringify(existingExpenses));

            successCount++;
          console.log('✅ Successfully processed expense:', timesheet.taskName);

        } catch (error) {
          console.error('❌ Error processing expense:', error);
          errorCount++;
        }
      }

      // Refresh data
      await loadExpenseData();
        if (refreshArchivedTimesheets) {
        await refreshArchivedTimesheets(selectedProject);
      }

      // Clear selection
      setSelectedExpenses([]);
      setShowContractSelection(false);

      if (successCount > 0) {
        setSuccess(`Successfully synced ${successCount} expenses to ACC. ${errorCount > 0 ? `${errorCount} failed.` : ''}`);
        setTimeout(() => setSuccess(null), 5000);
      }

      if (errorCount > 0 && successCount === 0) {
        setError(`Failed to create any expenses. Please check your ACC connection.`);
        setTimeout(() => setError(null), 5000);
      }

    } catch (error) {
      console.error('❌ Error syncing expenses:', error);
      setError('Failed to sync expenses. Please try again.');
      setTimeout(() => setError(null), 5000);
      } finally {
      setIsLoading(false);
    }
  };

  // Handle sync selected
  const handleSyncSelected = () => {
    if (contracts.length > 0) {
      setShowContractSelection(true);
      } else {
      createSelectedExpenses();
    }
  };

  // Handle contract selection
  const handleContractSelect = () => {
    createSelectedExpenses(selectedContract);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
          if (refreshArchivedTimesheets) {
        await refreshArchivedTimesheets(selectedProject);
      }
      await loadExpenseData();
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      setError('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  // Get task values from archived planners (tasks) for each budget
  const getTaskValuesFromArchivedPlanners = useMemo(() => {
    if (!selectedProject) return {};
    
    try {
      // Load archived tasks from localStorage
      const storedTasks = JSON.parse(localStorage.getItem("zoyantra_tasks") || "[]");
      const projectTasks = storedTasks.filter(task => 
        task.selectedProjectId === selectedProject.id && 
        task.status === 'archived'
      );
      
      console.log('📋 Archived tasks for project:', projectTasks.length);
      
      // Group task values by budget
      const taskValuesByBudget = {};
      projectTasks.forEach(task => {
        const budgetId = task.budgetId;
        if (budgetId) {
          if (!taskValuesByBudget[budgetId]) {
            taskValuesByBudget[budgetId] = {
              budgetName: task.budgetName || 'Unknown Budget',
              totalTaskValue: 0,
              taskCount: 0,
              tasks: []
            };
          }
          
          const taskValue = parseFloat(task.taskValue) || 0;
          taskValuesByBudget[budgetId].totalTaskValue += taskValue;
          taskValuesByBudget[budgetId].taskCount += 1;
          taskValuesByBudget[budgetId].tasks.push({
            id: task.id,
            name: task.taskName,
            taskValue: taskValue
          });
        }
      });
      
      console.log('📋 Task values by budget:', taskValuesByBudget);
      return taskValuesByBudget;
    } catch (error) {
      console.error('❌ Error loading archived tasks:', error);
      return {};
    }
  }, [selectedProject]);

  // Cost comparison data with task values from archived planners
  const costComparisonData = useMemo(() => {
    return archivedExpenseList
      .filter(expense => expense.isSynced)
      .map(expense => {
        // Get task value from archived planners for this budget
        const budgetTaskValue = getTaskValuesFromArchivedPlanners[expense.budgetId]?.totalTaskValue || 0;
        
        return {
          name: expense.taskName || expense.name || `Work by ${expense.memberName || 'Unknown Member'}`,
          taskName: expense.taskName || expense.name || 'Timesheet Work',
          timesheetCost: budgetTaskValue, // Use task value from archived planners
          originalTimesheetCost: parseFloat(expense.timesheetAmount || expense.amount || 0), // Keep original for reference
          expenseCost: parseFloat(expense.expenseAmount || expense.amount || 0),
          difference: parseFloat(expense.expenseAmount || expense.amount || 0) - budgetTaskValue,
          budgetId: expense.budgetId,
          taskValueSource: 'archived_planners'
        };
      });
  }, [archivedExpenseList, getTaskValuesFromArchivedPlanners]);

  const totalTimesheetCost = costComparisonData.reduce((sum, item) => sum + item.timesheetCost, 0);
  const totalExpenseCost = costComparisonData.reduce((sum, item) => sum + item.expenseCost, 0);
  const totalDifference = totalExpenseCost - totalTimesheetCost;

  if (!selectedProject) {
  return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
        <p className="text-gray-500">Please select a project to manage expenses.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Expense Management</h2>
          <p className="text-gray-600">Convert timesheets to expenses and sync to ACC</p>
        </div>
                      <button 
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
                      </button>
                    </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
                    <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
                    >
            <X className="w-4 h-4" />
                    </button>
                  </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800">{success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
      </div>

      {/* Active Expenses */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
                <div>
              <h3 className="text-lg font-semibold text-gray-900">Active Expenses</h3>
              <p className="text-sm text-gray-500">
                Select archived timesheets to sync to ACC (synced expenses appear in Archived section below)
              </p>
      </div>
            {selectedExpenses.length > 0 && (
                      <button
                onClick={handleSyncSelected}
                        disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                Sync Selected ({selectedExpenses.length})
                      </button>
                )}
        </div>
      </div>

        <div className="p-6">
            {filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Expenses</h3>
              <p className="text-gray-500">No archived timesheets available for expense conversion.</p>
        </div>
            ) : (
            <div className="space-y-4">
                {filteredExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                      checked={selectedExpenses.includes(expense.id)}
                      onChange={() => handleSelectExpense(expense.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900">{expense.name}</h4>
                          {expense.description && (
                            <p className="text-sm text-gray-500">{expense.description}</p>
                          )}
            </div>
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-medium">${expense.amount.toFixed(2)}</span>
          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{expense.hours}h</span>
                        </div>
                          <div className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            <span>Budget: {expense.budgetName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{expense.memberName}</span>
                      </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{expense.date}</span>
              </div>
            </div>
        </div>
              </div>
            </div>
                          <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-orange-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Not Synced</span>
                        </div>
                    <p className="text-xs text-gray-500">Use 'Sync Selected' button above to sync this expense</p>
                      </div>
                          </div>
                            ))}
                          </div>
                        )}
                      </div>
                  </div>
                  
      {/* Archived Expenses */}
      {archivedExpenseList.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Archived Expenses</h3>
            <p className="text-sm text-gray-500">Manage synced expenses and change their status</p>
                  </div>
          <div className="p-6">
            <div className="space-y-4">
              {archivedExpenseList.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div className="flex-1">
                    <div className="flex items-center gap-4">
                                  <div>
                        <h4 className="font-medium text-gray-900">{expense.taskName || expense.name}</h4>
                        <p className="text-sm text-gray-500">by {expense.memberName}</p>
                                  </div>
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-medium">${expense.amount.toFixed(2)}</span>
                                </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{expense.hours}h</span>
                                  </div>
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          <span>Budget: {expense.budgetName}</span>
                                </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{expense.date}</span>
                                    </div>
                                  </div>
                                </div>
                                    </div>
                                <div className="flex items-center gap-2">
                    {expense.status === 'synced' && (
                      <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                        ℹ️ Synced to ACC - check status in ACC
                                </div>
                              )}
                    {expense.status === 'approved' && (
                                <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                        <span className="font-medium text-sm">Approved</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              </div>
          </div>
        </div>
      )}

      {/* Cost Comparison Report */}
      {costComparisonData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Cost Comparison Report</h3>
            <p className="text-sm text-gray-500">Compare timesheet costs vs expense costs</p>
                        </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Task Value</h4>
                <p className="text-2xl font-bold text-blue-600">${totalTimesheetCost.toFixed(2)}</p>
                <p className="text-sm text-blue-700 mt-1">From Archived Planners</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Total Expense Cost</h4>
                <p className="text-2xl font-bold text-green-600">${totalExpenseCost.toFixed(2)}</p>
            </div>
              <div className={`p-4 rounded-lg ${totalDifference >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <h4 className={`font-medium mb-2 ${totalDifference >= 0 ? 'text-red-900' : 'text-green-900'}`}>
                  Difference
                </h4>
                <p className={`text-2xl font-bold ${totalDifference >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${totalDifference.toFixed(2)}
                        </p>
                      </div>
                      </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expense Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difference</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {costComparisonData.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium">${item.timesheetCost.toFixed(2)}</span>
                          <span className="text-xs text-gray-500">
                            {item.taskValueSource === 'archived_planners' ? 'From Archived Tasks' : 'From Timesheet'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${item.expenseCost.toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        item.difference >= 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        ${item.difference.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                  </div>
          </div>
        </div>
      )}

      {/* Contract Selection Modal */}
      {showContractSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Main Contract</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose the main contract for syncing {selectedExpenses.length} selected expenses.
            </p>
            
            {contracts.length > 0 ? (
              <div className="space-y-3">
                {contracts.map((contract) => (
                  <label key={contract.id} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="contract"
                      value={contract.id}
                      checked={selectedContract === contract.id}
                      onChange={(e) => setSelectedContract(e.target.value)}
                      className="w-4 h-4 text-pink-600"
                    />
                              <div>
                      <div className="font-medium text-gray-900">{contract.name}</div>
                      <div className="text-sm text-gray-500">{contract.description || 'No description'}</div>
                              </div>
                  </label>
                    ))}
                  </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">No contracts found for this project.</p>
                <p className="text-sm text-gray-400 mt-2">Expenses will be synced without a specific contract.</p>
                <div className="mt-2 text-xs text-gray-400">
                  <p>Debug info:</p>
                  <p>Contracts array length: {contracts.length}</p>
                  <p>Contracts: {JSON.stringify(contracts, null, 2)}</p>
          </div>
        </div>
      )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowContractSelection(false);
                  setSelectedContract('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleContractSelect}
                disabled={isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {contracts.length > 0 ? 'Sync with Contract' : 'Sync without Contract'}
              </button>
            </div>
          </div>
        </div>
      )}
            </div>
  );
};

export default ExpenseTab;
