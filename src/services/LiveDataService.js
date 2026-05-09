/**
 * Live Data Service - Real-time synchronization with ACC
 * Handles live data fetching, caching, and change detection
 */

import AccService from './AccService';
import AuditService from './AuditService';

class LiveDataService {
  constructor() {
    this.accService = new AccService();
    this.auditService = new AuditService();
    this.syncIntervals = new Map();
    this.lastSyncTimes = new Map();
    this.dataCache = new Map();
    this.changeListeners = new Map();
    this.isInitialized = false;
    this.failedValidations = new Map(); // Track failed validations to prevent infinite loops
  }

  /**
   * Initialize the live data service
   */
  initialize(credentials) {
    try {
      this.accService.initialize(credentials);
      this.isInitialized = true;
      console.log('🔄 Live Data Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Live Data Service:', error);
      throw error;
    }
  }

  /**
   * Start live data synchronization for a project
   */
  startLiveSync(projectId, hubId, syncInterval = 3600000) { // 1 hour default instead of every 30 seconds
    if (!this.isInitialized) {
      throw new Error('Live Data Service not initialized');
    }

    const syncKey = `${projectId}_${hubId}`;
    
    // Clear existing sync if any
    this.stopLiveSync(projectId, hubId);

    console.log(`🔄 Starting live sync for project ${projectId} (${syncInterval}ms interval)`);
    
    // Initial sync
    this.performFullSync(projectId, hubId);

    // Set up interval
    const intervalId = setInterval(() => {
      this.performIncrementalSync(projectId, hubId);
    }, syncInterval);

    this.syncIntervals.set(syncKey, intervalId);
    this.lastSyncTimes.set(syncKey, new Date().toISOString());
  }

  /**
   * Stop live data synchronization for a project
   */
  stopLiveSync(projectId, hubId) {
    const syncKey = `${projectId}_${hubId}`;
    const intervalId = this.syncIntervals.get(syncKey);
    
    if (intervalId) {
      clearInterval(intervalId);
      this.syncIntervals.delete(syncKey);
      console.log(`⏹️ Stopped live sync for project ${projectId}`);
    }
  }

  /**
   * Clear failed validation records for a project
   */
  clearFailedValidation(projectId, hubId) {
    const validationKey = `${projectId}-${hubId}`;
    this.failedValidations.delete(validationKey);
    console.log(`🔄 Cleared failed validation record for project ${projectId}`);
  }

  /**
   * Clear all failed validation records
   */
  clearAllFailedValidations() {
    this.failedValidations.clear();
    console.log(`🔄 Cleared all failed validation records`);
  }

  /**
   * Validate project exists in ACC
   */
  async validateProject(projectId, hubId) {
    try {
      console.log(`🔍 Validating project ${projectId} in hub ${hubId}`);
      
      // Check if this project has failed validation recently (prevent infinite loops)
      const validationKey = `${projectId}-${hubId}`;
      const lastFailure = this.failedValidations.get(validationKey);
      if (lastFailure && Date.now() - lastFailure < 3600000) { // 1 hour cooldown to prevent repeated API calls and slow performance
        console.warn(`⚠️ Project ${projectId} failed validation recently. Skipping to prevent infinite loop and slow down API calls.`);
        return false;
      }
      
      // Clean project ID
      let cleanProjectId = projectId;
      if (projectId.startsWith('b.')) {
        cleanProjectId = projectId.substring(2);
      } else if (projectId.startsWith('a.')) {
        cleanProjectId = projectId.substring(2);
      } else if (projectId.startsWith('c.')) {
        cleanProjectId = projectId.substring(2);
      }

      // Validate using the hub projects list (more reliable than account-derived HQ lookup).
      const projects = await this.accService.getProjects(hubId);
      const matchedProject = (projects || []).find((project) => {
        const candidateId = (project?.id || '').toString();
        const normalizedCandidate = candidateId.replace(/^[abc]\./, '');
        return candidateId === projectId || candidateId === cleanProjectId || normalizedCandidate === cleanProjectId;
      });

      if (matchedProject) {
        console.log(`✅ Project validated: ${matchedProject.name || cleanProjectId}`);
        // Clear any previous failure record
        this.failedValidations.delete(validationKey);
        return true;
      }
      
      // Record this failure
      this.failedValidations.set(validationKey, Date.now());
      return false;
    } catch (error) {
      console.error(`❌ Project validation failed for ${projectId}:`, error);

      // Network issues should not block syncing for an hour; proceed optimistically.
      const msg = (error?.message || '').toLowerCase();
      if (msg.includes('failed to fetch') || msg.includes('timed out') || msg.includes('network')) {
        console.warn(`⚠️ Validation skipped due to transient network error for ${projectId}. Continuing sync.`);
        return true;
      }
      
      // Record this failure
      const validationKey = `${projectId}-${hubId}`;
      this.failedValidations.set(validationKey, Date.now());
      
      if (error.message && error.message.includes('404')) {
        console.error('🔍 Project not found in ACC. This could be due to:');
        console.error('   - Project ID is incorrect');
        console.error('   - Project is in a different hub');
        console.error('   - Project has been deleted or archived');
        console.error('   - Insufficient permissions to access the project');
      }
      return false;
    }
  }

