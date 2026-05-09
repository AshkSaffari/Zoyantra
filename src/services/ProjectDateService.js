/**
 * Project Date Service
 * Handles project date calculations with calendar integration
 */

class ProjectDateService {
  constructor() {
    this.credentials = null;
  }

  initialize(credentials) {
    this.credentials = credentials;
  }

  /**
   * Load project dates from ACC with proper completion date handling
   */
  async loadProjectDates(projectId) {
    try {
      console.log('📅 Loading project dates for:', projectId);
      
      if (!this.credentials?.threeLegToken) {
        throw new Error('No credentials available');
      }

      // Import AccService dynamically to avoid circular dependencies
      const { default: AccService } = await import('./AccService');
      const accService = new AccService();
      AccService.initialize(this.credentials);

      // Get project details from ACC
      const projectDetails = await accService.getProjectDetails(projectId);
      
      if (!projectDetails) {
        throw new Error('Project details not found');
      }

      console.log('📅 Project details received:', projectDetails);

      // Extract dates from project details
      const startDate = this.extractStartDate(projectDetails);
      const finishDate = this.extractFinishDate(projectDetails);
      
      if (!startDate) {
        throw new Error('Project start date not found');
      }

      if (!finishDate) {
        throw new Error('Project completion date not found');
      }

      const projectDates = {
        startDate: startDate,
        finishDate: finishDate,
        projectName: projectDetails.name || 'Unknown Project',
        projectId: projectId,
        rawData: projectDetails
      };

      console.log('✅ Project dates loaded:', projectDates);
      return projectDates;

    } catch (error) {
      console.error('❌ Error loading project dates:', error);
      throw error;
    }
  }

  /**
   * Extract start date from project details
   */
  extractStartDate(projectDetails) {
    // Try multiple possible fields for start date
    const possibleStartFields = [
      'startDate',
      'start_date',
      'projectStartDate',
      'attributes.startDate',
      'attributes.start_date',
      'attributes.projectStartDate'
    ];

    for (const field of possibleStartFields) {
      const value = this.getNestedValue(projectDetails, field);
      if (value) {
        const date = this.parseDate(value);
        if (date && !isNaN(date.getTime())) {
          console.log(`✅ Found start date in field '${field}':`, date);
          return date.toISOString().split('T')[0];
        }
      }
    }

    console.warn('⚠️ No valid start date found in project details');
    return null;
  }

