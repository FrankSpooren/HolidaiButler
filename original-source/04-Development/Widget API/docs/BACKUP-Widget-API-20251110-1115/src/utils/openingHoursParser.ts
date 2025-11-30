import { logger } from '../config/logger';

interface OpeningHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

interface TimePeriod {
  start: number; // hours in 24h format (0-23)
  end: number;   // hours in 24h format (0-23)
}

interface DaySchedule {
  isClosed: boolean;
  periods: TimePeriod[];
}

export class OpeningHoursParser {
  
  /**
   * Parse opening hours from metadata
   */
  static parseOpeningHours(metadata: any): OpeningHours | null {
    if (!metadata) return null;
    
    // Use rawMetadata if available (pass-through from ChromaDB)
    const source = metadata.rawMetadata || metadata;
    
    const hours: OpeningHours = {};
    
    const dayFields = [
      'opening_hours_monday',
      'opening_hours_tuesday', 
      'opening_hours_wednesday',
      'opening_hours_thursday',
      'opening_hours_friday',
      'opening_hours_saturday',
      'opening_hours_sunday'
    ];
    
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (let i = 0; i < dayFields.length; i++) {
      const fieldName = dayFields[i];
      if (!fieldName) continue;
      const value = source[fieldName];
      if (value && typeof value === 'string') {
        hours[dayNames[i] as keyof OpeningHours] = value;
      }
    }
    
    return Object.keys(hours).length > 0 ? hours : null;
  }
  
  /**
   * Parse a time string like "9 AM to 5 PM" into hours (0-23)
   */
  static parseTimeString(timeStr: string): number | null {
    if (!timeStr || typeof timeStr !== 'string') return null;
    
    // Remove extra spaces and convert to lowercase
    const clean = timeStr.trim().toLowerCase();
    
    // Handle special cases
    if (clean.includes('closed')) return null;
    if (clean.includes('24 hours') || clean.includes('open 24 hours')) return 0; // Special marker for 24h
    
    // Match patterns like "9 AM", "2 PM", "14:30", etc.
    const amMatch = clean.match(/(\d+)\s*(am|a\.m\.)/);
    const pmMatch = clean.match(/(\d+)\s*(pm|p\.m\.)/);
    const hourMatch = clean.match(/(\d+):(\d+)/);
    
    if (amMatch && amMatch[1]) {
      let hour = parseInt(amMatch[1], 10);
      if (hour === 12) hour = 0;
      return hour;
    }
    
    if (pmMatch && pmMatch[1]) {
      let hour = parseInt(pmMatch[1], 10);
      if (hour !== 12) hour += 12;
      return hour;
    }
    
    if (hourMatch && hourMatch[1]) {
      return parseInt(hourMatch[1], 10);
    }
    
    return null;
  }
  
  /**
   * Parse hours string like "9 AM to 5 PM" into periods
   */
  static parseHoursString(hoursStr: string): DaySchedule {
    if (!hoursStr) {
      return { isClosed: true, periods: [] };
    }
    
    const clean = hoursStr.trim();
    
    if (clean.toLowerCase().includes('closed')) {
      return { isClosed: true, periods: [] };
    }
    
    // Handle "Open 24 hours"
    if (clean.toLowerCase().includes('24 hours') || clean.toLowerCase().includes('open 24 hours')) {
      return { isClosed: false, periods: [{ start: 0, end: 23 }] };
    }
    
    // Handle multiple periods like "1 to 4 PM; 8 to 11 PM"
    const periods: TimePeriod[] = [];
    const periodStrings = clean.split(';');
    
    for (const periodStr of periodStrings) {
      const parts = periodStr.split('to');
      if (parts.length !== 2) continue;
      
      const startTime = parts[0]?.trim();
      const endTime = parts[1]?.trim();
      if (!startTime || !endTime) continue;
      
      const startHour = this.parseTimeString(startTime);
      const endHour = this.parseTimeString(endTime);
      
      if (startHour !== null && endHour !== null) {
        periods.push({ start: startHour, end: endHour });
      }
    }
    
    return {
      isClosed: periods.length === 0,
      periods
    };
  }
  
  /**
   * Get schedule for a specific day
   */
  static getDaySchedule(openingHours: OpeningHours | null, dayIndex: number): DaySchedule {
    if (!openingHours) {
      return { isClosed: true, periods: [] };
    }
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayIndex];
    const hoursStr = openingHours[dayName as keyof OpeningHours];
    
    if (!hoursStr) {
      return { isClosed: true, periods: [] };
    }
    
