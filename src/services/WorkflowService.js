// Workflow service for construction project management automation

import { PLAN_STATUS, TIMESHEET_STATUS, EXPENSE_STATUS } from '../utils/statusEnums';
import ValidationService from './ValidationService';
import AccService from './AccService_old';

class WorkflowService {
  /**
   * Create timesheet from plan
   * @param {string} planId - Plan ID
   * @param {Object} context - App context with state and dispatch
   * @returns {Promise<Object>} Result of timesheet creation
   */
  static async createTimesheetFromPlan(planId, context) {
    try {
      const { state, dispatch } = context;
      const plan = state.plans.find(p => p.id === planId);
      const planLines = state.planLines.filter(pl => pl.planId === planId);

      // Validate plan can be converted to timesheet
      const validation = ValidationService.validateTimesheetCreationFromPlan(plan, planLines);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Create timesheet from plan
      const timesheet = {
        id: `ts-${Date.now()}`,
        planId: planId,
        name: `Timesheet for ${plan.name}`,
        periodStart: plan.startDate,
        periodEnd: plan.finishDate,
        status: TIMESHEET_STATUS.DRAFT,
        totalHours: 0,
        totalQty: 0,
        createdBy: state.credentials.accountId,
        createdAt: new Date().toISOString(),
        createdFromPlan: true
      };

      // Create timesheet lines from plan lines
      const timesheetLines = planLines.map(planLine => ({
        id: `tsl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timesheetId: timesheet.id,
        planLineId: planLine.id,
        taskId: planLine.taskId,
        budgetId: planLine.budgetId,
        userId: planLine.userId,
        crewId: planLine.crewId,
        date: planLine.startDate,
        loggedHours: 0,
        outputQty: 0,
        comments: '',
        status: 'draft'
      }));

      // Dispatch actions
      dispatch({ type: 'ADD_TIMESHEET', payload: timesheet });
      dispatch({ type: 'ARCHIVE_PLAN', payload: planId });
      
      // Update plan status
      dispatch({ 
        type: 'UPDATE_PLAN', 
        payload: { 
          ...plan, 
          status: PLAN_STATUS.ARCHIVED,
          archivedAt: new Date().toISOString(),
          archivedBy: state.credentials.accountId
        } 
      });

      console.log('✅ Timesheet created from plan:', timesheet.id);
      return {
        success: true,
        timesheet,
        timesheetLines,
        message: 'Timesheet created successfully from plan'
      };

    } catch (error) {
      console.error('❌ Error creating timesheet from plan:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Submit timesheet for approval
   * @param {string} timesheetId - Timesheet ID
   * @param {Object} context - App context
   * @returns {Promise<Object>} Result of submission
   */
  static async submitTimesheet(timesheetId, context) {
    try {
      const { state, dispatch } = context;
      const timesheet = state.timesheets.find(t => t.id === timesheetId);

      if (!timesheet) {
        throw new Error('Timesheet not found');
      }

      if (timesheet.status !== TIMESHEET_STATUS.DRAFT) {
        throw new Error('Timesheet must be in draft status to submit');
      }

      // Update timesheet status
      dispatch({
        type: 'UPDATE_TIMESHEET_STATUS',
        payload: {
          timesheetId,
          newStatus: TIMESHEET_STATUS.SUBMITTED
        }
      });

      console.log('✅ Timesheet submitted:', timesheetId);
      return {
        success: true,
        message: 'Timesheet submitted for approval'
      };

    } catch (error) {
      console.error('❌ Error submitting timesheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Approve timesheet
   * @param {string} timesheetId - Timesheet ID
   * @param {Object} context - App context
   * @returns {Promise<Object>} Result of approval
   */
  static async approveTimesheet(timesheetId, context) {
    try {
      const { state, dispatch } = context;
      const timesheet = state.timesheets.find(t => t.id === timesheetId);

      if (!timesheet) {
        throw new Error('Timesheet not found');
      }

      if (timesheet.status !== TIMESHEET_STATUS.SUBMITTED) {
        throw new Error('Timesheet must be submitted to approve');
      }

      // Update timesheet status
      dispatch({
        type: 'UPDATE_TIMESHEET_STATUS',
        payload: {
          timesheetId,
          newStatus: TIMESHEET_STATUS.APPROVED
        }
      });

      console.log('✅ Timesheet approved:', timesheetId);
      return {
        success: true,
        message: 'Timesheet approved successfully'
      };

    } catch (error) {
      console.error('❌ Error approving timesheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync timesheet to ACC Performance Tracker
   * @param {string} timesheetId - Timesheet ID
   * @param {Object} context - App context
   * @returns {Promise<Object>} Result of sync
   */
  static async syncTimesheetToPerformanceTracker(timesheetId, context) {
    try {
      const { state, dispatch } = context;
      const timesheet = state.timesheets.find(t => t.id === timesheetId);

      if (!timesheet) {
        throw new Error('Timesheet not found');
      }

      if (timesheet.status !== TIMESHEET_STATUS.APPROVED) {
        throw new Error('Timesheet must be approved before syncing');
      }

      // Sync to ACC Performance Tracker
      const accService = new AccService();
      await accService.syncTimesheetToPerformanceTracker(timesheet);

      // Update timesheet status
      dispatch({
        type: 'UPDATE_TIMESHEET_STATUS',
        payload: {
          timesheetId,
          newStatus: TIMESHEET_STATUS.SYNCED
        }
      });

      // Mark as synced to tracker
      dispatch({
        type: 'SYNC_TIMESHEET_TO_TRACKER',
        payload: timesheetId
      });

      console.log('✅ Timesheet synced to Performance Tracker:', timesheetId);
      return {
        success: true,
        message: 'Timesheet synced to ACC Performance Tracker'
      };

    } catch (error) {
      console.error('❌ Error syncing timesheet to Performance Tracker:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create expense from timesheet
   * @param {string} timesheetId - Timesheet ID
   * @param {Object} context - App context
   * @returns {Promise<Object>} Result of expense creation
   */
  static async createExpenseFromTimesheet(timesheetId, context) {
    try {
      const { state, dispatch } = context;
      const timesheet = state.timesheets.find(t => t.id === timesheetId);

      if (!timesheet) {
        throw new Error('Timesheet not found');
      }

      if (timesheet.status !== TIMESHEET_STATUS.SYNCED) {
        throw new Error('Timesheet must be synced before creating expense');
      }

      // Create expense from timesheet
      const expense = {
        id: `exp-${Date.now()}`,
        timesheetId: timesheetId,
        name: `Expense for ${timesheet.name}`,
        amount: timesheet.totalCost || 0,
        tax: 0,
        status: EXPENSE_STATUS.DRAFT,
        createdAt: new Date().toISOString(),
        createdBy: state.credentials.accountId
      };

      // Dispatch action
      dispatch({ type: 'ADD_EXPENSE', payload: expense });

      console.log('✅ Expense created from timesheet:', expense.id);
      return {
        success: true,
        expense,
        message: 'Expense created successfully from timesheet'
      };

    } catch (error) {
      console.error('❌ Error creating expense from timesheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Archive timesheet
   * @param {string} timesheetId - Timesheet ID
   * @param {Object} context - App context
   * @returns {Promise<Object>} Result of archiving
   */
  static async archiveTimesheet(timesheetId, context) {
    try {
      const { state, dispatch } = context;
      const timesheet = state.timesheets.find(t => t.id === timesheetId);

      if (!timesheet) {
        throw new Error('Timesheet not found');
      }

      // Update timesheet status
      dispatch({
        type: 'UPDATE_TIMESHEET_STATUS',
        payload: {
          timesheetId,
          newStatus: TIMESHEET_STATUS.ARCHIVED
        }
      });

      // Archive timesheet
      dispatch({
        type: 'ARCHIVE_TIMESHEET',
        payload: timesheetId
      });

      console.log('✅ Timesheet archived:', timesheetId);
      return {
        success: true,
        message: 'Timesheet archived successfully'
      };

    } catch (error) {
      console.error('❌ Error archiving timesheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reopen archived plan (admin only)
   * @param {string} planId - Plan ID
   * @param {Object} context - App context
   * @returns {Promise<Object>} Result of reopening
   */
  static async reopenArchivedPlan(planId, context) {
    try {
      const { state, dispatch } = context;
      const plan = state.archivedPlans.find(p => p.id === planId);

      if (!plan) {
        throw new Error('Archived plan not found');
      }

      // Check if plan has associated timesheets
      const associatedTimesheets = state.timesheets.filter(t => t.planId === planId);
      if (associatedTimesheets.length > 0) {
        throw new Error('Cannot reopen plan with associated timesheets');
      }

      // Update plan status
      dispatch({
        type: 'UPDATE_PLAN',
        payload: {
          ...plan,
          status: PLAN_STATUS.DRAFT,
          reopenedAt: new Date().toISOString(),
          reopenedBy: state.credentials.accountId
        }
      });

      // Move from archived to active
      dispatch({
        type: 'SET_PLANS',
        payload: [...state.plans, plan]
      });

      dispatch({
        type: 'SET_ARCHIVED_PLANS',
        payload: state.archivedPlans.filter(p => p.id !== planId)
      });

      console.log('✅ Plan reopened:', planId);
      return {
        success: true,
        message: 'Plan reopened successfully'
      };

    } catch (error) {
      console.error('❌ Error reopening plan:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default WorkflowService;
