import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car, CalendarCheck, AlertTriangle, Wallet, TrendingUp, TrendingDown,
  PiggyBank, Users, ArrowRight, FileWarning, Clock,
} from 'lucide-react';
import Topbar from '../../components/layout/Topbar';
import StatCard from '../../components/common/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { PageLoader, EmptyState } from '../../components/ui/Feedback';
import { getDashboardOverview } from '../../api/dashboard';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { user } = useAuth();
  const isAdmin = !user?.role || user?.role === 'admin';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardOverview().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return null;

  const symbol = settings?.currency_symbol || '₹';
  const v = data.vehicle_status;
  const fin = data.finance_this_month;
  const showFinance = isAdmin && fin;

  return (
    <div>
      <Topbar title="Dashboard" subtitle="Overview of your rental operations" />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Alerts */}
        {(data.overdue_rentals > 0 || data.expiring_documents.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.overdue_rentals > 0 && (
              <div
                onClick={() => navigate('/rentals')}
                className="flex items-center gap-3 bg-danger-50 border border-danger-100 rounded-xl px-5 py-4 cursor-pointer hover:bg-danger-100/60 transition-colors"
              >
                <AlertTriangle className="w-5 h-5 text-danger-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-danger-700">{data.overdue_rentals} rental(s) overdue for return</p>
                  <p className="text-xs text-danger-500">Vehicles past their scheduled return time</p>
                </div>
                <ArrowRight className="w-4 h-4 text-danger-400" />
              </div>
            )}
            {data.expiring_documents.length > 0 && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-5 py-4">
                <FileWarning className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-700">{data.expiring_documents.length} document(s) expiring soon</p>
                  <p className="text-xs text-amber-600">
                    {data.expiring_documents.slice(0, 2).map((d) => `${d.vehicle} - ${d.document}`).join(', ')}
                    {data.expiring_documents.length > 2 && ` +${data.expiring_documents.length - 2} more`}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vehicle status row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Car} tone="success" label="Available Cars" value={v.available} sublabel={`of ${v.total} total fleet`} />
          <StatCard icon={CalendarCheck} tone="amber" label="Cars Out / Active Rentals" value={data.active_rentals} sublabel={`${v.rented} vehicles rented`} />
          <StatCard icon={AlertTriangle} tone="danger" label="Under Maintenance" value={v.maintenance} sublabel="Not available for rent" />
          <StatCard icon={CalendarCheck} tone="navy" label="Upcoming Bookings" value={data.booked_rentals} sublabel="Scheduled, not started" />
        </div>

        {/* Finance snapshot — admin only */}
        {showFinance && (
          <Card>
            <CardHeader
              icon={Wallet}
              title="This Month's Finance Snapshot"
              subtitle="Income, expense and savings overview"
              action={
                <button onClick={() => navigate('/finance')} className="text-sm font-medium text-navy-600 hover:text-navy-800 flex items-center gap-1">
                  View Finance Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </button>
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FinanceMiniStat
                icon={TrendingUp} tone="success" label="Total Income"
                value={formatCurrency(fin.income.total_income, symbol)}
              />
              <FinanceMiniStat
                icon={TrendingDown} tone="danger" label="Total Expense"
                value={formatCurrency(fin.expense.total_expense, symbol)}
              />
              <FinanceMiniStat
                icon={PiggyBank} tone="amber" label="Net Savings"
                value={formatCurrency(fin.savings, symbol)}
              />
              <FinanceMiniStat
                icon={Wallet} tone={fin.income.rental_to_be_collected < 0 ? 'danger' : 'navy'}
                label={fin.income.rental_to_be_collected < 0 ? 'Refunds Owed' : 'To Be Collected'}
                value={formatCurrency(Math.abs(fin.income.rental_to_be_collected), symbol)}
              />
            </div>
          </Card>
        )}

        {/* Upcoming bookings */}
        {data.upcoming_bookings?.length > 0 && (
          <Card>
            <CardHeader icon={Clock} title="Upcoming Reservations" subtitle="Future bookings — vehicle must be available at these times" />
            <div className="space-y-2">
              {data.upcoming_bookings.map((b) => (
                <div
                  key={b.id}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border ${
                    b.is_soon ? 'bg-amber-50/60 border-amber-100' : 'bg-white border-navy-100'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-navy-800 truncate">
                      {b['vehicle__registration_number']} · {b['vehicle__make']} {b['vehicle__model']}
                    </p>
                    <p className="text-xs text-navy-400 truncate">
                      {b['customer__full_name']} · {b.booked_days} {b.booked_days === 1 ? 'day' : 'days'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[7rem]">
                    {b.is_soon ? (
                      <Badge variant="partial" dot={false} className="text-[10px] px-2 py-0.5 leading-none">Due Soon</Badge>
                    ) : (
                      <span className="h-[18px]" aria-hidden="true" />
                    )}
                    <span className="text-sm font-medium text-navy-600 tabular-nums whitespace-nowrap">
                      {formatDateTime(b.scheduled_start)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader icon={Users} title="Team" subtitle="Active staff & owners" />
            <div className="space-y-3">
              <RowStat label="Active Staff Members" value={data.total_staff} />
              <RowStat label="Active Car Owners" value={data.total_owners} />
              <RowStat label="Total Fleet Size" value={v.total} />
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader icon={FileWarning} title="Documents Expiring Soon" subtitle="Within the next 30 days" />
            {data.expiring_documents.length === 0 ? (
              <EmptyState icon={FileWarning} title="All clear" description="No vehicle documents are expiring in the next 30 days." />
            ) : (
              <div className="space-y-2">
                {data.expiring_documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-amber-50/50 border border-amber-100">
                    <div>
                      <p className="text-sm font-medium text-navy-800">{doc.vehicle}</p>
                      <p className="text-xs text-navy-400">{doc.document}</p>
                    </div>
                    <Badge variant="pending" dot={false}>Expires {formatDate(doc.expires_on)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function FinanceMiniStat({ icon: Icon, tone, label, value }) {
  const tones = {
    success: 'text-success-600 bg-success-50',
    danger: 'text-danger-500 bg-danger-50',
    amber: 'text-amber-600 bg-amber-50',
    navy: 'text-navy-600 bg-navy-50',
  };
  return (
    <div className="flex items-center gap-3 px-1">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tones[tone]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-navy-400">{label}</p>
        <p className="text-base font-semibold text-navy-900 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function RowStat({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-navy-500">{label}</span>
      <span className="text-sm font-semibold text-navy-900 tabular-nums">{value}</span>
    </div>
  );
}
