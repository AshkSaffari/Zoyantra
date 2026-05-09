// LocalTimesheetService.js - Local storage for timesheet data

// eslint-disable-next-line import/no-anonymous-default-export
export default class LocalTimesheetService {
  constructor() {
    this.storageKey = 'zoyantra_timesheets';
    this.archivedStorageKey = 'zoyantra_archived_timesheets';
  }

  // Get all timesheets
  getAll() {
    try {
      const timesheets = localStorage.getItem(this.storageKey);
      return timesheets ? JSON.parse(timesheets) : [];
    } catch (error) {
      console.error('Error loading timesheets:', error);
      return [];
    }
  }

  // Get archived timesheets
  getArchived() {
    try {
      const archived = localStorage.getItem(this.archivedStorageKey);
      return archived ? JSON.parse(archived) : [];
    } catch (error) {
      console.error('Error loading archived timesheets:', error);
      return [];
    }
  }

  // Create new timesheet
  create(timesheetData) {
    try {
      const timesheets = this.getAll();
      const newTimesheet = {
        ...timesheetData,
        id: timesheetData.id || Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      timesheets.push(newTimesheet);
      localStorage.setItem(this.storageKey, JSON.stringify(timesheets));
      console.log('✅ Timesheet created:', newTimesheet);
      return newTimesheet;
    } catch (error) {
      console.error('Error creating timesheet:', error);
      throw error;
    }
  }

  // Update existing timesheet
  update(timesheetData) {
    try {
    const timesheets = this.getAll();
      const index = timesheets.findIndex(t => t.id === timesheetData.id);
    
    if (index !== -1) {
      timesheets[index] = {
        ...timesheets[index],
          ...timesheetData,
        updatedAt: new Date().toISOString()
      };
        localStorage.setItem(this.storageKey, JSON.stringify(timesheets));
        console.log('✅ Timesheet updated:', timesheets[index]);
      return timesheets[index];
      } else {
        throw new Error('Timesheet not found');
      }
    } catch (error) {
      console.error('Error updating timesheet:', error);
      throw error;
    }
  }

  // Delete timesheet
  delete(id) {
    try {
      const timesheets = this.getAll();
      const filteredTimesheets = timesheets.filter(t => t.id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(filteredTimesheets));
      console.log('✅ Timesheet deleted:', id);
      return true;
        } catch (error) {
      console.error('Error deleting timesheet:', error);
      throw error;
    }
  }

  // Archive timesheet
  archive(id) {
    try {
      const timesheets = this.getAll();
      const timesheet = timesheets.find(t => t.id === id);
      
      if (timesheet) {
        // Add to archived
        const archived = this.getArchived();
        const archivedTimesheet = {
          ...timesheet,
          isArchived: true,
          archivedAt: new Date().toISOString(),
          archivedReason: 'Manual archive'
        };
        archived.push(archivedTimesheet);
        localStorage.setItem(this.archivedStorageKey, JSON.stringify(archived));
        
        // Remove from active
        const filteredTimesheets = timesheets.filter(t => t.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(filteredTimesheets));
        
        console.log('✅ Timesheet archived:', id);
        return archivedTimesheet;
            } else {
        throw new Error('Timesheet not found');
      }
    } catch (error) {
      console.error('Error archiving timesheet:', error);
      throw error;
    }
  }

  // Add to archived (for direct archiving)
  addToArchived(timesheetData) {
    try {
      const archived = this.getArchived();
      const archivedTimesheet = {
        ...timesheetData,
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archivedReason: 'Direct archive'
      };
      archived.push(archivedTimesheet);
      localStorage.setItem(this.archivedStorageKey, JSON.stringify(archived));
      console.log('✅ Timesheet added to archived:', archivedTimesheet);
      return archivedTimesheet;
    } catch (error) {
      console.error('Error adding to archived:', error);
      throw error;
    }
  }

  // Restore timesheet from archive
  restore(id) {
    try {
      const archived = this.getArchived();
      const timesheet = archived.find(t => t.id === id);
      
      if (timesheet) {
        // Add back to active
        const timesheets = this.getAll();
        const restoredTimesheet = {
          ...timesheet,
          isArchived: false,
          restoredAt: new Date().toISOString(),
          restoredReason: 'Manual restore'
        };
        delete restoredTimesheet.archivedAt;
        delete restoredTimesheet.archivedReason;
        
        timesheets.push(restoredTimesheet);
        localStorage.setItem(this.storageKey, JSON.stringify(timesheets));
        
        // Remove from archived
        const filteredArchived = archived.filter(t => t.id !== id);
        localStorage.setItem(this.archivedStorageKey, JSON.stringify(filteredArchived));
        
        console.log('✅ Timesheet restored:', id);
        return restoredTimesheet;
          } else {
        throw new Error('Archived timesheet not found');
          }
        } catch (error) {
      console.error('Error restoring timesheet:', error);
      throw error;
    }
  }

  // Save timesheets (for bulk operations)
  save(timesheets) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(timesheets));
      console.log('✅ Timesheets saved:', timesheets.length);
      return true;
    } catch (error) {
      console.error('Error saving timesheets:', error);
      throw error;
    }
  }

  // Get timesheet by ID
  getById(id) {
    try {
      const timesheets = this.getAll();
      return timesheets.find(t => t.id === id);
    } catch (error) {
      console.error('Error getting timesheet by ID:', error);
      return null;
    }
  }

  // Get timesheets by project
  getByProject(projectId) {
    try {
      const timesheets = this.getAll();
      return timesheets.filter(t => t.projectId === projectId);
    } catch (error) {
      console.error('Error getting timesheets by project:', error);
      return [];
    }
  }

  // Get timesheets by user
  getByUser(userId) {
    try {
      const timesheets = this.getAll();
      return timesheets.filter(t => t.userId === userId);
    } catch (error) {
      console.error('Error getting timesheets by user:', error);
      return [];
    }
  }

  // Get timesheets by budget
  getByBudget(budgetId) {
    try {
      const timesheets = this.getAll();
      return timesheets.filter(t => t.budgetId === budgetId);
    } catch (error) {
      console.error('Error getting timesheets by budget:', error);
      return [];
    }
  }

  // Search timesheets
  search(query) {
    try {
      const timesheets = this.getAll();
      const lowerQuery = query.toLowerCase();
      
      return timesheets.filter(t => 
        t.userName?.toLowerCase().includes(lowerQuery) ||
        t.taskName?.toLowerCase().includes(lowerQuery) ||
        t.budgetName?.toLowerCase().includes(lowerQuery) ||
        t.description?.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error searching timesheets:', error);
      return [];
    }
  }

  // Export timesheets to CSV
  downloadCSV(filename = 'timesheets.csv') {
    try {
      const timesheets = this.getAll();
      
      if (timesheets.length === 0) {
        alert('No timesheets to export');
        return;
      }

      // Convert to CSV format
      const headers = [
        'ID', 'Project', 'User', 'Email', 'Task', 'Budget', 'Date', 
        'Hours', 'Output Units', 'Description', 'Status', 'Created At'
      ];
      
      const csvData = timesheets.map(t => [
        t.id,
        t.projectName || '',
        t.userName || '',
        t.email || '',
        t.taskName || '',
        t.budgetName || '',
        t.date || '',
        t.hours || '',
        t.outputUnits || '',
        t.description || '',
        t.status || '',
        t.createdAt || ''
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ CSV exported:', filename);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV: ' + error.message);
    }
  }

  // Clear all data
  clearAll() {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.archivedStorageKey);
      console.log('✅ All timesheet data cleared');
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  // Get statistics
  getStats() {
    try {
      const timesheets = this.getAll();
      const archived = this.getArchived();
      
      const totalHours = timesheets.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
      const totalOutput = timesheets.reduce((sum, t) => sum + (parseFloat(t.outputUnits) || 0), 0);
      
      const projects = [...new Set(timesheets.map(t => t.projectId))];
      const users = [...new Set(timesheets.map(t => t.userId))];
      const budgets = [...new Set(timesheets.map(t => t.budgetId))];
      
      return {
        totalTimesheets: timesheets.length,
        totalArchived: archived.length,
        totalHours: totalHours,
        totalOutput: totalOutput,
        uniqueProjects: projects.length,
        uniqueUsers: users.length,
        uniqueBudgets: budgets.length
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalTimesheets: 0,
        totalArchived: 0,
        totalHours: 0,
        totalOutput: 0,
        uniqueProjects: 0,
        uniqueUsers: 0,
        uniqueBudgets: 0
      };
    }
  }

  // Mark timesheet as synced to Performance Tracker
  markAsSyncedToTracker(timesheetId) {
    try {
      // Check active timesheets first
      const timesheets = this.getAll();
      const activeTimesheet = timesheets.find(t => t.id === timesheetId);
      
      if (activeTimesheet) {
        activeTimesheet.syncedToTracker = true;
        activeTimesheet.syncedToTrackerAt = new Date().toISOString();
        localStorage.setItem(this.storageKey, JSON.stringify(timesheets));
        console.log('✅ Marked active timesheet as synced to tracker:', timesheetId);
        return;
      }

      // Check archived timesheets
      const archivedTimesheets = this.getArchived();
      const archivedTimesheet = archivedTimesheets.find(t => t.id === timesheetId);
      
      if (archivedTimesheet) {
        archivedTimesheet.syncedToTracker = true;
        archivedTimesheet.syncedToTrackerAt = new Date().toISOString();
        localStorage.setItem(this.archivedStorageKey, JSON.stringify(archivedTimesheets));
        console.log('✅ Marked archived timesheet as synced to tracker:', timesheetId);
        return;
      }

      console.warn('⚠️ Timesheet not found for syncing:', timesheetId);
    } catch (error) {
      console.error('❌ Error marking timesheet as synced to tracker:', error);
      throw error;
    }
  }
}
