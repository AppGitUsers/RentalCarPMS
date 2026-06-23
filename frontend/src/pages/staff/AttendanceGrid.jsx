import { useEffect, useState } from 'react';
import { Check, X, Clock, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import Card from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Feedback';
import * as staffApi from '../../api/staff';
import { useToast } from '../../components/ui/Toast';
import { toDateInputValue } from '../../utils/format';
import { cn } from '../../utils/cn';

const STATUS_OPTIONS = [
  { key: 'present',  label: 'Present',  icon: Check, tone: 'success' },
  { key: 'half_day', label: 'Half Day', icon: Clock, tone: 'amber' },
  { key: 'absent',   label: 'Absent',   icon: X,     tone: 'danger' },
  { key: 'leave',    label: 'Leave',    icon: X,     tone: 'navy' },
];

export default function AttendanceGrid({ staffList, onAttendanceChanged }) {
  const { showToast } = useToast();
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [shiftEdits, setShiftEdits] = useState({});

  const load = () => {
    setLoading(true);
    staffApi.getAttendanceByDate(date).then((data) => {
      const map = {};
      data.forEach((r) => { map[r.staff] = r; });
      setRecords(map);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [date]);

  const shiftDate = (deltaDays) => {
    const d = new Date(date);
    d.setDate(d.getDate() + deltaDays);
    setDate(toDateInputValue(d));
  };

  const handleMark = async (staff, status) => {
    setSavingId(staff.id);
    try {
      const existing = records[staff.id];
      const edits = shiftEdits[staff.id] || {};
      const shift = staff.default_shift_detail;

      // Auto-fill from shift template when marking present/half_day.
      const defaultIn = shift?.start_time ?? '09:00';
      const defaultOut = shift?.end_time ?? '17:00';

      const payload = {
        staff: staff.id,
        date,
        status,
        shift: staff.default_shift ?? null,
        shift_in:  edits.shift_in  ?? existing?.shift_in  ?? (status === 'present' || status === 'half_day' ? defaultIn  : null),
        shift_out: edits.shift_out ?? existing?.shift_out ?? (status === 'present' || status === 'half_day' ? defaultOut : null),
      };
      let updated;
      if (existing) {
        updated = await staffApi.updateAttendance(existing.id, payload);
      } else {
        updated = await staffApi.markAttendance(payload);
      }
      setRecords((r) => ({ ...r, [staff.id]: updated }));
      onAttendanceChanged?.();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not save attendance', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleShiftTimeChange = (staffId, field, value) => {
    setShiftEdits((prev) => ({ ...prev, [staffId]: { ...prev[staffId], [field]: value } }));
  };

  const handleShiftBlur = async (staffId) => {
    const existing = records[staffId];
    const edits = shiftEdits[staffId];
    if (!existing || !edits) return;
    try {
      const updated = await staffApi.updateAttendance(existing.id, {
        shift_in:  edits.shift_in  ?? existing.shift_in,
        shift_out: edits.shift_out ?? existing.shift_out,
      });
      setRecords((r) => ({ ...r, [staffId]: updated }));
      onAttendanceChanged?.();
    } catch {
      showToast('Could not update shift time', 'error');
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-navy-800">Daily Attendance Sheet</p>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDate(-1)} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="text-sm border border-navy-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy-300"
          />
          <button onClick={() => shiftDate(1)} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center"><Spinner /></div>
      ) : (
        <div className="space-y-2">
          {staffList.map((staff) => {
            const record = records[staff.id];
            const edits = shiftEdits[staff.id] || {};
            const shift = staff.default_shift_detail;
            const isPresent = record?.status === 'present' || record?.status === 'half_day';

            return (
              <div key={staff.id} className="flex items-center gap-3 px-3.5 py-3 rounded-lg border border-navy-100 flex-wrap">
                {/* Staff avatar + name */}
                <div className="flex items-center gap-2.5 min-w-[180px]">
                  {staff.photo ? (
                    <img src={staff.photo} className="w-8 h-8 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center text-xs font-semibold text-navy-500">
                      {staff.full_name[0]}
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-navy-800">{staff.full_name}</span>
                    {shift && (
                      <p className="text-[10px] text-navy-400 leading-tight">{shift.name} · {shift.start_time}–{shift.end_time}</p>
                    )}
                  </div>
                </div>

                {/* Status buttons */}
                <div className="flex gap-1.5">
                  {STATUS_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = record?.status === opt.key;
                    return (
                      <button
                        key={opt.key}
                        disabled={savingId === staff.id}
                        onClick={() => handleMark(staff, opt.key)}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                          active
                            ? opt.tone === 'success' ? 'bg-success-500 text-white border-success-500'
                              : opt.tone === 'amber'   ? 'bg-amber-500 text-white border-amber-500'
                              : opt.tone === 'danger'  ? 'bg-danger-500 text-white border-danger-500'
                              : 'bg-navy-500 text-white border-navy-500'
                            : 'bg-white text-navy-500 border-navy-200 hover:bg-navy-50'
                        )}
                      >
                        <Icon className="w-3 h-3" /> {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Time inputs + late/OT badges */}
                {isPresent && (
                  <div className="flex items-center gap-2 ml-auto flex-wrap">
                    <input
                      type="time"
                      value={edits.shift_in ?? record?.shift_in ?? ''}
                      onChange={(e) => handleShiftTimeChange(staff.id, 'shift_in', e.target.value)}
                      onBlur={() => handleShiftBlur(staff.id)}
                      className="text-xs border border-navy-200 rounded-lg px-2 py-1 w-24"
                    />
                    <span className="text-navy-300 text-xs">to</span>
                    <input
                      type="time"
                      value={edits.shift_out ?? record?.shift_out ?? ''}
                      onChange={(e) => handleShiftTimeChange(staff.id, 'shift_out', e.target.value)}
                      onBlur={() => handleShiftBlur(staff.id)}
                      className="text-xs border border-navy-200 rounded-lg px-2 py-1 w-24"
                    />
                    {record?.hours_worked != null && (
                      <span className="text-xs text-navy-400 tabular-nums">{Number(record.hours_worked).toFixed(1)}h</span>
                    )}
                    {record?.is_late && (
                      <span className="flex items-center gap-0.5 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5">
                        <AlertTriangle className="w-3 h-3" /> Late
                      </span>
                    )}
                    {Number(record?.overtime_hours) > 0 && (
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 tabular-nums">
                        OT {Number(record.overtime_hours).toFixed(1)}h
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
