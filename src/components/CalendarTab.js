import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Save, 
  MapPin, 
  CalendarDays, 
  Clock3, 
  Plus, 
  Edit, 
  Trash2, 
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import LocalTimesheetService from '../services/LocalTimesheetService';

const CalendarTab = ({ selectedProject, selectedHub, projects, members, credentials }) => {
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [isLoading, setIsLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [australianHolidays, setAustralianHolidays] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [plannerTasks, setPlannerTasks] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [selectedDayTasks, setSelectedDayTasks] = useState([]);
  const [selectedDayTimesheets, setSelectedDayTimesheets] = useState([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [projectSortOrder, setProjectSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [timesheetService] = useState(new LocalTimesheetService());
  const [showOverlay, setShowOverlay] = useState(true);
  
  const [calendarForm, setCalendarForm] = useState({
    name: '',
    description: '',
    dailyHoursLimit: 8,
    selectedYear: 2025,
    selectedState: 'NSW',
    workDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
    holidays: [],
    allowWorkOnHolidays: false,
    color: '#3B82F6',
    allocatedProjects: [] // Array of project IDs this calendar is allocated to
  });

  // Australian states
  const australianStates = [
    'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'
  ];

  // Generate years from 2025 to 2099
  const years = Array.from({ length: 75 }, (_, i) => 2025 + i);

  // Filter and sort projects for allocation
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects || [];
    
    // Filter by search term
    if (projectSearchTerm.trim()) {
      filtered = filtered.filter(project => 
        project?.name?.toLowerCase().includes(projectSearchTerm.toLowerCase())
      );
    }
    
    // Sort projects
    filtered.sort((a, b) => {
      const nameA = a?.name?.toLowerCase() || '';
      const nameB = b?.name?.toLowerCase() || '';
      
      if (projectSortOrder === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
    
    return filtered;
  }, [projects, projectSearchTerm, projectSortOrder]);

  // Load calendars from localStorage
  useEffect(() => {
    loadCalendars();
  }, []);

  // Load planner tasks and timesheets when project changes
  useEffect(() => {
    if (selectedProject) {
      loadPlannerTasks();
      loadTimesheets();
    }
  }, [selectedProject]);

  const loadCalendars = () => {
    try {
      const stored = localStorage.getItem('zoyantra_calendars');
      if (stored) {
        const calendarsData = JSON.parse(stored);
        setCalendars(calendarsData);
        console.log(`📅 Loaded ${calendarsData.length} calendars`);
      } else {
        setCalendars([]);
        console.log('📅 No calendars found, initializing empty array');
      }
    } catch (error) {
      console.error('❌ Error loading calendars:', error);
      setCalendars([]);
    }
  };

  const loadPlannerTasks = () => {
    try {
      const stored = localStorage.getItem('zoyantra_tasks');
      if (stored) {
        const tasksData = JSON.parse(stored);
        const projectTasks = tasksData.filter(task => 
          task.selectedProjectId === selectedProject.id && 
          !task.isArchived &&
          task.plannedDate
        );
        setPlannerTasks(projectTasks);
        console.log(`📋 Loaded ${projectTasks.length} planner tasks for calendar`);
      } else {
        setPlannerTasks([]);
      }
    } catch (error) {
      console.error('❌ Error loading planner tasks:', error);
      setPlannerTasks([]);
    }
  };

  const loadTimesheets = () => {
    try {
      const allTimesheets = timesheetService.getAll();
      const projectTimesheets = allTimesheets.filter(timesheet => 
        timesheet.projectId === selectedProject.id && 
        !timesheet.isArchived
      );
      setTimesheets(projectTimesheets);
      console.log(`⏰ Loaded ${projectTimesheets.length} timesheets for calendar`);
    } catch (error) {
      console.error('❌ Error loading timesheets:', error);
      setTimesheets([]);
    }
  };

  const saveCalendars = (calendarsData) => {
    try {
      localStorage.setItem('zoyantra_calendars', JSON.stringify(calendarsData));
      setCalendars(calendarsData);
      console.log('💾 Calendars saved to localStorage');
    } catch (error) {
      console.error('❌ Error saving calendars:', error);
    }
  };

  const handleCalendarFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('workDays.')) {
      const day = name.split('.')[1];
      setCalendarForm(prev => ({
        ...prev,
        workDays: {
          ...prev.workDays,
          [day]: checked
        }
      }));
    } else {
      setCalendarForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const createCalendar = () => {
    if (!calendarForm.name.trim()) {
      alert('Please enter a calendar name');
      return;
    }

    const newCalendar = {
      id: `calendar-${Date.now()}`,
      name: calendarForm.name,
      description: calendarForm.description,
      dailyHoursLimit: calendarForm.dailyHoursLimit,
      selectedYear: calendarForm.selectedYear,
      selectedState: calendarForm.selectedState,
      workDays: calendarForm.workDays,
      holidays: calendarForm.holidays,
      allowWorkOnHolidays: calendarForm.allowWorkOnHolidays,
      workOnWeekends: calendarForm.workOnWeekends,
      workOnSaturday: calendarForm.workOnSaturday,
      workOnSunday: calendarForm.workOnSunday,
      color: calendarForm.color,
      allocatedProjects: calendarForm.allocatedProjects || [],
      createdAt: new Date().toISOString()
    };

    const updatedCalendars = [...calendars, newCalendar];
    saveCalendars(updatedCalendars);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('calendarUpdated'));
    
    setCalendarForm({
      name: '',
      description: '',
      dailyHoursLimit: 8,
      selectedYear: 2025,
      selectedState: 'NSW',
      workDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
      },
      holidays: [],
      allowWorkOnHolidays: false,
      workOnWeekends: false,
      workOnSaturday: false,
      workOnSunday: false,
      color: '#3B82F6',
      allocatedProjects: []
    });
    setIsCreating(false);
    
    console.log(`✅ Created calendar: ${newCalendar.name}`);
  };

  const editCalendar = (calendar) => {
    setSelectedCalendar(calendar);
    setCalendarForm({
      name: calendar.name,
      description: calendar.description,
      dailyHoursLimit: calendar.dailyHoursLimit,
      selectedYear: calendar.selectedYear,
      selectedState: calendar.selectedState,
      workDays: calendar.workDays,
      holidays: calendar.holidays,
      allowWorkOnHolidays: calendar.allowWorkOnHolidays,
      workOnWeekends: calendar.workOnWeekends,
      workOnSaturday: calendar.workOnSaturday,
      workOnSunday: calendar.workOnSunday,
      color: calendar.color,
      allocatedProjects: calendar.allocatedProjects || []
    });
    setIsEditing(true);
  };

  const updateCalendar = () => {
    if (!calendarForm.name.trim()) {
      alert('Please enter a calendar name');
      return;
    }

    const updatedCalendars = calendars.map(calendar => 
      calendar.id === selectedCalendar.id 
        ? {
            ...calendar,
            name: calendarForm.name,
            description: calendarForm.description,
            dailyHoursLimit: calendarForm.dailyHoursLimit,
            selectedYear: calendarForm.selectedYear,
            selectedState: calendarForm.selectedState,
            workDays: calendarForm.workDays,
            holidays: calendarForm.holidays,
            allowWorkOnHolidays: calendarForm.allowWorkOnHolidays,
            workOnWeekends: calendarForm.workOnWeekends,
            workOnSaturday: calendarForm.workOnSaturday,
            workOnSunday: calendarForm.workOnSunday,
            color: calendarForm.color,
            allocatedProjects: calendarForm.allocatedProjects || [], // Add this line
            updatedAt: new Date().toISOString()
          }
        : calendar
    );

    saveCalendars(updatedCalendars);
    setIsEditing(false);
    setSelectedCalendar(null);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('calendarUpdated'));
    
    console.log(`✅ Updated calendar: ${calendarForm.name}`, {
      allocatedProjects: calendarForm.allocatedProjects
    });
  };

  const deleteCalendar = (calendarId) => {
    if (window.confirm('Are you sure you want to delete this calendar? This action cannot be undone.')) {
      const updatedCalendars = calendars.filter(calendar => calendar.id !== calendarId);
      saveCalendars(updatedCalendars);
      console.log(`🗑️ Deleted calendar: ${calendarId}`);
    }
  };

  const addHoliday = () => {
    const date = prompt('Enter holiday date (YYYY-MM-DD):');
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const holiday = {
        id: `holiday-${Date.now()}`,
        date,
        name: prompt('Enter holiday name:') || 'Holiday',
        type: 'public'
      };
      setCalendarForm(prev => ({
        ...prev,
        holidays: [...prev.holidays, holiday]
      }));
    }
  };

  const removeHoliday = (holidayId) => {
    setCalendarForm(prev => ({
      ...prev,
      holidays: prev.holidays.filter(h => h.id !== holidayId)
    }));
  };

  const getWorkDaysCount = (workDaysObj) => {
    return Object.values(workDaysObj).filter(Boolean).length;
  };

  // Calendar view functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMonthName = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getWeekDays = () => {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  };

  const isWorkDay = (date, calendar) => {
    if (!calendar) return false;
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return calendar.workDays[dayNames[dayOfWeek]];
  };

  const isHoliday = (date, calendar) => {
    if (!calendar || !calendar.holidays) return false;
    const dateStr = date.toISOString().split('T')[0];
    return calendar.holidays.some(holiday => holiday.date === dateStr);
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getTasksForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return plannerTasks.filter(task => task.plannedDate === dateStr);
  };

  const getTimesheetsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return timesheets.filter(timesheet => timesheet.date === dateStr);
  };

  const handleDayClick = (date) => {
    const dayTasks = getTasksForDate(date);
    const dayTimesheets = getTimesheetsForDate(date);
    setSelectedDayTasks(dayTasks);
    setSelectedDayTimesheets(dayTimesheets);
    setSelectedDay(date);
    setShowDayModal(true);
  };

  const renderCalendarGrid = () => {
    if (!selectedCalendar) return null;

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-gray-200"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isWork = isWorkDay(date, selectedCalendar);
      const isHolidayDay = isHoliday(date, selectedCalendar);
      const isToday = date.toDateString() === new Date().toDateString();
      const dayTasks = getTasksForDate(date);
      const dayTimesheets = getTimesheetsForDate(date);
      const hasTasks = dayTasks.length > 0;
      const hasTimesheets = dayTimesheets.length > 0;
      
      // Check for delays (planned tasks without corresponding timesheets)
      const delayedTasks = dayTasks.filter(task => {
        const hasCorrespondingTimesheet = dayTimesheets.some(ts => 
          ts.taskId === task.id || ts.taskName === task.taskName
        );
        return !hasCorrespondingTimesheet;
      });
      const hasDelays = delayedTasks.length > 0;

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-200 p-2 cursor-pointer hover:bg-gray-100 ${
            isToday ? 'bg-blue-50' : ''
          } ${
            isWork ? 'bg-green-50' : 'bg-gray-50'
          } ${
            isHolidayDay ? 'bg-red-50 border-red-300' : ''
          } ${
            hasTasks ? 'bg-yellow-50 border-yellow-300' : ''
          } ${
            hasDelays ? 'bg-orange-50 border-orange-400' : ''
          }`}
          onClick={() => handleDayClick(date)}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-medium ${
              isToday ? 'text-blue-600' : 'text-gray-900'
            }`}>
              {day}
            </span>
            <div className="flex items-center gap-1">
              {isHolidayDay && (
                <span className="text-xs text-red-600">🎉</span>
              )}
              {hasTasks && (
                <span className="text-xs text-yellow-600 font-bold">
                  📋{dayTasks.length}
                </span>
              )}
              {hasTimesheets && (
                <span className="text-xs text-green-600 font-bold">
                  ⏰{dayTimesheets.length}
                </span>
              )}
              {hasDelays && (
                <span className="text-xs text-orange-600 font-bold">
                  ⚠️{delayedTasks.length}
                </span>
              )}
            </div>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {isWork ? `${selectedCalendar.dailyHoursLimit}h` : 'Off'}
          </div>
          {hasTasks && (
            <div className="mt-1 text-xs text-yellow-700 font-medium">
              {dayTasks.length} planned
            </div>
          )}
          {hasTimesheets && (
            <div className="mt-1 text-xs text-green-700 font-medium">
              {dayTimesheets.length} actual
            </div>
          )}
          {hasDelays && (
            <div className="mt-1 text-xs text-orange-700 font-medium">
              {delayedTasks.length} delayed
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const getWeeklyHours = (dailyHours, workDaysObj) => {
    const totalDays = getWorkDaysCount(workDaysObj);
    return dailyHours * totalDays;
  };

  // Removed hub requirement - Calendar tab works independently

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          Calendar Management
        </h2>
        <p className="text-gray-600">
          Create and manage multiple calendars with different work settings and holidays.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendars List */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Calendars</h3>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus className="w-4 h-4" />
              Create New Calendar
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {(calendars || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No calendars created yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {(calendars || []).map(calendar => (
                  <div
                    key={calendar.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedCalendar?.id === calendar.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                    }`}
                    onClick={() => setSelectedCalendar(calendar)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: calendar.color }}
                        ></div>
                        <div>
                          <h4 className="font-medium text-gray-900">{calendar.name}</h4>
                          <p className="text-sm text-gray-500">
                            {getWorkDaysCount(calendar.workDays)} work days • {calendar.dailyHoursLimit}h daily
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            editCalendar(calendar);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCalendar(calendar.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Calendar Details */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {selectedCalendar ? selectedCalendar.name : 'Calendar View'}
            </h3>
          </div>
          
          {selectedCalendar ? (
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">{selectedCalendar.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedCalendar.dailyHoursLimit}h daily limit
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarDays className="w-4 h-4" />
                    {selectedCalendar.selectedYear}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {selectedCalendar.selectedState}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock3 className="w-4 h-4" />
                    {getWeeklyHours(selectedCalendar.dailyHoursLimit, selectedCalendar.workDays)}h/week
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Work Days</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedCalendar.workDays).map(([day, isWorkDay]) => (
                    <div key={day} className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${isWorkDay ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className="text-sm capitalize">{day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calendar View Toggle */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Calendar View</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="showOverlay"
                        checked={showOverlay}
                        onChange={(e) => setShowOverlay(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="showOverlay" className="text-sm text-gray-700">
                        Show Planned vs Actual
                      </label>
                    </div>
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                      {[
                        { id: 'month', label: 'Month' },
                        { id: 'week', label: 'Week' },
                        { id: 'day', label: 'Day' }
                      ].map(({ id, label }) => (
                        <button
                          key={id}
                          onClick={() => setViewMode(id)}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            viewMode === id
                              ? 'bg-white text-blue-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Calendar Grid */}
              {viewMode === 'month' && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-lg font-semibold text-gray-900">
                      {getMonthName(currentDate)}
                    </h5>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigateMonth(-1)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Today
                      </button>
                      <button
                        onClick={() => navigateMonth(1)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
                    {/* Week day headers */}
                    {getWeekDays().map(day => (
                      <div key={day} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-700 border-b border-gray-200">
                        {day}
                      </div>
                    ))}
                    {/* Calendar days */}
                    {renderCalendarGrid()}
                  </div>
                </div>
              )}

              {/* Calendar Legend */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Legend</h5>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                    <span>Work Day ({selectedCalendar.dailyHoursLimit}h)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
                    <span>Non-Work Day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-50 border border-red-300 rounded"></div>
                    <span>Holiday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
                    <span>Today</span>
                  </div>
                  {showOverlay && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-50 border border-yellow-300 rounded"></div>
                        <span>📋 Planned Tasks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-50 border border-green-300 rounded"></div>
                        <span>⏰ Actual Timesheets</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-orange-50 border border-orange-400 rounded"></div>
                        <span>⚠️ Delayed Tasks</span>
                      </div>
                    </>
                  )}
                  {!showOverlay && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-50 border border-yellow-300 rounded"></div>
                      <span>Planner Tasks (click to view)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Holidays</h4>
                {(selectedCalendar.holidays || []).length === 0 ? (
                  <p className="text-sm text-gray-500">No holidays configured</p>
                ) : (
                  <div className="space-y-1">
                    {(selectedCalendar.holidays || []).map(holiday => (
                      <div key={holiday.id} className="text-sm text-gray-600">
                        {holiday.name} - {holiday.date}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Weekend Work</h4>
                <div className="space-y-1">
                  {selectedCalendar.workOnSaturday && (
                    <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                      ✅ Work on Saturday enabled
                    </div>
                  )}
                  {selectedCalendar.workOnSunday && (
                    <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                      ✅ Work on Sunday enabled
                    </div>
                  )}
                  {!selectedCalendar.workOnSaturday && !selectedCalendar.workOnSunday && (
                    <div className="text-sm text-gray-500">
                      No weekend work enabled
                    </div>
                  )}
                </div>
              </div>

              {selectedCalendar.allowWorkOnHolidays && (
                <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                  ⚠️ Work allowed on public holidays
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Select a calendar from the list to view details and calendar grid</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Calendar Modal */}
      {(isCreating || isEditing) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {isCreating ? 'Create New Calendar' : 'Edit Calendar'}
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                  setSelectedCalendar(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              isCreating ? createCalendar() : updateCalendar();
            }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calendar Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={calendarForm.name}
                    onChange={handleCalendarFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Calendar 1, Calendar 2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calendar Color
                  </label>
                  <input
                    type="color"
                    name="color"
                    value={calendarForm.color}
                    onChange={handleCalendarFormChange}
                    className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={calendarForm.description}
                  onChange={handleCalendarFormChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter calendar description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allocate to Projects
                </label>
                
                {/* Search and Sort Controls */}
                <div className="mb-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={projectSearchTerm}
                      onChange={(e) => setProjectSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ArrowUpDown className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Sort by name:</span>
                      <button
                        type="button"
                        onClick={() => setProjectSortOrder(projectSortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center space-x-1"
                      >
                        <span>{projectSortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-xs text-gray-500">
                      {filteredAndSortedProjects.length} project{filteredAndSortedProjects.length !== 1 ? 's' : ''} found
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {filteredAndSortedProjects.map(project => (
                    <label key={project.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={calendarForm.allocatedProjects.includes(project.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCalendarForm(prev => ({
                              ...prev,
                              allocatedProjects: [...prev.allocatedProjects, project.id]
                            }));
                          } else {
                            setCalendarForm(prev => ({
                              ...prev,
                              allocatedProjects: prev.allocatedProjects.filter(id => id !== project.id)
                            }));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{project.name}</span>
                    </label>
                  ))}
                  {filteredAndSortedProjects.length === 0 && (
                    <p className="text-sm text-gray-500 italic">
                      {projectSearchTerm ? 'No projects found matching your search' : 'No projects available'}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select which projects this calendar can be used for. Leave empty to make it available for all projects.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Hours Limit
                  </label>
                  <input
                    type="number"
                    name="dailyHoursLimit"
                    value={calendarForm.dailyHoursLimit}
                    onChange={handleCalendarFormChange}
                    min="1"
                    max="24"
                    step="0.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calendar Year
                  </label>
                  <select
                    name="selectedYear"
                    value={calendarForm.selectedYear}
                    onChange={handleCalendarFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Australian State
                  </label>
                  <select
                    name="selectedState"
                    value={calendarForm.selectedState}
                    onChange={handleCalendarFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {australianStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Days
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(calendarForm.workDays).map(([day, isWorkDay]) => (
                    <label key={day} className="flex items-center">
                      <input
                        type="checkbox"
                        name={`workDays.${day}`}
                        checked={isWorkDay}
                        onChange={handleCalendarFormChange}
                        className="mr-2"
                      />
                      <span className="text-sm capitalize">{day}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">{getWorkDaysCount(calendarForm.workDays)}</span> work days per week • 
                  <span className="font-medium ml-1">{getWeeklyHours(calendarForm.dailyHoursLimit, calendarForm.workDays)}</span> hours per week
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowWorkOnHolidays"
                      checked={calendarForm.allowWorkOnHolidays}
                      onChange={handleCalendarFormChange}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Allow work on public holidays</span>
                  </label>
                </div>

              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Holidays</h4>
                  <button
                    type="button"
                    onClick={addHoliday}
                    className="flex items-center gap-1 px-2 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    <Plus className="w-3 h-3" />
                    Add Holiday
                  </button>
                </div>
                
                {(calendarForm.holidays || []).length === 0 ? (
                  <p className="text-sm text-gray-500">No holidays configured</p>
                ) : (
                  <div className="space-y-1">
                    {(calendarForm.holidays || []).map(holiday => (
                      <div key={holiday.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{holiday.name} - {holiday.date}</span>
                        <button
                          type="button"
                          onClick={() => removeHoliday(holiday.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setIsEditing(false);
                    setSelectedCalendar(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  {isCreating ? 'Create Calendar' : 'Update Calendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Day Tasks Modal */}
      {showDayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Tasks for {selectedDay?.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <button
                onClick={() => setShowDayModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {selectedDayTasks.length === 0 && selectedDayTimesheets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No tasks or timesheets for this day</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Planned Tasks Section */}
                {selectedDayTasks.length > 0 && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-yellow-600" />
                      Planned Tasks ({selectedDayTasks.length})
                    </h4>
                    <div className="space-y-3">
                      {selectedDayTasks.map((task) => {
                        const hasCorrespondingTimesheet = selectedDayTimesheets.some(ts => 
                          ts.taskId === task.id || ts.taskName === task.taskName
                        );
                        const isDelayed = !hasCorrespondingTimesheet;
                        
                        return (
                          <div key={task.id} className={`border rounded-lg p-4 ${
                            isDelayed ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="font-medium text-gray-900">{task.taskName}</h5>
                                  {isDelayed && (
                                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                      ⚠️ Delayed
                                    </span>
                                  )}
                                  {hasCorrespondingTimesheet && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                      ✅ Completed
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                  <div>
                                    <span className="font-medium">Planned Hours:</span> {task.plannedHours}h
                                  </div>
                                  <div>
                                    <span className="font-medium">Planned Output:</span> {task.plannedOutput || '-'} {task.budgetUnit || 'units'}
                                  </div>
                                  <div>
                                    <span className="font-medium">Budget:</span> {task.budgetName || '-'}
                                  </div>
                                  <div>
                                    <span className="font-medium">Budget Unit:</span> {task.budgetUnit || '-'}
                                  </div>
                                </div>
                                {task.description && (
                                  <div className="mt-2 text-sm text-gray-600">
                                    <span className="font-medium">Description:</span> {task.description}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Assignment Info */}
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-4 text-sm">
                                {task.assignedCrewName ? (
                                  <div className="flex items-center gap-2 text-blue-600">
                                    <Users className="w-4 h-4" />
                                    <span className="font-medium">Crew:</span>
                                    <span>{task.assignedCrewName}</span>
                                  </div>
                                ) : task.assignedMemberName ? (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <User className="w-4 h-4" />
                                    <span className="font-medium">Member:</span>
                                    <span>{task.assignedMemberName}</span>
                                  </div>
                                ) : (
                                  <div className="text-gray-400">
                                    <span className="font-medium">Assignment:</span> Not assigned
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Actual Timesheets Section */}
                {selectedDayTimesheets.length > 0 && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-green-600" />
                      Actual Timesheets ({selectedDayTimesheets.length})
                    </h4>
                    <div className="space-y-3">
                      {selectedDayTimesheets.map((timesheet) => (
                        <div key={timesheet.id} className="border border-gray-200 rounded-lg p-4 bg-green-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 mb-2">{timesheet.taskName}</h5>
                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Hours:</span> {timesheet.hours}h
                                  {timesheet.extraHours > 0 && (
                                    <span className="text-orange-600 ml-1">(+{timesheet.extraHours}h extra)</span>
                                  )}
                                </div>
                                <div>
                                  <span className="font-medium">Output:</span> {timesheet.outputUnits || '-'} {timesheet.budgetUnit || 'units'}
                                </div>
                                <div>
                                  <span className="font-medium">Budget:</span> {timesheet.budgetName || '-'}
                                </div>
                                <div>
                                  <span className="font-medium">Status:</span> 
                                  <span className={`ml-1 px-2 py-1 text-xs rounded-full ${
                                    timesheet.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    timesheet.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {timesheet.status?.charAt(0).toUpperCase() + timesheet.status?.slice(1) || 'Draft'}
                                  </span>
                                </div>
                              </div>
                              {timesheet.description && (
                                <div className="mt-2 text-sm text-gray-600">
                                  <span className="font-medium">Description:</span> {timesheet.description}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Assignment Info */}
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-4 text-sm">
                              {timesheet.crewName ? (
                                <div className="flex items-center gap-2 text-blue-600">
                                  <Users className="w-4 h-4" />
                                  <span className="font-medium">Crew:</span>
                                  <span>{timesheet.crewName}</span>
                                </div>
                              ) : timesheet.userName ? (
                                <div className="flex items-center gap-2 text-green-600">
                                  <User className="w-4 h-4" />
                                  <span className="font-medium">Member:</span>
                                  <span>{timesheet.userName}</span>
                                </div>
                              ) : (
                                <div className="text-gray-400">
                                  <span className="font-medium">Assignment:</span> Not assigned
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDayModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarTab;
