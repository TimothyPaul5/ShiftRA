"use client";

import { buildMonthGrid, getMonthLabel } from "@/lib/core/calendar";

type CalendarShift = {
  id?: number;
  assignment_date: string;
  role: "Primary" | "Secondary";
  assigned_ra_name?: string | null;
  hall_name?: string;
  isMine?: boolean;
  colorClassName?: string;
};

type Props = {
  year: number;
  month: number;
  shifts: CalendarShift[];
  onDayClick?: (date: string) => void;
  onShiftClick?: (shiftId?: number) => void;
  selectedShiftId?: number | null;
  selectedMyShiftId?: number | null;
  selectedTargetShiftId?: number | null;
};

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ScheduleMonthCalendar({
  year,
  month,
  shifts,
  onDayClick,
  onShiftClick,
  selectedMyShiftId,
  selectedTargetShiftId,
  selectedShiftId,
}: Props) {
  const days = buildMonthGrid(year, month);

  function getShiftsForDate(date: string) {
    return shifts.filter((shift) => shift.assignment_date === date);
  }

  function getShiftClasses(shift: CalendarShift) {
    const isMySelected = selectedMyShiftId === shift.id;
    const isTargetSelected = selectedTargetShiftId === shift.id;
    const isGenericSelected = selectedShiftId === shift.id;

    if (isMySelected) {
      return "border-blue-700 bg-blue-100 ring-2 ring-blue-500 text-slate-900";
    }

    if (isTargetSelected) {
      return "border-amber-600 bg-amber-100 ring-2 ring-amber-500 text-slate-900";
    }

    if (isGenericSelected) {
      return "ring-2 ring-blue-900 text-slate-900";
    }

    if (shift.isMine) {
      return "border-yellow-400 bg-yellow-50 ring-1 ring-yellow-300 text-slate-900";
    }

    return shift.colorClassName || "border-slate-200 bg-white text-slate-900";
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">{getMonthLabel(year, month)}</h2>
        <div className="h-1 w-20 rounded-full bg-yellow-400" />
      </div>

      <div className="mb-3 grid grid-cols-7 gap-2">
        {WEEKDAY_HEADERS.map((label) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-slate-100 px-2 py-3 text-center text-sm font-semibold text-slate-700"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayShifts = getShiftsForDate(day.date);

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onDayClick?.(day.date)}
              className={`min-h-[170px] rounded-2xl border p-3 text-left align-top transition ${
                day.inCurrentMonth
                  ? "border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-white"
                  : "border-slate-200 bg-slate-100 opacity-70"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-lg bg-blue-950 px-2.5 py-1 text-xs font-bold text-white">
                  {day.dayNumber}
                </span>
              </div>

              <div className="space-y-2">
                {dayShifts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-2 py-3 text-center text-xs text-slate-400">
                    No shifts
                  </div>
                ) : (
                  dayShifts.map((shift, index) => (
                    <div
                      key={`${day.date}-${shift.role}-${index}-${shift.id ?? "x"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onShiftClick?.(shift.id);
                      }}
                      className={`cursor-pointer rounded-xl border px-3 py-2 text-xs shadow-sm transition hover:shadow ${getShiftClasses(
                        shift
                      )}`}
                    >
                      <div className="font-bold">{shift.role}</div>
                      <div className="mt-1">{shift.assigned_ra_name || "Unassigned"}</div>
                      {shift.hall_name ? (
                        <div className="mt-1 text-[11px] opacity-80">{shift.hall_name}</div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}