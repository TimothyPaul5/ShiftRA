export type CalendarDay = {
  date: string;
  dayNumber: number;
  inCurrentMonth: boolean;
};

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function buildMonthGrid(year: number, month: number): CalendarDay[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);

  const firstGridDate = new Date(firstOfMonth);
  const firstJsDay = firstGridDate.getDay(); // 0=Sun
  firstGridDate.setDate(firstGridDate.getDate() - firstJsDay);

  const lastGridDate = new Date(lastOfMonth);
  const lastJsDay = lastGridDate.getDay();
  lastGridDate.setDate(lastGridDate.getDate() + (6 - lastJsDay));

  const days: CalendarDay[] = [];
  const current = new Date(firstGridDate);

  while (current <= lastGridDate) {
    days.push({
      date: toISODate(current),
      dayNumber: current.getDate(),
      inCurrentMonth: current.getMonth() === month - 1,
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
}

export function getPreviousMonth(year: number, month: number) {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }

  return { year, month: month - 1 };
}

export function getNextMonth(year: number, month: number) {
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }

  return { year, month: month + 1 };
}