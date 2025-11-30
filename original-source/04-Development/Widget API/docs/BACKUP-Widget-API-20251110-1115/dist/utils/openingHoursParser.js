"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpeningHoursParser = void 0;
class OpeningHoursParser {
    static parseOpeningHours(metadata) {
        if (!metadata)
            return null;
        const source = metadata.rawMetadata || metadata;
        const hours = {};
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
            if (!fieldName)
                continue;
            const value = source[fieldName];
            if (value && typeof value === 'string') {
                hours[dayNames[i]] = value;
            }
        }
        return Object.keys(hours).length > 0 ? hours : null;
    }
    static parseTimeString(timeStr) {
        if (!timeStr || typeof timeStr !== 'string')
            return null;
        const clean = timeStr.trim().toLowerCase();
        if (clean.includes('closed'))
            return null;
        if (clean.includes('24 hours') || clean.includes('open 24 hours'))
            return 0;
        const amMatch = clean.match(/(\d+)\s*(am|a\.m\.)/);
        const pmMatch = clean.match(/(\d+)\s*(pm|p\.m\.)/);
        const hourMatch = clean.match(/(\d+):(\d+)/);
        if (amMatch && amMatch[1]) {
            let hour = parseInt(amMatch[1], 10);
            if (hour === 12)
                hour = 0;
            return hour;
        }
        if (pmMatch && pmMatch[1]) {
            let hour = parseInt(pmMatch[1], 10);
            if (hour !== 12)
                hour += 12;
            return hour;
        }
        if (hourMatch && hourMatch[1]) {
            return parseInt(hourMatch[1], 10);
        }
        return null;
    }
    static parseHoursString(hoursStr) {
        if (!hoursStr) {
            return { isClosed: true, periods: [] };
        }
        const clean = hoursStr.trim();
        if (clean.toLowerCase().includes('closed')) {
            return { isClosed: true, periods: [] };
        }
        if (clean.toLowerCase().includes('24 hours') || clean.toLowerCase().includes('open 24 hours')) {
            return { isClosed: false, periods: [{ start: 0, end: 23 }] };
        }
        const periods = [];
        const periodStrings = clean.split(';');
        for (const periodStr of periodStrings) {
            const parts = periodStr.split('to');
            if (parts.length !== 2)
                continue;
            const startTime = parts[0]?.trim();
            const endTime = parts[1]?.trim();
            if (!startTime || !endTime)
                continue;
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
    static getDaySchedule(openingHours, dayIndex) {
        if (!openingHours) {
            return { isClosed: true, periods: [] };
        }
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayIndex];
        const hoursStr = openingHours[dayName];
        if (!hoursStr) {
            return { isClosed: true, periods: [] };
        }
        return this.parseHoursString(hoursStr);
    }
    static isCurrentlyOpen(metadata, currentTime = new Date()) {
        const hourlyStatus = this.checkHourlyFormat(metadata, currentTime);
        if (hourlyStatus !== null) {
            return hourlyStatus;
        }
        const openingHours = this.parseOpeningHours(metadata);
        if (!openingHours)
            return false;
        const currentDay = currentTime.getDay();
        const currentHour = currentTime.getHours();
        const schedule = this.getDaySchedule(openingHours, currentDay);
        if (schedule.isClosed)
            return false;
        if (schedule.periods.length === 0)
            return false;
        for (const period of schedule.periods) {
            if (currentHour >= period.start && currentHour < period.end) {
                return true;
            }
        }
        return false;
    }
    static checkHourlyFormat(metadata, currentTime) {
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
        const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        const currentDayName = dayNames[currentDay];
        const pattern = `${currentDayName}:${currentHour}:`;
        const regex = new RegExp(`${pattern}(open|closed)`);
        const match = openingHoursStr.match(regex);
        if (match && match[1]) {
            return match[1] === 'open';
        }
        return false;
    }
    static checkHourlyFormatOpeningSoon(metadata, currentTime) {
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
        const pattern = `${currentDayName}:${nextHour}:`;
        const regex = new RegExp(`${pattern}(open|closed)`);
        const match = openingHoursStr.match(regex);
        if (match && match[1]) {
            const currentPattern = `${currentDayName}:${currentHour}:`;
            const currentMatch = openingHoursStr.match(new RegExp(`${currentPattern}(open|closed)`));
            const currentlyOpen = currentMatch && currentMatch[1] === 'open';
            return !currentlyOpen && match[1] === 'open';
        }
        return false;
    }
    static isOpeningSoon(metadata, currentTime = new Date()) {
        const hourlyStatus = this.checkHourlyFormatOpeningSoon(metadata, currentTime);
        if (hourlyStatus !== null) {
            return hourlyStatus;
        }
        const openingHours = this.parseOpeningHours(metadata);
        if (!openingHours)
            return false;
        const currentDay = currentTime.getDay();
        const currentHour = currentTime.getHours();
        const schedule = this.getDaySchedule(openingHours, currentDay);
        if (schedule.isClosed || schedule.periods.length === 0)
            return false;
        for (const period of schedule.periods) {
            if (currentHour < period.start && currentHour >= period.start - 1) {
                return true;
            }
        }
        return false;
    }
    static checkHourlyFormatClosingSoon(metadata, currentTime) {
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
        const currentPattern = `${currentDayName}:${currentHour}:`;
        const nextPattern = `${currentDayName}:${nextHour}:`;
        const currentMatch = openingHoursStr.match(new RegExp(`${currentPattern}(open|closed)`));
        const nextMatch = openingHoursStr.match(new RegExp(`${nextPattern}(open|closed)`));
        const currentlyOpen = currentMatch && currentMatch[1] === 'open';
        const nextHourClosed = nextMatch && nextMatch[1] === 'closed';
        return currentlyOpen && nextHourClosed;
    }
    static isClosingSoon(metadata, currentTime = new Date()) {
        const hourlyStatus = this.checkHourlyFormatClosingSoon(metadata, currentTime);
        if (hourlyStatus !== null) {
            return hourlyStatus;
        }
        const openingHours = this.parseOpeningHours(metadata);
        if (!openingHours)
            return false;
        const currentDay = currentTime.getDay();
        const currentHour = currentTime.getHours();
        const schedule = this.getDaySchedule(openingHours, currentDay);
        if (schedule.isClosed || schedule.periods.length === 0)
            return false;
        for (const period of schedule.periods) {
            if (currentHour >= period.start && currentHour < period.end &&
                currentHour >= period.end - 1) {
                return true;
            }
        }
        return false;
    }
    static getNextOpeningTime(metadata, currentTime = new Date()) {
        const openingHours = this.parseOpeningHours(metadata);
        if (!openingHours)
            return null;
        const currentDay = currentTime.getDay();
        const currentHour = currentTime.getHours();
        const todaySchedule = this.getDaySchedule(openingHours, currentDay);
        if (!todaySchedule.isClosed && todaySchedule.periods.length > 0) {
            for (const period of todaySchedule.periods) {
                if (currentHour < period.start) {
                    return this.formatHour(period.start);
                }
            }
        }
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
    static formatHour(hour) {
        if (hour === 0)
            return '12 AM';
        if (hour < 12)
            return `${hour} AM`;
        if (hour === 12)
            return '12 PM';
        return `${hour - 12} PM`;
    }
    static getOpeningStatus(metadata, currentTime = new Date()) {
        const source = metadata?.rawMetadata || metadata;
        const openingHoursStr = source?.opening_hours;
        const hourlyStatus = this.checkHourlyFormat(source, currentTime);
        if (hourlyStatus !== null) {
            if (hourlyStatus) {
                const isClosingSoon = this.checkHourlyFormatClosingSoon(source, currentTime);
                if (isClosingSoon) {
                    return 'Currently open (closing soon)';
                }
                return 'Currently open';
            }
            else {
                const nextOpen = this.getNextOpeningTimeFromHourly(source, currentTime);
                if (nextOpen) {
                    return `Currently closed. Opens ${nextOpen}`;
                }
                return 'Currently closed';
            }
        }
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
    static getNextOpeningTimeFromHourly(metadata, currentTime) {
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
exports.OpeningHoursParser = OpeningHoursParser;
//# sourceMappingURL=openingHoursParser.js.map