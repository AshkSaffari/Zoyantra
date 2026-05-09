import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Minus, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Target,
  DollarSign,
  Users,
  Building2
} from 'lucide-react';
import { safeFormatCurrency } from '../utils/numberUtils';

const TaskSelector = ({ 
  tasks = [], 
  budgets = [], 
  crews = [], 
  selectedTasks = [], 
  onTaskSelect, 
  onTaskDeselect,
  onTaskAdd,
  showBudgetInfo = true,
  showCrewInfo = true 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter(task => {
      const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || task.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        case 'created':
          return new Date(b.createdAt) - new Date(a.createdAt);
        default:
          return 0;
      }
    });

  // Get task budget info
  const getTaskBudgetInfo = (task) => {
    if (!task.budgetId || !showBudgetInfo) return null;
    return budgets.find(b => b.id === task.budgetId);
  };

  // Get task crew info
  const getTaskCrewInfo = (task) => {
    if (!task.crewId || !showCrewInfo) return null;
    return crews.find(c => c.id === task.crewId);
  };

  // Check if task is selected
  const isTaskSelected = (taskId) => {
    return selectedTasks.some(t => t.id === taskId);
  };

  // Handle task selection
  const handleTaskSelect = (task) => {
    if (isTaskSelected(task.id)) {
      onTaskDeselect?.(task.id);
    } else {
      onTaskSelect?.(task);
    }
  };

  // Handle add new task
  const handleAddNewTask = () => {
    onTaskAdd?.();
  };

  // Get task priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Pane - Task Library */}
      <div className="flex-1 border-r border-gray-200 p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Task Library</h3>
          
          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex space-x-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="excavation">Excavation</option>
                <option value="concrete">Concrete</option>
                <option value="steel">Steel</option>
                <option value="electrical">Electrical</option>
                <option value="plumbing">Plumbing</option>
                <option value="finishing">Finishing</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Sort by Name</option>
                <option value="category">Sort by Category</option>
                <option value="priority">Sort by Priority</option>
                <option value="created">Sort by Created</option>
              </select>
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleTaskSelect(task)}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                isTaskSelected(task.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900">{task.name}</h4>
                    {task.priority && (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                  
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {task.defaultHours && (
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {task.defaultHours}h
                      </div>
                    )}
                    {task.defaultQty && (
                      <div className="flex items-center">
                        <Target className="h-3 w-3 mr-1" />
                        {task.defaultQty} {task.defaultUnit || 'units'}
                      </div>
                    )}
                    {task.category && (
                      <div className="flex items-center">
                        <Building2 className="h-3 w-3 mr-1" />
                        {task.category}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="ml-2">
                  {isTaskSelected(task.id) ? (
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Plus className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {filteredTasks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No tasks found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        {/* Add New Task Button */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleAddNewTask}
            className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Task
          </button>
        </div>
      </div>

      {/* Right Pane - Selected Tasks */}
      <div className="flex-1 p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Selected Tasks ({selectedTasks.length})
          </h3>
        </div>

        {/* Selected Tasks List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {selectedTasks.map((task) => {
            const budget = getTaskBudgetInfo(task);
            const crew = getTaskCrewInfo(task);
            
            return (
              <div key={task.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{task.name}</h4>
                    {task.description && (
                      <p className="text-sm text-gray-600">{task.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onTaskDeselect?.(task.id)}
                    className="ml-2 p-1 text-gray-400 hover:text-red-600"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Task Details */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {budget && (
                    <div>
                      <div className="flex items-center text-gray-600 mb-1">
                        <DollarSign className="h-3 w-3 mr-1" />
                        Budget
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Name:</span>
                          <span className="font-medium">{budget.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Amount:</span>
                          <span className="font-medium">{safeFormatCurrency(budget.revised)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Hours:</span>
                          <span className="font-medium">{budget.inputHours || 0}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Qty:</span>
                          <span className="font-medium">{budget.inputQty || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {crew && (
                    <div>
                      <div className="flex items-center text-gray-600 mb-1">
                        <Users className="h-3 w-3 mr-1" />
                        Crew
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Name:</span>
                          <span className="font-medium">{crew.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Members:</span>
                          <span className="font-medium">{crew.members?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Rate:</span>
                          <span className="font-medium">{safeFormatCurrency(crew.avgRate || 0)}/h</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {selectedTasks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Target className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No tasks selected</p>
              <p className="text-sm">Choose tasks from the library to add to your plan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskSelector;
