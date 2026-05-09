import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Target, Users, DollarSign, AlertTriangle, CheckCircle, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import LocalTimesheetService from '../services/LocalTimesheetService';
import LocalPhaseService from '../services/LocalPhaseService';
import ResourceService from '../services/ResourceService';

const TeamLoadBalanceTab = ({ projectId, credentials, selectedProject }) => {
  const [timesheets, setTimesheets] = useState([]);
  const [phases, setPhases] = useState([]);
  const [resources, setResources] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [settings, setSettings] = useState({
    minimumChunkHours: 2,
    maxDailyHours: 8,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    levelingMethod: 'serial', // 'serial' or 'parallel'
    preserveLogic: true,
    levelWithinFloat: true,
    allowSplitting: false,
    levelingPriority: 'float', // 'float', 'startDate', 'priority'
    maxWeeklyHours: 40,
    holidayCalendar: null
  });
  const [optimizedSchedule, setOptimizedSchedule] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [dataStats, setDataStats] = useState({
    timesheets: 0,
    tasks: 0,
    crews: 0,
    budgets: 0,
    lastSync: null
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [projectId]);

  // Load calendars when project changes
  useEffect(() => {
    loadCalendars();
  }, [selectedProject]);

  const loadData = async () => {
    try {
      // Initialize services (LocalPhaseService is already instantiated)
      const timesheetService = new LocalTimesheetService();
      const phaseService = LocalPhaseService; // Already instantiated
      const resourceService = new ResourceService();
      
      // Get data using correct method names
      const timesheetData = timesheetService.getAll();
      const phaseData = phaseService.getAllProjectPhases(projectId);
      const resourceData = resourceService.getAll();
      
      setTimesheets(timesheetData || []);
      setPhases(phaseData || []);
      setResources(resourceData || []);
      
      // Load data statistics
      loadDataStats();
    } catch (error) {
      console.error('Error loading data for team load balance:', error);
    }
  };

  const loadDataStats = () => {
    try {
      const timesheets = JSON.parse(localStorage.getItem('zoyantra_timesheets') || '[]')
        .filter(ts => ts.projectId === selectedProject?.id);
      
      const tasks = JSON.parse(localStorage.getItem('zoyantra_tasks') || '[]')
        .filter(task => task.selectedProjectId === selectedProject?.id);
      
      const crews = JSON.parse(localStorage.getItem('zoyantra_crews') || '[]')
        .filter(crew => crew.projectId === selectedProject?.id);
      
      const budgets = JSON.parse(localStorage.getItem('zoyantra_budgets') || '[]')
        .filter(budget => budget.projectId === selectedProject?.id);

      setDataStats({
        timesheets: timesheets.length,
        tasks: tasks.length,
        crews: crews.length,
        budgets: budgets.length,
        lastSync: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error loading data stats:', error);
    }
  };

  const loadCalendars = () => {
    try {
      const storedCalendars = JSON.parse(localStorage.getItem('zoyantra_calendars') || '[]');
      
      // Filter calendars based on selected project
      if (selectedProject) {
        const projectCalendars = storedCalendars.filter(cal => 
          cal.allocatedProjects && cal.allocatedProjects.includes(selectedProject.id)
        );
        setCalendars(projectCalendars);
        
        // Auto-select first calendar for current project if available
        if (projectCalendars.length > 0) {
          setSelectedCalendar(projectCalendars[0]);
          updateSettingsFromCalendar(projectCalendars[0]);
        } else {
          setSelectedCalendar(null);
        }
      } else {
        setCalendars([]);
        setSelectedCalendar(null);
      }
    } catch (error) {
      console.error('Error loading calendars:', error);
    }
  };

  const updateSettingsFromCalendar = (calendar) => {
    if (calendar) {
      const workingDays = calendar.workDays ? 
        Object.keys(calendar.workDays).filter(day => calendar.workDays[day])
          .map(day => day.charAt(0).toUpperCase() + day.slice(1)) : 
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      
      setSettings(prev => ({
        ...prev,
        maxDailyHours: calendar.dailyHoursLimit || 8,
        workingDays: workingDays
      }));
    }
  };

  // Calculate maximum weekly hours based on calendar
  const getMaxWeeklyHours = (calendar) => {
    if (!calendar) return 0;
    
    const dailyHours = calendar.dailyHoursLimit || 8;
    const workingDays = calendar.workDays ? 
      Object.keys(calendar.workDays).filter(day => calendar.workDays[day]) : 
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    return dailyHours * workingDays.length;
  };

  const handleCalendarChange = (calendarId) => {
    const calendar = calendars.find(cal => cal.id === calendarId);
    setSelectedCalendar(calendar);
    updateSettingsFromCalendar(calendar);
  };

  // Calculate current workload for each user
  const currentWorkload = useMemo(() => {
    const workload = {};
    
    // Initialize all resources
    resources.forEach(resource => {
      workload[resource.id] = {
        id: resource.id,
        name: resource.name,
        role: resource.role,
        hourlyRate: resource.hourlyRate,
        dailyHours: {},
        totalHours: 0,
        overAllocated: false
      };
    });

    // Calculate hours from timesheets
    timesheets.forEach(timesheet => {
      if (timesheet.resourceId && timesheet.date) {
        const date = new Date(timesheet.date).toISOString().split('T')[0];
        const hours = parseFloat(timesheet.hours) || 0;
        
        if (!workload[timesheet.resourceId]) {
          workload[timesheet.resourceId] = {
            id: timesheet.resourceId,
            name: timesheet.resourceName || 'Unknown',
            role: 'Unknown',
            hourlyRate: 0,
            dailyHours: {},
            totalHours: 0,
            overAllocated: false
          };
        }

        if (!workload[timesheet.resourceId].dailyHours[date]) {
          workload[timesheet.resourceId].dailyHours[date] = 0;
        }
        
        workload[timesheet.resourceId].dailyHours[date] += hours;
        workload[timesheet.resourceId].totalHours += hours;
      }
    });

    // Check for over-allocation (both daily and weekly limits)
    Object.values(workload).forEach(user => {
      let weeklyHours = 0;
      Object.values(user.dailyHours).forEach(dailyHours => {
        weeklyHours += dailyHours;
        if (dailyHours > settings.maxDailyHours) {
          user.overAllocated = true;
        }
      });
      
      // Check weekly limit
      const maxWeeklyHours = selectedCalendar ? getMaxWeeklyHours(selectedCalendar) : settings.maxDailyHours * 5;
      if (weeklyHours > maxWeeklyHours) {
        user.overAllocated = true;
      }
    });

    return workload;
  }, [timesheets, resources, settings.maxDailyHours, selectedCalendar]);

  // Calculate planned workload from phases
  const plannedWorkload = useMemo(() => {
    const planned = {};
    
    phases.forEach(phase => {
      if (phase.assignedResources && phase.assignedResources.length > 0) {
        phase.assignedResources.forEach(resourceId => {
          if (!planned[resourceId]) {
            planned[resourceId] = {
              id: resourceId,
              name: resources.find(r => r.id === resourceId)?.name || 'Unknown',
              phases: [],
              totalPlannedHours: 0,
              dailyPlannedHours: {}
            };
          }
          
          const plannedHours = parseFloat(phase.plannedHours) || 0;
          const startDate = new Date(phase.startDate);
          const endDate = new Date(phase.endDate);
          
          planned[resourceId].phases.push({
            phaseId: phase.id,
            phaseName: phase.name,
            plannedHours,
            startDate,
            endDate
          });
          
          planned[resourceId].totalPlannedHours += plannedHours;
          
          // Distribute hours across working days
          const workingDays = getWorkingDaysBetween(startDate, endDate, settings.workingDays);
          const hoursPerDay = plannedHours / Math.max(workingDays.length, 1);
          
          workingDays.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            if (!planned[resourceId].dailyPlannedHours[dateStr]) {
              planned[resourceId].dailyPlannedHours[dateStr] = 0;
            }
            planned[resourceId].dailyPlannedHours[dateStr] += hoursPerDay;
          });
        });
      }
    });
    
    return planned;
  }, [phases, resources, settings.workingDays]);

  // Get working days between two dates
  const getWorkingDaysBetween = (startDate, endDate, workingDays) => {
    const days = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayName = dayNames[d.getDay()];
      if (workingDays.includes(dayName)) {
        days.push(new Date(d));
      }
    }
    
    return days;
  };

  // Advanced Primavera P6-style Resource Leveling Algorithm
  const optimizeWorkload = () => {
    setIsOptimizing(true);
    
    try {
      console.log('🚀 Starting Primavera P6-style Resource Leveling...');
      
      // Step 1: Calculate unleveled resource profile
      const resourceProfiles = calculateResourceProfiles();
      console.log('📊 Resource profiles calculated:', Object.keys(resourceProfiles).length);
      
      // Step 2: Identify over-allocations
      const overAllocations = identifyOverAllocations(resourceProfiles);
      console.log('⚠️ Over-allocations found:', overAllocations.length);
      
      // Step 3: Apply leveling based on method
      let optimized;
      if (settings.levelingMethod === 'serial') {
        optimized = applySerialLeveling(resourceProfiles, overAllocations);
      } else {
        optimized = applyParallelLeveling(resourceProfiles, overAllocations);
      }
      
      console.log('✅ Leveling complete');
      setOptimizedSchedule(optimized);
    } catch (error) {
      console.error('❌ Error in resource leveling:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Step 1: Calculate resource profiles (Ri(t) = Σ ra(t) for all activities a using resource i)
  const calculateResourceProfiles = () => {
    const profiles = {};
    const timeHorizon = getTimeHorizon();
    
    // Initialize all resources
    resources.forEach(resource => {
      profiles[resource.id] = {
        resourceId: resource.id,
        resourceName: resource.name,
        dailyDemand: {},
        totalDemand: 0,
        activities: []
      };
    });
    
    // Process each phase/activity
    phases.forEach(phase => {
      if (phase.assignedResources && phase.assignedResources.length > 0) {
        const startDate = new Date(phase.startDate);
        const endDate = new Date(phase.endDate);
        const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const hoursPerDay = (parseFloat(phase.plannedHours) || 0) / Math.max(duration, 1);
        
        phase.assignedResources.forEach(resourceId => {
          if (profiles[resourceId]) {
            const workingDays = getWorkingDaysBetween(startDate, endDate, settings.workingDays);
            
            workingDays.forEach(date => {
              const dateStr = date.toISOString().split('T')[0];
              if (!profiles[resourceId].dailyDemand[dateStr]) {
                profiles[resourceId].dailyDemand[dateStr] = 0;
              }
              profiles[resourceId].dailyDemand[dateStr] += hoursPerDay;
              profiles[resourceId].totalDemand += hoursPerDay;
            });
            
            profiles[resourceId].activities.push({
              phaseId: phase.id,
              phaseName: phase.name,
              startDate,
              endDate,
              plannedHours: parseFloat(phase.plannedHours) || 0,
              hoursPerDay,
              priority: phase.priority || 50,
              float: calculateFloat(phase)
            });
          }
        });
      }
    });
    
    return profiles;
  };

  // Step 2: Identify over-allocations (Ri(t) > Ai(t))
  const identifyOverAllocations = (profiles) => {
    const overAllocations = [];
    const maxDailyHours = settings.maxDailyHours;
    const maxWeeklyHours = settings.maxWeeklyHours;
    
    Object.values(profiles).forEach(profile => {
      const dailyViolations = [];
      let weeklyHours = 0;
      
      Object.entries(profile.dailyDemand).forEach(([date, hours]) => {
        weeklyHours += hours;
        
        if (hours > maxDailyHours) {
          dailyViolations.push({
            date,
            hours,
            maxHours: maxDailyHours,
            type: 'daily'
          });
        }
      });
      
      if (weeklyHours > maxWeeklyHours) {
        dailyViolations.push({
          date: 'weekly',
          hours: weeklyHours,
          maxHours: maxWeeklyHours,
          type: 'weekly'
        });
      }
      
      if (dailyViolations.length > 0) {
        overAllocations.push({
          resourceId: profile.resourceId,
          resourceName: profile.resourceName,
          violations: dailyViolations,
          activities: profile.activities
        });
      }
    });
    
    return overAllocations;
  };

  // Step 3a: Serial Leveling (Primavera's default method)
  const applySerialLeveling = (profiles, overAllocations) => {
    const optimized = {};
    
    // Sort activities by leveling priority
    const sortedActivities = getSortedActivities(profiles);
    
    sortedActivities.forEach(({ resourceId, activity }) => {
      if (!optimized[resourceId]) {
        optimized[resourceId] = {
          resourceId,
          resourceName: profiles[resourceId].resourceName,
          optimizedSchedule: {},
          violations: [],
          levelingDelays: []
        };
      }
      
      // Find earliest feasible start date
      const originalStart = activity.startDate;
      const leveledStart = findEarliestFeasibleStart(activity, optimized[resourceId], profiles[resourceId]);
      
      if (leveledStart > originalStart) {
        const delay = Math.ceil((leveledStart - originalStart) / (1000 * 60 * 60 * 24));
        optimized[resourceId].levelingDelays.push({
          activityId: activity.phaseId,
          activityName: activity.phaseName,
          originalStart,
          leveledStart,
          delayDays: delay
        });
      }
      
      // Apply the leveled schedule
      applyLeveledSchedule(optimized[resourceId], activity, leveledStart);
    });
    
    // Check for remaining violations
    Object.values(optimized).forEach(resource => {
      resource.violations = checkViolations(resource.optimizedSchedule);
    });
    
    return optimized;
  };

  // Step 3b: Parallel Leveling (iterative adjustment)
  const applyParallelLeveling = (profiles, overAllocations) => {
    const optimized = {};
    let iterations = 0;
    const maxIterations = 10;
    
    // Initialize optimized schedules
    Object.values(profiles).forEach(profile => {
      optimized[profile.resourceId] = {
        resourceId: profile.resourceId,
        resourceName: profile.resourceName,
        optimizedSchedule: { ...profile.dailyDemand },
        violations: [],
        levelingDelays: []
      };
    });
    
    // Iterative adjustment
    while (iterations < maxIterations) {
      let hasViolations = false;
      
      Object.values(optimized).forEach(resource => {
        const violations = checkViolations(resource.optimizedSchedule);
        if (violations.length > 0) {
          hasViolations = true;
          adjustSchedule(resource, violations);
        }
      });
      
      if (!hasViolations) break;
      iterations++;
    }
    
    return optimized;
  };

  // Helper: Get time horizon for leveling
  const getTimeHorizon = () => {
    let earliestStart = new Date();
    let latestEnd = new Date();
    
    phases.forEach(phase => {
      const start = new Date(phase.startDate);
      const end = new Date(phase.endDate);
      
      if (start < earliestStart) earliestStart = start;
      if (end > latestEnd) latestEnd = end;
    });
    
    return { earliestStart, latestEnd };
  };

  // Helper: Calculate activity float
  const calculateFloat = (phase) => {
    const startDate = new Date(phase.startDate);
    const endDate = new Date(phase.endDate);
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    // Simplified float calculation (can be enhanced with dependency analysis)
    return Math.max(0, duration * 0.2); // 20% of duration as float
  };

  // Helper: Get activities sorted by leveling priority
  const getSortedActivities = (profiles) => {
    const activities = [];
    
    Object.values(profiles).forEach(profile => {
      profile.activities.forEach(activity => {
        activities.push({
          resourceId: profile.resourceId,
          activity
        });
      });
    });
    
    // Sort by priority criteria
    return activities.sort((a, b) => {
      if (settings.levelingPriority === 'float') {
        return a.activity.float - b.activity.float; // Lower float first
      } else if (settings.levelingPriority === 'startDate') {
        return a.activity.startDate - b.activity.startDate; // Earlier start first
      } else {
        return a.activity.priority - b.activity.priority; // Lower priority number first
      }
    });
  };

  // Helper: Find earliest feasible start date
  const findEarliestFeasibleStart = (activity, currentSchedule, resourceProfile) => {
    const originalStart = activity.startDate;
    const duration = Math.ceil((new Date(activity.endDate) - originalStart) / (1000 * 60 * 60 * 24));
    const maxDailyHours = settings.maxDailyHours;
    
    // Test start dates from original start onwards
    for (let daysOffset = 0; daysOffset <= (settings.levelWithinFloat ? activity.float : 30); daysOffset++) {
      const testStart = new Date(originalStart);
      testStart.setDate(testStart.getDate() + daysOffset);
      
      if (isFeasibleStart(activity, testStart, currentSchedule, maxDailyHours)) {
        return testStart;
      }
    }
    
    return originalStart; // Fallback to original start
  };

  // Helper: Check if a start date is feasible
  const isFeasibleStart = (activity, startDate, currentSchedule, maxDailyHours) => {
    const duration = Math.ceil((new Date(activity.endDate) - new Date(activity.startDate)) / (1000 * 60 * 60 * 24));
    const hoursPerDay = activity.hoursPerDay;
    
    for (let day = 0; day < duration; day++) {
      const testDate = new Date(startDate);
      testDate.setDate(testDate.getDate() + day);
      const dateStr = testDate.toISOString().split('T')[0];
      
      const currentHours = currentSchedule.optimizedSchedule[dateStr] || 0;
      if (currentHours + hoursPerDay > maxDailyHours) {
        return false;
      }
    }
    
    return true;
  };

  // Helper: Apply leveled schedule
  const applyLeveledSchedule = (resource, activity, startDate) => {
    const duration = Math.ceil((new Date(activity.endDate) - new Date(activity.startDate)) / (1000 * 60 * 60 * 24));
    const hoursPerDay = activity.hoursPerDay;
    
    for (let day = 0; day < duration; day++) {
      const scheduleDate = new Date(startDate);
      scheduleDate.setDate(scheduleDate.getDate() + day);
      const dateStr = scheduleDate.toISOString().split('T')[0];
      
      if (!resource.optimizedSchedule[dateStr]) {
        resource.optimizedSchedule[dateStr] = 0;
      }
      resource.optimizedSchedule[dateStr] += hoursPerDay;
    }
  };

  // Helper: Check for violations in optimized schedule
  const checkViolations = (schedule) => {
    const violations = [];
    const maxDailyHours = settings.maxDailyHours;
    const maxWeeklyHours = settings.maxWeeklyHours;
    let weeklyHours = 0;
    
    Object.entries(schedule).forEach(([date, hours]) => {
      weeklyHours += hours;
      
      if (hours > maxDailyHours) {
        violations.push({
          date,
          hours,
          maxHours: maxDailyHours,
          type: 'daily'
        });
      }
    });
    
    if (weeklyHours > maxWeeklyHours) {
      violations.push({
        date: 'weekly',
        hours: weeklyHours,
        maxHours: maxWeeklyHours,
        type: 'weekly'
      });
    }
    
    return violations;
  };

  // Helper: Adjust schedule for violations (parallel method)
  const adjustSchedule = (resource, violations) => {
    violations.forEach(violation => {
      if (violation.type === 'daily') {
        // Redistribute excess hours to adjacent days
        redistributeDailyViolation(resource, violation);
      } else if (violation.type === 'weekly') {
        // Redistribute excess hours to next week
        redistributeWeeklyViolation(resource, violation);
      }
    });
  };

  // Helper: Redistribute daily violation
  const redistributeDailyViolation = (resource, violation) => {
    const excessHours = violation.hours - violation.maxHours;
    const violationDate = new Date(violation.date);
    
    // Try to move excess hours to next available day
    for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
      const nextDate = new Date(violationDate);
      nextDate.setDate(nextDate.getDate() + dayOffset);
      const nextDateStr = nextDate.toISOString().split('T')[0];
      
      const currentHours = resource.optimizedSchedule[nextDateStr] || 0;
      if (currentHours + excessHours <= settings.maxDailyHours) {
        resource.optimizedSchedule[violation.date] -= excessHours;
        resource.optimizedSchedule[nextDateStr] = (resource.optimizedSchedule[nextDateStr] || 0) + excessHours;
        break;
      }
    }
  };

  // Helper: Redistribute weekly violation
  const redistributeWeeklyViolation = (resource, violation) => {
    // Move excess hours to next week
    const excessHours = violation.hours - violation.maxHours;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() + 7);
    
    for (let day = 0; day < 5; day++) {
      const nextWeekDate = new Date(weekStart);
      nextWeekDate.setDate(nextWeekDate.getDate() + day);
      const dateStr = nextWeekDate.toISOString().split('T')[0];
      
      if (!resource.optimizedSchedule[dateStr]) {
        resource.optimizedSchedule[dateStr] = 0;
      }
      
      const hoursToMove = Math.min(excessHours, settings.maxDailyHours - resource.optimizedSchedule[dateStr]);
      if (hoursToMove > 0) {
        resource.optimizedSchedule[dateStr] += hoursToMove;
        // Reduce from current week (simplified)
        break;
      }
    }
  };

  // Redistribute hours when daily limit is exceeded
  const redistributeHours = (userSchedule, phase, workingDays, totalHours, minChunk) => {
    const dailyLimit = settings.maxDailyHours;
    const remainingDays = [...workingDays];
    let remainingHours = totalHours;
    
    // First pass: allocate up to daily limit
    remainingDays.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const hoursToAllocate = Math.min(dailyLimit, remainingHours);
      
      if (hoursToAllocate >= minChunk) {
        if (!userSchedule.optimizedSchedule[dateStr]) {
          userSchedule.optimizedSchedule[dateStr] = 0;
        }
        userSchedule.optimizedSchedule[dateStr] += hoursToAllocate;
        remainingHours -= hoursToAllocate;
      }
    });
    
    // Second pass: distribute remaining hours across additional days
    if (remainingHours > 0) {
      const additionalDays = getAdditionalWorkingDays(workingDays, settings.workingDays);
      
      additionalDays.forEach(date => {
        if (remainingHours <= 0) return;
        
        const dateStr = date.toISOString().split('T')[0];
        const hoursToAllocate = Math.min(dailyLimit, remainingHours);
        
        if (hoursToAllocate >= minChunk) {
          if (!userSchedule.optimizedSchedule[dateStr]) {
            userSchedule.optimizedSchedule[dateStr] = 0;
          }
          userSchedule.optimizedSchedule[dateStr] += hoursToAllocate;
          remainingHours -= hoursToAllocate;
        }
      });
    }
  };

  // Get additional working days after the planned period
  const getAdditionalWorkingDays = (originalDays, workingDays) => {
    const additionalDays = [];
    const lastDay = new Date(Math.max(...originalDays.map(d => new Date(d))));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Add 30 additional days
    for (let i = 1; i <= 30; i++) {
      const nextDay = new Date(lastDay);
      nextDay.setDate(lastDay.getDate() + i);
      const dayName = dayNames[nextDay.getDay()];
      
      if (workingDays.includes(dayName)) {
        additionalDays.push(nextDay);
      }
    }
    
    return additionalDays;
  };

  // Get workload summary
  const getWorkloadSummary = () => {
    const totalUsers = Object.keys(currentWorkload).length;
    const overAllocatedUsers = Object.values(currentWorkload).filter(user => user.overAllocated).length;
    const totalPlannedHours = Object.values(plannedWorkload).reduce((sum, user) => sum + user.totalPlannedHours, 0);
    
    return {
      totalUsers,
      overAllocatedUsers,
      totalPlannedHours,
      averageHoursPerUser: totalUsers > 0 ? totalPlannedHours / totalUsers : 0
    };
  };

  const summary = getWorkloadSummary();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Load Balance</h2>
        <p className="text-gray-600">Optimize workload distribution to prevent over-allocation and ensure efficient resource utilization.</p>
      </div>

      {/* Project Data Overview */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Data Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Timesheets</p>
                <p className="text-2xl font-bold text-blue-900">{dataStats.timesheets}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Tasks</p>
                <p className="text-2xl font-bold text-green-900">{dataStats.tasks}</p>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Crews</p>
                <p className="text-2xl font-bold text-purple-900">{dataStats.crews}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Budgets</p>
                <p className="text-2xl font-bold text-orange-900">{dataStats.budgets}</p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
        
        {dataStats.lastSync && (
          <div className="mt-4 text-sm text-gray-500">
            Last updated: {new Date(dataStats.lastSync).toLocaleString()}
          </div>
        )}
      </div>

      {/* Advanced Primavera P6-style Settings Panel */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold">Resource Leveling</h3>
        </div>
        
        {/* Basic Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Calendar
            </label>
            <select
              value={selectedCalendar?.id || ''}
              onChange={(e) => handleCalendarChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {calendars.length === 0 ? (
                <option value="">No calendars allocated to this project</option>
              ) : (
                <>
                  <option value="">-- Select Calendar --</option>
                  {calendars.map(calendar => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            {selectedCalendar ? (
              <p className="text-xs text-gray-500 mt-1">
                Max: {selectedCalendar.dailyHoursLimit}h/day
              </p>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Work Block (Hours)
            </label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={settings.minimumChunkHours}
              onChange={(e) => setSettings(prev => ({ ...prev, minimumChunkHours: parseFloat(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Weekly Hours
            </label>
            <input
              type="number"
              min="20"
              max="60"
              value={settings.maxWeeklyHours}
              onChange={(e) => setSettings(prev => ({ ...prev, maxWeeklyHours: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Weekly capacity limit
            </p>
          </div>
          <div className="flex items-end">
            <button
              onClick={optimizeWorkload}
              disabled={isOptimizing}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isOptimizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Leveling...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Run Leveling
                </>
              )}
            </button>
          </div>
        </div>

        {/* Advanced Leveling Options */}
        <div className="border-t pt-4">
          <h4 className="text-md font-medium text-gray-900 mb-4">Advanced Leveling Options</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leveling Method
              </label>
              <select
                value={settings.levelingMethod}
                onChange={(e) => setSettings(prev => ({ ...prev, levelingMethod: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="serial">Serial (Faster)</option>
                <option value="parallel">Parallel (More Balanced)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {settings.levelingMethod === 'serial' 
                  ? 'Level activities one by one' 
                  : 'Iteratively adjust all activities'
                }
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leveling Priority
              </label>
              <select
                value={settings.levelingPriority}
                onChange={(e) => setSettings(prev => ({ ...prev, levelingPriority: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="float">Total Float</option>
                <option value="startDate">Start Date</option>
                <option value="priority">Activity Priority</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Determines which activities to delay first
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leveling Constraints
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.preserveLogic}
                    onChange={(e) => setSettings(prev => ({ ...prev, preserveLogic: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Preserve Logic</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.levelWithinFloat}
                    onChange={(e) => setSettings(prev => ({ ...prev, levelWithinFloat: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Level Within Float</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.allowSplitting}
                    onChange={(e) => setSettings(prev => ({ ...prev, allowSplitting: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Allow Splitting</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Total Users</div>
          <div className="text-2xl font-bold text-gray-900">{summary.totalUsers}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Over-allocated</div>
          <div className="text-2xl font-bold text-red-600">{summary.overAllocatedUsers}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Total Planned Hours</div>
          <div className="text-2xl font-bold text-gray-900">{summary.totalPlannedHours.toFixed(1)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Avg Hours/User</div>
          <div className="text-2xl font-bold text-gray-900">{summary.averageHoursPerUser.toFixed(1)}</div>
        </div>
      </div>

      {/* Current Workload Table */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Current Workload</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Breakdown</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.values(currentWorkload).map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.role}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.totalHours.toFixed(1)}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.overAllocated 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.overAllocated ? 'Over-allocated' : 'Normal'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs">
                      {Object.entries(user.dailyHours).slice(0, 3).map(([date, hours]) => (
                        <div key={date} className="text-xs">
                          {new Date(date).toLocaleDateString()}: {hours.toFixed(1)}h
                        </div>
                      ))}
                      {Object.keys(user.dailyHours).length > 3 && (
                        <div className="text-xs text-gray-400">
                          +{Object.keys(user.dailyHours).length - 3} more days
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Primavera P6-Style Leveling Results */}
      {optimizedSchedule && (
        <div className="space-y-6">
          {/* Leveling Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold">Resource Leveling Complete</h3>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Method: {settings.levelingMethod === 'serial' ? 'Serial' : 'Parallel'}</span>
                <span>Priority: {settings.levelingPriority}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-blue-600">Resources Leveled</div>
                <div className="text-2xl font-bold text-blue-900">{Object.keys(optimizedSchedule).length}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-green-600">No Violations</div>
                <div className="text-2xl font-bold text-green-900">
                  {Object.values(optimizedSchedule).filter(r => r.violations.length === 0).length}
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-orange-600">Total Delays</div>
                <div className="text-2xl font-bold text-orange-900">
                  {Object.values(optimizedSchedule).reduce((sum, r) => sum + r.levelingDelays.length, 0)}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-purple-600">Avg Delay (Days)</div>
                <div className="text-2xl font-bold text-purple-900">
                  {Object.values(optimizedSchedule).length > 0 
                    ? (Object.values(optimizedSchedule).reduce((sum, r) => 
                        sum + r.levelingDelays.reduce((s, d) => s + d.delayDays, 0), 0) / 
                       Object.values(optimizedSchedule).reduce((sum, r) => sum + r.levelingDelays.length, 1)).toFixed(1)
                    : '0'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Leveled Resource Schedules</h3>
              <p className="text-sm text-gray-600">Optimized workload distribution with Primavera P6-style leveling</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delays</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule Preview</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.values(optimizedSchedule).map((resource) => (
                    <tr key={resource.resourceId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {resource.resourceName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Object.values(resource.optimizedSchedule).reduce((sum, hours) => sum + hours, 0).toFixed(1)}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            resource.violations.length > 0 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {resource.violations.length === 0 ? 'Leveled' : `${resource.violations.length} violations`}
                          </span>
                          {resource.violations.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {resource.violations.filter(v => v.type === 'daily').length} daily, {resource.violations.filter(v => v.type === 'weekly').length} weekly
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {resource.levelingDelays.length > 0 ? (
                          <div className="space-y-1">
                            {resource.levelingDelays.slice(0, 2).map((delay, idx) => (
                              <div key={idx} className="text-xs">
                                <div className="font-medium">{delay.activityName}</div>
                                <div className="text-gray-500">+{delay.delayDays} days</div>
                              </div>
                            ))}
                            {resource.levelingDelays.length > 2 && (
                              <div className="text-xs text-gray-400">
                                +{resource.levelingDelays.length - 2} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-green-600 text-xs">No delays</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs">
                          {Object.entries(resource.optimizedSchedule).slice(0, 5).map(([date, hours]) => (
                            <div key={date} className="text-xs flex justify-between">
                              <span>{new Date(date).toLocaleDateString()}</span>
                              <span className="font-medium">{hours.toFixed(1)}h</span>
                            </div>
                          ))}
                          {Object.keys(resource.optimizedSchedule).length > 5 && (
                            <div className="text-xs text-gray-400">
                              +{Object.keys(resource.optimizedSchedule).length - 5} more days
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leveling Details */}
          {Object.values(optimizedSchedule).some(r => r.levelingDelays.length > 0) && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Leveling Details</h3>
                <p className="text-sm text-gray-600">Activities that were delayed during leveling</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {Object.values(optimizedSchedule).map((resource) => (
                    resource.levelingDelays.length > 0 && (
                      <div key={resource.resourceId} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">{resource.resourceName}</h4>
                          <span className="text-sm text-gray-500">{resource.levelingDelays.length} delays</span>
                        </div>
                        <div className="space-y-2">
                          {resource.levelingDelays.map((delay, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                              <div>
                                <div className="font-medium text-sm">{delay.activityName}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(delay.originalStart).toLocaleDateString()} → {new Date(delay.leveledStart).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-orange-600">+{delay.delayDays} days</div>
                                <div className="text-xs text-gray-500">delay</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamLoadBalanceTab;
