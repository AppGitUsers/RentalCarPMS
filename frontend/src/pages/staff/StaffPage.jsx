import { useEffect, useState, useCallback } from 'react';
import { Plus, Users, Phone, Pencil, CalendarDays } from 'lucide-react';
import Topbar from '../../components/layout/Topbar';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { PageLoader, EmptyState } from '../../components/ui/Feedback';
import StatCard from '../../components/common/StatCard';
import * as staffApi from '../../api/staff';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency } from '../../utils/format';
import StaffFormModal from './StaffFormModal';
import StaffCalendarModal from './StaffCalendarModal';

export default function StaffPage() {
  const { settings } = useSettings();
  const symbol = settings?.currency_symbol || '₹';

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [calendarStaff, setCalendarStaff] = useState(null);

  const loadStaff = useCallback(() => {
    setLoading(true);
    staffApi.listStaff(showInactive ? {} : { is_active: true })
      .then((data) => setStaffList(data.results || data))
      .finally(() => setLoading(false));
  }, [showInactive]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const activeStaff = staffList.filter((s) => s.is_active);
  const totalMonthlyPayroll = activeStaff.reduce((sum, s) => sum + Number(s.monthly_salary), 0);

  return (
    <div>
      <Topbar
        title="Staff"
        subtitle="Team members, attendance and payroll"
        actions={
          <Button icon={Plus} onClick={() => { setEditingStaff(null); setFormOpen(true); }}>
            Add Staff
          </Button>
        }
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={Users} tone="navy" label="Active Staff" value={activeStaff.length} />
          <StatCard icon={Users} tone="amber" label="Monthly Payroll (Base)" value={formatCurrency(totalMonthlyPayroll, symbol)} />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-navy-700">Team Members</h2>
          <label className="flex items-center gap-2 text-xs text-navy-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Show inactive
          </label>
        </div>

        {loading ? (
          <PageLoader />
        ) : staffList.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No staff members yet"
            description="Add your team to start tracking attendance and payroll."
            action={<Button icon={Plus} onClick={() => setFormOpen(true)}>Add Staff</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffList.map((s) => (
              <Card key={s.id} className={!s.is_active ? 'opacity-60' : ''}>
                <div className="flex items-center gap-3 mb-3">
                  {s.photo ? (
                    <img src={s.photo} className="w-12 h-12 rounded-full object-cover flex-shrink-0" alt="" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-navy-100 flex items-center justify-center text-base font-semibold text-navy-500 flex-shrink-0">
                      {s.full_name[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-900 truncate">{s.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="neutral" className="capitalize">
                        {s.role.replace('_', ' ')}
                      </Badge>
                      {!s.is_active && <Badge variant="inactive">Inactive</Badge>}
                    </div>
                  </div>
                  <button
                    onClick={() => setCalendarStaff(s)}
                    title="Attendance & payroll"
                    className="p-1.5 text-navy-400 hover:text-navy-700 hover:bg-navy-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <CalendarDays className="w-4 h-4" />
                  </button>
                </div>

                {s.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-navy-500 mb-2">
                    <Phone className="w-3.5 h-3.5 text-navy-300" />
                    {s.phone}
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 pt-3 border-t border-navy-100">
                  <div>
                    <p className="text-[10px] text-navy-400 uppercase tracking-wide">Monthly Salary</p>
                    <p className="text-sm font-semibold text-navy-900 tabular-nums">
                      {formatCurrency(s.monthly_salary, symbol)}
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditingStaff(s); setFormOpen(true); }}
                    className="p-1.5 text-navy-400 hover:text-navy-700 hover:bg-navy-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <StaffFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        staff={editingStaff}
        onSaved={loadStaff}
      />
      {calendarStaff && (
        <StaffCalendarModal
          staff={calendarStaff}
          onClose={() => setCalendarStaff(null)}
          onPaymentRecorded={loadStaff}
        />
      )}
    </div>
  );
}
