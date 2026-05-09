import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Centralized data store for the entire application
const AppDataContext = createContext();

// Action types
const ActionTypes = {
  // Projects
  SET_PROJECTS: 'SET_PROJECTS',
  SET_SELECTED_PROJECT: 'SET_SELECTED_PROJECT',
  SET_SELECTED_HUB: 'SET_SELECTED_HUB',
  
  // Members & Crews
  SET_MEMBERS: 'SET_MEMBERS',
  SET_CREWS: 'SET_CREWS',
  ADD_CREW: 'ADD_CREW',
  UPDATE_CREW: 'UPDATE_CREW',
  DELETE_CREW: 'DELETE_CREW',
  
  // Resources (canonical entity)
  SET_RESOURCES: 'SET_RESOURCES',
  ADD_RESOURCE: 'ADD_RESOURCE',
  UPDATE_RESOURCE: 'UPDATE_RESOURCE',
  DELETE_RESOURCE: 'DELETE_RESOURCE',
  
  // Tasks
  SET_TASKS: 'SET_TASKS',
  ADD_TASK: 'ADD_TASK',
  UPDATE_TASK: 'UPDATE_TASK',
  DELETE_TASK: 'DELETE_TASK',
  ARCHIVE_TASK: 'ARCHIVE_TASK',
  
  // Budgets
  SET_BUDGETS: 'SET_BUDGETS',
  UPDATE_BUDGET: 'UPDATE_BUDGET',
  
  // Plans (Work Planning)
  SET_PLANS: 'SET_PLANS',
  ADD_PLAN: 'ADD_PLAN',
  UPDATE_PLAN: 'UPDATE_PLAN',
  DELETE_PLAN: 'DELETE_PLAN',
  ARCHIVE_PLAN: 'ARCHIVE_PLAN',
  
  // Plan Lines
  SET_PLAN_LINES: 'SET_PLAN_LINES',
  ADD_PLAN_LINE: 'ADD_PLAN_LINE',
  UPDATE_PLAN_LINE: 'UPDATE_PLAN_LINE',
  DELETE_PLAN_LINE: 'DELETE_PLAN_LINE',
  
  // Timesheets
  SET_TIMESHEETS: 'SET_TIMESHEETS',
  ADD_TIMESHEET: 'ADD_TIMESHEET',
  UPDATE_TIMESHEET: 'UPDATE_TIMESHEET',
  DELETE_TIMESHEET: 'DELETE_TIMESHEET',
  ARCHIVE_TIMESHEET: 'ARCHIVE_TIMESHEET',
  SYNC_TIMESHEET_TO_TRACKER: 'SYNC_TIMESHEET_TO_TRACKER',
  UPDATE_TIMESHEET_STATUS: 'UPDATE_TIMESHEET_STATUS',
  
  // Expenses
  SET_EXPENSES: 'SET_EXPENSES',
  ADD_EXPENSE: 'ADD_EXPENSE',
  UPDATE_EXPENSE: 'UPDATE_EXPENSE',
  DELETE_EXPENSE: 'DELETE_EXPENSE',
  SYNC_EXPENSE_TO_ACC: 'SYNC_EXPENSE_TO_ACC',
  CREATE_EXPENSE_FROM_TIMESHEET: 'CREATE_EXPENSE_FROM_TIMESHEET',
  
  // Authentication
  SET_CREDENTIALS: 'SET_CREDENTIALS',
  CLEAR_CREDENTIALS: 'CLEAR_CREDENTIALS',
  
  // Loading states
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

// Initial state
const initialState = {
  // Projects
  projects: [],
  selectedProject: null,
  selectedHub: null,
  
  // Members & Crews
  members: [],
  crews: [],
  
  // Resources (canonical entity)
  resources: [],
  
  // Tasks
  tasks: [],
  archivedTasks: [],
  
  // Budgets
  budgets: [],
  
  // Plans (Work Planning)
  plans: [],
  planLines: [],
  archivedPlans: [],
  
  // Timesheets
  timesheets: [],
  archivedTimesheets: [],
  
  // Expenses
  expenses: [],
  archivedExpenses: [],
  
  // Status Management
  timesheetStatuses: {
    draft: [],
    submitted: [],
    approved: [],
    synced: [],
    archived: []
  },
  
  // Admin Settings
  adminSettings: {
    allowExtraHours: false,
    minSplitLength: 0,
    defaultRates: {},
    accIntegration: {
      clientId: '',
      clientSecret: '',
      redirectUris: []
    },
    mappingRules: {},
    permissions: {}
  },
  
  // Authentication
  credentials: {
    accountId: '',
    clientId: '',
    threeLegToken: '',
    refreshToken: '',
    twoLeggedToken: ''
  },
  
  // UI State
  loading: false,
  error: null
};

// Reducer function
function appDataReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_PROJECTS:
      return { ...state, projects: action.payload };
    
    case ActionTypes.SET_SELECTED_PROJECT:
      return { ...state, selectedProject: action.payload };
    
    case ActionTypes.SET_SELECTED_HUB:
      return { ...state, selectedHub: action.payload };
    
    case ActionTypes.SET_MEMBERS:
      return { ...state, members: action.payload };
    
    case ActionTypes.SET_CREWS:
      return { ...state, crews: action.payload };
    
    case ActionTypes.ADD_CREW:
      return { ...state, crews: [...state.crews, action.payload] };
    
    case ActionTypes.UPDATE_CREW:
      return {
        ...state,
        crews: state.crews.map(crew => 
          crew.id === action.payload.id ? action.payload : crew
        )
      };
    
    case ActionTypes.DELETE_CREW:
      return {
        ...state,
        crews: state.crews.filter(crew => crew.id !== action.payload)
      };
    
    case ActionTypes.SET_RESOURCES:
      return { ...state, resources: action.payload };
    
    case ActionTypes.ADD_RESOURCE:
      return { ...state, resources: [...state.resources, action.payload] };
    
    case ActionTypes.UPDATE_RESOURCE:
      return {
        ...state,
        resources: state.resources.map(resource => 
          resource.id === action.payload.id ? action.payload : resource
        )
      };
    
    case ActionTypes.DELETE_RESOURCE:
      return {
        ...state,
        resources: state.resources.filter(resource => resource.id !== action.payload)
      };
    
    case ActionTypes.SET_TASKS:
      return { ...state, tasks: action.payload };
    
    case ActionTypes.ADD_TASK:
      return { ...state, tasks: [...state.tasks, action.payload] };
    
    case ActionTypes.UPDATE_TASK:
      return {
        ...state,
        tasks: state.tasks.map(task => 
          task.id === action.payload.id ? action.payload : task
        )
      };
    
    case ActionTypes.DELETE_TASK:
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload)
      };
    
    case ActionTypes.ARCHIVE_TASK:
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
        archivedTasks: [...state.archivedTasks, action.payload]
      };
    
    case ActionTypes.SET_BUDGETS:
      return { ...state, budgets: action.payload };
    
    case ActionTypes.UPDATE_BUDGET:
      return {
        ...state,
        budgets: state.budgets.map(budget => 
          budget.id === action.payload.id ? action.payload : budget
        )
      };
    
    // Plans (Work Planning)
    case ActionTypes.SET_PLANS:
      return { ...state, plans: action.payload };
    
    case ActionTypes.ADD_PLAN:
      return { ...state, plans: [...state.plans, action.payload] };
    
    case ActionTypes.UPDATE_PLAN:
      return {
        ...state,
        plans: state.plans.map(plan => 
          plan.id === action.payload.id ? action.payload : plan
        )
      };
    
    case ActionTypes.DELETE_PLAN:
      return {
        ...state,
        plans: state.plans.filter(plan => plan.id !== action.payload)
      };
    
    case ActionTypes.ARCHIVE_PLAN:
      return {
        ...state,
        plans: state.plans.filter(plan => plan.id !== action.payload),
        archivedPlans: [...state.archivedPlans, action.payload]
      };
    
    // Plan Lines
    case ActionTypes.SET_PLAN_LINES:
      return { ...state, planLines: action.payload };
    
    case ActionTypes.ADD_PLAN_LINE:
      return { ...state, planLines: [...state.planLines, action.payload] };
    
    case ActionTypes.UPDATE_PLAN_LINE:
      return {
        ...state,
        planLines: state.planLines.map(planLine => 
          planLine.id === action.payload.id ? action.payload : planLine
        )
      };
    
    case ActionTypes.DELETE_PLAN_LINE:
      return {
        ...state,
        planLines: state.planLines.filter(planLine => planLine.id !== action.payload)
      };
    
    case ActionTypes.SET_TIMESHEETS:
      return { ...state, timesheets: action.payload };
    
    case ActionTypes.ADD_TIMESHEET:
      return { ...state, timesheets: [...state.timesheets, action.payload] };
    
    case ActionTypes.UPDATE_TIMESHEET:
      return {
        ...state,
        timesheets: state.timesheets.map(timesheet => 
          timesheet.id === action.payload.id ? action.payload : timesheet
        )
      };
    
    case ActionTypes.DELETE_TIMESHEET:
      return {
        ...state,
        timesheets: state.timesheets.filter(timesheet => timesheet.id !== action.payload)
      };
    
    case ActionTypes.ARCHIVE_TIMESHEET:
      return {
        ...state,
        timesheets: state.timesheets.filter(timesheet => timesheet.id !== action.payload),
        archivedTimesheets: [...state.archivedTimesheets, action.payload]
      };
    
    case ActionTypes.SYNC_TIMESHEET_TO_TRACKER:
      return {
        ...state,
        timesheets: state.timesheets.map(timesheet => 
          timesheet.id === action.payload 
            ? { ...timesheet, syncedToTracker: true, syncedToTrackerAt: new Date().toISOString() }
            : timesheet
        ),
        archivedTimesheets: state.archivedTimesheets.map(timesheet => 
          timesheet.id === action.payload 
            ? { ...timesheet, syncedToTracker: true, syncedToTrackerAt: new Date().toISOString() }
            : timesheet
        )
      };
    
    case ActionTypes.UPDATE_TIMESHEET_STATUS:
      const { timesheetId, newStatus } = action.payload;
      return {
        ...state,
        timesheets: state.timesheets.map(timesheet => 
          timesheet.id === timesheetId 
            ? { ...timesheet, status: newStatus, statusUpdatedAt: new Date().toISOString() }
            : timesheet
        ),
        timesheetStatuses: {
          ...state.timesheetStatuses,
          [newStatus]: [...state.timesheetStatuses[newStatus], timesheetId]
        }
      };
    
    case ActionTypes.SET_EXPENSES:
      return { ...state, expenses: action.payload };
    
    case ActionTypes.ADD_EXPENSE:
      return { ...state, expenses: [...state.expenses, action.payload] };
    
    case ActionTypes.UPDATE_EXPENSE:
      return {
        ...state,
        expenses: state.expenses.map(expense => 
          expense.id === action.payload.id ? action.payload : expense
        )
      };
    
    case ActionTypes.DELETE_EXPENSE:
      return {
        ...state,
        expenses: state.expenses.filter(expense => expense.id !== action.payload)
      };
    
    case ActionTypes.SYNC_EXPENSE_TO_ACC:
      return {
        ...state,
        expenses: state.expenses.map(expense => 
          expense.id === action.payload 
            ? { ...expense, syncedToACC: true, syncedToACCAt: new Date().toISOString() }
            : expense
        )
      };
    
    case ActionTypes.SET_CREDENTIALS:
      return { ...state, credentials: action.payload };
    
    case ActionTypes.CLEAR_CREDENTIALS:
      return { ...state, credentials: initialState.credentials };
    
    case ActionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    
    default:
      return state;
  }
}

