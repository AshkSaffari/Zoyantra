/**
 * Audit Service - Tracks all changes, deletions, and modifications across the application
 * Provides comprehensive audit trail for timesheets, expenses, budgets, and other data
 */

class AuditService {
  constructor() {
    this.auditKey = 'zoyantra_audit_trail';
    this.maxAuditEntries = 10000; // Maximum audit entries to keep
  }

  /**
   * Log an audit event
   * @param {string} action - The action performed (create, update, delete, archive, restore)
   * @param {string} entityType - The type of entity (timesheet, expense, budget, crew, etc.)
   * @param {string} entityId - The ID of the entity
   * @param {Object} oldData - The data before the change (for updates/deletes)
   * @param {Object} newData - The data after the change (for creates/updates)
   * @param {string} userId - The user who performed the action
   * @param {string} projectId - The project context
   * @param {Object} metadata - Additional metadata
   */
  logAuditEvent(action, entityType, entityId, oldData = null, newData = null, userId = 'system', projectId = null, metadata = {}) {
    try {
      const auditEntry = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        action,
        entityType,
        entityId,
        oldData: oldData ? this.sanitizeData(oldData) : null,
        newData: newData ? this.sanitizeData(newData) : null,
        userId,
        projectId,
        metadata: {
          ...metadata,
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      };

      const auditTrail = this.getAuditTrail();
      auditTrail.push(auditEntry);

      // Keep only the most recent entries
      if (auditTrail.length > this.maxAuditEntries) {
        auditTrail.splice(0, auditTrail.length - this.maxAuditEntries);
      }

      localStorage.setItem(this.auditKey, JSON.stringify(auditTrail));
      
      console.log(`📝 Audit logged: ${action} ${entityType} ${entityId}`, auditEntry);
      return auditEntry;
    } catch (error) {
      console.error('❌ Error logging audit event:', error);
      return null;
    }
  }

