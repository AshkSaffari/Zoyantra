// Validation service for construction project management business rules

import { TASK_STATUS, PLAN_STATUS, TIMESHEET_STATUS } from '../utils/statusEnums';

class ValidationService {
  /**
   * Validate plan line creation/update
   * @param {Object} planLine - Plan line data
   * @param {Object} budget - Associated budget
   * @param {Object} adminSettings - Admin configuration
   * @returns {Object} Validation result
   */
  static validatePlanLine(planLine, budget, adminSettings = {}) {
    const errors = [];
    const warnings = [];

    // Required fields validation
    if (!planLine.taskId) {
      errors.push('Task is required');
    }
    if (!planLine.budgetId) {
      errors.push('Budget is required');
    }
    if (!planLine.startDate || !planLine.finishDate) {
      errors.push('Start date and finish date are required');
    }

    // Date validation
    if (planLine.startDate && planLine.finishDate) {
      const startDate = new Date(planLine.startDate);
      const finishDate = new Date(planLine.finishDate);
      
      if (startDate >= finishDate) {
        errors.push('Start date must be before finish date');
      }
    }

    // Budget validation
    if (budget && planLine.plannedHours) {
      const budgetInputHours = budget.inputHours || 0;
      const plannedHours = parseFloat(planLine.plannedHours) || 0;
      
      if (plannedHours > budgetInputHours) {
        if (adminSettings.allowExtraHours) {
          warnings.push(`Planned hours (${plannedHours}) exceed budget input hours (${budgetInputHours})`);
        } else {
          errors.push(`Planned hours cannot exceed budget input hours (${budgetInputHours})`);
        }
      }
    }

    // Output quantity validation
    if (budget && planLine.plannedOutputQty) {
      const budgetInputQty = budget.inputQty || 0;
      const plannedOutputQty = parseFloat(planLine.plannedOutputQty) || 0;
      
      if (plannedOutputQty > budgetInputQty) {
        if (adminSettings.allowExtraHours) {
          warnings.push(`Planned output quantity (${plannedOutputQty}) exceed budget input quantity (${budgetInputQty})`);
        } else {
          errors.push(`Planned output quantity cannot exceed budget input quantity (${budgetInputQty})`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate timesheet entry
   * @param {Object} timesheetEntry - Timesheet entry data
   * @param {Object} budget - Associated budget
   * @param {Object} adminSettings - Admin configuration
   * @returns {Object} Validation result
   */
  static validateTimesheetEntry(timesheetEntry, budget, adminSettings = {}) {
    const errors = [];
    const warnings = [];

    // Required fields validation
    if (!timesheetEntry.userId && !timesheetEntry.crewId) {
      errors.push('User or crew is required');
    }
    if (!timesheetEntry.date) {
      errors.push('Date is required');
    }
    if (!timesheetEntry.loggedHours && !timesheetEntry.outputQty) {
      errors.push('Logged hours or output quantity is required');
    }

    // Hours validation
    if (budget && timesheetEntry.loggedHours) {
      const budgetInputHours = budget.inputHours || 0;
      const loggedHours = parseFloat(timesheetEntry.loggedHours) || 0;
      
      if (loggedHours > budgetInputHours) {
        if (adminSettings.allowExtraHours) {
          warnings.push(`Logged hours (${loggedHours}) exceed budget input hours (${budgetInputHours})`);
        } else {
          errors.push(`Logged hours cannot exceed budget input hours (${budgetInputHours})`);
        }
      }
    }

    // Output quantity validation
    if (budget && timesheetEntry.outputQty) {
      const budgetInputQty = budget.inputQty || 0;
      const outputQty = parseFloat(timesheetEntry.outputQty) || 0;
      
      if (outputQty > budgetInputQty) {
        if (adminSettings.allowExtraHours) {
          warnings.push(`Output quantity (${outputQty}) exceed budget input quantity (${budgetInputQty})`);
        } else {
          errors.push(`Output quantity cannot exceed budget input quantity (${budgetInputQty})`);
        }
      }
    }

    // Date validation
    if (timesheetEntry.date) {
      const entryDate = new Date(timesheetEntry.date);
      const today = new Date();
      
      if (entryDate > today) {
        warnings.push('Timesheet date is in the future');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate plan creation
   * @param {Object} plan - Plan data
   * @param {Array} planLines - Plan lines
   * @returns {Object} Validation result
   */
  static validatePlan(plan, planLines = []) {
    const errors = [];
    const warnings = [];

    // Required fields validation
    if (!plan.name) {
      errors.push('Plan name is required');
    }
    if (!plan.startDate || !plan.finishDate) {
      errors.push('Start date and finish date are required');
    }

    // Date validation
    if (plan.startDate && plan.finishDate) {
      const startDate = new Date(plan.startDate);
      const finishDate = new Date(plan.finishDate);
      
      if (startDate >= finishDate) {
        errors.push('Plan start date must be before finish date');
      }
    }

    // Plan lines validation
    if (planLines.length === 0) {
      warnings.push('Plan has no tasks assigned');
    }

    // Check for duplicate tasks
    const taskIds = planLines.map(line => line.taskId);
    const duplicateTasks = taskIds.filter((id, index) => taskIds.indexOf(id) !== index);
    if (duplicateTasks.length > 0) {
      warnings.push(`Duplicate tasks found: ${duplicateTasks.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate timesheet creation from plan
   * @param {Object} plan - Plan data
   * @param {Array} planLines - Plan lines
   * @returns {Object} Validation result
   */
  static validateTimesheetCreationFromPlan(plan, planLines = []) {
    const errors = [];
    const warnings = [];

    // Plan status validation
    if (plan.status !== PLAN_STATUS.APPROVED) {
      errors.push('Plan must be approved before creating timesheet');
    }

    // Plan lines validation
    if (planLines.length === 0) {
      errors.push('Plan must have at least one task assigned');
    }

    // Check if plan is already archived
    if (plan.status === PLAN_STATUS.ARCHIVED) {
      errors.push('Cannot create timesheet from archived plan');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate status transition
   * @param {string} currentStatus - Current status
   * @param {string} newStatus - Target status
   * @param {string} entityType - Type of entity (task, plan, timesheet, expense)
   * @returns {Object} Validation result
   */
  static validateStatusTransition(currentStatus, newStatus, entityType) {
    const errors = [];
    const warnings = [];

    // Check if transition is allowed
    const allowedTransitions = this.getAllowedTransitions(currentStatus, entityType);
    
    if (!allowedTransitions.includes(newStatus)) {
      errors.push(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }

    // Special business rules
    if (entityType === 'timesheet' && newStatus === TIMESHEET_STATUS.SYNCED) {
      if (currentStatus !== TIMESHEET_STATUS.APPROVED) {
        errors.push('Timesheet must be approved before syncing');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get allowed status transitions for an entity
   * @param {string} currentStatus - Current status
   * @param {string} entityType - Type of entity
   * @returns {Array} Allowed transitions
   */
  static getAllowedTransitions(currentStatus, entityType) {
    // This would be implemented based on the status transition rules
    // For now, return basic transitions
    const transitions = {
      [TASK_STATUS.DRAFT]: [TASK_STATUS.ACTIVE],
      [TASK_STATUS.ACTIVE]: [TASK_STATUS.DEPRECATED],
      [PLAN_STATUS.DRAFT]: [PLAN_STATUS.APPROVED],
      [PLAN_STATUS.APPROVED]: [PLAN_STATUS.ARCHIVED],
      [TIMESHEET_STATUS.DRAFT]: [TIMESHEET_STATUS.SUBMITTED],
      [TIMESHEET_STATUS.SUBMITTED]: [TIMESHEET_STATUS.APPROVED, TIMESHEET_STATUS.DRAFT],
      [TIMESHEET_STATUS.APPROVED]: [TIMESHEET_STATUS.SYNCED],
      [TIMESHEET_STATUS.SYNCED]: [TIMESHEET_STATUS.ARCHIVED]
    };

    return transitions[currentStatus] || [];
  }

  /**
   * Validate budget override permissions
   * @param {Object} userPermissions - User permissions
   * @param {string} overrideType - Type of override (hours, quantity, cost)
   * @returns {boolean} Whether override is allowed
   */
  static validateBudgetOverride(userPermissions, overrideType) {
    if (!userPermissions || !userPermissions.isAdmin) {
      return false;
    }

    const allowedOverrides = userPermissions.allowedOverrides || [];
    return allowedOverrides.includes(overrideType) || allowedOverrides.includes('all');
  }

  /**
   * Validate crew assignment
   * @param {Object} crew - Crew data
   * @param {Object} task - Task data
   * @returns {Object} Validation result
   */
  static validateCrewAssignment(crew, task) {
    const errors = [];
    const warnings = [];

    if (!crew.members || crew.members.length === 0) {
      errors.push('Crew must have at least one member');
    }

    if (!crew.avgRate || crew.avgRate <= 0) {
      warnings.push('Crew average rate is not set or is zero');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default ValidationService;
