/**
 * Centralized Cost Calculation Service
 * Handles all cost calculations across the application
 */

class CostCalculationService {
  /**
   * Calculate budget cost (rate × timesheet hours)
   * @param {Array} timesheets - Array of timesheet objects
   * @param {Array} members - Array of member objects with rates
   * @param {Array} budgets - Array of budget objects
   * @returns {Object} Budget cost calculations
   */
  static calculateBudgetCosts(timesheets, members, budgets) {
    const budgetCosts = {};
    
    // Initialize budget costs
    budgets.forEach(budget => {
      budgetCosts[budget.id] = {
        budgetId: budget.id,
        budgetName: budget.attributes?.name || budget.name || budget.title || 'Unknown',
        totalHours: 0,
        totalExtraHours: 0,
        totalRegularCost: 0,
        totalExtraCost: 0,
        totalCost: 0,
        memberBreakdown: {}
      };
    });

    // Process each timesheet
    timesheets.forEach(timesheet => {
      const budgetId = timesheet.budgetId;
      const memberId = timesheet.userId;
      
      if (!budgetId || !memberId) return;

      const member = members.find(m => m.id === memberId);
      const budget = budgets.find(b => b.id === budgetId);
      
      if (!member || !budget) return;

      // Get rates from crew management or use defaults
      const hourlyRate = this.getMemberRate(member, budgetId);
      const extraHoursRate = this.getMemberExtraRate(member, budgetId);
      
      const regularHours = parseFloat(timesheet.hours) || 0;
      const extraHours = parseFloat(timesheet.extraHours) || 0;
      
      const regularCost = regularHours * hourlyRate;
      const extraCost = extraHours * extraHoursRate;
      const totalCost = regularCost + extraCost;

      // Update budget totals
      if (budgetCosts[budgetId]) {
        budgetCosts[budgetId].totalHours += regularHours;
        budgetCosts[budgetId].totalExtraHours += extraHours;
        budgetCosts[budgetId].totalRegularCost += regularCost;
        budgetCosts[budgetId].totalExtraCost += extraCost;
        budgetCosts[budgetId].totalCost += totalCost;

        // Update member breakdown
        if (!budgetCosts[budgetId].memberBreakdown[memberId]) {
          budgetCosts[budgetId].memberBreakdown[memberId] = {
            memberId,
            memberName: member.name,
            totalHours: 0,
            totalExtraHours: 0,
            totalCost: 0,
            hourlyRate,
            extraHoursRate
          };
        }

        budgetCosts[budgetId].memberBreakdown[memberId].totalHours += regularHours;
        budgetCosts[budgetId].memberBreakdown[memberId].totalExtraHours += extraHours;
        budgetCosts[budgetId].memberBreakdown[memberId].totalCost += totalCost;
      }
    });

    return budgetCosts;
  }

  /**
   * Get member rate for a specific budget
   * @param {Object} member - Member object
   * @param {string} budgetId - Budget ID
   * @returns {number} Hourly rate
   */
  static getMemberRate(member, budgetId) {
    // Try to get rate from crew management
    const projectRates = JSON.parse(localStorage.getItem(`memberRates_${budgetId}`) || '{}');
    if (projectRates[member.id]) {
      return parseFloat(projectRates[member.id]) || 0;
    }

    // Try member's default rate
    if (member.rate) {
      return parseFloat(member.rate) || 0;
    }

    // Default rate
    return 50;
  }

  /**
   * Get member extra hours rate for a specific budget
   * @param {Object} member - Member object
   * @param {string} budgetId - Budget ID
   * @returns {number} Extra hours rate
   */
  static getMemberExtraRate(member, budgetId) {
    const regularRate = this.getMemberRate(member, budgetId);
    const projectRates = JSON.parse(localStorage.getItem(`memberRates_${budgetId}`) || '{}');
    
    // Try to get specific extra rate
    if (projectRates[`${member.id}_extra`]) {
      return parseFloat(projectRates[`${member.id}_extra`]) || 0;
    }

    // Default to 1.5x regular rate
    return regularRate * 1.5;
  }

