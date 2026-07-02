import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Download, TrendingUp, TrendingDown, PiggyBank, Wallet, ChevronLeft, ChevronRight, Receipt,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Topbar from '../../components/layout/Topbar';
import Button from '../../components/ui/Button';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { PageLoader, EmptyState } from '../../components/ui/Feedback';
import StatCard from '../../components/common/StatCard';
import * as financeApi from '../../api/finance';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency, MONTH_NAMES, formatDate } from '../../utils/format';
import FinanceEntryModal from './FinanceEntryModal';

export default function FinancePage() {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const symbol = settings?.currency_symbol || '₹';

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [exportingRange, setExportingRange] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      financeApi.getFinanceSummary(month, year),
      financeApi.getFinanceTrend(year),
      financeApi.listFinanceEntries({ ordering: '-date' }),
    ]).then(([s, t, e]) => {
      setSummary(s);
      setTrend(t);
      setEntries((e.results || e).slice(0, 8));
    }).finally(() => setLoading(false));
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const shiftMonth = (delta) => {
    let m = month + delta, y = year;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    setMonth(m); setYear(y);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await financeApi.downloadFinanceExcel(month, year);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Finance_Report_${month}_${year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('Could not export report', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportRange = async () => {
    if (!rangeFrom || !rangeTo) { showToast('Please select both From and To dates', 'error'); return; }
    if (rangeFrom > rangeTo) { showToast('From date must be before To date', 'error'); return; }
    setExportingRange(true);
    try {
      const blob = await financeApi.downloadFinanceExcelRange(rangeFrom, rangeTo);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Finance_Report_${rangeFrom}_to_${rangeTo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('Could not export range report', 'error');
    } finally {
      setExportingRange(false);
    }
  };

  const chartData = trend.map((t) => ({
    name: MONTH_NAMES[t.month - 1].slice(0, 3),
    income: Number(t.income),
    expense: Number(t.expense),
  }));

  if (loading || !summary) return <PageLoader />;

  return (
    <div>
      <Topbar
        title="Finance"
        subtitle="Income, expenses and savings overview"
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={handleExport} loading={exporting}>Export Excel</Button>
            <Button icon={Plus} onClick={() => setEntryModalOpen(true)}>Add Entry</Button>
          </>
        }
      />

      <div className="p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Month selector */}
          <div className="flex items-center gap-2">
            <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-white border border-navy-200 text-navy-400"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium text-navy-700 w-36 text-center bg-white border border-navy-200 rounded-lg py-1.5">{MONTH_NAMES[month - 1]} {year}</span>
            <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg hover:bg-white border border-navy-200 text-navy-400"><ChevronRight className="w-4 h-4" /></button>
          </div>

          {/* Date range export */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-navy-400 font-medium whitespace-nowrap">Export range:</span>
            <input
              type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)}
              className="text-xs border border-navy-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-navy-300"
            />
            <span className="text-xs text-navy-400">to</span>
            <input
              type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)}
              className="text-xs border border-navy-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-navy-300"
            />
            <Button size="sm" variant="secondary" icon={Download} onClick={handleExportRange} loading={exportingRange}>
              Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={TrendingUp} tone="success" label="Total Income" value={formatCurrency(summary.income.total_income, symbol)} sublabel="Collected (incl. custom income)" />
          <StatCard icon={TrendingDown} tone="danger" label="Total Expense" value={formatCurrency(summary.expense.total_expense, symbol)} sublabel="Payouts + salary + custom" />
          <StatCard icon={PiggyBank} tone="amber" label="Net Savings" value={formatCurrency(summary.savings, symbol)} sublabel="Income minus expense" />
          <StatCard
            icon={Wallet} tone={summary.income.rental_to_be_collected < 0 ? 'danger' : 'navy'}
            label={summary.income.rental_to_be_collected < 0 ? 'Refunds Owed to Customers' : 'To Be Collected'}
            value={formatCurrency(Math.abs(summary.income.rental_to_be_collected), symbol)}
            sublabel={summary.income.rental_to_be_collected < 0 ? 'Overpaid on closed rentals' : 'Outstanding rental balance'}
          />
        </div>

        <Card>
          <CardHeader title="Income vs Expense Trend" subtitle={`${year} — monthly`} />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF4FA" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#7FA8CC' }} axisLine={{ stroke: '#D9E6F2' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#7FA8CC' }} axisLine={false} tickLine={false} width={50} />
                <Tooltip
                  formatter={(value) => formatCurrency(value, symbol)}
                  contentStyle={{ borderRadius: 10, border: '1px solid #D9E6F2', fontSize: 13 }}
                />
                <Line type="monotone" dataKey="income" stroke="#1B8A5A" strokeWidth={2.5} dot={false} name="Income" />
                <Line type="monotone" dataKey="expense" stroke="#C0392B" strokeWidth={2.5} dot={false} name="Expense" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Income Breakdown" />
            <div className="space-y-2.5">
              <BreakdownRow label="Rental Collected" value={formatCurrency(summary.income.rental_collected, symbol)} />
              <BreakdownRow
                label={summary.income.rental_to_be_collected < 0 ? 'Refunds Owed to Customers' : 'Rental To Be Collected'}
                value={formatCurrency(Math.abs(summary.income.rental_to_be_collected), symbol)} muted
              />
              <BreakdownRow label="GST Collected" value={formatCurrency(summary.income.gst_collected, symbol)} muted />
              <BreakdownRow label="Custom Income Entries" value={formatCurrency(summary.income.custom_income, symbol)} />
              <div className="border-t border-navy-100 pt-2.5">
                <BreakdownRow label="Total Income" value={formatCurrency(summary.income.total_income, symbol)} bold />
              </div>
              <div className="pt-1">
                <BreakdownRow label="Yearly Income" value={formatCurrency(summary.yearly_income, symbol)} bold tone="amber" />
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Expense Breakdown" />
            <div className="space-y-2.5">
              <BreakdownRow label="Car Owner Payouts" value={formatCurrency(summary.expense.owner_payouts, symbol)} />
              <BreakdownRow label="Staff Salary Paid" value={formatCurrency(summary.expense.staff_salary, symbol)} />
              <BreakdownRow label="Custom Expense Entries" value={formatCurrency(summary.expense.custom_expense, symbol)} />
              <div className="border-t border-navy-100 pt-2.5">
                <BreakdownRow label="Total Expense" value={formatCurrency(summary.expense.total_expense, symbol)} bold />
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Recent Custom Entries" subtitle="Manual income & expense additions" />
          {entries.length === 0 ? (
            <EmptyState icon={Receipt} title="No custom entries yet" description="Add fuel costs, office rent, or other entries here." />
          ) : (
            <div className="space-y-2">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-navy-100">
                  <div>
                    <p className="text-sm font-medium text-navy-800">{e.title}</p>
                    <p className="text-xs text-navy-400">{formatDate(e.date)} · <span className="capitalize">{e.category.replace('_', ' ')}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold tabular-nums ${e.entry_type === 'income' ? 'text-success-600' : 'text-danger-500'}`}>
                      {e.entry_type === 'income' ? '+' : '-'}{formatCurrency(e.amount, symbol)}
                    </span>
                    <Badge variant={e.entry_type === 'income' ? 'paid' : 'pending'} dot={false}>{e.entry_type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <FinanceEntryModal open={entryModalOpen} onClose={() => setEntryModalOpen(false)} onSaved={load} />
    </div>
  );
}

function BreakdownRow({ label, value, muted, bold, tone }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${muted ? 'text-navy-400' : 'text-navy-600'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? 'font-semibold text-navy-900' : 'text-navy-700'} ${tone === 'amber' ? 'text-amber-600' : ''}`}>{value}</span>
    </div>
  );
}
