/**
 * Data Sync Service - Bidirectional synchronization between local and ACC
 * Handles data consistency, conflict resolution, and change tracking
 */

import AccService from './AccService';
import AuditService from './AuditService';

class DataSyncService {
  constructor() {
    this.accService = new AccService();
    this.auditService = new AuditService();
    this.syncQueue = [];
    this.isProcessing = false;
    this.conflictResolution = 'acc_priority'; // 'acc_priority', 'local_priority', 'manual'
  }

  /**
   * Initialize the sync service
   */
  initialize(credentials) {
    this.accService.initialize(credentials);
    console.log('🔄 Data Sync Service initialized');
  }

  /**
   * Set conflict resolution strategy
   */
  setConflictResolution(strategy) {
    this.conflictResolution = strategy;
    console.log(`🔄 Conflict resolution set to: ${strategy}`);
  }

  /**
   * Sync all data for a project
   */
  async syncProjectData(projectId, hubId, options = {}) {
    try {
      console.log(`🔄 Starting comprehensive sync for project ${projectId}`);
      
      // Set hub information
      this.accService.hubId = hubId;
      
      const syncResults = {
        projectId,
        hubId,
        timestamp: new Date().toISOString(),
        results: {}
      };

      // Sync budgets
      if (options.syncBudgets !== false) {
        syncResults.results.budgets = await this.syncBudgets(projectId);
      }

      // Sync contracts
      if (options.syncContracts !== false) {
        syncResults.results.contracts = await this.syncContracts(projectId);
      }

      // Sync cost items
      if (options.syncCostItems !== false) {
        syncResults.results.costItems = await this.syncCostItems(projectId);
      }

      // Sync expenses
      if (options.syncExpenses !== false) {
        syncResults.results.expenses = await this.syncExpenses(projectId);
      }

      // Sync performance tracking
      if (options.syncPerformanceTracking !== false) {
        syncResults.results.performanceTracking = await this.syncPerformanceTracking(projectId);
      }

      // Sync timesheets to ACC
      if (options.syncTimesheets !== false) {
        syncResults.results.timesheets = await this.syncTimesheetsToACC(projectId);
      }

      console.log(`✅ Comprehensive sync completed for project ${projectId}`);
      return syncResults;
    } catch (error) {
      console.error(`❌ Error in comprehensive sync for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Sync budgets between local and ACC
   */
  async syncBudgets(projectId) {
    try {
      console.log(`🔄 Syncing budgets for project ${projectId}`);
      
      // Get local budgets
      const localBudgets = JSON.parse(localStorage.getItem('zoyantra_budgets') || '[]')
        .filter(budget => budget.projectId === projectId);

      // Get ACC budgets
      const accBudgets = await this.accService.getProjectBudgets(projectId, {
        include: ['subitems', 'attributes']
      });

      const syncResult = {
        localCount: localBudgets.length,
        accCount: accBudgets.length,
        created: 0,
        updated: 0,
        conflicts: 0
      };

      // Create local budgets in ACC
      for (const localBudget of localBudgets) {
        if (!localBudget.accId) {
          try {
            const accBudget = await this.accService.createBudget(projectId, {
              name: localBudget.name,
              description: localBudget.description,
              quantity: localBudget.quantity || 1,
              unitPrice: localBudget.unitPrice || 0,
              unit: localBudget.unit || 'EA',
              code: localBudget.code || `LOCAL_${Date.now()}`
            });
            
            // Update local budget with ACC ID
            localBudget.accId = accBudget.id;
            localBudget.lastSynced = new Date().toISOString();
            syncResult.created++;
            
            this.auditService.logChange(projectId, 'budget', localBudget.id, 'accId', null, accBudget.id);
          } catch (error) {
            console.error(`❌ Error creating budget in ACC:`, error);
          }
        }
      }

      // Update local storage
      this.updateLocalStorage('zoyantra_budgets', localBudgets, projectId);

      // Merge ACC budgets into local storage
      const mergedBudgets = this.mergeBudgets(localBudgets, accBudgets, projectId);
      this.updateLocalStorage('zoyantra_budgets', mergedBudgets, projectId);

      console.log(`✅ Budget sync completed: ${syncResult.created} created, ${syncResult.updated} updated`);
      return syncResult;
    } catch (error) {
      console.error('❌ Error syncing budgets:', error);
      throw error;
    }
  }

  /**
   * Sync contracts between local and ACC
   */
  async syncContracts(projectId) {
    try {
      console.log(`🔄 Syncing contracts for project ${projectId}`);
      
      // Get ACC contracts
      const accContracts = await this.accService.getProjectContracts(projectId, {
        include: ['budgets', 'scheduleOfValues']
      });

      const syncResult = {
        accCount: accContracts.length,
        updated: 0
      };

      // Update local storage with ACC contracts
      const existingContracts = JSON.parse(localStorage.getItem('zoyantra_contracts') || '[]');
      const otherProjectContracts = existingContracts.filter(contract => contract.projectId !== projectId);
      
      const projectContracts = accContracts.map(contract => ({
        ...contract,
        projectId,
        lastSynced: new Date().toISOString(),
        source: 'acc'
      }));

      const updatedContracts = [...otherProjectContracts, ...projectContracts];
      localStorage.setItem('zoyantra_contracts', JSON.stringify(updatedContracts));

      syncResult.updated = projectContracts.length;
      console.log(`✅ Contract sync completed: ${syncResult.updated} updated`);
      return syncResult;
    } catch (error) {
      console.error('❌ Error syncing contracts:', error);
      throw error;
    }
  }

  /**
   * Sync cost items between local and ACC
   */
  async syncCostItems(projectId) {
    try {
      console.log(`🔄 Syncing cost items for project ${projectId}`);
      
      // Get ACC cost items
      const accCostItems = await this.accService.getProjectCostItems(projectId, {
        include: ['budget', 'changeOrders']
      });

      const syncResult = {
        accCount: accCostItems.length,
        updated: 0
      };

      // Update local storage with ACC cost items
      const existingCostItems = JSON.parse(localStorage.getItem('zoyantra_cost_items') || '[]');
      const otherProjectCostItems = existingCostItems.filter(item => item.projectId !== projectId);
      
      const projectCostItems = accCostItems.map(item => ({
        ...item,
        projectId,
        lastSynced: new Date().toISOString(),
        source: 'acc'
      }));

      const updatedCostItems = [...otherProjectCostItems, ...projectCostItems];
      localStorage.setItem('zoyantra_cost_items', JSON.stringify(updatedCostItems));

      syncResult.updated = projectCostItems.length;
      console.log(`✅ Cost items sync completed: ${syncResult.updated} updated`);
      return syncResult;
    } catch (error) {
      console.error('❌ Error syncing cost items:', error);
      throw error;
    }
  }

  /**
   * Sync expenses between local and ACC
   */
  async syncExpenses(projectId) {
    try {
      console.log(`🔄 Syncing expenses for project ${projectId}`);
      
      // Get local expenses
      const localExpenses = JSON.parse(localStorage.getItem('zoyantra_created_expenses') || '[]')
        .filter(expense => expense.projectId === projectId && !expense.accId);

      // Get ACC expenses
      const accExpenses = await this.accService.getProjectExpenses(projectId, {
        include: ['expenseItems']
      });

      const syncResult = {
        localCount: localExpenses.length,
        accCount: accExpenses.length,
        created: 0,
        updated: 0
      };

      // Create local expenses in ACC
      for (const localExpense of localExpenses) {
        try {
          const accExpense = await this.accService.createExpenseFromTimesheet(
            localExpense.timesheetId,
            localExpense.projectId,
            localExpense.budgetId,
            localExpense.amount,
            localExpense.description
          );
          
          // Update local expense with ACC ID
          localExpense.accId = accExpense.id;
          localExpense.lastSynced = new Date().toISOString();
          syncResult.created++;
          
          this.auditService.logChange(projectId, 'expense', localExpense.id, 'accId', null, accExpense.id);
        } catch (error) {
          console.error(`❌ Error creating expense in ACC:`, error);
        }
      }

      // Update local storage
      this.updateLocalStorage('zoyantra_created_expenses', localExpenses, projectId);

      // Merge ACC expenses into local storage
      const mergedExpenses = this.mergeExpenses(localExpenses, accExpenses, projectId);
      this.updateLocalStorage('zoyantra_created_expenses', mergedExpenses, projectId);

      console.log(`✅ Expense sync completed: ${syncResult.created} created, ${syncResult.updated} updated`);
      return syncResult;
    } catch (error) {
      console.error('❌ Error syncing expenses:', error);
      throw error;
    }
  }

  /**
   * Sync performance tracking data
   */
  async syncPerformanceTracking(projectId) {
    try {
      console.log(`🔄 Syncing performance tracking for project ${projectId}`);
      
      // Get ACC performance tracking
      const accPerformanceTracking = await this.accService.getPerformanceTrackingInstances(projectId, {
        limit: 1000
      });

      const syncResult = {
        accCount: accPerformanceTracking.length,
        updated: 0
      };

      // Update local storage with ACC performance tracking
      const existingPerformanceTracking = JSON.parse(localStorage.getItem('zoyantra_performance_tracking') || '[]');
      const otherProjectPerformanceTracking = existingPerformanceTracking.filter(item => item.projectId !== projectId);
      
      const projectPerformanceTracking = accPerformanceTracking.map(item => ({
        ...item,
        projectId,
        lastSynced: new Date().toISOString(),
        source: 'acc'
      }));

      const updatedPerformanceTracking = [...otherProjectPerformanceTracking, ...projectPerformanceTracking];
      localStorage.setItem('zoyantra_performance_tracking', JSON.stringify(updatedPerformanceTracking));

      syncResult.updated = projectPerformanceTracking.length;
      console.log(`✅ Performance tracking sync completed: ${syncResult.updated} updated`);
      return syncResult;
    } catch (error) {
      console.error('❌ Error syncing performance tracking:', error);
      throw error;
    }
  }

  /**
   * Sync timesheets to ACC
   */
  async syncTimesheetsToACC(projectId) {
    try {
      console.log(`🔄 Syncing timesheets to ACC for project ${projectId}`);
      
      // Get local timesheets that haven't been synced
      const localTimesheets = JSON.parse(localStorage.getItem('zoyantra_timesheets') || '[]')
        .filter(timesheet => 
          timesheet.projectId === projectId && 
          timesheet.status === 'approved' && 
          !timesheet.accSynced
        );

      const syncResult = {
        localCount: localTimesheets.length,
        synced: 0,
        errors: 0
      };

      // Sync each timesheet
      for (const timesheet of localTimesheets) {
        try {
          // Create expense in ACC from timesheet
          const accExpense = await this.accService.createExpenseFromTimesheet(
            timesheet.id,
            projectId,
            timesheet.budgetId,
            timesheet.totalCost,
            `Timesheet: ${timesheet.workDescription}`
          );
          
          // Mark timesheet as synced
          timesheet.accSynced = true;
          timesheet.accExpenseId = accExpense.id;
          timesheet.lastSynced = new Date().toISOString();
          syncResult.synced++;
          
          this.auditService.logChange(projectId, 'timesheet', timesheet.id, 'accSynced', false, true);
        } catch (error) {
          console.error(`❌ Error syncing timesheet ${timesheet.id}:`, error);
          syncResult.errors++;
        }
      }

      // Update local storage
      this.updateLocalStorage('zoyantra_timesheets', localTimesheets, projectId);

      console.log(`✅ Timesheet sync completed: ${syncResult.synced} synced, ${syncResult.errors} errors`);
      return syncResult;
    } catch (error) {
      console.error('❌ Error syncing timesheets:', error);
      throw error;
    }
  }

  /**
   * Merge budgets from local and ACC
   */
  mergeBudgets(localBudgets, accBudgets, projectId) {
    const merged = [...localBudgets];
    
    accBudgets.forEach(accBudget => {
      const existingIndex = merged.findIndex(budget => budget.accId === accBudget.id);
      
      if (existingIndex >= 0) {
        // Update existing budget
        merged[existingIndex] = {
          ...merged[existingIndex],
          ...accBudget,
          projectId,
          lastSynced: new Date().toISOString(),
          source: 'acc'
        };
      } else {
        // Add new budget
        merged.push({
          ...accBudget,
          projectId,
          lastSynced: new Date().toISOString(),
          source: 'acc'
        });
      }
    });

    return merged;
  }

  /**
   * Merge expenses from local and ACC
   */
  mergeExpenses(localExpenses, accExpenses, projectId) {
    const merged = [...localExpenses];
    
    accExpenses.forEach(accExpense => {
      const existingIndex = merged.findIndex(expense => expense.accId === accExpense.id);
      
      if (existingIndex >= 0) {
        // Update existing expense
        merged[existingIndex] = {
          ...merged[existingIndex],
          ...accExpense,
          projectId,
          lastSynced: new Date().toISOString(),
          source: 'acc'
        };
      } else {
        // Add new expense
        merged.push({
          ...accExpense,
          projectId,
          lastSynced: new Date().toISOString(),
          source: 'acc'
        });
      }
    });

    return merged;
  }

  /**
   * Update local storage with merged data
   */
  updateLocalStorage(storageKey, data, projectId) {
    try {
      const existingData = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const otherProjectData = existingData.filter(item => item.projectId !== projectId);
      const updatedData = [...otherProjectData, ...data];
      localStorage.setItem(storageKey, JSON.stringify(updatedData));
    } catch (error) {
      console.error('❌ Error updating local storage:', error);
    }
  }

  /**
   * Get sync status for a project
   */
  getSyncStatus(projectId) {
    const timesheets = JSON.parse(localStorage.getItem('zoyantra_timesheets') || '[]')
      .filter(ts => ts.projectId === projectId);
    
    const expenses = JSON.parse(localStorage.getItem('zoyantra_created_expenses') || '[]')
      .filter(exp => exp.projectId === projectId);

    return {
      projectId,
      timesheets: {
        total: timesheets.length,
        synced: timesheets.filter(ts => ts.accSynced).length,
        pending: timesheets.filter(ts => !ts.accSynced).length
      },
      expenses: {
        total: expenses.length,
        synced: expenses.filter(exp => exp.accId).length,
        pending: expenses.filter(exp => !exp.accId).length
      },
      lastSync: this.getLastSyncTime(projectId)
    };
  }

  /**
   * Get last sync time for a project
   */
  getLastSyncTime(projectId) {
    const timesheets = JSON.parse(localStorage.getItem('zoyantra_timesheets') || '[]')
      .filter(ts => ts.projectId === projectId && ts.lastSynced);
    
    if (timesheets.length === 0) return null;
    
    const lastSyncTimes = timesheets.map(ts => new Date(ts.lastSynced));
    return new Date(Math.max(...lastSyncTimes)).toISOString();
  }

  /**
   * Resolve conflicts between local and ACC data
   */
  resolveConflicts(localData, accData, conflictResolution = this.conflictResolution) {
    switch (conflictResolution) {
      case 'acc_priority':
        return accData;
      case 'local_priority':
        return localData;
      case 'manual':
        // Return both for manual resolution
        return { local: localData, acc: accData };
      default:
        return accData;
    }
  }
}

export default DataSyncService;
