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
    start: number;
    end: number;
}
interface DaySchedule {
    isClosed: boolean;
    periods: TimePeriod[];
}
export declare class OpeningHoursParser {
    static parseOpeningHours(metadata: any): OpeningHours | null;
    static parseTimeString(timeStr: string): number | null;
    static parseHoursString(hoursStr: string): DaySchedule;
    static getDaySchedule(openingHours: OpeningHours | null, dayIndex: number): DaySchedule;
    static isCurrentlyOpen(metadata: any, currentTime?: Date): boolean;
    private static checkHourlyFormat;
    private static checkHourlyFormatOpeningSoon;
    static isOpeningSoon(metadata: any, currentTime?: Date): boolean;
    private static checkHourlyFormatClosingSoon;
    static isClosingSoon(metadata: any, currentTime?: Date): boolean;
    static getNextOpeningTime(metadata: any, currentTime?: Date): string | null;
    private static formatHour;
    static getOpeningStatus(metadata: any, currentTime?: Date): string;
    private static getNextOpeningTimeFromHourly;
}
export {};
//# sourceMappingURL=openingHoursParser.d.ts.map