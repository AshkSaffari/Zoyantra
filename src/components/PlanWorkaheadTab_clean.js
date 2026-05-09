import React, { useState, useEffect } from 'react';
import { Plus, Calendar as CalendarIcon, User, Users, Target, Download, Upload, Clock, Link as LinkIcon } from "lucide-react";
import CalendarTab from "./CalendarTab";
import * as XLSX from 'xlsx';
import { safeParseFloat, safeToFixed, safeFormatCurrency, extractBudgetAmount } from '../utils/numberUtils';
import LocalTimesheetService from '../services/LocalTimesheetService';
import TaskBudgetLinkService from '../services/TaskBudgetLinkService';
import AccService from '../services/AccService';

const PlanWorkaheadTab = ({ selectedProject, selectedHub, projects, members = [], budgets = [], credentials }) => {
  const [tasks, setTasks] = useState([]);
  const [crews, setCrews] = useState([]);
  const [selectedProjectBudgets, setSelectedProjectBudgets] = useState([]);
  const [projectUsers, setProjectUsers] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [availableCalendars, setAvailableCalendars] = useState([]);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [timesheetService] = useState(new LocalTimesheetService());
  const [linkService] = useState(() => new TaskBudgetLinkService());
  const [linkedTasks, setLinkedTasks] = useState([]);
  const [filteredBudget, setFilteredBudget] = useState('');
  const [budgetSearchTerm, setBudgetSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    taskName: "",
    description: "",
    plannedDate: "",
    startDate: "",
    endDate: "",
    plannedHours: "",
    plannedOutput: "",
    outputUnit: "units",
    outputUnitCost: "",
    taskValue: "",
    workType: "member", // member or crew
    assignedMemberName: "",
    assignedCrewName: "",
    userName: "",
    crewId: "",
    crewName: "",
    budgetId: "",
    budgetName: "",
    budgetAmount: 0,
    status: "planned"
  });

  // Load data when project changes
  useEffect(() => {
    if (selectedProject) {
      loadTasks();
      loadCrews();
      loadProjectBudgets();
      loadProjectUsers();
      loadAvailableCalendars();
    }
  }, [selectedProject, budgets]);

  // Clear budget state when hub changes to prevent cross-hub data pollution
  useEffect(() => {
    console.log('🔄 Hub changed in PlanWorkaheadTab, clearing budget state to prevent cross-hub data pollution');
    setSelectedProjectBudgets([]);
    setProjectUsers([]);
    
    // Force clear any cached data
    if (typeof localStorage !== 'undefined') {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('budget') || key.includes('user') || key.includes('project'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('🧹 Cleared cached budget/user data from localStorage in PlanWorkaheadTab');
    }
  }, [selectedHub]);

  // Budget loading will be rebuilt from scratch
  const loadProjectBudgets = async () => {
    console.log('💰 Budget loading will be rebuilt from scratch');
    setSelectedProjectBudgets([]);
  };

  const loadProjectUsers = async () => {
    if (!selectedProject || !credentials) return;
    
    try {
      console.log('👥 Loading project users for project:', selectedProject.id);
      const users = await AccService.getProjectMembers(selectedProject.id);
      setProjectUsers(users);
      console.log('👥 Loaded project users:', users.length);
    } catch (error) {
      console.error('Error loading project users:', error);
      setProjectUsers([]);
    }
  };

  const loadTasks = () => {
    const savedTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    setTasks(savedTasks);
  };

  const loadCrews = () => {
    const savedCrews = JSON.parse(localStorage.getItem('crews') || '[]');
    setCrews(savedCrews);
  };

  const loadAvailableCalendars = () => {
    const savedCalendars = JSON.parse(localStorage.getItem('calendars') || '[]');
    setAvailableCalendars(savedCalendars);
  };

  const saveTasks = (newTasks) => {
    localStorage.setItem('tasks', JSON.stringify(newTasks));
    setTasks(newTasks);
  };

  const saveCrews = (newCrews) => {
    localStorage.setItem('crews', JSON.stringify(newCrews));
    setCrews(newCrews);
  };

  const saveCalendars = (newCalendars) => {
    localStorage.setItem('calendars', JSON.stringify(newCalendars));
    setAvailableCalendars(newCalendars);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newTask = {
      id: Date.now().toString(),
      ...formData,
      createdAt: new Date().toISOString()
    };
    
    const updatedTasks = [...tasks, newTask];
    saveTasks(updatedTasks);
    
    // Reset form
    setFormData({
      taskName: "",
      description: "",
      plannedDate: "",
      startDate: "",
      endDate: "",
      plannedHours: "",
      plannedOutput: "",
      outputUnit: "units",
      outputUnitCost: "",
      taskValue: "",
      workType: "member",
      assignedMemberName: "",
      assignedCrewName: "",
      userName: "",
      crewId: "",
      crewName: "",
      budgetId: "",
      budgetName: "",
      budgetAmount: 0,
      status: "planned"
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const deleteTask = (taskId) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    saveTasks(updatedTasks);
  };

  const updateTask = (taskId, updates) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    );
    saveTasks(updatedTasks);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Budget System Status</h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              <strong>Budget functionality is being rebuilt from scratch.</strong>
            </p>
            <p className="text-yellow-700 mt-2">
              All budget-related features have been removed and will be reimplemented with a clean, 
              region-aware approach that works for both US and APAC hubs.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Name *
              </label>
              <input
                type="text"
                name="taskName"
                value={formData.taskName}
                onChange={handleInputChange}
                required
                className="w-full p-2 border rounded-lg"
                placeholder="Enter task name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Type *
              </label>
              <select
                name="workType"
                value={formData.workType}
                onChange={handleInputChange}
                required
                className="w-full p-2 border rounded-lg"
              >
                <option value="member">Individual Member</option>
                <option value="crew">Crew</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Planned Date *
              </label>
              <input
                type="date"
                name="plannedDate"
                value={formData.plannedDate}
                onChange={handleInputChange}
                required
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Planned Hours
              </label>
              <input
                type="number"
                name="plannedHours"
                value={formData.plannedHours}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                placeholder="0"
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-lg"
              rows="3"
              placeholder="Enter task description"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Tasks ({tasks.length})</h3>
        
        {tasks.length === 0 ? (
          <p className="text-gray-500">No tasks planned yet.</p>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{task.taskName}</h4>
                    <p className="text-gray-600 text-sm">{task.description}</p>
                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                      <span>Planned: {task.plannedDate}</span>
                      <span>Hours: {task.plannedHours || 0}</span>
                      <span>Type: {task.workType === 'member' ? 'Individual' : 'Crew'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanWorkaheadTab;
