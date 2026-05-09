class AustralianHolidaysService {
  constructor() {
    this.baseURL = 'https://www.timeanddate.com/holidays/australia/';
    this.holidaysCache = new Map();
  }

  /**
   * Get Australian public holidays for a specific state and year
   * @param {string} state - Australian state/territory
   * @param {number} year - Year (2025-2099)
   * @returns {Promise<Array>} Array of holiday objects
   */
  async getHolidaysForState(state, year) {
    const cacheKey = `${state}-${year}`;
    
    // Return cached data if available
    if (this.holidaysCache.has(cacheKey)) {
      return this.holidaysCache.get(cacheKey);
    }

    try {
      console.log(`🇦🇺 Fetching holidays for ${state} in ${year}`);
      
      // For now, we'll use a static implementation based on the website data
      // In a real implementation, you would scrape or use an API
      const holidays = this.getStaticHolidaysForState(state, year);
      
      // Cache the results
      this.holidaysCache.set(cacheKey, holidays);
      
      console.log(`✅ Loaded ${holidays.length} holidays for ${state} in ${year}`);
      return holidays;
      
    } catch (error) {
      console.error(`❌ Error fetching holidays for ${state}:`, error);
      return [];
    }
  }

  /**
   * Get static holiday data based on the website structure
   * This is a simplified version - in production you'd want to scrape the actual site
   */
  getStaticHolidaysForState(state, year) {
    const holidays = [];
    
    // National holidays (same for all states)
    const nationalHolidays = this.getNationalHolidays(year);
    holidays.push(...nationalHolidays);

    // State-specific holidays
    const stateHolidays = this.getStateSpecificHolidays(state, year);
    holidays.push(...stateHolidays);

    return holidays;
  }

  getNationalHolidays(year) {
    return [
      {
        id: `new-year-${year}`,
        name: "New Year's Day",
        date: `${year}-01-01`,
        type: 'national',
        state: 'all'
      },
      {
        id: `australia-day-${year}`,
        name: "Australia Day",
        date: `${year}-01-26`,
        type: 'national',
        state: 'all'
      },
      {
        id: `anzac-day-${year}`,
        name: "Anzac Day",
        date: `${year}-04-25`,
        type: 'national',
        state: 'all'
      },
      {
        id: `christmas-day-${year}`,
        name: "Christmas Day",
        date: `${year}-12-25`,
        type: 'national',
        state: 'all'
      },
      {
        id: `boxing-day-${year}`,
        name: "Boxing Day",
        date: `${year}-12-26`,
        type: 'national',
        state: 'all'
      }
    ];
  }

  getStateSpecificHolidays(state, year) {
    // Based on Time and Date website data structure
    const stateHolidays = {
      'NSW': [
        { name: "Labour Day", month: 10, day: 6, type: 'state' },
        { name: "King's Birthday", month: 6, day: 10, type: 'state' }
      ],
      'VIC': [
        { name: "Labour Day", month: 3, day: 10, type: 'state' },
        { name: "King's Birthday", month: 6, day: 10, type: 'state' },
        { name: "Melbourne Cup Day", month: 11, day: 4, type: 'state' },
        { name: "Friday before AFL Grand Final", month: 9, day: 26, type: 'state', tentative: true }
      ],
      'QLD': [
        { name: "Labour Day", month: 5, day: 5, type: 'state' },
        { name: "King's Birthday", month: 10, day: 6, type: 'state' },
        { name: "Royal Queensland Show", month: 8, day: 12, type: 'state', region: 'Brisbane only' }
      ],
      'SA': [
        { name: "Adelaide Cup Day", month: 3, day: 10, type: 'state' },
        { name: "King's Birthday", month: 6, day: 10, type: 'state' },
        { name: "Labour Day", month: 10, day: 6, type: 'state' }
      ],
      'WA': [
        { name: "Labour Day", month: 3, day: 3, type: 'state' },
        { name: "Western Australia Day", month: 6, day: 2, type: 'state' },
        { name: "King's Birthday", month: 9, day: 29, type: 'state' }
      ],
      'TAS': [
        { name: "Eight Hours Day", month: 3, day: 10, type: 'state' },
        { name: "King's Birthday", month: 6, day: 10, type: 'state' },
        { name: "Recreation Day", month: 11, day: 3, type: 'state' },
        { name: "Royal Hobart Show", month: 10, day: 23, type: 'state', region: 'Tasmania*' }
      ],
      'NT': [
        { name: "May Day", month: 5, day: 5, type: 'state' },
        { name: "King's Birthday", month: 6, day: 10, type: 'state' },
        { name: "Picnic Day", month: 8, day: 4, type: 'state' }
      ],
      'ACT': [
        { name: "Canberra Day", month: 3, day: 10, type: 'state' },
        { name: "Reconciliation Day", month: 6, day: 2, type: 'state' },
        { name: "King's Birthday", month: 6, day: 10, type: 'state' },
        { name: "Labour Day", month: 10, day: 6, type: 'state' }
      ]
    };

    const holidays = [];
    const stateData = stateHolidays[state] || [];

    stateData.forEach(holiday => {
      const date = new Date(year, holiday.month - 1, holiday.day);
      const dateString = date.toISOString().split('T')[0];
      
      holidays.push({
        id: `${holiday.name.toLowerCase().replace(/\s+/g, '-')}-${state}-${year}`,
        name: holiday.name,
        date: dateString,
        type: holiday.type,
        state: state,
        region: holiday.region || null,
        tentative: holiday.tentative || false
      });
    });

    return holidays;
  }

  /**
   * Get Easter dates for a given year (simplified calculation)
   */
  getEasterDates(year) {
    // Simplified Easter calculation (Gauss's algorithm)
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const n = Math.floor((h + l - 7 * m + 114) / 31);
    const p = (h + l - 7 * m + 114) % 31;
    
    const easterDay = p + 1;
    const easterMonth = n;
    
    const easterDate = new Date(year, easterMonth - 1, easterDay);
    const goodFriday = new Date(easterDate);
    goodFriday.setDate(easterDate.getDate() - 2);
    const easterMonday = new Date(easterDate);
    easterMonday.setDate(easterDate.getDate() + 1);

    return {
      goodFriday: goodFriday.toISOString().split('T')[0],
      easterSaturday: new Date(easterDate.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      easterSunday: easterDate.toISOString().split('T')[0],
      easterMonday: easterMonday.toISOString().split('T')[0]
    };
  }

  /**
   * Add Easter holidays to the list
   */
  addEasterHolidays(holidays, year) {
    const easter = this.getEasterDates(year);
    
    holidays.push(
      {
        id: `good-friday-${year}`,
        name: "Good Friday",
        date: easter.goodFriday,
        type: 'national',
        state: 'all'
      },
      {
        id: `easter-saturday-${year}`,
        name: "Easter Saturday",
        date: easter.easterSaturday,
        type: 'national',
        state: 'all'
      },
      {
        id: `easter-sunday-${year}`,
        name: "Easter Sunday",
        date: easter.easterSunday,
        type: 'national',
        state: 'all'
      },
      {
        id: `easter-monday-${year}`,
        name: "Easter Monday",
        date: easter.easterMonday,
        type: 'national',
        state: 'all'
      }
    );
  }

  /**
   * Get all available states
   */
  getAvailableStates() {
    return [
      { code: 'NSW', name: 'New South Wales' },
      { code: 'VIC', name: 'Victoria' },
      { code: 'QLD', name: 'Queensland' },
      { code: 'SA', name: 'South Australia' },
      { code: 'WA', name: 'Western Australia' },
      { code: 'TAS', name: 'Tasmania' },
      { code: 'NT', name: 'Northern Territory' },
      { code: 'ACT', name: 'Australian Capital Territory' }
    ];
  }

  /**
   * Check if a date is a public holiday
   */
  isPublicHoliday(date, state, year) {
    const holidays = this.getStaticHolidaysForState(state, year);
    const dateString = new Date(date).toISOString().split('T')[0];
    
    return holidays.some(holiday => 
      holiday.date === dateString && 
      (holiday.state === 'all' || holiday.state === state)
    );
  }
}

export default new AustralianHolidaysService();