  /**
   * Calculate output cost from timesheet budget calculations
   * @param {Array} timesheets - Array of timesheet objects
   * @param {Array} budgets - Array of budget objects
   * @returns {Object} Output cost calculations
   */
  static calculateOutputCosts(timesheets, budgets) {
    const outputCosts = {};
    
    budgets.forEach(budget => {
      const budgetTimesheets = timesheets.filter(t => t.budgetId === budget.id);
      
      const totalOutput = budgetTimesheets.reduce((sum, t) => sum + (parseFloat(t.outputUnits) || 0), 0);
      const totalHours = budgetTimesheets.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
      
      outputCosts[budget.id] = {
        budgetId: budget.id,
        budgetName: budget.attributes?.name || budget.name || budget.title || 'Unknown',
        totalOutput,
        totalHours,
        outputPerHour: totalHours > 0 ? totalOutput / totalHours : 0,
        budgetAmount: budget.revised || budget.attributes?.amount || budget.amount || budget.originalAmount || budget.unitPrice || 0,
        plannedOutput: budget.inputQuantity || budget.attributes?.inputQuantity || budget.quantity || 0,
        outputEfficiency: budget.inputQuantity > 0 ? (totalOutput / budget.inputQuantity) * 100 : 0
      };
    });

    return outputCosts;
  }

  /**
   * Calculate profit/loss comparison between actual and budget costs
   * @param {Object} actualCosts - Actual costs from expenses
   * @param {Object} budgetCosts - Budget costs from timesheets
   * @returns {Object} Profit/loss analysis
   */
  static calculateProfitLoss(actualCosts, budgetCosts) {
    const profitLoss = {};
    
    Object.keys(budgetCosts).forEach(budgetId => {
      const budgetCost = budgetCosts[budgetId];
      const actualCost = actualCosts[budgetId] || 0;
      
      const variance = actualCost - budgetCost.totalCost;
      const variancePercentage = budgetCost.totalCost > 0 ? (variance / budgetCost.totalCost) * 100 : 0;
      
      profitLoss[budgetId] = {
        budgetId,
        budgetName: budgetCost.budgetName,
        budgetCost: budgetCost.totalCost,
        actualCost,
        variance,
        variancePercentage,
        isProfit: variance < 0,
        isLoss: variance > 0,
        efficiency: actualCost > 0 ? (budgetCost.totalCost / actualCost) * 100 : 0
      };
    });

    return profitLoss;
  }

  /**
   * Get comprehensive cost analysis for all budgets
   * @param {Array} timesheets - Array of timesheet objects
   * @param {Array} members - Array of member objects
   * @param {Array} budgets - Array of budget objects
   * @param {Array} expenses - Array of expense objects
   * @returns {Object} Comprehensive cost analysis
   */
  static getComprehensiveCostAnalysis(timesheets, members, budgets, expenses) {
    const budgetCosts = this.calculateBudgetCosts(timesheets, members, budgets);
    const outputCosts = this.calculateOutputCosts(timesheets, budgets);
    
    // Calculate actual costs from expenses
    const actualCosts = {};
    expenses.forEach(expense => {
      if (expense.budgetId) {
        actualCosts[expense.budgetId] = (actualCosts[expense.budgetId] || 0) + (parseFloat(expense.amount) || 0);
      }
    });
    
    const profitLoss = this.calculateProfitLoss(actualCosts, budgetCosts);
    
    return {
      budgetCosts,
      outputCosts,
      actualCosts,
      profitLoss,
      summary: {
        totalBudgetCost: Object.values(budgetCosts).reduce((sum, b) => sum + b.totalCost, 0),
        totalActualCost: Object.values(actualCosts).reduce((sum, cost) => sum + cost, 0),
        totalVariance: Object.values(profitLoss).reduce((sum, p) => sum + p.variance, 0),
        totalOutput: Object.values(outputCosts).reduce((sum, o) => sum + o.totalOutput, 0)
      }
    };
  }
}

export default CostCalculationService;