// LocalTimesheetService.js - Local storage for timesheet data with ACC Performance Tracker integration
import AccService from './AccService';

// eslint-disable-next-line import/no-anonymous-default-export
export default class LocalTimesheetService {
  constructor() {
    this.storageKey = 'cewa_timesheets';
    this.exportVersion = '1.4';
  }

  // Create a new timesheet entry
  create(timesheetData) {
    const timesheets = this.getAll();
    const newTimesheet = {
      id: Date.now().toString(),
      ...timesheetData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    timesheets.push(newTimesheet);
    this.save(timesheets);
    return newTimesheet;
  }

  // Get all timesheets
  getAll() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading timesheets:', error);
      return [];
    }
  }

  // Get timesheets by project
  getByProject(projectId) {
    return this.getAll().filter(t => t.projectId === projectId);
  }

  // Get timesheets by user
  getByUser(userId) {
    return this.getAll().filter(t => t.userId === userId);
  }

  // Archive a timesheet (move to archived storage)
  archive(id) {
    const timesheets = this.getAll();
    const timesheet = timesheets.find(t => t.id === id);
    if (timesheet) {
      // Add archive metadata
      const archivedTimesheet = {
        ...timesheet,
        archivedAt: new Date().toISOString(),
        isArchived: true
      };
      
      // Remove from active timesheets
      const updatedTimesheets = timesheets.filter(t => t.id !== id);
      this.save(updatedTimesheets);
      
      // Add to archived timesheets
      this.addToArchived(archivedTimesheet);
      
      return archivedTimesheet;
    }
    return null;
  }

  // Get all archived timesheets
  getArchived() {
    try {
      const data = localStorage.getItem(`${this.storageKey}_archived`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading archived timesheets:', error);
      return [];
    }
  }

  // Add timesheet to archived storage
  addToArchived(timesheet) {
    const archived = this.getArchived();
    archived.push(timesheet);
    localStorage.setItem(`${this.storageKey}_archived`, JSON.stringify(archived));
  }

  // Restore a timesheet from archive
  restore(id) {
    const archived = this.getArchived();
    const timesheet = archived.find(t => t.id === id);
    if (timesheet) {
      // Remove archive metadata
      const restoredTimesheet = {
        ...timesheet,
        archivedAt: undefined,
        isArchived: false,
        restoredAt: new Date().toISOString()
      };
      
      // Remove from archived
      const updatedArchived = archived.filter(t => t.id !== id);
      localStorage.setItem(`${this.storageKey}_archived`, JSON.stringify(updatedArchived));
      
      // Add back to active timesheets
      const timesheets = this.getAll();
      timesheets.push(restoredTimesheet);
      this.save(timesheets);
      
      return restoredTimesheet;
    }
    return null;
  }

  // Permanently delete an archived timesheet
  deleteArchived(id) {
    const archived = this.getArchived();
    const updatedArchived = archived.filter(t => t.id !== id);
    localStorage.setItem(`${this.storageKey}_archived`, JSON.stringify(updatedArchived));
    return true;
  }

  // Update a timesheet entry
  update(id, updates) {
    const timesheets = this.getAll();
    const index = timesheets.findIndex(t => t.id === id);
    
    if (index !== -1) {
      timesheets[index] = {
        ...timesheets[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.save(timesheets);
      return timesheets[index];
    }
    
    return null;
  }

  // Delete a timesheet entry (from main timesheets)
  delete(id) {
    const timesheets = this.getAll();
    const filtered = timesheets.filter(t => t.id !== id);
    this.save(filtered);
    return filtered.length < timesheets.length;
  }

  // Delete an archived timesheet entry
  deleteArchived(id) {
    const archived = this.getArchived();
    const filtered = archived.filter(t => t.id !== id);
    localStorage.setItem(`${this.storageKey}_archived`, JSON.stringify(filtered));
    return filtered.length < archived.length;
  }

  // Save timesheets to localStorage
  save(timesheets) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(timesheets));
    } catch (error) {
      console.error('Error saving timesheets:', error);
    }
  }

  // Clear all timesheets
  clear() {
    localStorage.removeItem(this.storageKey);
  }

  // Export timesheets to CSV
  exportToCSV(timesheets = null) {
    const data = timesheets || this.getAll();
    if (data.length === 0) return '';

    const headers = ['ID', 'Date', 'Project', 'User', 'Hours', 'Output Units', 'Description', 'Created At'];
    const rows = data.map(t => [
      t.id,
      t.date,
      t.projectName || 'Unknown',
      t.userName || 'Unknown',
      t.hours || 0,
      t.outputUnits || 0,
      t.description || '',
      t.createdAt
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  // Download CSV file
  downloadCSV(filename = 'timesheets.csv') {
    const csvContent = this.exportToCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Delete specific timesheet from Performance Tracker
  async deleteFromPerformanceTracker(projectId, timesheetId) {
    console.log('🗑️ Deleting timesheet from Performance Tracker...');
    console.log('📊 Project ID:', projectId);
    console.log('📋 Timesheet ID:', timesheetId);

    // Check if AccService is properly initialized
    if (!AccService.instance) {
      console.error('❌ AccService not initialized');
      return {
        success: false,
        message: 'AccService not initialized. Please ensure you are properly authenticated.'
      };
    }

    try {
      // Get the timesheet data
      const timesheet = this.getById(timesheetId);
      if (!timesheet) {
        return { success: false, message: 'Timesheet not found' };
      }

      console.log('📊 Timesheet data:', timesheet);

      // Get Performance Tracking Items for this budget
      const trackingItems = await AccService.getPerformanceTrackingItems(projectId, {
        filter: { budgetId: [timesheet.budgetId] }
      });

      if (trackingItems.length === 0) {
        console.log(`⚠️ No Performance Tracking Items found for budget ${timesheet.budgetId}`);
        return { success: true, message: 'No Performance Tracking Items found for this timesheet' };
      }

      let deletedCount = 0;
      const deleteReport = [];

      // For each tracking item, find and delete the user instance for this timesheet
      for (const trackingItem of trackingItems) {
        console.log(`📊 Processing Performance Tracking Item: ${trackingItem.id}`);
        
        // Get all instances for this tracking item
        const instances = await AccService.getPerformanceTrackingItemInstances(projectId, {
          filter: { performanceTrackingItemId: [trackingItem.id] }
        });

        console.log(`📊 Found ${instances.length} instances for tracking item ${trackingItem.id}`);

        // Find the user instance for this specific timesheet
        // Look for instances that match the timesheet's user name with date
        const timesheetDateField = timesheet.startDate || timesheet.date || timesheet.endDate;
        const timesheetDate = timesheetDateField ? new Date(timesheetDateField).toLocaleDateString('en-US', { 
          month: '2-digit', 
          day: '2-digit', 
          year: 'numeric' 
        }) : 'Unknown Date';
        const expectedUserName = `${timesheetDate} - ${timesheet.userName || 'User'}`;

        const userInstance = instances.find(inst => {
          return inst.name === expectedUserName || 
                 inst.name?.includes(timesheet.userName) ||
                 inst.name?.includes(timesheetDate);
        });

        if (userInstance) {
          console.log(`🗑️ Found user instance to delete: ${userInstance.id} (${userInstance.name})`);
          
          // Delete the user instance
          await AccService.deletePerformanceTrackingItemInstance(projectId, userInstance.id);
          console.log(`✅ Deleted user instance: ${userInstance.id}`);
          
          deletedCount++;
          deleteReport.push({
            timesheetId: timesheetId,
            trackingItemId: trackingItem.id,
            instanceId: userInstance.id,
            instanceName: userInstance.name,
            status: 'deleted',
            timestamp: new Date().toISOString()
          });
        } else {
          console.log(`⚠️ No user instance found for timesheet ${timesheetId} in tracking item ${trackingItem.id}`);
        }
      }

      console.log(`✅ Delete completed: ${deletedCount} user instances deleted`);
      return {
        success: true,
        message: `Successfully deleted ${deletedCount} user instances from Performance Tracker`,
        deletedCount: deletedCount,
        deleteReport: deleteReport
      };

    } catch (error) {
      console.error('❌ Delete failed:', error);
      return {
        success: false,
        message: `Delete failed: ${error.message}`,
        error: error.toString()
      };
    }
  }

  // Purge Performance Tracker instances for selected timesheets
  async purgePerformanceTrackerInstances(projectId, selectedTimesheetIds) {
    console.log('🗑️ Starting Performance Tracker purge...');
    console.log('📊 Project ID:', projectId);
    console.log('📋 Selected timesheet IDs:', selectedTimesheetIds);

    // Check if AccService is properly initialized
    if (!AccService.instance) {
      console.error('❌ AccService not initialized');
      return {
        success: false,
        message: 'AccService not initialized. Please ensure you are properly authenticated.'
      };
    }

    try {
      // Get the selected timesheets
      const selectedTimesheets = this.getArchived().filter(t => selectedTimesheetIds.includes(t.id));
      if (selectedTimesheets.length === 0) {
        return { success: false, message: 'No selected timesheets found' };
      }

      // Get unique budgets from selected timesheets
      const uniqueBudgets = [...new Set(selectedTimesheets.map(t => t.budgetId).filter(Boolean))];
      console.log(`📊 Found ${uniqueBudgets.length} unique budgets to purge:`, uniqueBudgets);

      let purgedCount = 0;
      const purgeReport = [];

      for (const budgetId of uniqueBudgets) {
        try {
          console.log(`🗑️ Purging instances for budget: ${budgetId}`);
          
          // Get Performance Tracking Items for this budget
          const trackingItems = await AccService.getPerformanceTrackingItems(projectId, {
            filter: { budgetId: [budgetId] }
          });

          if (trackingItems.length === 0) {
            console.log(`⚠️ No Performance Tracking Items found for budget ${budgetId}`);
            continue;
          }

          // For each tracking item, find and delete the budget/task instance (not user instances)
          for (const trackingItem of trackingItems) {
            console.log(`📊 Processing Performance Tracking Item: ${trackingItem.id}`);
            
            // Get all instances for this tracking item
            const instances = await AccService.getPerformanceTrackingItemInstances(projectId, {
              filter: { performanceTrackingItemId: [trackingItem.id] }
            });

            console.log(`📊 Found ${instances.length} instances for tracking item ${trackingItem.id}`);

            // Find the budget/task instance (usually ends with "-01" or is the first created instance)
            const budgetInstance = instances.find(inst => {
              // Look for instances that are NOT user instances (budget total instances)
              return inst.number?.endsWith('-01') || 
                     inst.name?.includes('Budget Total') ||
                     inst.name?.includes('budget-total') ||
                     !inst.name?.includes('-'); // Instance names without dashes are usually budget instances
            });

            if (budgetInstance) {
              console.log(`🗑️ Found budget instance to delete: ${budgetInstance.id} (${budgetInstance.name})`);
              
              // Delete the budget instance
              await AccService.deletePerformanceTrackingItemInstance(projectId, budgetInstance.id);
              console.log(`✅ Deleted budget instance: ${budgetInstance.id}`);
              
              purgedCount++;
              purgeReport.push({
                budgetId: budgetId,
                trackingItemId: trackingItem.id,
                instanceId: budgetInstance.id,
                instanceName: budgetInstance.name,
                status: 'deleted',
                timestamp: new Date().toISOString()
              });
            } else {
              console.log(`⚠️ No budget instance found for tracking item ${trackingItem.id}`);
            }
          }

        } catch (error) {
          console.error(`❌ Error purging budget ${budgetId}:`, error);
          purgeReport.push({
            budgetId: budgetId,
            status: 'failed',
            message: `Failed to purge budget instances: ${error.message}`,
            timestamp: new Date().toISOString()
          });
        }
      }

      console.log(`✅ Purge completed: ${purgedCount} budget instances deleted`);
      return {
        success: true,
        message: `Successfully purged ${purgedCount} budget instances from Performance Tracker`,
        purgedCount: purgedCount,
        purgeReport: purgeReport
      };

    } catch (error) {
      console.error('❌ Purge failed:', error);
      return {
        success: false,
        message: `Purge failed: ${error.message}`,
        error: error.toString()
      };
    }
  }

  // Simple sync that only creates/updates main budget instances (no user instances)
  async syncToPerformanceTracker(projectId, hubId, perUser = false, customTimesheets = null) {
    console.log('🔄 Starting ACC Performance Tracking sync...');
    console.log('📊 APPROACH: Main budget instances only, no user instances');
    console.log('📊 Project ID:', projectId);

    // Check if AccService is properly initialized
    if (!AccService.instance) {
      console.error('❌ AccService not initialized');
      return {
        success: false,
        message: 'AccService not initialized. Please ensure you are properly authenticated.',
        syncReport: []
      };
    }

    // Use custom timesheets if provided, otherwise get from project
    const timesheets = customTimesheets || this.getByProject(projectId);
    if (timesheets.length === 0) {
      console.log('⚠️ No timesheets found for project:', projectId);
      return { success: false, message: 'No timesheets found' };
    }

    console.log('📋 Found timesheets:', timesheets.length);

    try {
      // Use the existing syncAllTimesheets method which only creates main instances
      const result = await this.syncAllTimesheets(projectId, timesheets);
      
      console.log('✅ ACC Performance Tracking sync completed');
      return {
        success: result.success,
        message: result.message || 'Performance Tracking sync completed successfully',
        syncReport: result.syncReport || []
      };

    } catch (error) {
      console.error('❌ Error during Performance Tracking sync:', error);
      return {
        success: false,
        message: `Performance Tracking sync failed: ${error.message}`,
        syncReport: [],
        error: error.toString()
      };
    }
  }

  // Helper method to adjust quantities by subtracting user sums from main instance
  async adjustQuantities(projectId, instanceId, userSumInputQty, userSumOutputQty) {
    try {
      console.log(`🔧 Adjusting quantities for instance ${instanceId}`);
      console.log(`🔧 User sum input qty to subtract: ${userSumInputQty}`);
      console.log(`🔧 User sum output qty to subtract: ${userSumOutputQty}`);
      
      // Get current instance data
      const currentInstance = await AccService.getPerformanceTrackingItemInstance(projectId, instanceId);
      console.log(`🔧 Current instance data:`, {
        currentInputQty: currentInstance.plannedInputQuantity,
        currentOutputQty: currentInstance.plannedOutputQuantity,
        currentTrackedInput: currentInstance.trackedInputQuantity,
        currentTrackedOutput: currentInstance.trackedOutputQuantity
      });
      
      // Calculate adjusted quantities
      const adjustedInputQty = Math.max(0, (currentInstance.plannedInputQuantity || 0) - userSumInputQty);
      const adjustedOutputQty = Math.max(0, (currentInstance.plannedOutputQuantity || 0) - userSumOutputQty);
      const adjustedTrackedInput = Math.max(0, (currentInstance.trackedInputQuantity || 0) - userSumInputQty);
      const adjustedTrackedOutput = Math.max(0, (currentInstance.trackedOutputQuantity || 0) - userSumOutputQty);
      
      console.log(`🔧 Adjusted quantities:`, {
        adjustedInputQty,
        adjustedOutputQty,
        adjustedTrackedInput,
        adjustedTrackedOutput
      });
      
      // Update the instance with adjusted quantities
      const updateData = {
        plannedInputQuantity: adjustedInputQty,
        plannedOutputQuantity: adjustedOutputQty,
        trackedInputQuantity: adjustedTrackedInput,
        trackedOutputQuantity: adjustedTrackedOutput,
        // Recalculate percentages
        inputUsedPercentage: adjustedInputQty > 0 ? (adjustedTrackedInput / adjustedInputQty) * 100 : 0,
        outputCompletedPercentage: adjustedOutputQty > 0 ? (adjustedTrackedOutput / adjustedOutputQty) * 100 : 0,
        // Recalculate productivity rate
        productivityRate: adjustedTrackedOutput > 0 ? adjustedTrackedInput / adjustedTrackedOutput : 0,
        // Recalculate variances
        inputVariance: adjustedTrackedInput - adjustedInputQty,
        outputVariance: adjustedTrackedOutput - adjustedOutputQty,
        // Update adjusted quantities
        adjustedInputQuantity: Math.max(0, adjustedInputQty - adjustedTrackedInput),
        adjustedOutputQuantity: Math.max(0, adjustedOutputQty - adjustedTrackedOutput)
      };
      
      await AccService.updatePerformanceTrackingItemInstance(projectId, instanceId, updateData);
      console.log(`✅ Successfully adjusted quantities for instance ${instanceId}`);
      
      return {
        success: true,
        adjustedInputQty,
        adjustedOutputQty,
        adjustedTrackedInput,
        adjustedTrackedOutput,
        message: `Quantities adjusted: Input ${currentInstance.plannedInputQuantity} → ${adjustedInputQty}, Output ${currentInstance.plannedOutputQuantity} → ${adjustedOutputQty}`
      };
      
    } catch (error) {
      console.error(`❌ Error adjusting quantities:`, error);
      return {
        success: false,
        error: error.message,
        message: `Failed to adjust quantities: ${error.message}`
      };
    }
  }

  // Helper method to get budget data
  async getBudgetData(projectId, budgetId) {
    try {
      console.log(`📊 Fetching budget data for budget: ${budgetId} in project: ${projectId}`);
      
      // Get budget details from ACC
      const budget = await AccService.getBudget(projectId, budgetId);
      console.log(`📊 Retrieved budget data:`, budget);
      
      // Extract budget data in the format needed for Performance Tracking
      const budgetData = {
        // Use the same field mapping as TimesheetTab
        inputQuantity: budget.attributes?.inputQuantity || budget.inputQuantity || budget.quantity || 0,
        outputQuantity: budget.quantity || budget.attributes?.quantity || budget.outputQuantity || 1,
        inputUnitCost: (() => {
          const budgetTotal = budget.revised || budget.originalAmount || budget.amount || budget.attributes?.amount || budget.unitPrice || 0;
          const budgetHours = budget.attributes?.inputQuantity || budget.inputQuantity || budget.quantity || 0;
          return budgetHours > 0 ? budgetTotal / budgetHours : budgetTotal;
        })(),
        outputUnitCost: (() => {
          const budgetTotal = budget.revised || budget.originalAmount || budget.amount || budget.attributes?.amount || budget.unitPrice || 0;
          const budgetOutputQty = budget.quantity || budget.attributes?.quantity || budget.outputQuantity || 1;
          return budgetOutputQty > 0 ? budgetTotal / budgetOutputQty : budgetTotal;
        })(),
        // Use revised amount as the main budget amount (same as TimesheetTab)
        plannedTotal: budget.revised || budget.originalAmount || budget.amount || budget.attributes?.amount || budget.unitPrice || 0,
        inputUnit: budget.attributes?.inputUnit || budget.inputUnit || 'hr',
        outputUnit: budget.attributes?.outputUnit || budget.outputUnit || 'units',
        name: budget.attributes?.name || budget.name || 'Unnamed Budget',
        description: budget.attributes?.description || budget.description || ''
      };
      
      console.log(`📊 Processed budget data:`, budgetData);
      return budgetData;
    } catch (error) {
      console.error('❌ Error fetching budget data:', error);
      // Return default values if budget fetch fails
      return {
        inputQuantity: 0,
        outputQuantity: 1,
        inputUnitCost: 0,
        outputUnitCost: 0,
        plannedTotal: 0,
        inputUnit: 'hr',
        outputUnit: 'units',
        name: 'Unknown Budget',
        description: ''
      };
    }
  }

  // Clean up user instances and accumulate values in main instance
  async purgeMainInstance(projectId) {
    try {
      console.log(`🗑️ Cleaning up user instances and accumulating values in main instance for project: ${projectId}`);

      // Get all performance tracking items for this project
      const trackingItems = await AccService.getPerformanceTrackingItems(projectId);
      console.log(`📊 Found ${trackingItems.length} performance tracking items`);

      let totalPurged = 0;
      let totalUpdated = 0;
      const errors = [];

      for (const item of trackingItems) {
        try {
          // Get all instances for this tracking item
          const instances = await AccService.getPerformanceTrackingItemInstances(projectId, {
            filter: { performanceTrackingItemId: [item.id] }
          });

          // Find the main instance (not user-specific)
          const mainInstance = instances.find(inst => 
            inst.name === item.name || // Exact match with tracking item name
            inst.name === `Budget Total - ${item.name}` || // Budget total format
            (inst.name?.includes(item.name) && // Contains the item name
            !inst.name?.includes(' - ') && // Not user-specific (no " - " separator)
            !inst.name?.includes('User:') && // Not user-specific
            !inst.name?.includes('Date:')) // Not date-specific
          );

          // Find user instances (those with user-specific naming patterns)
          const userInstances = instances.filter(inst => 
            inst.name?.includes(' - ') || // User instances typically have " - " in name
            inst.name?.includes('User:') || // User instances typically start with "User:"
            inst.name?.includes('Date:') || // User instances typically include date
            (inst.id !== mainInstance?.id && inst.name !== item.name) // Not the main instance
          );

          console.log(`📊 Found main instance: ${mainInstance?.name || 'None'}`);
          console.log(`📊 Found ${userInstances.length} user instances for task: ${item.name}`);

          // Get timesheet data for this budget
          const timesheetService = new LocalTimesheetService();
          const allTimesheets = timesheetService.getAll();
          const budgetTimesheets = allTimesheets.filter(t => 
            t.budgetId === item.budgetId && 
            (t.projectId === projectId || t.selectedProjectId === projectId)
          );

          if (budgetTimesheets.length > 0) {
            // Calculate total tracked values from timesheets
            const totalTrackedInput = budgetTimesheets.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
            const totalTrackedOutput = budgetTimesheets.reduce((sum, t) => sum + (parseFloat(t.outputUnits) || 0), 0);

            console.log(`📊 Timesheet data: ${budgetTimesheets.length} entries, Input=${totalTrackedInput}, Output=${totalTrackedOutput}`);

            // Get budget data for calculations
            const budgetData = await this.getBudgetData(projectId, item.budgetId);

            if (mainInstance) {
              // Update existing main instance with accumulated values
              try {
                const updateData = {
                  trackedInputQuantity: totalTrackedInput,
                  trackedOutputQuantity: totalTrackedOutput,
                  // Recalculate percentages based on original quantities
                  inputUsedPercentage: budgetData.inputQuantity > 0 ? (totalTrackedInput / budgetData.inputQuantity) * 100 : 0,
                  outputCompletedPercentage: budgetData.outputQuantity > 0 ? (totalTrackedOutput / budgetData.outputQuantity) * 100 : 0,
                  // Recalculate productivity rate
                  productivityRate: totalTrackedOutput > 0 ? totalTrackedInput / totalTrackedOutput : 0,
                  // Recalculate variances
                  inputVariance: totalTrackedInput - budgetData.inputQuantity,
                  outputVariance: totalTrackedOutput - budgetData.outputQuantity,
                  // Update adjusted quantities
                  adjustedInputQuantity: Math.max(0, budgetData.inputQuantity - totalTrackedInput),
                  adjustedOutputQuantity: Math.max(0, budgetData.outputQuantity - totalTrackedOutput)
                };

                await AccService.updatePerformanceTrackingItemInstance(projectId, mainInstance.id, updateData);
                totalUpdated++;
                console.log(`✅ Updated main instance with accumulated values for: ${item.name}`);
              } catch (updateError) {
                console.error(`❌ Error updating main instance:`, updateError);
                errors.push({ item: item.name, error: updateError.message });
              }
            } else {
              // Create new main instance with timesheet data
              try {
                const instanceData = {
                  performanceTrackingItemId: item.id,
                  budgetId: item.budgetId,
                  name: item.name,
                  inputUnit: budgetData.inputUnit || 'hr',
                  inputQuantity: budgetData.inputQuantity || 0,
                  inputUnitPrice: budgetData.inputUnitCost || 0,
                  outputUnit: budgetData.outputUnit || 'units',
                  outputQuantity: budgetData.outputQuantity || 1,
                  outputUnitPrice: budgetData.outputUnitCost || 0,
                  trackedInputQuantity: totalTrackedInput,
                  trackedOutputQuantity: totalTrackedOutput,
                  adjustedInputQuantity: Math.max(0, budgetData.inputQuantity - totalTrackedInput),
                  adjustedOutputQuantity: Math.max(0, budgetData.outputQuantity - totalTrackedOutput),
                  description: `Performance tracking for ${item.name} - consolidated from ${budgetTimesheets.length} timesheet entries`,
                  status: 'active',
                  isActive: true
                };

                await AccService.createPerformanceTrackingItemInstance(projectId, instanceData);
                totalUpdated++;
                console.log(`✅ Created main instance with timesheet data for: ${item.name}`);
              } catch (createError) {
                console.error(`❌ Error creating main instance:`, createError);
                errors.push({ item: item.name, error: createError.message });
              }
            }

            // Delete all user instances
            for (const userInstance of userInstances) {
              try {
                await AccService.deletePerformanceTrackingItemInstance(projectId, userInstance.id);
                totalPurged++;
                console.log(`✅ Deleted user instance: ${userInstance.name} (${userInstance.id})`);
              } catch (deleteError) {
                console.error(`❌ Error deleting user instance ${userInstance.id}:`, deleteError);
                errors.push({ instance: userInstance.name, error: deleteError.message });
              }
            }
          } else {
            console.log(`⚠️ No timesheet data found for task: ${item.name}`);
          }
        } catch (itemError) {
          console.error(`❌ Error processing item ${item.name}:`, itemError);
          errors.push({ item: item.name, error: itemError.message });
        }
      }

      if (errors.length === 0) {
        console.log(`✅ Cleanup completed: ${totalPurged} user instances deleted, ${totalUpdated} main instances updated/created`);
        return {
          success: true,
          purgedCount: totalPurged,
          updatedCount: totalUpdated,
          message: `Successfully cleaned up ${totalPurged} user instances and updated/created ${totalUpdated} main instances with accumulated timesheet data`
        };
      } else {
        console.log(`⚠️ Cleanup completed with errors: ${totalPurged} deleted, ${totalUpdated} updated/created, ${errors.length} errors`);
        return {
          success: true,
          purgedCount: totalPurged,
          updatedCount: totalUpdated,
          errors: errors,
          message: `Cleaned up ${totalPurged} user instances, updated/created ${totalUpdated} main instances with ${errors.length} errors`
        };
      }
    } catch (error) {
      console.error('❌ Error cleaning up instances:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to clean up instances: ${error.message}`
      };
    }
  }

  // Helper method to get or create performance tracking item
  async getOrCreatePerformanceTrackingItem(projectId, budgetId) {
    try {
      // First, try to get existing performance tracking items for this budget
      console.log(`📊 Looking for existing performance tracking items for budget: ${budgetId}`);
      const existingItems = await AccService.getPerformanceTrackingItems(projectId, {
        filter: { budgetId: [budgetId] }
      });
      
      if (existingItems && existingItems.length > 0) {
        console.log(`📊 Found existing performance tracking item for budget ${budgetId}: ${existingItems[0].id}`);
        console.log(`📊 Performance Tracking Item details:`, {
          id: existingItems[0].id,
          name: existingItems[0].name,
          budgetId: existingItems[0].budgetId,
          status: existingItems[0].status
        });
        return existingItems[0];
      }
      
      // Create new performance tracking item linked to the budget
      console.log(`📊 Creating new performance tracking item for budget ${budgetId}`);
      console.log(`📊 This will create a Performance Tracking Item that can have multiple instances`);
      
      const newItem = await AccService.createPerformanceTrackingItem(projectId, budgetId);
      console.log(`✅ Created performance tracking item: ${newItem.id} for budget: ${budgetId}`);
      console.log(`📊 New Performance Tracking Item details:`, {
        id: newItem.id,
        name: newItem.name,
        budgetId: newItem.budgetId,
        status: newItem.status
      });
      
      return newItem;
    } catch (error) {
      console.error('❌ Error getting/creating performance tracking item:', error);
      console.error('❌ Budget ID:', budgetId, 'Project ID:', projectId);
      throw error;
    }
  }


  // Helper method to update performance tracking item instance
  async updatePerformanceTrackingItemInstance(projectId, instanceId, updateData) {
    try {
      console.log(`📊 Updating performance tracking item instance ${instanceId}`);
      const updatedInstance = await AccService.updatePerformanceTrackingItemInstance(
        projectId, 
        instanceId, 
        updateData
      );
      console.log(`✅ Updated performance tracking item instance: ${instanceId}`);
      return updatedInstance;
    } catch (error) {
      console.error('❌ Error updating performance tracking item instance:', error);
      throw error;
    }
  }

  // Live Relationship Monitoring System
  // Track Performance Tracking instance relationships and notify on changes
  
  // Store Performance Tracking instance relationships
  storeInstanceRelationship(projectId, instanceId, timesheetIds) {
    try {
      const relationships = this.getStoredRelationships();
      const key = `${projectId}_${instanceId}`;
      
      relationships[key] = {
        projectId,
        instanceId,
        timesheetIds: Array.isArray(timesheetIds) ? timesheetIds : [timesheetIds],
        createdAt: new Date().toISOString(),
        lastChecked: new Date().toISOString()
      };
      
      localStorage.setItem('cewa_instance_relationships', JSON.stringify(relationships));
      console.log(`📊 Stored relationship for instance ${instanceId} with ${timesheetIds.length} timesheets`);
    } catch (error) {
      console.error('❌ Error storing instance relationship:', error);
    }
  }

  // Get stored Performance Tracking instance relationships
  getStoredRelationships() {
    try {
      const stored = localStorage.getItem('cewa_instance_relationships');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ Error getting stored relationships:', error);
      return {};
    }
  }

  // Get relationships for a specific project
  getProjectRelationships(projectId) {
    const relationships = this.getStoredRelationships();
    return Object.values(relationships).filter(rel => rel.projectId === projectId);
  }

  // Check for Performance Tracking instance deletions and notify
  async checkInstanceDeletions(projectId) {
    try {
      console.log(`📊 Checking for Performance Tracking instance deletions in project: ${projectId}`);
      
      const relationships = this.getProjectRelationships(projectId);
      const knownInstanceIds = relationships.map(rel => rel.instanceId);
      
      if (knownInstanceIds.length === 0) {
        console.log(`📊 No known instances to check for project: ${projectId}`);
        return { deletedInstances: [], notifications: [] };
      }
      
      // Check each known instance
      const deletionResults = [];
      const notifications = [];
      
      for (const relationship of relationships) {
        try {
          const exists = await AccService.checkPerformanceTrackingInstanceExists(projectId, relationship.instanceId);
          
          if (!exists) {
            console.log(`❌ Performance Tracking instance deleted: ${relationship.instanceId}`);
            deletionResults.push(relationship);
            
            // Create notification for affected timesheets
            for (const timesheetId of relationship.timesheetIds) {
              const notification = {
                id: `deletion_${relationship.instanceId}_${timesheetId}_${Date.now()}`,
                type: 'instance_deleted',
                title: 'Performance Tracking Instance Deleted',
                message: `The Performance Tracking instance associated with this timesheet has been deleted from ACC.`,
                instanceId: relationship.instanceId,
                timesheetId: timesheetId,
                projectId: projectId,
                severity: 'warning',
                timestamp: new Date().toISOString(),
                read: false
              };
              
              notifications.push(notification);
              this.addNotification(notification);
            }
            
            // Update timesheet sync status
            for (const timesheetId of relationship.timesheetIds) {
              this.updateSyncStatus(timesheetId, false, 'Instance Deleted from ACC');
            }
          } else {
            // Update last checked timestamp
            relationship.lastChecked = new Date().toISOString();
            this.updateRelationship(relationship);
          }
        } catch (error) {
          console.error(`❌ Error checking instance ${relationship.instanceId}:`, error);
        }
      }
      
      console.log(`📊 Instance deletion check completed: ${deletionResults.length} deleted instances found`);
      return { deletedInstances: deletionResults, notifications };
      
    } catch (error) {
      console.error('❌ Error checking instance deletions:', error);
      throw error;
    }
  }

  // Update relationship data
  updateRelationship(relationship) {
    try {
      const relationships = this.getStoredRelationships();
      const key = `${relationship.projectId}_${relationship.instanceId}`;
      relationships[key] = relationship;
      localStorage.setItem('cewa_instance_relationships', JSON.stringify(relationships));
    } catch (error) {
      console.error('❌ Error updating relationship:', error);
    }
  }

  // Remove relationship when instance is deleted
  removeRelationship(projectId, instanceId) {
    try {
      const relationships = this.getStoredRelationships();
      const key = `${projectId}_${instanceId}`;
      delete relationships[key];
      localStorage.setItem('cewa_instance_relationships', JSON.stringify(relationships));
      console.log(`📊 Removed relationship for instance: ${instanceId}`);
    } catch (error) {
      console.error('❌ Error removing relationship:', error);
    }
  }

  // Notification system for Performance Tracking changes
  addNotification(notification) {
    try {
      const notifications = this.getNotifications();
      notifications.unshift(notification); // Add to beginning
      
      // Keep only last 100 notifications
      if (notifications.length > 100) {
        notifications.splice(100);
      }
      
      localStorage.setItem('cewa_notifications', JSON.stringify(notifications));
      console.log(`📊 Added notification: ${notification.title}`);
    } catch (error) {
      console.error('❌ Error adding notification:', error);
    }
  }

  // Get all notifications
  getNotifications() {
    try {
      const stored = localStorage.getItem('cewa_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Error getting notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  markNotificationRead(notificationId) {
    try {
      const notifications = this.getNotifications();
      const notification = notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        localStorage.setItem('cewa_notifications', JSON.stringify(notifications));
        console.log(`📊 Marked notification as read: ${notificationId}`);
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  }

  // Get unread notifications count
  getUnreadNotificationsCount() {
    try {
      const notifications = this.getNotifications();
      return notifications.filter(n => !n.read).length;
    } catch (error) {
      console.error('❌ Error getting unread notifications count:', error);
      return 0;
    }
  }

  // Monitor Performance Tracking changes periodically
  async startInstanceMonitoring(projectId, intervalMinutes = 5) {
    try {
      console.log(`📊 Starting Performance Tracking instance monitoring for project: ${projectId} (every ${intervalMinutes} minutes)`);
      
      const checkInstances = async () => {
        try {
          await this.checkInstanceDeletions(projectId);
        } catch (error) {
          console.error('❌ Error in instance monitoring:', error);
        }
      };
      
      // Initial check
      await checkInstances();
      
      // Set up periodic checking
      const intervalId = setInterval(checkInstances, intervalMinutes * 60 * 1000);
      
      // Store interval ID for cleanup
      localStorage.setItem(`cewa_monitoring_${projectId}`, intervalId.toString());
      
      console.log(`✅ Instance monitoring started for project: ${projectId}`);
      return intervalId;
    } catch (error) {
      console.error('❌ Error starting instance monitoring:', error);
      throw error;
    }
  }

  // Stop instance monitoring
  stopInstanceMonitoring(projectId) {
    try {
      const intervalId = localStorage.getItem(`cewa_monitoring_${projectId}`);
      if (intervalId) {
        clearInterval(parseInt(intervalId));
        localStorage.removeItem(`cewa_monitoring_${projectId}`);
        console.log(`📊 Stopped instance monitoring for project: ${projectId}`);
      }
    } catch (error) {
      console.error('❌ Error stopping instance monitoring:', error);
    }
  }

  // Enhanced sync status update with instance relationship tracking
  updateSyncStatus(timesheetId, isSynced, reason = null) {
    try {
      const timesheets = this.getAll();
      const timesheet = timesheets.find(t => t.id === timesheetId);
      
      if (timesheet) {
        timesheet.isSynced = isSynced;
        timesheet.lastSyncDate = isSynced ? new Date().toISOString() : timesheet.lastSyncDate;
        timesheet.syncStatus = isSynced ? 'Synced' : (reason || 'Not Synced');
        timesheet.syncReason = reason;
        
        this.save(timesheets);
        console.log(`📊 Updated sync status for timesheet ${timesheetId}: ${isSynced ? 'Synced' : 'Not Synced'}${reason ? ` (${reason})` : ''}`);
      }
    } catch (error) {
      console.error('❌ Error updating sync status:', error);
    }
  }


  /**
   * Sync multiple timesheet entries in one go.
   * Groups entries by budget → creates/updates single instance per budget with accumulated data.
   */
  async syncAllTimesheets(projectId, timesheetEntries) {
    try {
      console.log(`🔄 Starting batch sync for ${timesheetEntries.length} timesheet entries`);

      // Group entries by budget
      const grouped = timesheetEntries.reduce((acc, entry) => {
        acc[entry.budgetId] = acc[entry.budgetId] || [];
        acc[entry.budgetId].push(entry);
        return acc;
      }, {});

      const syncReport = [];

      // Process each budget group
      for (const budgetId of Object.keys(grouped)) {
        console.log(`🔄 Syncing timesheets for Budget: ${budgetId}`);

        try {
          // Create or update single instance for this budget
          await this.syncBudgetInstance(projectId, budgetId, grouped[budgetId]);

          syncReport.push({
            budgetId: budgetId,
            entryCount: grouped[budgetId].length,
            status: 'success',
            message: `Successfully synced ${grouped[budgetId].length} entries for budget ${budgetId}`
          });

          console.log(`🎯 Completed sync for Budget: ${budgetId}`);
        } catch (budgetError) {
          console.error(`❌ Error syncing budget ${budgetId}:`, budgetError);
          syncReport.push({
            budgetId: budgetId,
            entryCount: grouped[budgetId].length,
            status: 'error',
            message: `Failed to sync budget ${budgetId}: ${budgetError.message}`
          });
        }
      }

      console.log("✅ All timesheets synced successfully");
      return {
        success: true,
        message: 'Batch sync completed',
        syncReport: syncReport
      };
    } catch (err) {
      console.error("❌ Error syncing all timesheets:", err);
      throw err;
    }
  }

  /**
   * Create or update a single instance per budget with accumulated tracked data
   */
  async syncBudgetInstance(projectId, budgetId, timesheetEntries) {
    try {
      console.log(`🔄 Creating/updating single instance for budget: ${budgetId}`);

      // 1️⃣ Get budget info
      const budgetData = await this.getBudgetData(projectId, budgetId);

      // 2️⃣ Get or create performance tracking item
      const trackingItem = await this.getOrCreatePerformanceTrackingItem(projectId, budgetId);

      // 3️⃣ Calculate accumulated tracked data from all timesheet entries
      const totalTrackedInput = timesheetEntries.reduce((sum, entry) => sum + (parseFloat(entry.hours) || 0), 0);
      const totalTrackedOutput = timesheetEntries.reduce((sum, entry) => sum + (parseFloat(entry.outputUnits) || 0), 0);

      console.log(`📊 Accumulated data for budget ${budgetId}:`, {
        totalTrackedInput,
        totalTrackedOutput,
        entryCount: timesheetEntries.length,
        sampleEntries: timesheetEntries.slice(0, 3).map(entry => ({
          id: entry.id,
          hours: entry.hours,
          outputUnits: entry.outputUnits,
          userName: entry.userName
        }))
      });

      // 4️⃣ Check if instance already exists
      const instances = await AccService.getPerformanceTrackingItemInstances(projectId, {
        filter: { performanceTrackingItemId: [trackingItem.id] }
      });

      // Look for existing budget instance (not user-specific instances)
      const existingInstance = instances.find(inst => 
        inst.name === budgetData.name || 
        inst.name === `Budget Total - ${budgetData.name}` ||
        inst.name?.includes(budgetData.name)
      );

      if (existingInstance) {
        // Update existing instance with accumulated data (add to existing values)
        console.log(`🔄 Updating existing instance: ${existingInstance.id}`);
        
        // Get current tracked values from the existing instance
        const currentTrackedInput = parseFloat(existingInstance.trackedInputQuantity) || 0;
        const currentTrackedOutput = parseFloat(existingInstance.trackedOutputQuantity) || 0;
        
        // Add new timesheet values to existing values
        const newTotalTrackedInput = currentTrackedInput + totalTrackedInput;
        const newTotalTrackedOutput = currentTrackedOutput + totalTrackedOutput;
        
        console.log(`📊 Accumulating values: Current(${currentTrackedInput}+${currentTrackedOutput}) + New(${totalTrackedInput}+${totalTrackedOutput}) = Total(${newTotalTrackedInput}+${newTotalTrackedOutput})`);
        
        const updateData = {
          trackedInputQuantity: newTotalTrackedInput,
          trackedOutputQuantity: newTotalTrackedOutput,
          // Recalculate percentages
          inputUsedPercentage: budgetData.inputQuantity > 0 ? (newTotalTrackedInput / budgetData.inputQuantity) * 100 : 0,
          outputCompletedPercentage: budgetData.outputQuantity > 0 ? (newTotalTrackedOutput / budgetData.outputQuantity) * 100 : 0,
          // Recalculate productivity rate
          productivityRate: newTotalTrackedOutput > 0 ? newTotalTrackedInput / newTotalTrackedOutput : 0,
          // Recalculate variances
          inputVariance: newTotalTrackedInput - budgetData.inputQuantity,
          outputVariance: newTotalTrackedOutput - budgetData.outputQuantity,
          // Update adjusted quantities
          adjustedInputQuantity: Math.max(0, budgetData.inputQuantity - newTotalTrackedInput),
          adjustedOutputQuantity: Math.max(0, budgetData.outputQuantity - newTotalTrackedOutput)
        };

        await AccService.updatePerformanceTrackingItemInstance(projectId, existingInstance.id, updateData);
        console.log(`✅ Updated instance for budget ${budgetId} with accumulated values`);
      } else {
        // Create new instance with accumulated data
        console.log(`🔄 Creating new instance for budget: ${budgetId}`);
        
        const instanceData = {
          performanceTrackingItemId: trackingItem.id,
          budgetId: budgetId,
          name: budgetData.name,
          inputUnit: 'hr',
          inputQuantity: budgetData.inputQuantity || 0,
          inputUnitPrice: budgetData.inputUnitCost || 0,
          outputUnit: budgetData.outputUnit || 'units',
          outputQuantity: budgetData.outputQuantity || 1,
          outputUnitPrice: budgetData.outputUnitCost || 0,
          trackedInputQuantity: totalTrackedInput,
          trackedOutputQuantity: totalTrackedOutput,
          adjustedInputQuantity: Math.max(0, budgetData.inputQuantity - totalTrackedInput),
          adjustedOutputQuantity: Math.max(0, budgetData.outputQuantity - totalTrackedOutput),
          description: `Performance tracking for ${budgetData.name} - accumulated from ${timesheetEntries.length} timesheet entries`,
          status: 'active',
          isActive: true
        };

        await AccService.createPerformanceTrackingItemInstance(projectId, instanceData);
        console.log(`✅ Created new instance for budget ${budgetId}`);
      }

      return true;
    } catch (err) {
      console.error("❌ Error syncing budget instance:", err);
      throw err;
    }
  }


  /**
   * Update master instance for a budget (adjust output quantity using PATCH)
   * Master instances have numbers ending with "-01"
   */
  async updateMasterInstance(projectId, budgetId) {
    try {
      console.log(`🔄 Updating master instance for budget: ${budgetId}`);

      // 1️⃣ Get budget info
      const budgetData = await this.getBudgetData(projectId, budgetId);

      // 2️⃣ Get all instances for this budget
      const trackingItem = await this.getOrCreatePerformanceTrackingItem(projectId, budgetId);
      const instances = await AccService.getPerformanceTrackingItemInstances(projectId, {
        filter: { performanceTrackingItemId: [trackingItem.id] }
      });

      // 3️⃣ Find master instance (number ends with "-01")
      const masterInstance = instances.find(inst => 
        inst.number?.endsWith('-01')
      );

      if (masterInstance) {
        console.log(`🔄 Found master instance to update: ${masterInstance.id} (number: ${masterInstance.number})`);
        
        // 4️⃣ Calculate adjusted values
        const userInstances = instances.filter(inst => 
          !inst.number?.endsWith('-01')
        );

        const totalUserOutputQty = userInstances.reduce((sum, inst) => sum + (parseFloat(inst.outputQuantity) || 0), 0);
        const totalUserInputUnitCost = userInstances.reduce((sum, inst) => sum + (parseFloat(inst.inputUnitPrice) || 0), 0);
        
        // Apply honest formulas:
        // Adjusted Output Qty = Original Budget Output Qty - Sum of User Instance Output Qty
        const originalOutputQty = parseFloat(budgetData.outputQuantity) || 1;
        const adjustedOutputQty = Math.max(0, originalOutputQty - totalUserOutputQty);
        
        // Adjusted Input Unit Cost = Original Budget Input Unit Cost - Sum of User Instance Input Unit Costs
        const originalInputUnitCost = parseFloat(budgetData.inputUnitCost) || 0;
        const adjustedInputUnitCost = Math.max(0, originalInputUnitCost - totalUserInputUnitCost);

        console.log(`📊 MASTER INSTANCE UPDATE DETAILS:`);
        console.log(`   Project ID: ${projectId}`);
        console.log(`   Budget: ${budgetData.name} (${budgetId})`);
        console.log(`   Budget Code: ${budgetData.code || 'N/A'}`);
        console.log(`   Master Instance: ${masterInstance.number} (${masterInstance.id})`);
        console.log(`   Master Instance Name: ${masterInstance.name || 'N/A'}`);
        console.log(`   Original Output Qty: ${originalOutputQty}`);
        console.log(`   User Instances Output Qty Sum: ${totalUserOutputQty}`);
        console.log(`   Adjusted Output Qty: ${adjustedOutputQty} (${originalOutputQty} - ${totalUserOutputQty})`);
        console.log(`   Original Input Unit Cost: ${originalInputUnitCost}`);
        console.log(`   User Instances Input Unit Cost Sum: ${totalUserInputUnitCost}`);
        console.log(`   Adjusted Input Unit Cost: ${adjustedInputUnitCost} (${originalInputUnitCost} - ${totalUserInputUnitCost})`);
        console.log(`   User Instances Count: ${userInstances.length}`);

        // 5️⃣ Update the master instance using PATCH
        const updateData = {
          adjustedOutputQuantity: adjustedOutputQty,
          inputUnitPrice: adjustedInputUnitCost
        };

        await AccService.updatePerformanceTrackingItemInstance(projectId, masterInstance.id, updateData);
        console.log(`✅ Successfully updated master instance: ${masterInstance.id} (number: ${masterInstance.number})`);
        console.log(`📊 Final Update: adjustedOutputQty=${adjustedOutputQty}, adjustedInputUnitCost=${adjustedInputUnitCost}`);
      } else {
        console.log(`ℹ️ No master instance found for budget: ${budgetId} (no instance with number ending in "-01")`);
      }

    } catch (err) {
      console.error("❌ Error updating master instance:", err);
      throw err;
    }
  }

  /**
   * Purge non-user instances from Performance Tracker
   * Deletes instances that are NOT user name instances (main budget/task instances)
   */
  async purgeNonUserInstances(projectId) {
    try {
      console.log(`🗑️ Purging non-user instances for project: ${projectId}`);
      
      // Ensure project ID has the correct format for ACC API calls
      const accProjectId = projectId.startsWith('b.') ? projectId : `b.${projectId}`;
      console.log(`🔍 Using ACC project ID: ${accProjectId}`);
      
      // Get all Performance Tracking instances for the project
      const allInstances = await AccService.getPerformanceTrackingItemInstances(accProjectId, { limit: 1000 });
      console.log(`📊 Found ${allInstances.length} total instances`);
      
      // Filter out user instances (instances with user names that include dates)
      const nonUserInstances = allInstances.filter(instance => {
        const name = instance.name || '';
        // Non-user instances are those that:
        // 1. End with "-01" (master instances)
        // 2. Don't contain a date pattern (YYYY-MM-DD)
        // 3. Are named "Budget Total" or similar
        const hasDatePattern = /\d{4}-\d{2}-\d{2}/.test(name);
        const isMasterInstance = instance.number?.endsWith('-01');
        const isBudgetTotal = name.toLowerCase().includes('budget total') || 
                             name.toLowerCase().includes('construction contract');
        
        return !hasDatePattern && (isMasterInstance || isBudgetTotal);
      });
      
      console.log(`🗑️ Found ${nonUserInstances.length} non-user instances to purge:`, 
        nonUserInstances.map(inst => ({ id: inst.id, name: inst.name, number: inst.number }))
      );
      
      let purgedCount = 0;
      const errors = [];
      
      // Delete each non-user instance
      for (const instance of nonUserInstances) {
        try {
          await AccService.deletePerformanceTrackingItemInstance(accProjectId, instance.id);
          console.log(`✅ Purged instance: ${instance.name} (${instance.id})`);
          purgedCount++;
        } catch (error) {
          console.error(`❌ Failed to purge instance ${instance.name}:`, error);
          errors.push({ instance: instance.name, error: error.message });
        }
      }
      
      console.log(`✅ Purge completed: ${purgedCount} instances deleted, ${errors.length} errors`);
      
      return {
        success: true,
        purgedCount,
        totalFound: nonUserInstances.length,
        errors: errors.length > 0 ? errors : null
      };
      
    } catch (error) {
      console.error('❌ Error purging non-user instances:', error);
      return {
        success: false,
        error: error.message,
        purgedCount: 0
      };
    }
  }

  /**
   * Purge instances for a specific budget
   * Deletes non-user instances for the given budget ID
   */
  async purgeInstancesForBudget(projectId, budgetId) {
    try {
      console.log(`🗑️ Purging instances for budget: ${budgetId} in project: ${projectId}`);
      
      // Ensure project ID has the correct format for ACC API calls
      const accProjectId = projectId.startsWith('b.') ? projectId : `b.${projectId}`;
      console.log(`🔍 Using ACC project ID: ${accProjectId}`);
      
      // Get all Performance Tracking instances for the project
      const allInstances = await AccService.getPerformanceTrackingItemInstances(accProjectId, { limit: 1000 });
      console.log(`📊 Found ${allInstances.length} total instances`);
      
      // Find the Performance Tracking Item for this budget
      const trackingItem = await this.getOrCreatePerformanceTrackingItem(accProjectId, budgetId);
      
      // Filter instances for this specific budget/tracking item
      const budgetInstances = allInstances.filter(instance => 
        instance.performanceTrackingItemId === trackingItem.id
      );
      
      console.log(`📊 Found ${budgetInstances.length} instances for budget ${budgetId}`);
      
      // Filter out user instances (instances with user names that include dates)
      const nonUserInstances = budgetInstances.filter(instance => {
        const name = instance.name || '';
        // Non-user instances are those that:
        // 1. End with "-01" (master instances)
        // 2. Don't contain a date pattern (YYYY-MM-DD)
        // 3. Are named "Budget Total" or similar
        const hasDatePattern = /\d{4}-\d{2}-\d{2}/.test(name);
        const isMasterInstance = instance.number?.endsWith('-01');
        const isBudgetTotal = name.toLowerCase().includes('budget total') || 
                             name.toLowerCase().includes('construction contract');
        
        return !hasDatePattern && (isMasterInstance || isBudgetTotal);
      });
      
      console.log(`🗑️ Found ${nonUserInstances.length} non-user instances to purge for budget ${budgetId}:`, 
        nonUserInstances.map(inst => ({ id: inst.id, name: inst.name, number: inst.number }))
      );
      
      let purgedCount = 0;
      const errors = [];
      
      // Delete each non-user instance
      for (const instance of nonUserInstances) {
        try {
          await AccService.deletePerformanceTrackingItemInstance(accProjectId, instance.id);
          console.log(`✅ Purged instance: ${instance.name} (${instance.id})`);
          purgedCount++;
        } catch (error) {
          console.error(`❌ Failed to purge instance ${instance.name}:`, error);
          errors.push({ instance: instance.name, error: error.message });
        }
      }
      
      console.log(`✅ Purge completed for budget ${budgetId}: ${purgedCount} instances deleted, ${errors.length} errors`);
      
      return {
        success: true,
        purgedCount,
        totalFound: nonUserInstances.length,
        budgetId,
        errors: errors.length > 0 ? errors : null
      };
      
    } catch (error) {
      console.error('❌ Error purging instances for budget:', error);
      return {
        success: false,
        error: error.message,
        purgedCount: 0,
        budgetId
      };
    }
  }

  /**
   * Generate a report of all instances for a given budget.
   * Shows budget, user instances, and master instance balance.
   */
  async getTimesheetReport(projectId, budgetId) {
    try {
      console.log(`📊 Generating timesheet report for Budget: ${budgetId}`);

      // 1️⃣ Fetch budget info
      const budgetData = await this.getBudgetData(projectId, budgetId);

      // 2️⃣ Get all instances for this budget
      const trackingItem = await this.getOrCreatePerformanceTrackingItem(projectId, budgetId);
      const instances = await AccService.getPerformanceTrackingItemInstances(projectId, {
        filter: { performanceTrackingItemId: [trackingItem.id] }
      });

      // 3️⃣ Separate master vs users
      const master = instances.find(inst => 
        inst.number?.endsWith('-01')
      );
      const users = instances.filter(inst => 
        !inst.number?.endsWith('-01')
      );

      // 4️⃣ Build report object
      const report = {
        budget: {
          id: budgetId,
          name: budgetData.name,
          inputQty: budgetData.inputQuantity || 0,
          outputQty: budgetData.outputQuantity || 1,
          inputUnitCost: budgetData.inputUnitCost || 0,
          outputUnitCost: budgetData.outputUnitCost || 0,
        },
        master: master ? {
          id: master.id,
          name: master.name,
          inputQty: master.inputQuantity || 0,
          outputQty: master.outputQuantity || 0,
          trackedInputQty: master.trackedInputQuantity || 0,
          trackedOutputQty: master.trackedOutputQuantity || 0,
          adjustedInputQty: master.adjustedInputQuantity || 0,
          adjustedOutputQty: master.adjustedOutputQuantity || 0,
        } : null,
        users: users.map(u => ({
          id: u.id,
          name: u.name,
          inputQty: u.inputQuantity || 0,
          outputQty: u.outputQuantity || 0,
          trackedInputQty: u.trackedInputQuantity || 0,
          trackedOutputQty: u.trackedOutputQuantity || 0,
        })),
        summary: {
          totalUserInput: users.reduce((sum, u) => sum + (u.trackedInputQuantity || 0), 0),
          totalUserOutput: users.reduce((sum, u) => sum + (u.trackedOutputQuantity || 0), 0),
          remainingInput: master ? (master.adjustedInputQuantity || 0) : 0,
          remainingOutput: master ? (master.adjustedOutputQuantity || 0) : 0,
        }
      };

      console.table(report.users); // quick console log of users
      console.log("Master:", report.master);
      console.log("Budget:", report.budget);
      console.log("Summary:", report.summary);

      return report;
    } catch (err) {
      console.error("❌ Error generating timesheet report:", err);
      throw err;
    }
  }
}

// Helper function to determine hub region
function getHubRegion(hubId) {
  const cleanHubId = hubId.startsWith('b.') ? hubId.substring(2) : hubId;
  
  console.log(`🔍 Detecting region for hub: ${hubId} (clean: ${cleanHubId})`);
  
  const apacHubs = ['apacHub1', 'apacHub2']; // replace with your actual APAC hubIds
  const usHubs = ['usHub1', 'usHub2'];       // replace with your actual US hubIds
  
  if (apacHubs.includes(cleanHubId)) {
    console.log(`✅ Hub ${hubId} mapped to APAC (specific mapping)`);
    return 'APAC';
  }
  if (usHubs.includes(cleanHubId)) {
    console.log(`✅ Hub ${hubId} mapped to US (specific mapping)`);
    return 'US';
  }
  
  if (cleanHubId.toLowerCase().includes('apac') || 
      cleanHubId.toLowerCase().includes('asia') || 
      cleanHubId.toLowerCase().includes('australia') ||
      cleanHubId.toLowerCase().includes('sydney') ||
      cleanHubId.toLowerCase().includes('melbourne') ||
      cleanHubId.toLowerCase().includes('singapore')) {
    console.log(`✅ Hub ${hubId} detected as APAC (pattern matching)`);
    return 'APAC';
  }
  
  if (cleanHubId.toLowerCase().includes('us') || 
      cleanHubId.toLowerCase().includes('america') || 
      cleanHubId.toLowerCase().includes('north') ||
      cleanHubId.toLowerCase().includes('united') ||
      cleanHubId.toLowerCase().includes('states') ||
      cleanHubId.toLowerCase().includes('california') ||
      cleanHubId.toLowerCase().includes('texas') ||
      cleanHubId.toLowerCase().includes('newyork')) {
    console.log(`✅ Hub ${hubId} detected as US (pattern matching)`);
    return 'US';
  }
  
  console.warn(`⚠️ Cannot determine region for hub: ${hubId}`);
  console.warn(`⚠️ Please add this hub ID to the appropriate region mapping in LocalTimesheetService.js`);
  console.warn(`Current APAC hubs: ${apacHubs.join(', ')}`);
  console.warn(`Current US hubs: ${usHubs.join(', ')}`);
  
  return 'UNKNOWN';
}
