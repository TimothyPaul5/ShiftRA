export function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDatesInRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current <= end) {
    dates.push(toISODate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// 1 = Monday ... 7 = Sunday
export function getWeekdayNumber(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  const jsDay = date.getDay(); // 0=Sun ... 6=Sat
  return jsDay === 0 ? 7 : jsDay;
}

export function getWeekdayName(dayNumber: number) {
  const map: Record<number, string> = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday",
  };

  return map[dayNumber] || "Unknown";
}

// Friday and Saturday are weekends for your app
export function isWeekendDay(dayNumber: number) {
  return dayNumber === 5 || dayNumber === 6;
}