  /**
   * Extract finish/completion date from project details
   */
  extractFinishDate(projectDetails) {
    // Try multiple possible fields for completion date
    const possibleFinishFields = [
      'completionDate',
      'completion_date',
      'finishDate',
      'finish_date',
      'endDate',
      'end_date',
      'projectCompletionDate',
      'projectFinishDate',
      'attributes.completionDate',
      'attributes.completion_date',
      'attributes.finishDate',
      'attributes.finish_date',
      'attributes.endDate',
      'attributes.end_date',
      'attributes.projectCompletionDate',
      'attributes.projectFinishDate'
    ];

    for (const field of possibleFinishFields) {
      const value = this.getNestedValue(projectDetails, field);
      if (value) {
        const date = this.parseDate(value);
        if (date && !isNaN(date.getTime())) {
          console.log(`✅ Found completion date in field '${field}':`, date);
          return date.toISOString().split('T')[0];
        }
      }
    }

    console.warn('⚠️ No valid completion date found in project details');
    return null;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * Parse date from various formats
   */
  parseDate(dateValue) {
    if (!dateValue) return null;
    
    // If it's already a Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // If it's a string, try to parse it
    if (typeof dateValue === 'string') {
      // Try ISO format first
      let date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // Try other common formats
      const formats = [
        'YYYY-MM-DD',
        'MM/DD/YYYY',
        'DD/MM/YYYY',
        'YYYY/MM/DD'
      ];
      
      for (const format of formats) {
        try {
          // Simple parsing for common formats
          if (format === 'YYYY-MM-DD' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return new Date(dateValue);
          }
          if (format === 'MM/DD/YYYY' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
            const [month, day, year] = dateValue.split('/');
            return new Date(year, month - 1, day);
          }
          if (format === 'DD/MM/YYYY' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
            const [day, month, year] = dateValue.split('/');
            return new Date(year, month - 1, day);
          }
        } catch (e) {
          // Continue to next format
        }
      }
    }
    
    return null;
  }

  /**
   * Calculate total duration in working days
   */
  calculateWorkingDays(startDate, finishDate, calendar = null) {
    try {
      const start = new Date(startDate);
      const finish = new Date(finishDate);
      
      if (isNaN(start.getTime()) || isNaN(finish.getTime())) {
        console.error('❌ Invalid dates for working days calculation:', startDate, finishDate);
        return {
          totalDays: 0,
          workingDays: 0,
          totalHours: 0,
          dailyHours: calendar?.dailyHoursLimit || 8
        };
      }

      // Calculate total calendar days
      const totalDays = Math.ceil((finish - start) / (1000 * 60 * 60 * 24)) + 1;
      
      // If no calendar is provided, assume 5 working days per week
      if (!calendar) {
        const workingDays = this.calculateBasicWorkingDays(start, finish);
        return {
          totalDays,
          workingDays,
          totalHours: workingDays * 8, // Default 8 hours per day
          dailyHours: 8
        };
      }

      // Calculate working days based on calendar
      const workingDays = this.calculateCalendarWorkingDays(start, finish, calendar);
      const dailyHours = calendar.dailyHoursLimit || 8;
      
      return {
        totalDays,
        workingDays,
        totalHours: workingDays * dailyHours,
        dailyHours
      };

    } catch (error) {
      console.error('❌ Error calculating working days:', error);
      return {
        totalDays: 0,
        workingDays: 0,
        totalHours: 0,
        dailyHours: 8
      };
    }
  }

  /**
   * Calculate basic working days (Monday to Friday)
   */
  calculateBasicWorkingDays(startDate, finishDate) {
    let workingDays = 0;
    const current = new Date(startDate);
    const finish = new Date(finishDate);
    
    while (current <= finish) {
      const dayOfWeek = current.getDay();
      // Monday = 1, Tuesday = 2, ..., Friday = 5
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
  }

  /**
   * Calculate working days based on calendar settings
   */
  calculateCalendarWorkingDays(startDate, finishDate, calendar) {
    let workingDays = 0;
    const current = new Date(startDate);
    const finish = new Date(finishDate);
    
    while (current <= finish) {
      // Check if this day is a working day according to calendar
      if (this.isWorkingDay(current, calendar)) {
        workingDays++;
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
  }

  /**
   * Check if a specific date is a working day
   */
  isWorkingDay(date, calendar) {
    if (!calendar) {
      // Default: Monday to Friday
      const dayOfWeek = date.getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    }

    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    // Check if this day is configured as a work day in the calendar
    if (calendar.workDays && calendar.workDays[dayName] !== undefined) {
      if (!calendar.workDays[dayName]) {
        return false; // This day is not a work day
      }
    } else {
      // Default: Monday to Friday if workDays not specified
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false;
      }
    }

    // Check for holidays
    const dateString = date.toISOString().split('T')[0];
    if (calendar.holidays && calendar.holidays.length > 0) {
      // Check if this date is in the holidays list
      const isHoliday = calendar.holidays.some(holiday => {
        if (typeof holiday === 'string') {
          return holiday === dateString;
        } else if (holiday.date) {
          return holiday.date === dateString;
        }
        return false;
      });
      
      if (isHoliday) {
        // Check if work is allowed on holidays
        if (!calendar.allowWorkOnHolidays) {
          return false;
        }
      }
    }

    // Check for Australian holidays if configured
    if (calendar.australianState && calendar.calendarYear) {
      const australianHolidays = this.getAustralianHolidays(calendar.calendarYear, calendar.australianState);
      if (australianHolidays.includes(dateString)) {
        if (!calendar.allowWorkOnHolidays) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get Australian holidays for a specific year and state
   */
  getAustralianHolidays(year, state) {
    const holidays = [];
    
    // Common Australian holidays
    const commonHolidays = [
      `${year}-01-01`, // New Year's Day
      `${year}-01-26`, // Australia Day
      `${year}-04-25`, // Anzac Day
      `${year}-12-25`, // Christmas Day
      `${year}-12-26`  // Boxing Day
    ];
    
    holidays.push(...commonHolidays);
    
    // State-specific holidays
    if (state === 'VIC') {
      holidays.push(
        `${year}-03-11`, // Labour Day (VIC)
        `${year}-04-14`, // Good Friday (calculated)
        `${year}-04-15`, // Easter Saturday
        `${year}-04-16`, // Easter Sunday
        `${year}-04-17`, // Easter Monday
        `${year}-06-10`, // King's Birthday (VIC)
        `${year}-11-05`  // Melbourne Cup Day
      );
    } else if (state === 'NSW') {
      holidays.push(
        `${year}-03-11`, // Labour Day (NSW)
        `${year}-04-14`, // Good Friday
        `${year}-04-15`, // Easter Saturday
        `${year}-04-16`, // Easter Sunday
        `${year}-04-17`, // Easter Monday
        `${year}-06-10`, // King's Birthday (NSW)
        `${year}-10-07`  // Labour Day (NSW)
      );
    }
    
    return holidays;
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString();
    } catch (error) {
      console.error('❌ Error formatting date:', error);
      return 'Invalid Date';
    }
  }

  /**
   * Get project duration summary
   */
  getProjectDurationSummary(projectDates, calendar = null) {
    if (!projectDates || !projectDates.startDate || !projectDates.finishDate) {
      return {
        startDate: 'Invalid Date',
        finishDate: 'Invalid Date',
        totalDays: 0,
        workingDays: 0,
        totalHours: 0,
        dailyHours: 8
      };
    }

    const duration = this.calculateWorkingDays(
      projectDates.startDate, 
      projectDates.finishDate, 
      calendar
    );

    return {
      startDate: this.formatDate(projectDates.startDate),
      finishDate: this.formatDate(projectDates.finishDate),
      totalDays: duration.totalDays,
      workingDays: duration.workingDays,
      totalHours: duration.totalHours,
      dailyHours: duration.dailyHours
    };
  }
}

export default ProjectDateService;
