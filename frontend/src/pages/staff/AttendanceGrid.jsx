import { useEffect, useState } from 'react';
import { Check, X, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Feedback';
import * as staffApi from '../../api/staff';
import { useToast } from '../../components/ui/Toast';
import { toDateInputValue } from '../../utils/format';
import { cn } from '../../utils/cn';

const STATUS_OPTIONS = [
  { key: 'present', label: 'Present', icon: Check, tone: 'success' },
  { key: 'half_day', label: 'Half Day', icon: Clock, tone: 'amber' },
  { key: 'absent', label: 'Absent', icon: X, tone: 'danger' },
  { key: 'leave', label: 'Leave', icon: X, tone: 'navy' },
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

  const handleMark = async (staffId, status) => {
    setSavingId(staffId);
    try {
      const existing = records[staffId];
      const edits = shiftEdits[staffId] || {};
      const payload = {
        staff: staffId, date, status,
        shift_in: edits.shift_in ?? existing?.shift_in ?? (status === 'present' || status === 'half_day' ? '09:00' : null),
        shift_out: edits.shift_out ?? existing?.shift_out ?? (status === 'present' || status === 'half_day' ? '17:00' : null),
      };
      if (existing) {
        const updated = await staffApi.updateAttendance(existing.id, payload);
        setRecords((r) => ({ ...r, [staffId]: updated }));
      } else {
        const created = await staffApi.markAttendance(payload);
        setRecords((r) => ({ ...r, [staffId]: created }));
      }
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
        shift_in: edits.shift_in ?? existing.shift_in,
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
        <p className="text-sm font-semibold text-navy-800">Daily Attendance</p>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDate(-1)} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400"><ChevronLeft className="w-4 h-4" /></button>
          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="text-sm border border-navy-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy-300"
          />
          <button onClick={() => shiftDate(1)} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center"><Spinner /></div>
      ) : (
        <div className="space-y-2">
          {staffList.map((staff) => {
            const record = records[staff.id];
            const edits = shiftEdits[staff.id] || {};
            return (
              <div key={staff.id} className="flex items-center gap-3 px-3.5 py-3 rounded-lg border border-navy-100 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-[160px]">
                  {staff.photo ? (
                    <img src={staff.photo} className="w-8 h-8 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center text-xs font-semibold text-navy-500">
                      {staff.full_name[0]}
                    </div>
                  )}
                  <span className="text-sm font-medium text-navy-800 truncate">{staff.full_name}</span>
                </div>

                <div className="flex gap-1.5">
                  {STATUS_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = record?.status === opt.key;
                    return (
                      <button
                        key={opt.key}
                        disabled={savingId === staff.id}
                        onClick={() => handleMark(staff.id, opt.key)}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                          active
                            ? (opt.tone === 'success' ? 'bg-success-500 text-white border-success-500'
                              : opt.tone === 'amber' ? 'bg-amber-500 text-white border-amber-500'
                              : opt.tone === 'danger' ? 'bg-danger-500 text-white border-danger-500'
                              : 'bg-navy-500 text-white border-navy-500')
                            : 'bg-white text-navy-500 border-navy-200 hover:bg-navy-50'
                        )}
                      >
                        <Icon className="w-3 h-3" /> {opt.label}
                      </button>
                    );
                  })}
                </div>

                {record && (record.status === 'present' || record.status === 'half_day') && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <input
                      type="time"
                      value={edits.shift_in ?? record.shift_in ?? ''}
                      onChange={(e) => handleShiftTimeChange(staff.id, 'shift_in', e.target.value)}
                      onBlur={() => handleShiftBlur(staff.id)}
                      className="text-xs border border-navy-200 rounded-lg px-2 py-1 w-24"
                    />
                    <span className="text-navy-300 text-xs">to</span>
                    <input
                      type="time"
                      value={edits.shift_out ?? record.shift_out ?? ''}
                      onChange={(e) => handleShiftTimeChange(staff.id, 'shift_out', e.target.value)}
                      onBlur={() => handleShiftBlur(staff.id)}
                      className="text-xs border border-navy-200 rounded-lg px-2 py-1 w-24"
                    />
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
