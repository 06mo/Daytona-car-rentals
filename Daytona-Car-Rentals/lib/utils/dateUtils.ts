type DateRange = {
  startDate: Date;
  endDate: Date;
};

const millisecondsPerDay = 1000 * 60 * 60 * 24;

export function getDateRangeInDays(startDate: Date, endDate: Date) {
  return Math.ceil((endDate.getTime() - startDate.getTime()) / millisecondsPerDay);
}

export function checkVehicleAvailability(existingRange: DateRange, requestedRange: DateRange) {
  return requestedRange.startDate < existingRange.endDate && requestedRange.endDate > existingRange.startDate;
}
