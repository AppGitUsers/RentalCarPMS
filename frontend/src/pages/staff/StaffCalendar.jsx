import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import { Spinner } from '../../components/ui/Feedback';
import * as staffApi from '../../api/staff';
import { MONTH_NAMES } from '../../utils/format';
import { cn } from '../../utils/cn';

const STATUS_META = {
  present:  { label: 'Present',  bg: 'bg-success-100', text: 'text-success-700', dot: 'bg-success-500' },
  half_day: { label: 'Half Day', bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  absent:   { label: 'Absent',   bg: 'bg-danger-100',  text: 'text-danger-700',  dot: 'bg-danger-500' },
  leave:    { label: 'Leave',    bg: 'bg-navy-100',    text: 'text-navy-500',    dot: 'bg-navy-400' },
};

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function StaffCalendar({ staffMember }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!staffMember?.id) return;
    setLoading(true);
    staffApi.getAttendanceByStaffMonth(staffMember.id, month, year)
      .then((data) => {
        const map = {};
        data.forEach((r) => { map[r.date] = r; });
        setRecords(map);
      })
      .finally(() => setLoading(false));
  }, [staffMember?.id, month, year]);

  const shiftMonth = (delta) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    setMonth(m);
    setYear(y);
  };

  // Which weekday indices (0=Mon…6=Sun) are working days for this staff's shift
  const workingIndices = staffMember?.default_shift_detail
    ? (() => {
        const s = staffMember.default_shift_detail;
        const flags = [s.work_mon, s.work_tue, s.work_wed, s.work_thu, s.work_fri, s.work_sat, s.work_sun];
        return new Set(flags.map((v, i) => (v ? i : -1)).filter((i) => i >= 0));
      })()
    : null;

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-based
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (day) => `${year}-${pad(month)}-${pad(day)}`;

  // Summary
  const presentDays = Object.values(records).filter((r) => r.status === 'present').length;
  const halfDays    = Object.values(records).filter((r) => r.status === 'half_day').length;
  const absentDays  = Object.values(records).filter((r) => r.status === 'absent').length;
  const lateDays    = Object.values(records).filter((r) => r.is_late).length;
  const totalOT     = Object.values(records).reduce((s, r) => s + Number(r.overtime_hours || 0), 0);
  const totalHours  = Object.values(records).reduce((s, r) => s + Number(r.hours_worked || 0), 0);

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-navy-800">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Shift info banner */}
      {staffMember?.default_shift_detail && (
        <div className="flex items-center gap-2 text-xs text-navy-500 bg-navy-50 border border-navy-100 rounded-lg px-3 py-2">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            <strong>{staffMember.default_shift_detail.name}</strong>{' '}
            {staffMember.default_shift_detail.start_time}–{staffMember.default_shift_detail.end_time}
            {staffMember.default_shift_detail.working_days_display
              ? ` · ${staffMember.default_shift_detail.working_days_display}`
              : ''}
          </span>
        </div>
      )}

      {/* Summary row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: 'Total Hours', value: totalHours.toFixed(1) + 'h', color: 'text-navy-800' },
          { label: 'Present',     value: presentDays,                  color: 'text-success-600' },
          { label: 'Half Days',   value: halfDays,                     color: 'text-amber-600' },
          { label: 'Absent',      value: absentDays,                   color: 'text-danger-600' },
          { label: 'Late',        value: lateDays,                     color: 'text-orange-600' },
          { label: 'OT Hours',    value: totalOT.toFixed(1) + 'h',    color: 'text-blue-600' },
        ].map((item) => (
          <div key={item.label} className="bg-white border border-navy-100 rounded-lg px-3 py-2 text-center">
            <p className={`text-base font-bold tabular-nums ${item.color}`}>{item.value}</p>
            <p className="text-xs text-navy-400 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Spinner /></div>
      ) : (
        <div className="bg-white border border-navy-100 rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-navy-100">
            {DAY_HEADERS.map((d, i) => (
              <div
                key={d}
                className={cn(
                  'py-2 text-center text-xs font-semibold uppercase tracking-wide',
                  workingIndices && !workingIndices.has(i) ? 'text-navy-200' : 'text-navy-400'
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }).map((_, idx) => {
              const dayNum = idx - startOffset + 1;
              const isValid = dayNum >= 1 && dayNum <= daysInMonth;
              const key = isValid ? dateKey(dayNum) : null;
              const record = key ? records[key] : null;
              const meta = record ? STATUS_META[record.status] : null;
              const today = new Date();
              const isToday = isValid && dayNum === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();
              // Column index 0=Mon…6=Sun
              const colIdx = idx % 7;
              const isNonWorkingDay = workingIndices && isValid && !workingIndices.has(colIdx);

              return (
                <div
                  key={idx}
                  className={cn(
                    'min-h-[72px] border-b border-r border-navy-50 p-1.5 last:border-r-0',
                    !isValid && 'bg-navy-50/30',
                    isNonWorkingDay && 'bg-navy-50/60',
                  )}
                >
                  {isValid && (
                    <>
                      <p className={cn(
                        'text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                        isToday ? 'bg-amber-500 text-white' : isNonWorkingDay ? 'text-navy-300' : 'text-navy-600',
                      )}>
                        {dayNum}
                      </p>
                      {meta ? (
                        <div className={cn('rounded-md px-1.5 py-1 text-xs', meta.bg)}>
                          <div className="flex items-center gap-1">
                            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', meta.dot)} />
                            <span className={cn('font-medium truncate', meta.text)}>{meta.label}</span>
                          </div>
                          {/* Times and hours worked */}
                          {record.shift_in && (
                            <div className="text-[10px] text-navy-500 mt-0.5 tabular-nums leading-tight">
                              {record.shift_in}–{record.shift_out ?? '?'}
                            </div>
                          )}
                          {record.hours_worked != null && (
                            <div className="text-[10px] font-semibold text-navy-600 tabular-nums">
                              {Number(record.hours_worked).toFixed(1)}h
                            </div>
                          )}
                          {record.is_late && (
                            <div className="flex items-center gap-0.5 mt-0.5 text-orange-600">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span className="text-[10px]">Late</span>
                            </div>
                          )}
                          {Number(record.overtime_hours) > 0 && (
                            <div className="text-[10px] text-blue-600">
                              OT {Number(record.overtime_hours).toFixed(1)}h
                            </div>
                          )}
                        </div>
                      ) : (
                        isNonWorkingDay
                          ? <div className="text-[10px] text-navy-300 px-1">Off</div>
                          : <div className="text-[10px] text-navy-300 px-1">—</div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-navy-500">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={cn('w-2.5 h-2.5 rounded-full', meta.dot)} />
            {meta.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-2.5 h-2.5 text-orange-500" /> Late
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-blue-600 font-semibold">OT</span> Overtime
        </div>
        {workingIndices && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-navy-100" /> Off day
          </div>
        )}
      </div>
    </div>
  );
}
