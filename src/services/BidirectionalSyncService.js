// BidirectionalSyncService.js - Comprehensive bidirectional sync between local app and ACC
import AccService from './AccService';

class BidirectionalSyncService {
  constructor() {
    this.accService = new AccService();
    this.syncStatus = {
      isRunning: false,
      lastSync: null,
      errors: []
    };
  }

  // Initialize with credentials
  initialize(credentials) {
    this.accService.initialize(credentials);
  }

  // ===== EXPENSE MANAGEMENT =====

  /**
   * Get expenses from ACC
   * @param {string} containerId - The project container ID
   * @param {Object} options - Query parameters
   * @returns {Promise<Object>} Expenses data
   */
  async getAccExpenses(containerId, options = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (options.offset) queryParams.append('offset', options.offset);
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.sort) queryParams.append('sort', options.sort);
      if (options.include) queryParams.append('include', options.include);
      if (options.filterId) queryParams.append('filter[id]', options.filterId);
      if (options.filterNumber) queryParams.append('filter[number]', options.filterNumber);
      if (options.filterStatus) queryParams.append('filter[status]', options.filterStatus);
      if (options.filterMainContractId) queryParams.append('filter[mainContractId]', options.filterMainContractId);
      if (options.filterBudgetPaymentId) queryParams.append('filter[budgetPaymentId]', options.filterBudgetPaymentId);
      if (options.filterCreatedAt) queryParams.append('filter[createdAt]', options.filterCreatedAt);
      if (options.filterLastModifiedSince) queryParams.append('filter[lastModifiedSince]', options.filterLastModifiedSince);
      if (options.filterExternalSystem) queryParams.append('filter[externalSystem]', options.filterExternalSystem);
      if (options.filterExternalId) queryParams.append('filter[externalId]', options.filterExternalId);

