import { useEffect, useState, useCallback } from 'react';
import { Plus, Users, Phone } from 'lucide-react';
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
import AttendanceGrid from './AttendanceGrid';
import PayrollTable from './PayrollTable';

export default function StaffPage() {
  const { settings } = useSettings();
  const symbol = settings?.currency_symbol || '₹';

  const [tab, setTab] = useState('members');
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    staffApi.listStaff({ is_active: true })
      .then((data) => setStaffList(data.results || data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalMonthlyPayroll = staffList.reduce((sum, s) => sum + Number(s.monthly_salary), 0);

  return (
    <div>
      <Topbar
        title="Staff"
        subtitle="Team members, attendance and payroll"
        actions={<Button icon={Plus} onClick={() => { setEditingStaff(null); setFormOpen(true); }}>Add Staff</Button>}
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={Users} tone="navy" label="Active Staff" value={staffList.length} />
          <StatCard icon={Users} tone="amber" label="Total Monthly Payroll (Base)" value={formatCurrency(totalMonthlyPayroll, symbol)} />
        </div>

        <div className="flex gap-1 border-b border-navy-100">
          {[
            { key: 'members', label: 'Team Members' },
            { key: 'attendance', label: 'Attendance & Shifts' },
            { key: 'payroll', label: 'Payroll' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-amber-500 text-navy-900' : 'border-transparent text-navy-400 hover:text-navy-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'members' && (
          loading ? (
            <PageLoader />
          ) : staffList.length === 0 ? (
            <EmptyState icon={Users} title="No staff members yet" description="Add your team to start tracking attendance and payroll." action={<Button icon={Plus} onClick={() => setFormOpen(true)}>Add Staff</Button>} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffList.map((s) => (
                <Card key={s.id} hover onClick={() => { setEditingStaff(s); setFormOpen(true); }}>
                  <div className="flex items-center gap-3 mb-3">
                    {s.photo ? (
                      <img src={s.photo} className="w-12 h-12 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-navy-100 flex items-center justify-center text-base font-semibold text-navy-500">
                        {s.full_name[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-navy-900">{s.full_name}</p>
                      <Badge variant="neutral" className="capitalize mt-0.5">{s.role.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-navy-500">
                    <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-navy-300" /> {s.phone}</div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-navy-100">
                    <span className="text-xs text-navy-400">Monthly Salary</span>
                    <span className="text-sm font-semibold text-navy-900 tabular-nums">{formatCurrency(s.monthly_salary, symbol)}</span>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}

        {tab === 'attendance' && !loading && <AttendanceGrid staffList={staffList} />}

        {tab === 'payroll' && !loading && <PayrollTable />}
      </div>

      <StaffFormModal open={formOpen} onClose={() => setFormOpen(false)} staff={editingStaff} onSaved={load} />
    </div>
  );
}