  /**
   * Get audit trail for a specific entity
   * @param {string} entityType - The type of entity
   * @param {string} entityId - The ID of the entity
   * @param {string} projectId - Optional project filter
   * @returns {Array} Array of audit entries
   */
  getEntityAuditTrail(entityType, entityId, projectId = null) {
    try {
      const auditTrail = this.getAuditTrail();
      return auditTrail.filter(entry => {
        const matchesEntity = entry.entityType === entityType && entry.entityId === entityId;
        const matchesProject = !projectId || entry.projectId === projectId;
        return matchesEntity && matchesProject;
      }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('❌ Error getting entity audit trail:', error);
      return [];
    }
  }

  /**
   * Get audit trail for a project
   * @param {string} projectId - The project ID
   * @param {string} entityType - Optional entity type filter
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} Array of audit entries
   */
  getProjectAuditTrail(projectId, entityType = null, limit = 100) {
    try {
      const auditTrail = this.getAuditTrail();
      let filtered = auditTrail.filter(entry => {
        const matchesProject = entry.projectId === projectId;
        const matchesEntity = !entityType || entry.entityType === entityType;
        return matchesProject && matchesEntity;
      });

      // Sort by timestamp (newest first)
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply limit
      if (limit && limit > 0) {
        filtered = filtered.slice(0, limit);
      }

      return filtered;
    } catch (error) {
      console.error('❌ Error getting project audit trail:', error);
      return [];
    }
  }

  /**
   * Get all audit entries
   * @returns {Array} Array of all audit entries
   */
  getAuditTrail() {
    try {
      const stored = localStorage.getItem(this.auditKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Error getting audit trail:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   * @param {string} projectId - Optional project filter
   * @returns {Object} Audit statistics
   */
  getAuditStatistics(projectId = null) {
    try {
      const auditTrail = this.getAuditTrail();
      let filtered = projectId ? auditTrail.filter(entry => entry.projectId === projectId) : auditTrail;

      const stats = {
        totalEntries: filtered.length,
        byAction: {},
        byEntityType: {},
        byUser: {},
        recentActivity: filtered.slice(0, 10),
        lastActivity: filtered.length > 0 ? filtered[0].timestamp : null
      };

      filtered.forEach(entry => {
        // Count by action
        stats.byAction[entry.action] = (stats.byAction[entry.action] || 0) + 1;
        
        // Count by entity type
        stats.byEntityType[entry.entityType] = (stats.byEntityType[entry.entityType] || 0) + 1;
        
        // Count by user
        stats.byUser[entry.userId] = (stats.byUser[entry.userId] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('❌ Error getting audit statistics:', error);
      return { totalEntries: 0, byAction: {}, byEntityType: {}, byUser: {}, recentActivity: [], lastActivity: null };
    }
  }

  /**
   * Archive an entity (soft delete with audit trail)
   * @param {string} entityType - The type of entity
   * @param {string} entityId - The ID of the entity
   * @param {Object} entityData - The current data of the entity
   * @param {string} userId - The user performing the action
   * @param {string} projectId - The project context
   * @param {string} reason - Reason for archiving
   */
  archiveEntity(entityType, entityId, entityData, userId, projectId, reason = 'Archived by user') {
    try {
      // Log the archive action
      this.logAuditEvent('archive', entityType, entityId, entityData, null, userId, projectId, { reason });

      // Move to archive storage
      const archiveKey = `zoyantra_archived_${entityType}`;
      const archived = this.getArchivedEntities(entityType);
      
      const archivedEntity = {
        ...entityData,
        archivedAt: new Date().toISOString(),
        archivedBy: userId,
        archiveReason: reason,
        originalId: entityId
      };

      archived.push(archivedEntity);
      localStorage.setItem(archiveKey, JSON.stringify(archived));

      console.log(`📦 Archived ${entityType} ${entityId}`, archivedEntity);
      return archivedEntity;
    } catch (error) {
      console.error('❌ Error archiving entity:', error);
      return null;
    }
  }

  /**
   * Restore an archived entity
   * @param {string} entityType - The type of entity
   * @param {string} originalId - The original ID of the entity
   * @param {string} userId - The user performing the action
   * @param {string} projectId - The project context
   */
  restoreEntity(entityType, originalId, userId, projectId) {
    try {
      const archived = this.getArchivedEntities(entityType);
      const entityIndex = archived.findIndex(item => item.originalId === originalId);
      
      if (entityIndex === -1) {
        throw new Error(`Archived ${entityType} ${originalId} not found`);
      }

      const archivedEntity = archived[entityIndex];
      
      // Log the restore action
      this.logAuditEvent('restore', entityType, originalId, null, archivedEntity, userId, projectId, { 
        restoredFrom: archivedEntity.archivedAt 
      });

      // Remove from archive
      archived.splice(entityIndex, 1);
      const archiveKey = `zoyantra_archived_${entityType}`;
      localStorage.setItem(archiveKey, JSON.stringify(archived));

      console.log(`🔄 Restored ${entityType} ${originalId}`, archivedEntity);
      return archivedEntity;
    } catch (error) {
      console.error('❌ Error restoring entity:', error);
      return null;
    }
  }

  /**
   * Get archived entities
   * @param {string} entityType - The type of entity
   * @returns {Array} Array of archived entities
   */
  getArchivedEntities(entityType) {
    try {
      const archiveKey = `zoyantra_archived_${entityType}`;
      const stored = localStorage.getItem(archiveKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Error getting archived entities:', error);
      return [];
    }
  }

  /**
   * Get change history for an entity
   * @param {string} entityType - The type of entity
   * @param {string} entityId - The ID of the entity
   * @returns {Array} Array of changes
   */
  getEntityChangeHistory(entityType, entityId) {
    try {
      const auditTrail = this.getEntityAuditTrail(entityType, entityId);
      return auditTrail.map(entry => ({
        action: entry.action,
        timestamp: entry.timestamp,
        userId: entry.userId,
        changes: this.getChanges(entry.oldData, entry.newData),
        metadata: entry.metadata
      }));
    } catch (error) {
      console.error('❌ Error getting entity change history:', error);
      return [];
    }
  }

  /**
   * Compare two objects and return the changes
   * @param {Object} oldData - Old data
   * @param {Object} newData - New data
   * @returns {Object} Changes object
   */
  getChanges(oldData, newData) {
    if (!oldData && !newData) return {};
    if (!oldData) return { created: newData };
    if (!newData) return { deleted: oldData };

    const changes = {};
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    allKeys.forEach(key => {
      const oldValue = oldData[key];
      const newValue = newData[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = {
          from: oldValue,
          to: newValue
        };
      }
    });

    return changes;
  }

  /**
   * Sanitize data for audit storage (remove sensitive information)
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];

    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Clear audit trail (use with caution)
   * @param {string} projectId - Optional project filter
   */
  clearAuditTrail(projectId = null) {
    try {
      if (projectId) {
        const auditTrail = this.getAuditTrail();
        const filtered = auditTrail.filter(entry => entry.projectId !== projectId);
        localStorage.setItem(this.auditKey, JSON.stringify(filtered));
      } else {
        localStorage.removeItem(this.auditKey);
      }
      console.log('🗑️ Audit trail cleared');
    } catch (error) {
      console.error('❌ Error clearing audit trail:', error);
    }
  }
}

export default AuditService;
