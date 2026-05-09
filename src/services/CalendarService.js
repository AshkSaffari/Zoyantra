class CalendarService {
  constructor() {
    this.storageKey = 'zoyantra_calendars';
  }

  // Get all calendars
  getCalendars() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading calendars:', error);
      return [];
    }
  }

  // Create a new calendar
  createCalendar(calendarData) {
    try {
      const calendars = this.getCalendars();
      const newCalendar = {
        id: `calendar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: calendarData.name,
        description: calendarData.description || '',
        workingHoursPerDay: calendarData.workingHoursPerDay || 8,
        workingDays: calendarData.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        holidays: calendarData.holidays || [],
        state: calendarData.state || 'NSW',
        year: calendarData.year || new Date().getFullYear(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      calendars.push(newCalendar);
      localStorage.setItem(this.storageKey, JSON.stringify(calendars));
      
      console.log('✅ Calendar created:', newCalendar);
      return newCalendar;
    } catch (error) {
      console.error('Error creating calendar:', error);
      throw error;
    }
  }

  // Update a calendar
  updateCalendar(calendarId, updateData) {
    try {
      const calendars = this.getCalendars();
      const index = calendars.findIndex(c => c.id === calendarId);
      
      if (index === -1) {
        throw new Error('Calendar not found');
      }
      
      calendars[index] = {
        ...calendars[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(calendars));
      
      console.log('✅ Calendar updated:', calendars[index]);
      return calendars[index];
    } catch (error) {
      console.error('Error updating calendar:', error);
      throw error;
    }
  }

  // Delete a calendar
  deleteCalendar(calendarId) {
    try {
      const calendars = this.getCalendars();
      const filteredCalendars = calendars.filter(c => c.id !== calendarId);
      
      localStorage.setItem(this.storageKey, JSON.stringify(filteredCalendars));
      
      console.log('✅ Calendar deleted:', calendarId);
      return true;
    } catch (error) {
      console.error('Error deleting calendar:', error);
      throw error;
    }
  }

  // Get calendar by ID
  getCalendarById(calendarId) {
    const calendars = this.getCalendars();
    return calendars.find(c => c.id === calendarId);
  }

  // Get working hours for a specific date
  getWorkingHoursForDate(calendarId, date) {
    const calendar = this.getCalendarById(calendarId);
    if (!calendar) return 0;

    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    // Check if it's a working day
    if (!calendar.workingDays.includes(dayName)) {
      return 0;
    }

    // Check if it's a holiday
    const dateStr = dateObj.toISOString().split('T')[0];
    const isHoliday = calendar.holidays.some(holiday => holiday.date === dateStr);
    
    if (isHoliday) {
      return 0;
    }

    return calendar.workingHoursPerDay;
  }

  // Check if a date is a working day
  isWorkingDay(calendarId, date) {
    const workingHours = this.getWorkingHoursForDate(calendarId, date);
    return workingHours > 0;
  }

  // Get default calendar (first one or create one)
  getDefaultCalendar() {
    const calendars = this.getCalendars();
    
    if (calendars.length === 0) {
      // Create a default calendar
      return this.createCalendar({
        name: 'Default Working Calendar',
        description: 'Standard 8-hour working day calendar',
        workingHoursPerDay: 8,
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        holidays: []
      });
    }
    
    return calendars[0];
  }
}

export default new CalendarService();