// Provider component
export function AppDataProvider({ children }) {
  const [state, dispatch] = useReducer(appDataReducer, initialState);

  // Load data from localStorage on mount
  useEffect(() => {
    // Load projects
    const savedProjects = localStorage.getItem('zoyantra_projects');
    if (savedProjects) {
      dispatch({ type: ActionTypes.SET_PROJECTS, payload: JSON.parse(savedProjects) });
    }

    // Load members
    const savedMembers = localStorage.getItem('zoyantra_members');
    if (savedMembers) {
      dispatch({ type: ActionTypes.SET_MEMBERS, payload: JSON.parse(savedMembers) });
    }

    // Load crews
    const savedCrews = localStorage.getItem('zoyantra_crews');
    if (savedCrews) {
      dispatch({ type: ActionTypes.SET_CREWS, payload: JSON.parse(savedCrews) });
    }

    // Load resources
    const savedResources = localStorage.getItem('zoyantra_resources');
    if (savedResources) {
      dispatch({ type: ActionTypes.SET_RESOURCES, payload: JSON.parse(savedResources) });
    }

    // Load tasks
    const savedTasks = localStorage.getItem('zoyantra_tasks');
    if (savedTasks) {
      const tasks = JSON.parse(savedTasks);
      const activeTasks = tasks.filter(task => !task.isArchived);
      const archivedTasks = tasks.filter(task => task.isArchived);
      dispatch({ type: ActionTypes.SET_TASKS, payload: activeTasks });
      dispatch({ type: ActionTypes.SET_ARCHIVED_TASKS, payload: archivedTasks });
    }

    // Load budgets
    const savedBudgets = localStorage.getItem('zoyantra_budgets');
    if (savedBudgets) {
      dispatch({ type: ActionTypes.SET_BUDGETS, payload: JSON.parse(savedBudgets) });
    }

    // Load timesheets
    const savedTimesheets = localStorage.getItem('zoyantra_timesheets');
    if (savedTimesheets) {
      const timesheets = JSON.parse(savedTimesheets);
      const activeTimesheets = timesheets.filter(ts => !ts.isArchived);
      const archivedTimesheets = timesheets.filter(ts => ts.isArchived);
      dispatch({ type: ActionTypes.SET_TIMESHEETS, payload: activeTimesheets });
      dispatch({ type: ActionTypes.SET_ARCHIVED_TIMESHEETS, payload: archivedTimesheets });
    }

    // Load expenses
    const savedExpenses = localStorage.getItem('zoyantra_expenses');
    if (savedExpenses) {
      const expenses = JSON.parse(savedExpenses);
      const activeExpenses = expenses.filter(exp => !exp.isArchived);
      const archivedExpenses = expenses.filter(exp => exp.isArchived);
      dispatch({ type: ActionTypes.SET_EXPENSES, payload: activeExpenses });
      dispatch({ type: ActionTypes.SET_ARCHIVED_EXPENSES, payload: archivedExpenses });
    }

    // Load credentials (without client secret)
    const savedCredentials = localStorage.getItem('zoyantra_credentials');
    if (savedCredentials) {
      const creds = JSON.parse(savedCredentials);
      // Remove client secret for security
      const { clientSecret, ...safeCredentials } = creds;
      dispatch({ type: ActionTypes.SET_CREDENTIALS, payload: safeCredentials });
    }
  }, []);

  // Save data to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('zoyantra_projects', JSON.stringify(state.projects));
  }, [state.projects]);

  useEffect(() => {
    localStorage.setItem('zoyantra_members', JSON.stringify(state.members));
  }, [state.members]);

  useEffect(() => {
    localStorage.setItem('zoyantra_crews', JSON.stringify(state.crews));
  }, [state.crews]);

  useEffect(() => {
    localStorage.setItem('zoyantra_resources', JSON.stringify(state.resources));
  }, [state.resources]);

  useEffect(() => {
    const allTasks = [...state.tasks, ...state.archivedTasks];
    localStorage.setItem('zoyantra_tasks', JSON.stringify(allTasks));
  }, [state.tasks, state.archivedTasks]);

  useEffect(() => {
    localStorage.setItem('zoyantra_budgets', JSON.stringify(state.budgets));
  }, [state.budgets]);

  useEffect(() => {
    const allTimesheets = [...state.timesheets, ...state.archivedTimesheets];
    localStorage.setItem('zoyantra_timesheets', JSON.stringify(allTimesheets));
  }, [state.timesheets, state.archivedTimesheets]);

  useEffect(() => {
    const allExpenses = [...state.expenses, ...state.archivedExpenses];
    localStorage.setItem('zoyantra_expenses', JSON.stringify(allExpenses));
  }, [state.expenses, state.archivedExpenses]);

  useEffect(() => {
    localStorage.setItem('zoyantra_credentials', JSON.stringify(state.credentials));
  }, [state.credentials]);

  const value = {
    state,
    dispatch,
    actions: {
      // Projects
      setProjects: (projects) => dispatch({ type: ActionTypes.SET_PROJECTS, payload: projects }),
      setSelectedProject: (project) => dispatch({ type: ActionTypes.SET_SELECTED_PROJECT, payload: project }),
      setSelectedHub: (hub) => dispatch({ type: ActionTypes.SET_SELECTED_HUB, payload: hub }),
      
      // Members & Crews
      setMembers: (members) => dispatch({ type: ActionTypes.SET_MEMBERS, payload: members }),
      setCrews: (crews) => dispatch({ type: ActionTypes.SET_CREWS, payload: crews }),
      addCrew: (crew) => dispatch({ type: ActionTypes.ADD_CREW, payload: crew }),
      updateCrew: (crew) => dispatch({ type: ActionTypes.UPDATE_CREW, payload: crew }),
      deleteCrew: (crewId) => dispatch({ type: ActionTypes.DELETE_CREW, payload: crewId }),
      
      // Resources
      setResources: (resources) => dispatch({ type: ActionTypes.SET_RESOURCES, payload: resources }),
      addResource: (resource) => dispatch({ type: ActionTypes.ADD_RESOURCE, payload: resource }),
      updateResource: (resource) => dispatch({ type: ActionTypes.UPDATE_RESOURCE, payload: resource }),
      deleteResource: (resourceId) => dispatch({ type: ActionTypes.DELETE_RESOURCE, payload: resourceId }),
      
      // Tasks
      setTasks: (tasks) => dispatch({ type: ActionTypes.SET_TASKS, payload: tasks }),
      addTask: (task) => dispatch({ type: ActionTypes.ADD_TASK, payload: task }),
      updateTask: (task) => dispatch({ type: ActionTypes.UPDATE_TASK, payload: task }),
      deleteTask: (taskId) => dispatch({ type: ActionTypes.DELETE_TASK, payload: taskId }),
      archiveTask: (task) => dispatch({ type: ActionTypes.ARCHIVE_TASK, payload: task }),
      
      // Budgets
      setBudgets: (budgets) => dispatch({ type: ActionTypes.SET_BUDGETS, payload: budgets }),
      updateBudget: (budget) => dispatch({ type: ActionTypes.UPDATE_BUDGET, payload: budget }),
      
      // Timesheets
      setTimesheets: (timesheets) => dispatch({ type: ActionTypes.SET_TIMESHEETS, payload: timesheets }),
      addTimesheet: (timesheet) => dispatch({ type: ActionTypes.ADD_TIMESHEET, payload: timesheet }),
      updateTimesheet: (timesheet) => dispatch({ type: ActionTypes.UPDATE_TIMESHEET, payload: timesheet }),
      deleteTimesheet: (timesheetId) => dispatch({ type: ActionTypes.DELETE_TIMESHEET, payload: timesheetId }),
      archiveTimesheet: (timesheet) => dispatch({ type: ActionTypes.ARCHIVE_TIMESHEET, payload: timesheet }),
      syncTimesheetToTracker: (timesheetId) => dispatch({ type: ActionTypes.SYNC_TIMESHEET_TO_TRACKER, payload: timesheetId }),
      
      // Expenses
      setExpenses: (expenses) => dispatch({ type: ActionTypes.SET_EXPENSES, payload: expenses }),
      addExpense: (expense) => dispatch({ type: ActionTypes.ADD_EXPENSE, payload: expense }),
      updateExpense: (expense) => dispatch({ type: ActionTypes.UPDATE_EXPENSE, payload: expense }),
      deleteExpense: (expenseId) => dispatch({ type: ActionTypes.DELETE_EXPENSE, payload: expenseId }),
      syncExpenseToACC: (expenseId) => dispatch({ type: ActionTypes.SYNC_EXPENSE_TO_ACC, payload: expenseId }),
      
      // Authentication
      setCredentials: (credentials) => dispatch({ type: ActionTypes.SET_CREDENTIALS, payload: credentials }),
      clearCredentials: () => dispatch({ type: ActionTypes.CLEAR_CREDENTIALS }),
      
      // UI State
      setLoading: (loading) => dispatch({ type: ActionTypes.SET_LOADING, payload: loading }),
      setError: (error) => dispatch({ type: ActionTypes.SET_ERROR, payload: error })
    }
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}

// Custom hook to use the context
export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}

export default AppDataContext;

