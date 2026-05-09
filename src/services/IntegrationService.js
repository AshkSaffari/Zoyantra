/**
 * Integration Service - Master service for coordinating all data synchronization
 * Combines LiveDataService, DataSyncService, and AuditService for comprehensive data management
 */

import LiveDataService from './LiveDataService';
import DataSyncService from './DataSyncService';
import AuditService from './AuditService';
import AccService from './AccService';

class IntegrationService {
  constructor() {
    this.liveDataService = new LiveDataService();
    this.dataSyncService = new DataSyncService();
    this.auditService = new AuditService();
    this.accService = new AccService();
    this.isInitialized = false;
    this.syncStatus = new Map();
    this.changeListeners = new Map();
  }

  /**
   * Initialize the integration service
   */
  initialize(credentials) {
    try {
      this.accService.initialize(credentials);
      this.liveDataService.initialize(credentials);
      this.dataSyncService.initialize(credentials);
      this.isInitialized = true;
      console.log('🔄 Integration Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Integration Service:', error);
      throw error;
    }
  }

  /**
   * Start comprehensive live data synchronization
   */
  async startLiveSync(projectId, hubId, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Integration Service not initialized');
    }

    try {
      console.log(`🔄 Starting comprehensive live sync for project ${projectId}`);
      
      // Start live data service
      this.liveDataService.startLiveSync(projectId, hubId, options.syncInterval || 30000);
      
      // Add change listeners
      this.liveDataService.addChangeListener(projectId, (syncType, changes) => {
        this.handleDataChange(projectId, syncType, changes);
      });

      // Set sync status
      this.syncStatus.set(projectId, {
        isActive: true,
        startTime: new Date().toISOString(),
        lastSync: null,
        changes: 0
      });

      console.log(`✅ Live sync started for project ${projectId}`);
    } catch (error) {
      console.error(`❌ Error starting live sync for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Stop live data synchronization
   */
  stopLiveSync(projectId, hubId) {
    try {
      this.liveDataService.stopLiveSync(projectId, hubId);
      this.syncStatus.delete(projectId);
      console.log(`⏹️ Live sync stopped for project ${projectId}`);
    } catch (error) {
      console.error(`❌ Error stopping live sync for project ${projectId}:`, error);
    }
  }

  /**
   * Perform comprehensive data synchronization
   */
  async performFullSync(projectId, hubId, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Integration Service not initialized');
    }

    try {
      console.log(`🔄 Performing comprehensive full sync for project ${projectId}`);
      
      // Perform data sync
      const syncResults = await this.dataSyncService.syncProjectData(projectId, hubId, options);
      
      // Log sync completion
      this.auditService.logChange(projectId, 'sync', 'full_sync', 'status', 'pending', 'completed');
      
      // Update sync status
      this.syncStatus.set(projectId, {
        isActive: true,
        startTime: new Date().toISOString(),
        lastSync: new Date().toISOString(),
        changes: Object.values(syncResults.results).reduce((sum, result) => sum + (result.created || 0) + (result.updated || 0), 0)
      });

      // Notify listeners
      this.notifyChangeListeners(projectId, 'full_sync', syncResults);

      console.log(`✅ Full sync completed for project ${projectId}`);
      return syncResults;
    } catch (error) {
      console.error(`❌ Error in full sync for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Handle data changes from live sync
   */
  handleDataChange(projectId, syncType, changes) {
    try {
      // Log the change
      this.auditService.logChange(projectId, 'live_sync', syncType, 'changes', changes.length, changes.length);
      
      // Update sync status
      const currentStatus = this.syncStatus.get(projectId);
      if (currentStatus) {
        this.syncStatus.set(projectId, {
          ...currentStatus,
          lastSync: new Date().toISOString(),
          changes: currentStatus.changes + changes.length
        });
      }

      // Notify listeners
      this.notifyChangeListeners(projectId, syncType, changes);
    } catch (error) {
      console.error('❌ Error handling data change:', error);
    }
  }

  /**
   * Get comprehensive sync status for a project
   */
  getSyncStatus(projectId) {
    const liveStatus = this.liveDataService.getSyncStatus(projectId);
    const dataSyncStatus = this.dataSyncService.getSyncStatus(projectId);
    const integrationStatus = this.syncStatus.get(projectId);

    return {
      projectId,
      isActive: integrationStatus?.isActive || false,
      startTime: integrationStatus?.startTime,
      lastSync: integrationStatus?.lastSync,
      totalChanges: integrationStatus?.changes || 0,
      liveData: liveStatus,
      dataSync: dataSyncStatus,
      auditLog: this.auditService.getAuditLog(projectId).length
    };
  }

  /**
   * Force refresh all data for a project
   */
  async forceRefresh(projectId, hubId) {
    try {
      console.log(`🔄 Force refresh requested for project ${projectId}`);
      
      // Stop current sync
      this.stopLiveSync(projectId, hubId);
      
      // Perform full sync
      const results = await this.performFullSync(projectId, hubId);
      
      // Restart live sync
      await this.startLiveSync(projectId, hubId);
      
      console.log(`✅ Force refresh completed for project ${projectId}`);
      return results;
    } catch (error) {
      console.error(`❌ Error in force refresh for project ${projectId}:`, error);
      throw error;
    }
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
   * Get audit trail for a project
   */
  getAuditTrail(projectId, entityType = null, entityId = null) {
    return this.auditService.getAuditLog(projectId, entityType, entityId);
  }

  /**
   * Clear audit trail for a project
   */
  clearAuditTrail(projectId) {
    this.auditService.clearAuditLog(projectId);
    console.log(`🧹 Audit trail cleared for project ${projectId}`);
  }

  /**
   * Get comprehensive project data
   */
  getProjectData(projectId) {
    return {
      budgets: this.liveDataService.getCachedData(projectId, 'budgets'),
      contracts: this.liveDataService.getCachedData(projectId, 'contracts'),
      costItems: this.liveDataService.getCachedData(projectId, 'costItems'),
      expenses: this.liveDataService.getCachedData(projectId, 'expenses'),
      performanceTracking: this.liveDataService.getCachedData(projectId, 'performanceTracking'),
      syncStatus: this.getSyncStatus(projectId),
      auditTrail: this.getAuditTrail(projectId)
    };
  }

  /**
   * Export comprehensive project data
   */
  exportProjectData(projectId) {
    try {
      const projectData = this.getProjectData(projectId);
      const exportData = {
        ...projectData,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zoyantra-comprehensive-${projectId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`📤 Comprehensive project data exported for ${projectId}`);
    } catch (error) {
      console.error('❌ Error exporting project data:', error);
      throw error;
    }
  }

  /**
   * Stop all live syncs
   */
  stopAllLiveSyncs() {
    this.liveDataService.stopAllLiveSyncs();
    this.syncStatus.clear();
    console.log('⏹️ All live syncs stopped');
  }

  /**
   * Clean up all resources
   */
  cleanup() {
    this.stopAllLiveSyncs();
    this.liveDataService.cleanup();
    this.changeListeners.clear();
    this.isInitialized = false;
    console.log('🧹 Integration Service cleaned up');
  }
}

export default IntegrationService;