    return this.parseHoursString(hoursStr);
  }
  
  /**
   * Check if place is currently open
   */
  static isCurrentlyOpen(metadata: any, currentTime: Date = new Date()): boolean {
    // First try the hourly format from opening_hours field
    const hourlyStatus = this.checkHourlyFormat(metadata, currentTime);
    if (hourlyStatus !== null) {
      return hourlyStatus;
    }
    
    // Fall back to readable day-specific fields
    const openingHours = this.parseOpeningHours(metadata);
    if (!openingHours) return false;
    
    const currentDay = currentTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentHour = currentTime.getHours();
    
    const schedule = this.getDaySchedule(openingHours, currentDay);
    
    if (schedule.isClosed) return false;
    if (schedule.periods.length === 0) return false;
    
    // Check if current hour is within any open period
    for (const period of schedule.periods) {
      if (currentHour >= period.start && currentHour < period.end) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check hourly format like "Mo:11:open;Mo:12:open;..."
   */
  private static checkHourlyFormat(metadata: any, currentTime: Date): boolean | null {
    // Get opening_hours from rawMetadata
    const source = metadata?.rawMetadata || metadata;
    const openingHoursStr = source?.opening_hours || source?.openingHours;
    
    if (!openingHoursStr || typeof openingHoursStr !== 'string') {
      return null;
    }
    
    // Check if it's the hourly format
    if (!openingHoursStr.includes(':open') && !openingHoursStr.includes(':closed')) {
      return null; // Not hourly format
    }
    
    const currentDay = currentTime.getDay(); // 0 = Sunday, 1 = Monday
    const currentHour = currentTime.getHours();
    
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const currentDayName = dayNames[currentDay];
    
    // Look for pattern like "Mo:14:open" or "Mo:14:closed"
    const pattern = `${currentDayName}:${currentHour}:`;
    const regex = new RegExp(`${pattern}(open|closed)`);
    const match = openingHoursStr.match(regex);
    
    if (match && match[1]) {
      return match[1] === 'open';
    }
    
    return false; // Not found in schedule = closed
  }
  
  /**
   * Check if opening soon using hourly format
   */
  private static checkHourlyFormatOpeningSoon(metadata: any, currentTime: Date): boolean | null {
    const source = metadata?.rawMetadata || metadata;
    const openingHoursStr = source?.opening_hours || source?.openingHours;
    
    if (!openingHoursStr || typeof openingHoursStr !== 'string') {
      return null;
    }
    
    if (!openingHoursStr.includes(':open') && !openingHoursStr.includes(':closed')) {
      return null;
    }
    
    const currentDay = currentTime.getDay();
    const currentHour = currentTime.getHours();
    const nextHour = (currentHour + 1) % 24;
    
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const currentDayName = dayNames[currentDay];
    
    // Check if next hour is open
    const pattern = `${currentDayName}:${nextHour}:`;
    const regex = new RegExp(`${pattern}(open|closed)`);
    const match = openingHoursStr.match(regex);
    
    if (match && match[1]) {
      // Only return true if currently closed but opening next hour
      const currentPattern = `${currentDayName}:${currentHour}:`;
      const currentMatch = openingHoursStr.match(new RegExp(`${currentPattern}(open|closed)`));
      const currentlyOpen = currentMatch && currentMatch[1] === 'open';
      
      return !currentlyOpen && match[1] === 'open';
    }
    
    return false;
  }
  
  /**
   * Check if place is opening within the next hour
   */
  static isOpeningSoon(metadata: any, currentTime: Date = new Date()): boolean {
    // First try hourly format
    const hourlyStatus = this.checkHourlyFormatOpeningSoon(metadata, currentTime);
    if (hourlyStatus !== null) {
      return hourlyStatus;
    }
    
    const openingHours = this.parseOpeningHours(metadata);
    if (!openingHours) return false;
    
    const currentDay = currentTime.getDay();
    const currentHour = currentTime.getHours();
    
    // Check if opening within the next hour
    const schedule = this.getDaySchedule(openingHours, currentDay);
    
    if (schedule.isClosed || schedule.periods.length === 0) return false;
    
    // Check if we're before opening time and will open within an hour
    for (const period of schedule.periods) {
      if (currentHour < period.start && currentHour >= period.start - 1) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if closing soon using hourly format
   */
  private static checkHourlyFormatClosingSoon(metadata: any, currentTime: Date): boolean | null {
    const source = metadata?.rawMetadata || metadata;
    const openingHoursStr = source?.opening_hours || source?.openingHours;
    
    if (!openingHoursStr || typeof openingHoursStr !== 'string') {
      return null;
    }
    
    if (!openingHoursStr.includes(':open') && !openingHoursStr.includes(':closed')) {
      return null;
    }
    
    const currentDay = currentTime.getDay();
    const currentHour = currentTime.getHours();
    const nextHour = (currentHour + 1) % 24;
    
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const currentDayName = dayNames[currentDay];
    
    // Check current hour and next hour
    const currentPattern = `${currentDayName}:${currentHour}:`;
    const nextPattern = `${currentDayName}:${nextHour}:`;
    
    const currentMatch = openingHoursStr.match(new RegExp(`${currentPattern}(open|closed)`));
    const nextMatch = openingHoursStr.match(new RegExp(`${nextPattern}(open|closed)`));
    
    const currentlyOpen = currentMatch && currentMatch[1] === 'open';
    const nextHourClosed = nextMatch && nextMatch[1] === 'closed';
    
    // Closing soon if currently open but closing next hour
    return currentlyOpen && nextHourClosed;
  }
  
  /**
   * Check if place is closing within the next hour
   */
  static isClosingSoon(metadata: any, currentTime: Date = new Date()): boolean {
    // First try hourly format
    const hourlyStatus = this.checkHourlyFormatClosingSoon(metadata, currentTime);
    if (hourlyStatus !== null) {
      return hourlyStatus;
    }
    
    const openingHours = this.parseOpeningHours(metadata);
    if (!openingHours) return false;
    
    const currentDay = currentTime.getDay();
    const currentHour = currentTime.getHours();
    
    const schedule = this.getDaySchedule(openingHours, currentDay);
    
    if (schedule.isClosed || schedule.periods.length === 0) return false;
    
    // Check if we're within an hour of closing
    for (const period of schedule.periods) {
      if (currentHour >= period.start && currentHour < period.end && 
          currentHour >= period.end - 1) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get next opening time
   */
  static getNextOpeningTime(metadata: any, currentTime: Date = new Date()): string | null {
    const openingHours = this.parseOpeningHours(metadata);
    if (!openingHours) return null;
    
    const currentDay = currentTime.getDay();
    const currentHour = currentTime.getHours();
    
    // Check today first
    const todaySchedule = this.getDaySchedule(openingHours, currentDay);
    if (!todaySchedule.isClosed && todaySchedule.periods.length > 0) {
      for (const period of todaySchedule.periods) {
        if (currentHour < period.start) {
          return this.formatHour(period.start);
        }
      }
    }
    
    // Check next 7 days
    for (let i = 1; i <= 7; i++) {
      const nextDay = (currentDay + i) % 7;
      const nextSchedule = this.getDaySchedule(openingHours, nextDay);
      if (!nextSchedule.isClosed && nextSchedule.periods.length > 0) {
        const nextOpening = nextSchedule.periods[0];
        if (nextOpening) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          return `${dayNames[nextDay]} at ${this.formatHour(nextOpening.start)}`;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Format hour for display
   */
  private static formatHour(hour: number): string {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  }
  
  /**
   * Get readable opening status
   */
  static getOpeningStatus(metadata: any, currentTime: Date = new Date()): string {
    const source = metadata?.rawMetadata || metadata;
    
    // Debug: Log what we're checking
    const openingHoursStr = source?.opening_hours;
    // logger.info(`🎯 getOpeningStatus: opening_hours=${openingHoursStr?.substring(0, 50) || 'not found'}, has_rawMetadata=${!!source === !!metadata.rawMetadata}`);
    
    // First check hourly format directly
    const hourlyStatus = this.checkHourlyFormat(source, currentTime);
    if (hourlyStatus !== null) {
      if (hourlyStatus) {
        const isClosingSoon = this.checkHourlyFormatClosingSoon(source, currentTime);
        if (isClosingSoon) {
          return 'Currently open (closing soon)';
        }
        return 'Currently open';
      } else {
        const nextOpen = this.getNextOpeningTimeFromHourly(source, currentTime);
        if (nextOpen) {
          return `Currently closed. Opens ${nextOpen}`;
        }
        return 'Currently closed';
      }
    }
    
    // Fallback to readable format
    const openingHours = this.parseOpeningHours(source);
    if (!openingHours) {
      return 'Opening hours not available';
    }
    
    const currentDay = currentTime.getDay();
    const schedule = this.getDaySchedule(openingHours, currentDay);
    
    if (schedule.isClosed) {
      return `Currently closed. ${this.getNextOpeningTime(source, currentTime) || 'Opening hours unknown'}`;
    }
    
    if (this.isCurrentlyOpen(source, currentTime)) {
      if (this.isClosingSoon(source, currentTime)) {
        return 'Open (closing soon)';
      }
      return 'Currently open';
    }
    
    if (this.isOpeningSoon(source, currentTime)) {
      return 'Opening soon';
    }
    
    const nextOpening = this.getNextOpeningTime(source, currentTime);
    if (nextOpening) {
      return `Closed. Opens ${nextOpening}`;
    }
    
    return 'Currently closed';
  }
  
  /**
   * Get next opening time from hourly format
   */
  private static getNextOpeningTimeFromHourly(metadata: any, currentTime: Date): string | null {
    const openingHoursStr = metadata?.opening_hours || metadata?.openingHours;
    if (!openingHoursStr || typeof openingHoursStr !== 'string') {
      return null;
    }
    
    if (!openingHoursStr.includes(':open') && !openingHoursStr.includes(':closed')) {
      return null;
    }
    
    const currentDay = currentTime.getDay();
    const currentHour = currentTime.getHours();
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const currentDayName = dayNames[currentDay];
    
    // Check next 24 hours
    for (let h = 1; h <= 24; h++) {
      const checkHour = (currentHour + h) % 24;
      const checkDay = Math.floor((currentHour + h) / 24);
      const dayAbbr = dayNames[(currentDay + checkDay) % 7];
      
      const pattern = `${dayAbbr}:${checkHour}:`;
      const match = openingHoursStr.match(new RegExp(`${pattern}(open|closed)`));
      
      if (match && match[1] === 'open') {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const day = dayNames[(currentDay + checkDay) % 7];
        const hour = this.formatHour(checkHour);
        return `${day} at ${hour}`;
      }
    }
    
    return null;
  }
}