  /**
   * Perform full synchronization
   */
  async performFullSync(projectId, hubId) {
    try {
      console.log(`🔄 Performing full sync for project ${projectId}`);
      
      // Validate project ID format
      if (!projectId || typeof projectId !== 'string') {
        throw new Error('Invalid project ID provided');
      }
      
      // Clean project ID (remove any prefixes)
      let cleanProjectId = projectId;
      if (projectId.startsWith('b.')) {
        cleanProjectId = projectId.substring(2);
      } else if (projectId.startsWith('a.')) {
        cleanProjectId = projectId.substring(2);
      } else if (projectId.startsWith('c.')) {
        cleanProjectId = projectId.substring(2);
      }
      
      console.log(`🔍 Using cleaned project ID: ${cleanProjectId}`);
      
      // Validate project exists before attempting sync
      const isValidProject = await this.validateProject(projectId, hubId);
      if (!isValidProject) {
        console.warn(`⚠️ Project ${projectId} not found in ACC. Skipping sync to prevent errors.`);
        console.warn('💡 This project may not exist in ACC or may be in a different hub.');
        return; // Exit early to prevent 404 errors
      }
      
      // Set hub information
      this.accService.hubId = hubId;
      
      // Fetch all data types in parallel with error handling
      const [budgets, contracts, costItems, expenses, performanceTracking] = await Promise.allSettled([
        this.accService.getProjectBudgets(cleanProjectId, { include: ['subitems', 'attributes'] }),
        this.accService.getProjectContracts(cleanProjectId, { include: ['budgets', 'scheduleOfValues'] }),
        this.accService.getProjectCostItems(cleanProjectId, { include: ['budget', 'changeOrders'] }),
        this.accService.getProjectExpenses(cleanProjectId, { include: ['expenseItems'] }),
        this.accService.getPerformanceTrackingInstances(cleanProjectId, { limit: 1000 })
      ]);
      
      // Handle results and errors
      const budgetsResult = budgets.status === 'fulfilled' ? budgets.value : [];
      const contractsResult = contracts.status === 'fulfilled' ? contracts.value : [];
      const costItemsResult = costItems.status === 'fulfilled' ? costItems.value : [];
      const expensesResult = expenses.status === 'fulfilled' ? expenses.value : [];
      const performanceTrackingResult = performanceTracking.status === 'fulfilled' ? performanceTracking.value : [];
      
      // Log any errors with detailed information
      if (budgets.status === 'rejected') {
        console.error('❌ Error fetching budgets:', budgets.reason);
        if (budgets.reason.message && budgets.reason.message.includes('404')) {
          console.error('🔍 Project not found in ACC. Please verify project ID and hub access.');
        }
      }
      if (contracts.status === 'rejected') {
        console.error('❌ Error fetching contracts:', contracts.reason);
        if (contracts.reason.message && contracts.reason.message.includes('404')) {
          console.error('🔍 Project not found in ACC. Please verify project ID and hub access.');
        }
      }
      if (costItems.status === 'rejected') {
        console.error('❌ Error fetching cost items:', costItems.reason);
        if (costItems.reason.message && costItems.reason.message.includes('404')) {
          console.error('🔍 Project not found in ACC. Please verify project ID and hub access.');
        }
      }
      if (expenses.status === 'rejected') {
        console.error('❌ Error fetching expenses:', expenses.reason);
        if (expenses.reason.message && expenses.reason.message.includes('404')) {
          console.error('🔍 Project not found in ACC. Please verify project ID and hub access.');
        }
      }
      if (performanceTracking.status === 'rejected') {
        console.error('❌ Error fetching performance tracking:', performanceTracking.reason);
        if (performanceTracking.reason.message && performanceTracking.reason.message.includes('404')) {
          console.error('🔍 Project not found in ACC. Please verify project ID and hub access.');
        }
      }

      // Cache the data
      this.dataCache.set(`${projectId}_budgets`, budgetsResult);
      this.dataCache.set(`${projectId}_contracts`, contractsResult);
      this.dataCache.set(`${projectId}_costItems`, costItemsResult);
      this.dataCache.set(`${projectId}_expenses`, expensesResult);
      this.dataCache.set(`${projectId}_performanceTracking`, performanceTrackingResult);

      // Update local storage with live data
      this.updateLocalStorage(projectId, {
        budgets: budgetsResult,
        contracts: contractsResult,
        costItems: costItemsResult,
        expenses: expensesResult,
        performanceTracking: performanceTrackingResult
      });

      // Notify listeners
      this.notifyChangeListeners(projectId, 'full_sync', {
        budgets: budgetsResult.length,
        contracts: contractsResult.length,
        costItems: costItemsResult.length,
        expenses: expensesResult.length,
        performanceTracking: performanceTrackingResult.length
      });

      console.log(`✅ Full sync completed for project ${projectId}`);
    } catch (error) {
      console.error(`❌ Error in full sync for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Perform incremental synchronization
   */
  async performIncrementalSync(projectId, hubId) {
    try {
      const syncKey = `${projectId}_${hubId}`;
      const lastSync = this.lastSyncTimes.get(syncKey);
      const lastSyncTime = lastSync ? new Date(lastSync) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to 24 hours ago
      
      console.log(`🔄 Performing incremental sync for project ${projectId} since ${lastSyncTime.toISOString()}`);
      
      // Clean project ID (remove any prefixes)
      let cleanProjectId = projectId;
      if (projectId.startsWith('b.')) {
        cleanProjectId = projectId.substring(2);
      } else if (projectId.startsWith('a.')) {
        cleanProjectId = projectId.substring(2);
      } else if (projectId.startsWith('c.')) {
        cleanProjectId = projectId.substring(2);
      }
      
      // Validate project exists before attempting sync
      const isValidProject = await this.validateProject(projectId, hubId);
      if (!isValidProject) {
        console.warn(`⚠️ Project ${projectId} not found in ACC. Skipping incremental sync to prevent errors.`);
        return; // Exit early to prevent 404 errors
      }
      
      // Set hub information
      this.accService.hubId = hubId;
      
      // Fetch only changed data with error handling
      const [budgets, contracts, costItems, expenses, performanceTracking] = await Promise.allSettled([
        this.accService.getProjectBudgets(cleanProjectId, { 
          lastModifiedSince: lastSyncTime.toISOString(),
          include: ['subitems', 'attributes'] 
        }),
        this.accService.getProjectContracts(cleanProjectId, { 
          lastModifiedSince: lastSyncTime.toISOString(),
          include: ['budgets', 'scheduleOfValues'] 
        }),
        this.accService.getProjectCostItems(cleanProjectId, { 
          lastModifiedSince: lastSyncTime.toISOString(),
          include: ['budget', 'changeOrders'] 
        }),
        this.accService.getProjectExpenses(cleanProjectId, { 
          lastModifiedSince: lastSyncTime.toISOString(),
          include: ['expenseItems'] 
        }),
        this.accService.getPerformanceTrackingInstances(cleanProjectId, { 
          lastModifiedSince: lastSyncTime.toISOString(),
          limit: 1000 
        })
      ]);

      // Handle results and errors
      const budgetsResult = budgets.status === 'fulfilled' ? budgets.value : [];
      const contractsResult = contracts.status === 'fulfilled' ? contracts.value : [];
      const costItemsResult = costItems.status === 'fulfilled' ? costItems.value : [];
      const expensesResult = expenses.status === 'fulfilled' ? expenses.value : [];
      const performanceTrackingResult = performanceTracking.status === 'fulfilled' ? performanceTracking.value : [];
      
      // Log any errors
      if (budgets.status === 'rejected') {
        console.error('❌ Error fetching budgets (incremental):', budgets.reason);
      }
      if (contracts.status === 'rejected') {
        console.error('❌ Error fetching contracts (incremental):', contracts.reason);
      }
      if (costItems.status === 'rejected') {
        console.error('❌ Error fetching cost items (incremental):', costItems.reason);
      }
      if (expenses.status === 'rejected') {
        console.error('❌ Error fetching expenses (incremental):', expenses.reason);
      }
      if (performanceTracking.status === 'rejected') {
        console.error('❌ Error fetching performance tracking (incremental):', performanceTracking.reason);
      }

      // Merge with existing data
      this.mergeData(projectId, {
        budgets: budgetsResult,
        contracts: contractsResult,
        costItems: costItemsResult,
        expenses: expensesResult,
        performanceTracking: performanceTrackingResult
      });

      // Update last sync time
      this.lastSyncTimes.set(syncKey, new Date().toISOString());

      // Notify listeners of changes
      const changes = this.detectChanges(projectId, {
        budgets: budgetsResult,
        contracts: contractsResult,
        costItems: costItemsResult,
        expenses: expensesResult,
        performanceTracking: performanceTrackingResult
      });

      if (changes.length > 0) {
        this.notifyChangeListeners(projectId, 'incremental_sync', changes);
        console.log(`✅ Incremental sync completed for project ${projectId} with ${changes.length} changes`);
      } else {
        console.log(`✅ Incremental sync completed for project ${projectId} - no changes`);
      }
    } catch (error) {
      console.error(`❌ Error in incremental sync for project ${projectId}:`, error);
    }
  }

  /**
   * Merge new data with existing cached data
   */
  mergeData(projectId, newData) {
    Object.keys(newData).forEach(dataType => {
      const cacheKey = `${projectId}_${dataType}`;
      const existingData = this.dataCache.get(cacheKey) || [];
      const newItems = newData[dataType];

      // Create a map of existing items by ID
      const existingMap = new Map(existingData.map(item => [item.id, item]));

      // Update or add new items
      newItems.forEach(item => {
        existingMap.set(item.id, item);
      });

      // Convert back to array
      const mergedData = Array.from(existingMap.values());
      this.dataCache.set(cacheKey, mergedData);

      // Update local storage
      this.updateLocalStorage(projectId, { [dataType]: mergedData });
    });
  }

  /**
   * Detect changes in data
   */
  detectChanges(projectId, newData) {
    const changes = [];

    Object.keys(newData).forEach(dataType => {
      const cacheKey = `${projectId}_${dataType}`;
      const existingData = this.dataCache.get(cacheKey) || [];
      const newItems = newData[dataType];

      // Check for new items
      const existingIds = new Set(existingData.map(item => item.id));
      const newItemsFiltered = newItems.filter(item => !existingIds.has(item.id));

      // Check for updated items
      const updatedItems = newItems.filter(newItem => {
        const existingItem = existingData.find(item => item.id === newItem.id);
        return existingItem && JSON.stringify(existingItem) !== JSON.stringify(newItem);
      });

      if (newItemsFiltered.length > 0) {
        changes.push({
          type: 'new',
          dataType,
          count: newItemsFiltered.length,
          items: newItemsFiltered
        });
      }

      if (updatedItems.length > 0) {
        changes.push({
          type: 'updated',
          dataType,
          count: updatedItems.length,
          items: updatedItems
        });
      }
    });

    return changes;
  }

  /**
   * Update local storage with live data
   */
  updateLocalStorage(projectId, data) {
    try {
      Object.keys(data).forEach(dataType => {
        const storageKey = `zoyantra_${dataType}`;
        const existingData = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        // Filter out existing project data
        const otherProjectData = existingData.filter(item => item.projectId !== projectId);
        
        // Add new project data
        const projectData = data[dataType].map(item => ({
          ...item,
          projectId,
          lastSynced: new Date().toISOString(),
          source: 'acc_live'
        }));

        // Combine and save
        const updatedData = [...otherProjectData, ...projectData];
        localStorage.setItem(storageKey, JSON.stringify(updatedData));

        // Log audit trail (if audit service is available)
        try {
          if (this.auditService && typeof this.auditService.logChange === 'function') {
            this.auditService.logChange(projectId, dataType, 'bulk_update', 'data', 
              existingData.length, updatedData.length);
          }
        } catch (auditError) {
          console.warn('⚠️ Audit logging failed:', auditError.message);
        }
      });
    } catch (error) {
      console.error('❌ Error updating local storage:', error);
    }
  }

  /**
   * Get cached data for a project
   */
  getCachedData(projectId, dataType) {
    const cacheKey = `${projectId}_${dataType}`;
    return this.dataCache.get(cacheKey) || [];
  }

  /**
   * Add change listener
   */
  addChangeListener(projectId, callback) {
    if (!this.changeListeners.has(projectId)) {
      this.changeListeners.set(projectId, []);
    }
    this.changeListeners.get(projectId).push(callback);
  }

  /**
   * Remove change listener
   */
  removeChangeListener(projectId, callback) {
    const listeners = this.changeListeners.get(projectId);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Notify change listeners
   */
  notifyChangeListeners(projectId, syncType, changes) {
    const listeners = this.changeListeners.get(projectId);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(syncType, changes);
        } catch (error) {
          console.error('❌ Error in change listener:', error);
        }
      });
    }
  }

  /**
   * Get sync status for a project
   */
  getSyncStatus(projectId, hubId) {
    const syncKey = `${projectId}_${hubId}`;
    const isActive = this.syncIntervals.has(syncKey);
    const lastSync = this.lastSyncTimes.get(syncKey);
    
    return {
      isActive,
      lastSync,
      dataTypes: {
        budgets: this.getCachedData(projectId, 'budgets').length,
        contracts: this.getCachedData(projectId, 'contracts').length,
        costItems: this.getCachedData(projectId, 'costItems').length,
        expenses: this.getCachedData(projectId, 'expenses').length,
        performanceTracking: this.getCachedData(projectId, 'performanceTracking').length
      }
    };
  }

  /**
   * Force refresh for a project
   */
  async forceRefresh(projectId, hubId) {
    console.log(`🔄 Force refresh requested for project ${projectId}`);
    await this.performFullSync(projectId, hubId);
  }

  /**
   * Get project troubleshooting information
   */
  getProjectTroubleshootingInfo(projectId, hubId) {
    return {
      projectId,
      hubId,
      possibleIssues: [
        'Project ID format is incorrect',
        'Project is in a different hub',
        'Project has been deleted or archived',
        'Insufficient permissions to access the project',
        'Project is in a different region (US vs EU vs APAC)',
        'Authentication token has expired'
      ],
      suggestions: [
        'Verify the project exists in the selected hub',
        'Check if you have access permissions to the project',
        'Try refreshing the project list',
        'Verify the hub selection is correct',
        'Check if the project is in a different region'
      ]
    };
  }

  /**
   * Stop all live syncs
   */
  stopAllLiveSyncs() {
    this.syncIntervals.forEach((intervalId, syncKey) => {
      clearInterval(intervalId);
    });
    this.syncIntervals.clear();
    console.log('⏹️ Stopped all live syncs');
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stopAllLiveSyncs();
    this.dataCache.clear();
    this.changeListeners.clear();
    this.lastSyncTimes.clear();
    this.isInitialized = false;
    console.log('🧹 Live Data Service cleaned up');
  }

  /**
   * Clear all failed validations (useful for debugging)
   */
  clearFailedValidations() {
    this.failedValidations.clear();
    console.log('🧹 Cleared all failed validations');
  }

  /**
   * Clear failed validation for a specific project
   */
  clearProjectValidation(projectId, hubId) {
    const validationKey = `${projectId}-${hubId}`;
    this.failedValidations.delete(validationKey);
    console.log(`🧹 Cleared failed validation for project ${projectId}`);
  }
}

export default LiveDataService;
