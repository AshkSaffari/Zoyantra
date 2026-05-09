/**
 * ResourceService - Core optimization engine for resource allocation and workload management
 * Implements construction-specific optimization algorithms and metrics
 */

class ResourceService {
  constructor() {
    this.optimizationRules = {
      minChunkHours: 2,
      maxDailyHours: 8,
      preferredBreakPeriods: ['12:00-13:00'],
      crewPriority: ['Supervisor', 'Foreman', 'Worker'],
      workWeekCalendar: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
      }
    };
  }

  /**
   * Get all resources for a specific project
   * @param {string} projectId - The project ID
   * @returns {Array} Array of resources for the project
   */
  getByProject(projectId) {
    try {
      const allResources = this.getAll();
      return allResources.filter(resource => resource.projectId === projectId);
    } catch (error) {
      console.error('❌ Error getting resources by project:', error);
      return [];
    }
  }

  /**
   * Get all resources from localStorage
   * @returns {Array} Array of all resources
   */
  getAll() {
    try {
      const resources = localStorage.getItem('zoyantra_resources');
      return resources ? JSON.parse(resources) : [];
    } catch (error) {
      console.error('❌ Error getting all resources:', error);
      return [];
    }
  }

  /**
   * Create a new resource
   * @param {Object} resourceData - The resource data
   * @returns {Object} The created resource
   */
  create(resourceData) {
    try {
      const resources = this.getAll();
      const newResource = {
        id: `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...resourceData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      resources.push(newResource);
      localStorage.setItem('zoyantra_resources', JSON.stringify(resources));
      
      console.log('✅ Created resource:', newResource.id);
      return newResource;
    } catch (error) {
      console.error('❌ Error creating resource:', error);
      throw error;
    }
  }

  /**
   * Load optimization rules from localStorage
   */
  loadOptimizationRules(projectId) {
    try {
      const stored = localStorage.getItem(`z_${projectId}_optimization_rules`);
      if (stored) {
        this.optimizationRules = { ...this.optimizationRules, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('❌ Error loading optimization rules:', error);
    }
  }

  /**
   * Save optimization rules to localStorage
   */
  saveOptimizationRules(projectId, rules) {
    try {
      this.optimizationRules = { ...this.optimizationRules, ...rules };
      localStorage.setItem(`z_${projectId}_optimization_rules`, JSON.stringify(this.optimizationRules));
    } catch (error) {
      console.error('❌ Error saving optimization rules:', error);
    }
  }

  /**
   * Calculate resource utilization metrics
   */
  calculateUtilizationMetrics(plannedTasks, actualTimesheets, crews, dateRange) {
    const metrics = {};
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    for (const crew of crews) {
      const crewId = crew.id;
      const crewMetrics = {
        crewId,
        crewName: crew.name,
        maxDailyHours: crew.maxDailyHours || this.optimizationRules.maxDailyHours,
        minChunkHours: crew.minChunkHours || this.optimizationRules.minChunkHours,
        dailyUtilization: {},
        weeklyStats: {
          totalPlannedHours: 0,
          totalActualHours: 0,
          totalOutput: 0,
          utilizationRate: 0,
          efficiencyRate: 0,
          overtimePercentage: 0,
          productivityTrend: []
        }
      };

      // Calculate daily utilization
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        
        // Planned hours for this crew on this date
        const plannedHours = plannedTasks
          .filter(task => 
            task.assignedCrewId === crewId && 
            task.plannedDate === dateStr
          )
          .reduce((sum, task) => sum + (task.plannedHours || 0), 0);

        // Actual hours for this crew on this date
        const actualHours = actualTimesheets
          .filter(ts => 
            ts.crewId === crewId && 
            ts.date === dateStr
          )
          .reduce((sum, ts) => sum + (ts.hours || 0) + (ts.extraHours || 0), 0);

        // Output for this crew on this date
        const output = actualTimesheets
          .filter(ts => 
            ts.crewId === crewId && 
            ts.date === dateStr
          )
          .reduce((sum, ts) => sum + (ts.outputUnits || 0), 0);

        crewMetrics.dailyUtilization[dateStr] = {
          plannedHours,
          actualHours,
          output,
          utilizationRate: actualHours > 0 ? (actualHours / crewMetrics.maxDailyHours) * 100 : 0,
          efficiencyRate: actualHours > 0 ? (plannedHours / actualHours) * 100 : 0,
          isOverloaded: actualHours > crewMetrics.maxDailyHours,
          isUnderloaded: actualHours < crewMetrics.minChunkHours && actualHours > 0,
          isIdle: actualHours === 0 && plannedHours > 0
        };

        crewMetrics.weeklyStats.totalPlannedHours += plannedHours;
        crewMetrics.weeklyStats.totalActualHours += actualHours;
        crewMetrics.weeklyStats.totalOutput += output;
      }

      // Calculate weekly statistics
      const workDays = Object.keys(crewMetrics.dailyUtilization).length;
      if (workDays > 0) {
        crewMetrics.weeklyStats.utilizationRate = 
          (crewMetrics.weeklyStats.totalActualHours / (crewMetrics.maxDailyHours * workDays)) * 100;
        
        crewMetrics.weeklyStats.efficiencyRate = 
          crewMetrics.weeklyStats.totalActualHours > 0 ? 
          (crewMetrics.weeklyStats.totalPlannedHours / crewMetrics.weeklyStats.totalActualHours) * 100 : 0;
        
        crewMetrics.weeklyStats.overtimePercentage = 
          crewMetrics.weeklyStats.totalActualHours > (crewMetrics.maxDailyHours * workDays) ?
          ((crewMetrics.weeklyStats.totalActualHours - (crewMetrics.maxDailyHours * workDays)) / crewMetrics.weeklyStats.totalActualHours) * 100 : 0;
      }

      metrics[crewId] = crewMetrics;
    }

    return metrics;
  }

  /**
   * Identify resource conflicts and optimization opportunities
   */
  identifyConflicts(utilizationMetrics) {
    const conflicts = {
      overloaded: [],
      underloaded: [],
      idle: [],
      recommendations: []
    };

    for (const [crewId, metrics] of Object.entries(utilizationMetrics)) {
      // Check daily conflicts
      for (const [date, daily] of Object.entries(metrics.dailyUtilization)) {
        if (daily.isOverloaded) {
          conflicts.overloaded.push({
            crewId,
            crewName: metrics.crewName,
            date,
            plannedHours: daily.plannedHours,
            actualHours: daily.actualHours,
            maxHours: metrics.maxDailyHours,
            excessHours: daily.actualHours - metrics.maxDailyHours
          });
        }

        if (daily.isUnderloaded) {
          conflicts.underloaded.push({
            crewId,
            crewName: metrics.crewName,
            date,
            plannedHours: daily.plannedHours,
            actualHours: daily.actualHours,
            minHours: metrics.minChunkHours,
            deficitHours: metrics.minChunkHours - daily.actualHours
          });
        }

        if (daily.isIdle) {
          conflicts.idle.push({
            crewId,
            crewName: metrics.crewName,
            date,
            plannedHours: daily.plannedHours,
            actualHours: daily.actualHours
          });
        }
      }

      // Generate recommendations based on weekly stats
      if (metrics.weeklyStats.utilizationRate > 110) {
        conflicts.recommendations.push({
          type: 'overallocation',
          crewId,
          crewName: metrics.crewName,
          message: `Crew is consistently over-allocated (${metrics.weeklyStats.utilizationRate.toFixed(1)}% utilization)`,
          priority: 'high'
        });
      } else if (metrics.weeklyStats.utilizationRate < 70) {
        conflicts.recommendations.push({
          type: 'underallocation',
          crewId,
          crewName: metrics.crewName,
          message: `Crew is under-utilized (${metrics.weeklyStats.utilizationRate.toFixed(1)}% utilization)`,
          priority: 'medium'
        });
      }

      if (metrics.weeklyStats.efficiencyRate < 80) {
        conflicts.recommendations.push({
          type: 'inefficiency',
          crewId,
          crewName: metrics.crewName,
          message: `Crew productivity below target (${metrics.weeklyStats.efficiencyRate.toFixed(1)}% efficiency)`,
          priority: 'high'
        });
      }
    }

    return conflicts;
  }

  /**
   * Auto-level resources using constraint-based redistribution
   */
  autoLevelResources(plannedTasks, crews, conflicts) {
    const optimizedTasks = [...plannedTasks];
    const changes = [];

    // Sort crews by priority
    const sortedCrews = crews.sort((a, b) => {
      const aPriority = this.optimizationRules.crewPriority.indexOf(a.role) || 999;
      const bPriority = this.optimizationRules.crewPriority.indexOf(b.role) || 999;
      return aPriority - bPriority;
    });

    // Process overloaded crews first
    for (const conflict of conflicts.overloaded) {
      const crew = sortedCrews.find(c => c.id === conflict.crewId);
      if (!crew) continue;

      const crewTasks = optimizedTasks.filter(task => 
        task.assignedCrewId === conflict.crewId && 
        task.plannedDate === conflict.date
      );

      // Try to redistribute excess hours to next available day
      const excessHours = conflict.excessHours;
      let remainingExcess = excessHours;

      for (let i = 1; i <= 7 && remainingExcess > 0; i++) {
        const nextDate = new Date(conflict.date);
        nextDate.setDate(nextDate.getDate() + i);
        const nextDateStr = nextDate.toISOString().split('T')[0];

        // Check if this is a work day
        const dayOfWeek = nextDate.getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        if (!this.optimizationRules.workWeekCalendar[dayNames[dayOfWeek]]) continue;

        // Find tasks that can be moved
        // Capture remainingExcess value to avoid unsafe closure reference
        const currentRemainingExcess = remainingExcess;
        const movableTasks = crewTasks.filter(task => 
          task.plannedDate === conflict.date &&
          task.plannedHours <= currentRemainingExcess &&
          !this.hasDependencies(task, optimizedTasks)
        );

        for (const task of movableTasks) {
          if (remainingExcess <= 0) break;

          // Move task to next date
          const originalDate = task.plannedDate;
          task.plannedDate = nextDateStr;
          remainingExcess -= task.plannedHours;

          changes.push({
            type: 'moved',
            taskId: task.id,
            taskName: task.taskName,
            crewId: conflict.crewId,
            fromDate: originalDate,
            toDate: nextDateStr,
            hours: task.plannedHours
          });
        }
      }
    }

    // Process underloaded crews
    for (const conflict of conflicts.underloaded) {
      const crew = sortedCrews.find(c => c.id === conflict.crewId);
      if (!crew) continue;

      // Try to pull nearby tasks forward
      const nearbyTasks = optimizedTasks.filter(task => 
        task.assignedCrewId === conflict.crewId &&
        task.plannedDate > conflict.date &&
        task.plannedDate <= this.addDays(conflict.date, 3) // Within 3 days
      );

      for (const task of nearbyTasks) {
        if (conflict.deficitHours <= 0) break;

        // Check if task can be moved forward
        if (!this.hasDependencies(task, optimizedTasks)) {
          const originalDate = task.plannedDate;
          task.plannedDate = conflict.date;

          changes.push({
            type: 'moved',
            taskId: task.id,
            taskName: task.taskName,
            crewId: conflict.crewId,
            fromDate: originalDate,
            toDate: conflict.date,
            hours: task.plannedHours
          });

          conflict.deficitHours -= task.plannedHours;
        }
      }
    }

      return {
      optimizedTasks,
      changes,
      summary: {
        totalChanges: changes.length,
        movedTasks: changes.filter(c => c.type === 'moved').length,
        redistributedHours: changes.reduce((sum, c) => sum + c.hours, 0)
      }
    };
  }

  /**
   * Check if a task has dependencies that prevent moving
   */
  hasDependencies(task, allTasks) {
    // Simple dependency check - can be enhanced later
    return false;
  }

  /**
   * Add days to a date string
   */
  addDays(dateStr, days) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Calculate resource balance index
   */
  calculateResourceBalanceIndex(utilizationMetrics) {
    const utilizationRates = Object.values(utilizationMetrics)
      .map(metrics => metrics.weeklyStats.utilizationRate);
    
    if (utilizationRates.length === 0) return 0;

    const mean = utilizationRates.reduce((sum, rate) => sum + rate, 0) / utilizationRates.length;
    const variance = utilizationRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / utilizationRates.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower standard deviation = better balance
    return Math.max(0, 100 - (standardDeviation / mean) * 100);
  }

  /**
   * Generate optimization report
   */
  generateOptimizationReport(utilizationMetrics, conflicts, optimizationResult) {
    const totalCrews = Object.keys(utilizationMetrics).length;
    const overloadedCrews = conflicts.overloaded.length;
    const underloadedCrews = conflicts.underloaded.length;
    const idleCrews = conflicts.idle.length;

    const averageUtilization = Object.values(utilizationMetrics)
      .reduce((sum, metrics) => sum + metrics.weeklyStats.utilizationRate, 0) / totalCrews;

    const averageEfficiency = Object.values(utilizationMetrics)
      .reduce((sum, metrics) => sum + metrics.weeklyStats.efficiencyRate, 0) / totalCrews;

    const resourceBalanceIndex = this.calculateResourceBalanceIndex(utilizationMetrics);

    return {
      summary: {
        totalCrews,
        averageUtilization: Math.round(averageUtilization * 10) / 10,
        averageEfficiency: Math.round(averageEfficiency * 10) / 10,
        resourceBalanceIndex: Math.round(resourceBalanceIndex * 10) / 10,
        optimizationChanges: optimizationResult?.summary?.totalChanges || 0
      },
      issues: {
        overloadedCrews,
        underloadedCrews,
        idleCrews,
        totalIssues: overloadedCrews + underloadedCrews + idleCrews
      },
      recommendations: conflicts.recommendations,
      changes: optimizationResult?.changes || []
    };
  }
}

export default ResourceService;