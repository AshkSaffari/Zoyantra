// Status management system for construction project management workflow

export const TASK_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  DEPRECATED: 'deprecated'
};

export const PLAN_STATUS = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  ARCHIVED: 'archived'
};

export const TIMESHEET_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  SYNCED: 'synced',
  ARCHIVED: 'archived'
};

export const EXPENSE_STATUS = {
  DRAFT: 'draft',
  SENT_TO_ACC: 'sent_to_acc',
  APPROVED: 'approved',
  PAID: 'paid'
};

export const CREW_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived'
};

// Status flow definitions
export const STATUS_FLOWS = {
  TASK: [TASK_STATUS.DRAFT, TASK_STATUS.ACTIVE, TASK_STATUS.DEPRECATED],
  PLAN: [PLAN_STATUS.DRAFT, PLAN_STATUS.APPROVED, PLAN_STATUS.ARCHIVED],
  TIMESHEET: [
    TIMESHEET_STATUS.DRAFT,
    TIMESHEET_STATUS.SUBMITTED,
    TIMESHEET_STATUS.APPROVED,
    TIMESHEET_STATUS.SYNCED,
    TIMESHEET_STATUS.ARCHIVED
  ],
  EXPENSE: [
    EXPENSE_STATUS.DRAFT,
    EXPENSE_STATUS.SENT_TO_ACC,
    EXPENSE_STATUS.APPROVED,
    EXPENSE_STATUS.PAID
  ]
};

// Status transition rules
export const STATUS_TRANSITIONS = {
  [TASK_STATUS.DRAFT]: [TASK_STATUS.ACTIVE],
  [TASK_STATUS.ACTIVE]: [TASK_STATUS.DEPRECATED],
  [TASK_STATUS.DEPRECATED]: [], // Terminal state
  
  [PLAN_STATUS.DRAFT]: [PLAN_STATUS.APPROVED],
  [PLAN_STATUS.APPROVED]: [PLAN_STATUS.ARCHIVED],
  [PLAN_STATUS.ARCHIVED]: [], // Terminal state
  
  [TIMESHEET_STATUS.DRAFT]: [TIMESHEET_STATUS.SUBMITTED],
  [TIMESHEET_STATUS.SUBMITTED]: [TIMESHEET_STATUS.APPROVED, TIMESHEET_STATUS.DRAFT],
  [TIMESHEET_STATUS.APPROVED]: [TIMESHEET_STATUS.SYNCED],
  [TIMESHEET_STATUS.SYNCED]: [TIMESHEET_STATUS.ARCHIVED],
  [TIMESHEET_STATUS.ARCHIVED]: [], // Terminal state
  
  [EXPENSE_STATUS.DRAFT]: [EXPENSE_STATUS.SENT_TO_ACC],
  [EXPENSE_STATUS.SENT_TO_ACC]: [EXPENSE_STATUS.APPROVED, EXPENSE_STATUS.DRAFT],
  [EXPENSE_STATUS.APPROVED]: [EXPENSE_STATUS.PAID],
  [EXPENSE_STATUS.PAID]: [] // Terminal state
};

// Helper functions
export const getNextStatuses = (currentStatus) => {
  return STATUS_TRANSITIONS[currentStatus] || [];
};

export const canTransitionTo = (currentStatus, targetStatus) => {
  return STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) || false;
};

export const isTerminalStatus = (status) => {
  return STATUS_TRANSITIONS[status]?.length === 0;
};

// Status display names
export const STATUS_DISPLAY_NAMES = {
  [TASK_STATUS.DRAFT]: 'Draft',
  [TASK_STATUS.ACTIVE]: 'Active',
  [TASK_STATUS.DEPRECATED]: 'Deprecated',
  
  [PLAN_STATUS.DRAFT]: 'Draft',
  [PLAN_STATUS.APPROVED]: 'Approved',
  [PLAN_STATUS.ARCHIVED]: 'Archived',
  
  [TIMESHEET_STATUS.DRAFT]: 'Draft',
  [TIMESHEET_STATUS.SUBMITTED]: 'Submitted',
  [TIMESHEET_STATUS.APPROVED]: 'Approved',
  [TIMESHEET_STATUS.SYNCED]: 'Synced',
  [TIMESHEET_STATUS.ARCHIVED]: 'Archived',
  
  [EXPENSE_STATUS.DRAFT]: 'Draft',
  [EXPENSE_STATUS.SENT_TO_ACC]: 'Sent to ACC',
  [EXPENSE_STATUS.APPROVED]: 'Approved',
  [EXPENSE_STATUS.PAID]: 'Paid'
};

// Status colors for UI
export const STATUS_COLORS = {
  [TASK_STATUS.DRAFT]: 'gray',
  [TASK_STATUS.ACTIVE]: 'green',
  [TASK_STATUS.DEPRECATED]: 'red',
  
  [PLAN_STATUS.DRAFT]: 'yellow',
  [PLAN_STATUS.APPROVED]: 'green',
  [PLAN_STATUS.ARCHIVED]: 'gray',
  
  [TIMESHEET_STATUS.DRAFT]: 'gray',
  [TIMESHEET_STATUS.SUBMITTED]: 'blue',
  [TIMESHEET_STATUS.APPROVED]: 'green',
  [TIMESHEET_STATUS.SYNCED]: 'purple',
  [TIMESHEET_STATUS.ARCHIVED]: 'gray',
  
  [EXPENSE_STATUS.DRAFT]: 'gray',
  [EXPENSE_STATUS.SENT_TO_ACC]: 'blue',
  [EXPENSE_STATUS.APPROVED]: 'green',
  [EXPENSE_STATUS.PAID]: 'green'
};