      const url = `${this.accService.baseURL}/cost/v1/containers/${containerId}/expenses?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...this.accService.getHeaders(),
          'region': this.accService.region
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get expenses: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Retrieved ACC Expenses:', data);
      return data;
    } catch (error) {
      console.error('❌ Error getting ACC expenses:', error);
      throw error;
    }
  }

  /**
   * Create expense in ACC
   * @param {string} containerId - The project container ID
   * @param {Object} expenseData - Expense data
   * @returns {Promise<Object>} Created expense data
   */
  async createAccExpense(containerId, expenseData) {
    try {
      const url = `${this.accService.baseURL}/cost/v1/containers/${containerId}/expenses`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.accService.getHeaders(),
          'region': this.accService.region
        },
        body: JSON.stringify(expenseData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create expense: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Created ACC Expense:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creating ACC expense:', error);
      throw error;
    }
  }

  /**
   * Update expense in ACC
   * @param {string} containerId - The project container ID
   * @param {string} expenseId - The expense ID
   * @param {Object} expenseData - Updated expense data
   * @returns {Promise<Object>} Updated expense data
   */
  async updateAccExpense(containerId, expenseId, expenseData) {
    try {
      const url = `${this.accService.baseURL}/cost/v1/containers/${containerId}/expenses/${expenseId}`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          ...this.accService.getHeaders(),
          'region': this.accService.region
        },
        body: JSON.stringify(expenseData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update expense: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Updated ACC Expense:', data);
      return data;
    } catch (error) {
      console.error('❌ Error updating ACC expense:', error);
      throw error;
    }
  }

  /**
   * Delete expense from ACC
   * @param {string} containerId - The project container ID
   * @param {string} expenseId - The expense ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteAccExpense(containerId, expenseId) {
    try {
      const url = `${this.accService.baseURL}/cost/v1/containers/${containerId}/expenses/${expenseId}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          ...this.accService.getHeaders(),
          'region': this.accService.region
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete expense: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log('✅ Deleted ACC Expense:', expenseId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting ACC expense:', error);
      throw error;
    }
  }

  /**
   * Get specific expense from ACC
   * @param {string} containerId - The project container ID
   * @param {string} expenseId - The expense ID
   * @param {Array} include - Resources to include
   * @returns {Promise<Object>} Expense data
   */
  async getAccExpense(containerId, expenseId, include = []) {
    try {
      const queryParams = new URLSearchParams();
      if (include.length > 0) {
        queryParams.append('include', include.join(','));
      }

      const url = `${this.accService.baseURL}/cost/v1/containers/${containerId}/expenses/${expenseId}?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...this.accService.getHeaders(),
          'region': this.accService.region
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get expense: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Retrieved ACC Expense:', data);
      return data;
    } catch (error) {
      console.error('❌ Error getting ACC expense:', error);
      throw error;
    }
  }

  // ===== PERFORMANCE TRACKER MANAGEMENT =====

  /**
   * Get performance tracking items from ACC
   * @param {string} containerId - The project container ID
   * @param {Object} options - Query parameters
   * @returns {Promise<Object>} Performance tracking items data
   */
  async getAccPerformanceTrackingItems(containerId, options = {}) {
    return await this.accService.getPerformanceTrackingItems(containerId, options);
  }

  /**
   * Create performance tracking item in ACC
   * @param {string} containerId - The project container ID
   * @param {string} budgetId - The budget ID
   * @returns {Promise<Object>} Created performance tracking item data
   */
  async createAccPerformanceTrackingItem(containerId, budgetId) {
    return await this.accService.createPerformanceTrackingItem(containerId, budgetId);
  }

  /**
   * Get performance tracking item instances from ACC
   * @param {string} containerId - The project container ID
   * @param {Object} options - Query parameters
   * @returns {Promise<Object>} Performance tracking item instances data
   */
  async getAccPerformanceTrackingItemInstances(containerId, options = {}) {
    return await this.accService.getPerformanceTrackingItemInstances(containerId, options);
  }

  /**
   * Create performance tracking item instance in ACC
   * @param {string} containerId - The project container ID
   * @param {Object} instanceData - Instance data
   * @returns {Promise<Object>} Created performance tracking item instance data
   */
  async createAccPerformanceTrackingItemInstance(containerId, instanceData) {
    return await this.accService.createPerformanceTrackingItemInstance(containerId, instanceData);
  }

  /**
   * Get timesheets from ACC Performance Tracker
   * @param {string} containerId - The project container ID
   * @param {Object} options - Query parameters
   * @returns {Promise<Object>} Timesheets data
   */
  async getAccPerformanceTimesheets(containerId, options = {}) {
    return await this.accService.getPerformanceTimesheets(containerId, options);
  }

  /**
   * Create timesheet in ACC Performance Tracker
   * @param {string} containerId - The project container ID
   * @param {Object} timesheetData - Timesheet data
   * @returns {Promise<Object>} Created timesheet data
   */
  async createAccPerformanceTimesheet(containerId, timesheetData) {
    return await this.accService.createPerformanceTimesheet(containerId, timesheetData);
  }

  // ===== BIDIRECTIONAL SYNC OPERATIONS =====

  /**
   * Sync local timesheet to ACC Performance Tracker
   * @param {string} containerId - The project container ID
   * @param {Object} localTimesheet - Local timesheet data
   * @param {Object} trackingItemInstance - Performance tracking item instance data
   * @returns {Promise<Object>} Sync result
   */
  async syncTimesheetToPerformanceTracker(containerId, localTimesheet, trackingItemInstance) {
    try {
      // Prepare timesheet data for ACC Performance Tracker
      const timesheetData = {
        trackingItemInstanceId: trackingItemInstance.id,
        startDate: localTimesheet.date || localTimesheet.startDate,
        endDate: localTimesheet.date || localTimesheet.endDate,
        inputQuantity: parseFloat(localTimesheet.hours) || 0,
        outputQuantity: parseFloat(localTimesheet.outputUnits) || 0
      };

      // Create timesheet in ACC Performance Tracker
      const accTimesheet = await this.createAccPerformanceTimesheet(containerId, timesheetData);
      
      // Update local timesheet with ACC data
      const updatedTimesheet = {
        ...localTimesheet,
        accTimesheetId: accTimesheet.id,
        syncedToPerformanceTracker: true,
        syncedToPerformanceTrackerAt: new Date().toISOString(),
        trackingItemInstanceId: accTimesheet.trackingItemInstanceId
      };

      console.log('✅ Synced timesheet to Performance Tracker:', accTimesheet);
      return { 
        success: true, 
        accTimesheet, 
        localTimesheet: updatedTimesheet,
        syncType: 'timesheet_to_performance_tracker'
      };
    } catch (error) {
      console.error('❌ Error syncing timesheet to Performance Tracker:', error);
      return { 
        success: false, 
        error: error.message,
        syncType: 'timesheet_to_performance_tracker'
      };
    }
  }

  /**
   * Sync local expense to ACC
   * @param {string} containerId - The project container ID
   * @param {Object} localExpense - Local expense data
   * @returns {Promise<Object>} Sync result
   */
  async syncExpenseToAcc(containerId, localExpense) {
    try {
      // Prepare expense data for ACC
      const expenseData = {
        name: localExpense.name || localExpense.description,
        description: localExpense.description || '',
        amount: localExpense.amount || 0,
        status: 'draft',
        supplierName: localExpense.supplierName || localExpense.companyName || 'Unknown Supplier',
        type: 'expense',
        scope: 'full',
        externalId: localExpense.id,
        externalSystem: 'Zoyantra',
        externalMessage: 'Synced from Zoyantra',
        lastSyncTime: new Date().toISOString(),
        integrationState: 'integrated'
      };

      // Create expense in ACC
      const accExpense = await this.createAccExpense(containerId, expenseData);
      
      // Update local expense with ACC data
      const updatedExpense = {
        ...localExpense,
        accExpenseId: accExpense.id,
        syncedToAcc: true,
        syncedToAccAt: new Date().toISOString(),
        accStatus: accExpense.status
      };

      console.log('✅ Synced expense to ACC:', accExpense);
      return { 
        success: true, 
        accExpense, 
        localExpense: updatedExpense,
        syncType: 'expense_to_acc'
      };
    } catch (error) {
      console.error('❌ Error syncing expense to ACC:', error);
      return { 
        success: false, 
        error: error.message,
        syncType: 'expense_to_acc'
      };
    }
  }

  /**
   * Sync timesheet from ACC Performance Tracker to local
   * @param {string} containerId - The project container ID
   * @param {string} timesheetId - The ACC timesheet ID
   * @returns {Promise<Object>} Sync result
   */
  async syncTimesheetFromPerformanceTracker(containerId, timesheetId) {
    try {
      // Get timesheet from ACC Performance Tracker
      const accTimesheet = await this.accService.getPerformanceTimesheet(containerId, timesheetId);
      
      // Get tracking item instance details
      const trackingItemInstance = await this.accService.getPerformanceTrackingItemInstance(containerId, accTimesheet.trackingItemInstanceId);
      
      // Convert ACC timesheet to local format
      const localTimesheet = {
        id: `acc_${accTimesheet.id}`,
        accTimesheetId: accTimesheet.id,
        projectId: containerId,
        projectName: 'ACC Project',
        taskName: trackingItemInstance.name || 'ACC Task',
        budgetId: trackingItemInstance.budgetId,
        budgetName: trackingItemInstance.budgetCode || 'ACC Budget',
        date: accTimesheet.endDate,
        startDate: accTimesheet.startDate,
        endDate: accTimesheet.endDate,
        hours: accTimesheet.inputQuantity,
        outputUnits: accTimesheet.outputQuantity,
        description: `Synced from ACC Performance Tracker - ${trackingItemInstance.name}`,
        syncedFromPerformanceTracker: true,
        syncedFromPerformanceTrackerAt: new Date().toISOString(),
        trackingItemInstanceId: accTimesheet.trackingItemInstanceId,
        createdAt: accTimesheet.createdAt,
        updatedAt: accTimesheet.updatedAt
      };

      console.log('✅ Synced timesheet from Performance Tracker:', localTimesheet);
      return { 
        success: true, 
        localTimesheet,
        accTimesheet,
        syncType: 'timesheet_from_performance_tracker'
      };
    } catch (error) {
      console.error('❌ Error syncing timesheet from Performance Tracker:', error);
      return { 
        success: false, 
        error: error.message,
        syncType: 'timesheet_from_performance_tracker'
      };
    }
  }

  /**
   * Sync expense from ACC to local
   * @param {string} containerId - The project container ID
   * @param {string} expenseId - The ACC expense ID
   * @returns {Promise<Object>} Sync result
   */
  async syncExpenseFromAcc(containerId, expenseId) {
    try {
      // Get expense from ACC
      const accExpense = await this.getAccExpense(containerId, expenseId);
      
      // Convert ACC expense to local format
      const localExpense = {
        id: `acc_${accExpense.id}`,
        accExpenseId: accExpense.id,
        name: accExpense.name,
        description: accExpense.description || '',
        amount: accExpense.amount || 0,
        status: accExpense.status,
        supplierName: accExpense.supplierName || 'Unknown Supplier',
        syncedFromAcc: true,
        syncedFromAccAt: new Date().toISOString(),
        accStatus: accExpense.status,
        createdAt: accExpense.createdAt,
        updatedAt: accExpense.updatedAt
      };

      console.log('✅ Synced expense from ACC:', localExpense);
      return { 
        success: true, 
        localExpense,
        accExpense,
        syncType: 'expense_from_acc'
      };
    } catch (error) {
      console.error('❌ Error syncing expense from ACC:', error);
      return { 
        success: false, 
        error: error.message,
        syncType: 'expense_from_acc'
      };
    }
  }

  // ===== STATUS MANAGEMENT =====

  /**
   * Update expense status in ACC with delay
   * @param {string} containerId - The project container ID
   * @param {string} expenseId - The expense ID
   * @param {string} status - New status
   * @param {number} delayMs - Delay in milliseconds (default: 10000 for 10 seconds)
   * @returns {Promise<Object>} Update result
   */
  async updateExpenseStatusWithDelay(containerId, expenseId, status = 'approved', delayMs = 10000) {
    try {
      console.log(`⏳ Updating expense status to '${status}' in ${delayMs/1000} seconds...`);
      
      // Wait for the specified delay
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      // Update the expense status
      const updateData = { status };
      const result = await this.updateAccExpense(containerId, expenseId, updateData);
      
      console.log(`✅ Updated expense status to '${status}':`, result);
      return { 
        success: true, 
        result,
        status,
        delayMs
      };
    } catch (error) {
      console.error('❌ Error updating expense status:', error);
      return { 
        success: false, 
        error: error.message,
        status,
        delayMs
      };
    }
  }

  // ===== BULK SYNC OPERATIONS =====

  /**
   * Sync multiple timesheets to Performance Tracker
   * @param {string} containerId - The project container ID
   * @param {Array} timesheets - Array of local timesheets
   * @param {Object} trackingItemInstance - Performance tracking item instance data
   * @returns {Promise<Object>} Bulk sync result
   */
  async bulkSyncTimesheetsToPerformanceTracker(containerId, timesheets, trackingItemInstance) {
    const results = {
      successful: [],
      failed: [],
      total: timesheets.length
    };

    console.log(`🔄 Starting bulk sync of ${timesheets.length} timesheets to Performance Tracker...`);

    for (const timesheet of timesheets) {
      try {
        const result = await this.syncTimesheetToPerformanceTracker(containerId, timesheet, trackingItemInstance);
        if (result.success) {
          results.successful.push(result);
        } else {
          results.failed.push({ timesheet, error: result.error });
        }
      } catch (error) {
        results.failed.push({ timesheet, error: error.message });
      }
    }

    console.log(`✅ Bulk sync completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    return results;
  }

  /**
   * Sync multiple expenses to ACC
   * @param {string} containerId - The project container ID
   * @param {Array} expenses - Array of local expenses
   * @returns {Promise<Object>} Bulk sync result
   */
  async bulkSyncExpensesToAcc(containerId, expenses) {
    const results = {
      successful: [],
      failed: [],
      total: expenses.length
    };

    console.log(`🔄 Starting bulk sync of ${expenses.length} expenses to ACC...`);

    for (const expense of expenses) {
      try {
        const result = await this.syncExpenseToAcc(containerId, expense);
        if (result.success) {
          results.successful.push(result);
        } else {
          results.failed.push({ expense, error: result.error });
        }
      } catch (error) {
        results.failed.push({ expense, error: error.message });
      }
    }

    console.log(`✅ Bulk sync completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    return results;
  }

  // ===== EXPENSE ITEMS MANAGEMENT =====

  /**
   * Get expense items from ACC
   * @param {string} containerId - The project container ID
   * @param {string} expenseId - The expense ID
   * @param {Object} options - Query parameters
   * @returns {Promise<Object>} Expense items data
   */
  async getAccExpenseItems(containerId, expenseId, options = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (options.offset) queryParams.append('offset', options.offset);
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.sort) queryParams.append('sort', options.sort);
      if (options.include) queryParams.append('include', options.include);
      if (options.filterId) queryParams.append('filter[id]', options.filterId);
      if (options.filterLastModifiedSince) queryParams.append('filter[lastModifiedSince]', options.filterLastModifiedSince);
      if (options.filterExternalSystem) queryParams.append('filter[externalSystem]', options.filterExternalSystem);
      if (options.filterExternalId) queryParams.append('filter[externalId]', options.filterExternalId);

      const url = `${this.accService.baseURL}/cost/v1/containers/${containerId}/expenses/${expenseId}/items?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...this.accService.getHeaders(),
          'region': this.accService.region
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get expense items: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Retrieved ACC Expense Items:', data);
      return data;
    } catch (error) {
      console.error('❌ Error getting ACC expense items:', error);
      throw error;
    }
  }

  /**
   * Get specific expense item from ACC
   * @param {string} containerId - The project container ID
   * @param {string} expenseId - The expense ID
   * @param {string} itemId - The expense item ID
   * @param {Array} include - Resources to include
   * @returns {Promise<Object>} Expense item data
   */
  async getAccExpenseItem(containerId, expenseId, itemId, include = []) {
    try {
      const queryParams = new URLSearchParams();
      if (include.length > 0) {
        queryParams.append('include', include.join(','));
      }

      const url = `${this.accService.baseURL}/cost/v1/containers/${containerId}/expenses/${expenseId}/items/${itemId}?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...this.accService.getHeaders(),
          'region': this.accService.region
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get expense item: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Retrieved ACC Expense Item:', data);
      return data;
    } catch (error) {
      console.error('❌ Error getting ACC expense item:', error);
      throw error;
    }
  }

  /**
   * Create expense item in ACC
   * @param {string} containerId - The project container ID
   * @param {string} expenseId - The expense ID
   * @param {Object} itemData - Expense item data
   * @returns {Promise<Object>} Created expense item data
   */
  async createAccExpenseItem(containerId, expenseId, itemData) {
    try {
      const url = `${this.accService.baseURL}/cost/v1/containers/${containerId}/expenses/${expenseId}/items`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.accService.getHeaders(),
          'region': this.accService.region
        },
        body: JSON.stringify(itemData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create expense item: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Created ACC Expense Item:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creating ACC expense item:', error);
      throw error;
    }
  }

  /**
   * Update expense item in ACC
   * @param {string} containerId - The project container ID
   * @param {string} expenseId - The expense ID
   * @param {string} itemId - The expense item ID
   * @param {Object} itemData - Updated expense item data
   * @returns {Promise<Object>} Updated expense item data
   */
  async updateAccExpenseItem(containerId, expenseId, itemId, itemData) {
    try {
      const url = `${this.accService.baseURL}/cost/v1/containers/${containerId}/expenses/${expenseId}/items/${itemId}`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          ...this.accService.getHeaders(),
          'region': this.accService.region
        },
        body: JSON.stringify(itemData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update expense item: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Updated ACC Expense Item:', data);
      return data;
    } catch (error) {
      console.error('❌ Error updating ACC expense item:', error);
      throw error;
    }
  }

  /**
   * Delete expense item from ACC
   * @param {string} containerId - The project container ID
   * @param {string} expenseId - The expense ID
   * @param {string} itemId - The expense item ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteAccExpenseItem(containerId, expenseId, itemId) {
    try {
      const url = `${this.accService.baseURL}/cost/v1/containers/${containerId}/expenses/${expenseId}/items/${itemId}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          ...this.accService.getHeaders(),
          'region': this.accService.region
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete expense item: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log('✅ Deleted ACC Expense Item:', itemId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting ACC expense item:', error);
      throw error;
    }
  }

  // ===== ENHANCED SYNC OPERATIONS =====

  /**
   * Sync timesheet with expense creation and status management
   * @param {string} containerId - The project container ID
   * @param {Object} localTimesheet - Local timesheet data
   * @param {Object} trackingItemInstance - Performance tracking item instance data
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Enhanced sync result
   */
  async syncTimesheetWithExpenseAndStatus(containerId, localTimesheet, trackingItemInstance, options = {}) {
    try {
      const results = {
        timesheetSync: null,
        expenseSync: null,
        statusUpdate: null,
        success: false,
        errors: []
      };

      // Step 1: Sync timesheet to Performance Tracker
      try {
        results.timesheetSync = await this.syncTimesheetToPerformanceTracker(containerId, localTimesheet, trackingItemInstance);
        if (!results.timesheetSync.success) {
          results.errors.push(`Timesheet sync failed: ${results.timesheetSync.error}`);
        }
      } catch (error) {
        results.errors.push(`Timesheet sync error: ${error.message}`);
      }

      // Step 2: Create expense in ACC
      try {
        const expenseData = {
          name: `${localTimesheet.taskName || 'Task'} - ${localTimesheet.userName || 'User'}`,
          description: `Timesheet entry for ${localTimesheet.taskName || 'task'} by ${localTimesheet.userName || 'user'}`,
          amount: localTimesheet.amount || 0,
          status: 'draft',
          supplierName: localTimesheet.companyName || localTimesheet.userName || 'Unknown Supplier',
          type: 'expense',
          scope: 'full',
          externalId: localTimesheet.id,
          externalSystem: 'Zoyantra',
          externalMessage: 'Synced from Zoyantra',
          lastSyncTime: new Date().toISOString(),
          integrationState: 'integrated'
        };

        results.expenseSync = await this.syncExpenseToAcc(containerId, expenseData);
        if (!results.expenseSync.success) {
          results.errors.push(`Expense sync failed: ${results.expenseSync.error}`);
        }
      } catch (error) {
        results.errors.push(`Expense sync error: ${error.message}`);
      }

      // Step 3: Update expense status with delay (if requested)
      if (options.autoApprove && results.expenseSync?.success) {
        try {
          const delayMs = options.approvalDelay || 10000; // Default 10 seconds
          results.statusUpdate = await this.updateExpenseStatusWithDelay(
            containerId, 
            results.expenseSync.accExpense.id, 
            'approved', 
            delayMs
          );
          if (!results.statusUpdate.success) {
            results.errors.push(`Status update failed: ${results.statusUpdate.error}`);
          }
        } catch (error) {
          results.errors.push(`Status update error: ${error.message}`);
        }
      }

      // Determine overall success
      results.success = results.timesheetSync?.success && results.expenseSync?.success && results.errors.length === 0;

      console.log('✅ Enhanced sync completed:', results);
      return results;
    } catch (error) {
      console.error('❌ Error in enhanced sync:', error);
      return { 
        success: false, 
        error: error.message,
        syncType: 'enhanced_sync'
      };
    }
  }

  // ===== SYNC STATUS MANAGEMENT =====

  /**
   * Get sync status
   * @returns {Object} Current sync status
   */
  getSyncStatus() {
    return this.syncStatus;
  }

  /**
   * Set sync status
   * @param {Object} status - New sync status
   */
  setSyncStatus(status) {
    this.syncStatus = { ...this.syncStatus, ...status };
  }

  /**
   * Clear sync errors
   */
  clearSyncErrors() {
    this.syncStatus.errors = [];
  }

  /**
   * Add sync error
   * @param {string} error - Error message
   */
  addSyncError(error) {
    this.syncStatus.errors.push({
      message: error,
      timestamp: new Date().toISOString()
    });
  }
}

export default BidirectionalSyncService;
