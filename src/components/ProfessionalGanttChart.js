import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  BarChart3, 
  ChevronRight,
  ChevronDown,
  Play,
  Pause,
  Square,
  CheckCircle,
  AlertCircle,
  Info,
  Settings,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { useSpring, animated } from '@react-spring/web';
import { useGesture } from '@use-gesture/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const ProfessionalGanttChart = ({ selectedProject, selectedHub, credentials, budgets = [] }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewMode, setViewMode] = useState('timeline'); // timeline, chart, calendar
  const [timeframe, setTimeframe] = useState('month'); // week, month, quarter, year
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    assignee: 'all'
  });

  // Load tasks from selected project
  const loadTasks = async () => {
    if (!selectedProject || !credentials) {
      setTasks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call to get project tasks
      // For now, show empty state or load from project data
      console.log('Loading tasks for project:', selectedProject);
      
      // If project has tasks data, use it
      if (selectedProject.tasks && Array.isArray(selectedProject.tasks)) {
        setTasks(selectedProject.tasks);
      } else {
        // Show empty state
        setTasks([]);
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Failed to load project tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Load tasks
  useEffect(() => {
    loadTasks();
  }, [selectedProject, credentials]);

  // Calculate project statistics
  const projectStats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
    const pendingTasks = tasks.filter(task => task.status === 'pending').length;
    const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      overallProgress
    };
  }, [tasks]);

  // Filter tasks based on current filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filters.status !== 'all' && task.status !== filters.status) return false;
      if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
      if (filters.assignee !== 'all' && task.assignee !== filters.assignee) return false;
      return true;
    });
  }, [tasks, filters]);

  // Toggle task expansion
  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'pending': return 'bg-gray-400';
      case 'blocked': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  // Calculate timeline data for charts
  const timelineData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, index) => {
      const monthTasks = tasks.filter(task => {
        const startMonth = new Date(task.startDate).getMonth();
        const endMonth = new Date(task.endDate).getMonth();
        return index >= startMonth && index <= endMonth;
      });
      
      return {
        month,
        completed: monthTasks.filter(task => task.status === 'completed').length,
        inProgress: monthTasks.filter(task => task.status === 'in-progress').length,
        pending: monthTasks.filter(task => task.status === 'pending').length
      };
    });
  }, [tasks]);

  // Animation springs
  const fadeIn = useSpring({
    from: { opacity: 0, y: 20 },
    to: { opacity: 1, y: 0 },
    delay: 200
  });

  const slideIn = useSpring({
    from: { x: -100, opacity: 0 },
    to: { x: 0, opacity: 1 },
    delay: 400
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="h-8 w-8 text-blue-500" />
        </motion.div>
        <span className="ml-3 text-gray-600">Loading Gant Chart...</span>
      </div>
    );
  }

  return (
    <animated.div style={fadeIn} className="h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Project Gant Chart</h2>
            <p className="text-gray-600">{selectedProject?.name || 'No project selected'}</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { id: 'timeline', name: 'Timeline', icon: BarChart3 },
                { id: 'chart', name: 'Charts', icon: TrendingUp },
                { id: 'calendar', name: 'Calendar', icon: Calendar }
              ].map(({ id, name, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setViewMode(id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{name}</span>
                </button>
              ))}
            </div>

            {/* Timeframe Selector */}
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="year">Year</option>
            </select>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Filter className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Download className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Project Statistics */}
      <animated.div style={slideIn} className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Tasks</p>
                <p className="text-2xl font-bold">{projectStats.totalTasks}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Completed</p>
                <p className="text-2xl font-bold">{projectStats.completedTasks}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">In Progress</p>
                <p className="text-2xl font-bold">{projectStats.inProgressTasks}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Progress</p>
                <p className="text-2xl font-bold">{Math.round(projectStats.overallProgress)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-200" />
            </div>
          </div>
        </div>
      </animated.div>

      {/* Budget Information */}
      {budgets && budgets.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Project Budgets</h3>
            <span className="text-sm text-gray-500">{budgets.length} budget items</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Total Budget</p>
                  <p className="text-xl font-bold">
                    ${budgets.reduce((sum, budget) => sum + (budget.amount || 0), 0).toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 text-purple-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Active Budgets</p>
                  <p className="text-xl font-bold">
                    {budgets.filter(b => b.status !== 'inactive').length}
                  </p>
                </div>
                <CheckCircle className="h-6 w-6 text-orange-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-100 text-sm">Avg. Unit Price</p>
                  <p className="text-xl font-bold">
                    ${budgets.length > 0 ? Math.round(budgets.reduce((sum, budget) => sum + (budget.unitPrice || 0), 0) / budgets.length).toLocaleString() : 0}
                  </p>
                </div>
                <BarChart3 className="h-6 w-6 text-teal-200" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In Progress</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Priority:</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'timeline' && (
          <div className="p-6">
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleTaskExpansion(task.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {expandedTasks.has(task.id) ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                        
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`} />
                        
                        <div>
                          <h3 className="font-medium text-gray-900">{task.name}</h3>
                          <p className="text-sm text-gray-500">{task.assignee}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">{task.progress}%</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getStatusColor(task.status)}`}
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(task.startDate).toLocaleDateString()} - {new Date(task.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          className={`h-2 rounded-full ${getStatusColor(task.status)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Subtasks */}
                  <AnimatePresence>
                    {expandedTasks.has(task.id) && task.subtasks && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-gray-100 bg-gray-50"
                      >
                        {task.subtasks.map((subtask) => (
                          <div key={subtask.id} className="px-8 py-3 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-2 h-2 rounded-full ${getStatusColor(subtask.status)}`} />
                                <span className="text-sm text-gray-700">{subtask.name}</span>
                              </div>
                              <div className="flex items-center space-x-4">
                                <span className="text-xs text-gray-500">{subtask.assignee}</span>
                                <span className="text-xs text-gray-500">{subtask.progress}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'chart' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Timeline Chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Timeline</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completed" stackId="a" fill="#10B981" />
                    <Bar dataKey="inProgress" stackId="a" fill="#3B82F6" />
                    <Bar dataKey="pending" stackId="a" fill="#6B7280" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Progress Chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} />
                    <Line type="monotone" dataKey="inProgress" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'calendar' && (
          <div className="p-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Calendar View</h3>
              <div className="text-center text-gray-500 py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Calendar view coming soon...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </animated.div>
  );
};

export default ProfessionalGanttChart;