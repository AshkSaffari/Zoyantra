import AccService from './AccService';

/**
 * Performance Tracker Service
 * Handles performance tracking with correct data flow:
 * - Progress = (Tracked Output / Planned Output) × 100
 * - Output quantity stays constant (never adjusted)
 * - Validation prevents overplanning
 * - AC comes only from ACC approved expenses
 */
class PerformanceTrackerService {
  constructor() {
    this.accService = new AccService();
  }

  /**
   * Initialize the service with credentials
   * @param {Object} credentials - ACC credentials
   */
  initialize(credentials) {
    this.accService.initialize(credentials);
  }

  /**
   * Get performance tracking data for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Performance tracking data
   */
  async getPerformanceData(projectId) {
    try {
      console.log('🔄 Getting performance tracking data for project:', projectId);
      
      // Get all budgets for the project
      const budgets = await this.accService.getBudgets(projectId, {
        include: ['subitems', 'attributes'],
        limit: 1000
      });

      // Get performance tracking instances
      const performanceInstances = await this.accService.getPerformanceTrackingInstances(projectId, { limit: 1000 });

      // Get approved expenses for actual cost
      const expenses = await this.accService.getProjectExpenses(projectId, {
        include: ['expenseItems'],
        limit: 1000
      });

      console.log('📊 Performance data loaded:', {
        budgets: budgets.length,
        performanceInstances: performanceInstances.length,
        expenses: expenses.length
      });

      // Process performance data by budget
      const performanceData = {};
      
      budgets.forEach(budget => {
        const budgetId = budget.id;
        const budgetName = budget.name || 'Unknown Budget';
        
        // Get planned output (original, never adjusted)
        const plannedOutput = this.getPlannedOutput(budget);
        
        // Get tracked output from performance instances
        const budgetInstances = performanceInstances.filter(instance => instance.budgetId === budgetId);
        const trackedOutput = this.calculateTrackedOutput(budgetInstances);
        
        // Calculate progress = (tracked output / planned output) × 100
        const progress = this.calculateProgress(trackedOutput, plannedOutput);
        
        // Get actual cost from approved expenses only
        const actualCost = this.getActualCost(budgetId, expenses);
        
        // Validate output (prevent overplanning)
        const validation = this.validateOutput(trackedOutput, plannedOutput);
        
        performanceData[budgetId] = {
          budgetId,
          budgetName,
          plannedOutput,
          trackedOutput,
          progress,
          actualCost,
          validation,
          instances: budgetInstances,
          expenseCount: expenses.filter(e => e.budgetId === budgetId).length
        };
      });

      return {
        projectId,
        budgets: performanceData,
        summary: this.calculateProjectSummary(performanceData),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error getting performance tracking data:', error);
      throw error;
    }
  }

  /**
   * Get planned output from budget (original, never adjusted)
   * @param {Object} budget - Budget object
   * @returns {number} Planned output quantity
   */
  getPlannedOutput(budget) {
    // Priority order for planned output
    const plannedOutput = parseFloat(
      budget.plannedOutput || 
      budget.quantity || 
      budget.outputQuantity || 
      budget.attributes?.plannedOutput ||
      budget.attributes?.quantity ||
      budget.attributes?.outputQuantity ||
      0
    );
    
    console.log(`📊 Planned output for ${budget.name}: ${plannedOutput}`);
    return plannedOutput;
  }

  /**
   * Calculate tracked output from performance instances
   * @param {Array} instances - Performance tracking instances
   * @returns {number} Total tracked output
   */
  calculateTrackedOutput(instances) {
    const trackedOutput = instances.reduce((sum, instance) => {
      return sum + (parseFloat(instance.outputQuantity || instance.outputUnits || 0));
    }, 0);
    
    console.log(`📊 Tracked output: ${trackedOutput} (from ${instances.length} instances)`);
    return trackedOutput;
  }

  /**
   * Calculate progress = (tracked output / planned output) × 100
   * @param {number} trackedOutput - Tracked output quantity
   * @param {number} plannedOutput - Planned output quantity
   * @returns {number} Progress percentage (0-100)
   */
  calculateProgress(trackedOutput, plannedOutput) {
    if (plannedOutput <= 0) {
      console.log('📊 No planned output, progress = 0%');
      return 0;
    }
    
    const progress = Math.min(100, (trackedOutput / plannedOutput) * 100);
    console.log(`📊 Progress calculation: (${trackedOutput} tracked / ${plannedOutput} planned) × 100 = ${progress}%`);
    
    return progress;
  }

  /**
   * Get actual cost from ACC approved expenses only
   * @param {string} budgetId - Budget ID
   * @param {Array} expenses - All expenses
   * @returns {number} Actual cost from approved expenses
   */
  getActualCost(budgetId, expenses) {
    // Only approved/paid/posted expenses count for actual cost
    const approvedExpenses = expenses.filter(expense => 
      (expense.budgetId === budgetId || 
       (expense.expenseItems && expense.expenseItems.some(item => item.budgetId === budgetId))) &&
      (expense.status === 'approved' || expense.status === 'paid' || expense.status === 'posted')
    );
    
    const actualCost = approvedExpenses.reduce((sum, expense) => {
      return sum + (parseFloat(expense.amount) || 0);
    }, 0);
    
    console.log(`💰 Actual cost for budget ${budgetId}: $${actualCost} (from ${approvedExpenses.length} approved expenses)`);
    return actualCost;
  }

  /**
   * Validate output to prevent overplanning
   * @param {number} trackedOutput - Tracked output quantity
   * @param {number} plannedOutput - Planned output quantity
   * @returns {Object} Validation result
   */
  validateOutput(trackedOutput, plannedOutput) {
    const isValid = trackedOutput <= plannedOutput;
    const isOverplanned = trackedOutput > plannedOutput;
    const remainingOutput = Math.max(0, plannedOutput - trackedOutput);
    
    if (isOverplanned) {
      console.warn(`⚠️ WARNING: Tracked output (${trackedOutput}) exceeds planned output (${plannedOutput})`);
    }
    
    return {
      isValid,
      isOverplanned,
      trackedOutput,
      plannedOutput,
      remainingOutput,
      overage: Math.max(0, trackedOutput - plannedOutput)
    };
  }

  /**
   * Calculate project-wide summary
   * @param {Object} performanceData - Performance data by budget
   * @returns {Object} Project summary
   */
  calculateProjectSummary(performanceData) {
    const budgets = Object.values(performanceData);
    
    const totalPlannedOutput = budgets.reduce((sum, budget) => sum + budget.plannedOutput, 0);
    const totalTrackedOutput = budgets.reduce((sum, budget) => sum + budget.trackedOutput, 0);
    const totalActualCost = budgets.reduce((sum, budget) => sum + budget.actualCost, 0);
    
    const overallProgress = totalPlannedOutput > 0 ? (totalTrackedOutput / totalPlannedOutput) * 100 : 0;
    
    const overplannedBudgets = budgets.filter(budget => budget.validation.isOverplanned);
    const validBudgets = budgets.filter(budget => budget.validation.isValid);
    
    return {
      totalPlannedOutput,
      totalTrackedOutput,
      totalActualCost,
      overallProgress,
      budgetCount: budgets.length,
      overplannedCount: overplannedBudgets.length,
      validCount: validBudgets.length,
      overplannedBudgets: overplannedBudgets.map(b => b.budgetName)
    };
  }

  /**
   * Create performance tracking item for a budget
   * @param {string} projectId - Project ID
   * @param {string} budgetId - Budget ID
   * @param {Object} options - Creation options
   * @returns {Promise<Object>} Created performance tracking item
   */
  async createPerformanceTrackingItem(projectId, budgetId, options = {}) {
    try {
      console.log(`🔄 Creating performance tracking item for budget: ${budgetId}`);
      
      const performanceItem = {
        name: options.name || `Performance Tracker - ${budgetId}`,
        description: options.description || `Performance tracking for budget ${budgetId}`,
        budgetId: budgetId,
        unit: options.unit || 'percentage',
        targetValue: options.targetValue || 100,
        currentValue: options.currentValue || 0
      };
      
      const createdItem = await this.accService.createPerformanceTrackingItem(projectId, budgetId);
      
      console.log(`✅ Created performance tracking item: ${createdItem.id}`);
      return createdItem;
      
    } catch (error) {
      console.error('❌ Error creating performance tracking item:', error);
      throw error;
    }
  }

  /**
   * Update performance tracking instance
   * @param {string} projectId - Project ID
   * @param {string} instanceId - Instance ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated instance
   */
  async updatePerformanceInstance(projectId, instanceId, updateData) {
    try {
      console.log(`🔄 Updating performance instance: ${instanceId}`);
      
      // Validate output before updating
      if (updateData.outputQuantity !== undefined) {
        const budget = await this.getBudgetForInstance(projectId, instanceId);
        const plannedOutput = this.getPlannedOutput(budget);
        
        if (updateData.outputQuantity > plannedOutput) {
          throw new Error(`Output quantity (${updateData.outputQuantity}) cannot exceed planned output (${plannedOutput})`);
        }
      }
      
      const updatedInstance = await this.accService.updatePerformanceTrackingInstance(projectId, instanceId, updateData);
      
      console.log(`✅ Updated performance instance: ${instanceId}`);
      return updatedInstance;
      
    } catch (error) {
      console.error('❌ Error updating performance instance:', error);
      throw error;
    }
  }

  /**
   * Get budget for a performance instance
   * @param {string} projectId - Project ID
   * @param {string} instanceId - Instance ID
   * @returns {Promise<Object>} Budget object
   */
  async getBudgetForInstance(projectId, instanceId) {
    try {
      const instance = await this.accService.getPerformanceTrackingInstance(projectId, instanceId);
      const budgets = await this.accService.getBudgets(projectId, { limit: 1000 });
      
      return budgets.find(budget => budget.id === instance.budgetId);
    } catch (error) {
      console.error('❌ Error getting budget for instance:', error);
      throw error;
    }
  }

  /**
   * Get performance tracking instances for a budget
   * @param {string} projectId - Project ID
   * @param {string} budgetId - Budget ID
   * @returns {Promise<Array>} Performance instances
   */
  async getPerformanceInstancesForBudget(projectId, budgetId) {
    try {
      const instances = await this.accService.getPerformanceTrackingInstances(projectId, { 
        budgetId: budgetId,
        limit: 1000 
      });
      
      console.log(`📊 Found ${instances.length} performance instances for budget ${budgetId}`);
      return instances;
      
    } catch (error) {
      console.error('❌ Error getting performance instances for budget:', error);
      throw error;
    }
  }

  /**
   * Validate timesheet output before syncing
   * @param {Object} timesheet - Timesheet object
   * @param {Object} budget - Budget object
   * @returns {Object} Validation result
   */
  validateTimesheetOutput(timesheet, budget) {
    const timesheetOutput = parseFloat(timesheet.outputUnits || timesheet.outputQuantity || timesheet.outputQty || 0);
    const plannedOutput = this.getPlannedOutput(budget);
    
    const validation = this.validateOutput(timesheetOutput, plannedOutput);
    
    return {
      ...validation,
      timesheetOutput,
      budgetName: budget.name,
      canSync: validation.isValid,
      errorMessage: validation.isOverplanned ? 
        `Output quantity (${timesheetOutput}) exceeds planned output (${plannedOutput}) for ${budget.name}` : 
        null
    };
  }
}

export default PerformanceTrackerService;
