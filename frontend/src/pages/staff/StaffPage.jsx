import { useEffect, useState, useCallback } from 'react';
import { Plus, Users, Phone, Clock, Pencil, Trash2, CalendarDays } from 'lucide-react';
import Topbar from '../../components/layout/Topbar';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { PageLoader, EmptyState } from '../../components/ui/Feedback';
import StatCard from '../../components/common/StatCard';
import * as staffApi from '../../api/staff';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils/format';
import StaffFormModal from './StaffFormModal';
import ShiftFormModal from './ShiftFormModal';
import AttendanceGrid from './AttendanceGrid';
import StaffCalendarModal from './StaffCalendarModal';
import PayrollTable from './PayrollTable';

export default function StaffPage() {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const symbol = settings?.currency_symbol || '₹';

  const [tab, setTab] = useState('members');
  const [staffList, setStaffList] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [staffFormOpen, setStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const [shiftFormOpen, setShiftFormOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);

  const [calendarStaff, setCalendarStaff] = useState(null);

  const loadStaff = useCallback(() => {
    setLoading(true);
    staffApi.listStaff({ is_active: true })
      .then((data) => setStaffList(data.results || data))
      .finally(() => setLoading(false));
  }, []);

  const loadShifts = useCallback(() => {
    staffApi.listShifts().then((data) => setShifts(data.results || data));
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);
  useEffect(() => { loadShifts(); }, [loadShifts]);

  const totalMonthlyPayroll = staffList.reduce((sum, s) => sum + Number(s.monthly_salary), 0);

  const handleDeleteShift = async (shift) => {
    if (!window.confirm(`Delete shift "${shift.name}"? Staff assigned to it will have no default shift.`)) return;
    try {
      await staffApi.deleteShift(shift.id);
      showToast('Shift deleted');
      loadShifts();
    } catch {
      showToast('Could not delete shift', 'error');
    }
  };

  const TABS = [
    { key: 'members',    label: 'Team Members' },
    { key: 'attendance', label: 'Daily Attendance' },
    { key: 'shifts',     label: 'Shifts' },
    { key: 'payroll',    label: 'Payroll' },
  ];

  return (
    <div>
      <Topbar
        title="Staff"
        subtitle="Team members, shifts, attendance and payroll"
        actions={
          tab === 'members' ? (
            <Button icon={Plus} onClick={() => { setEditingStaff(null); setStaffFormOpen(true); }}>Add Staff</Button>
          ) : tab === 'shifts' ? (
            <Button icon={Plus} onClick={() => { setEditingShift(null); setShiftFormOpen(true); }}>Add Shift</Button>
          ) : null
        }
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={Users} tone="navy" label="Active Staff" value={staffList.length} />
          <StatCard icon={Users} tone="amber" label="Total Monthly Payroll (Base)" value={formatCurrency(totalMonthlyPayroll, symbol)} />
        </div>

        <div className="flex gap-1 border-b border-navy-100 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key ? 'border-amber-500 text-navy-900' : 'border-transparent text-navy-400 hover:text-navy-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Team Members ── */}
        {tab === 'members' && (
          loading ? <PageLoader /> : staffList.length === 0 ? (
            <EmptyState icon={Users} title="No staff members yet" description="Add your team to start tracking attendance and payroll."
              action={<Button icon={Plus} onClick={() => setStaffFormOpen(true)}>Add Staff</Button>} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffList.map((s) => (
                <Card key={s.id}>
                  <div className="flex items-center gap-3 mb-3">
                    {s.photo ? (
                      <img src={s.photo} className="w-12 h-12 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-navy-100 flex items-center justify-center text-base font-semibold text-navy-500">
                        {s.full_name[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy-900">{s.full_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="neutral" className="capitalize">{s.role.replace('_', ' ')}</Badge>
                        <span title="Enter this number at the kiosk" className="text-[10px] font-mono text-navy-500 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                          Kiosk ID: {s.id}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCalendarStaff(s); }}
                      title="View calendar"
                      className="p-1.5 text-navy-400 hover:text-navy-700 hover:bg-navy-100 rounded-lg transition-colors flex-shrink-0"
                    >
                      <CalendarDays className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1 text-xs text-navy-500">
                    <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-navy-300" /> {s.phone}</div>
                    {s.default_shift_detail && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-navy-300" />
                        {s.default_shift_detail.name} · {s.default_shift_detail.start_time}–{s.default_shift_detail.end_time}
                        {s.default_shift_detail.working_days_display && (
                          <span className="text-navy-300">· {s.default_shift_detail.working_days_display}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-navy-100">
                    <span className="text-xs text-navy-400">Monthly Salary</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-navy-900 tabular-nums">{formatCurrency(s.monthly_salary, symbol)}</span>
                      <button
                        onClick={() => { setEditingStaff(s); setStaffFormOpen(true); }}
                        className="p-1 text-navy-400 hover:text-navy-700 hover:bg-navy-100 rounded transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}

        {/* ── Daily Attendance ── */}
        {tab === 'attendance' && !loading && (
          <AttendanceGrid staffList={staffList} />
        )}

        {/* ── Shifts ── */}
        {tab === 'shifts' && (
          <div className="space-y-3">
            {shifts.length === 0 ? (
              <EmptyState icon={Clock} title="No shifts defined" description="Create shift templates to assign to staff members and auto-fill attendance times."
                action={<Button icon={Plus} onClick={() => setShiftFormOpen(true)}>Add Shift</Button>} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {shifts.map((shift) => (
                  <Card key={shift.id}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-navy-900">{shift.name}</p>
                        <p className="text-xs text-navy-400 mt-0.5">{shift.start_time} – {shift.end_time}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditingShift(shift); setShiftFormOpen(true); }}
                          className="p-1.5 text-navy-400 hover:text-navy-700 rounded-lg hover:bg-navy-50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteShift(shift)}
                          className="p-1.5 text-navy-400 hover:text-danger-600 rounded-lg hover:bg-danger-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {shift.working_days_display && (
                      <p className="text-[11px] text-navy-400 mb-2">{shift.working_days_display}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-navy-50 rounded-lg px-2.5 py-1.5">
                        <p className="text-navy-400">Duration</p>
                        <p className="font-semibold text-navy-800 mt-0.5">{shift.shift_hours}h</p>
                      </div>
                      <div className="bg-navy-50 rounded-lg px-2.5 py-1.5">
                        <p className="text-navy-400">Late grace</p>
                        <p className="font-semibold text-navy-800 mt-0.5">{shift.late_grace_minutes} min</p>
                      </div>
                      <div className="bg-navy-50 rounded-lg px-2.5 py-1.5">
                        <p className="text-navy-400">OT grace</p>
                        <p className="font-semibold text-navy-800 mt-0.5">{shift.ot_grace_minutes} min</p>
                      </div>
                      <div className="bg-navy-50 rounded-lg px-2.5 py-1.5">
                        <p className="text-navy-400">Staff assigned</p>
                        <p className="font-semibold text-navy-800 mt-0.5">
                          {staffList.filter((s) => s.default_shift === shift.id).length}
                        </p>
                      </div>
                    </div>
                    {!shift.is_active && (
                      <div className="mt-2">
                        <Badge variant="inactive">Inactive</Badge>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Payroll ── */}
        {tab === 'payroll' && !loading && <PayrollTable />}
      </div>

      <StaffFormModal
        open={staffFormOpen}
        onClose={() => setStaffFormOpen(false)}
        staff={editingStaff}
        shifts={shifts}
        onSaved={loadStaff}
      />
      <ShiftFormModal
        open={shiftFormOpen}
        onClose={() => setShiftFormOpen(false)}
        shift={editingShift}
        onSaved={() => { loadShifts(); loadStaff(); }}
      />
      <StaffCalendarModal
        open={!!calendarStaff}
        onClose={() => setCalendarStaff(null)}
        staffMember={calendarStaff}
      />
    </div>
  );
}
