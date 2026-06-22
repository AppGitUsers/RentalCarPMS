import { useEffect, useState } from 'react';
import { Wallet, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Spinner, EmptyState } from '../../components/ui/Feedback';
import * as staffApi from '../../api/staff';
import { useToast } from '../../components/ui/Toast';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, MONTH_NAMES } from '../../utils/format';

export default function PayrollTable() {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const symbol = settings?.currency_symbol || '₹';

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAdjustment, setEditingAdjustment] = useState(null);
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [payingId, setPayingId] = useState(null);

  const load = () => {
    setLoading(true);
    staffApi.getSalaryForMonth(month, year).then(setRows).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [month, year]);

  const shiftMonth = (delta) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    setMonth(m);
    setYear(y);
  };

  const handleSaveAdjustment = async (row) => {
    try {
      const updated = await staffApi.adjustSalary(row.id, Number(adjustmentValue || 0));
      setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
      setEditingAdjustment(null);
      showToast('Adjustment saved');
    } catch {
      showToast('Could not save adjustment', 'error');
    }
  };

  const handlePay = async (row) => {
    setPayingId(row.id);
    try {
      const updated = await staffApi.paySalary(row.id);
      setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
      showToast(`Paid ${formatCurrency(updated.final_amount, symbol)} to ${row.staff_name}`);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Payment failed', 'error');
    } finally {
      setPayingId(null);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-navy-800">Monthly Payroll</p>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium text-navy-700 w-36 text-center">{MONTH_NAMES[month - 1]} {year}</span>
          <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center"><Spinner /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Wallet} title="No staff to pay" description="Add active staff members to see their payroll here." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-navy-400 border-b border-navy-100">
                <th className="py-2.5 pr-4 font-medium">Staff</th>
                <th className="py-2.5 pr-4 font-medium">Days Present</th>
                <th className="py-2.5 pr-4 font-medium">Hours Worked</th>
                <th className="py-2.5 pr-4 font-medium">Computed</th>
                <th className="py-2.5 pr-4 font-medium">Adjustment</th>
                <th className="py-2.5 pr-4 font-medium">Final Amount</th>
                <th className="py-2.5 pr-4 font-medium">Status</th>
                <th className="py-2.5 pr-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-navy-50 last:border-0">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      {row.staff_photo ? (
                        <img src={row.staff_photo} className="w-8 h-8 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center text-xs font-semibold text-navy-500">
                          {row.staff_name[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-navy-800">{row.staff_name}</p>
                        <p className="text-xs text-navy-400 capitalize">{row.staff_role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-navy-600">{row.days_present}</td>
                  <td className="py-3 pr-4 tabular-nums text-navy-600">{row.total_hours_worked}h / {row.expected_hours}h</td>
                  <td className="py-3 pr-4 tabular-nums text-navy-600">{formatCurrency(row.computed_amount, symbol)}</td>
                  <td className="py-3 pr-4">
                    {editingAdjustment === row.id ? (
                      <input
                        type="number"
                        autoFocus
                        value={adjustmentValue}
                        onChange={(e) => setAdjustmentValue(e.target.value)}
                        onBlur={() => handleSaveAdjustment(row)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveAdjustment(row)}
                        className="w-24 text-sm border border-navy-200 rounded-lg px-2 py-1"
                      />
                    ) : (
                      <button
                        disabled={row.is_paid}
                        onClick={() => { setEditingAdjustment(row.id); setAdjustmentValue(row.adjustment); }}
                        className="tabular-nums text-navy-600 hover:text-navy-900 underline-offset-2 hover:underline disabled:no-underline disabled:cursor-default"
                      >
                        {formatCurrency(row.adjustment, symbol)}
                      </button>
                    )}
                  </td>
                  <td className="py-3 pr-4 tabular-nums font-semibold text-navy-900">{formatCurrency(row.final_amount, symbol)}</td>
                  <td className="py-3 pr-4">
                    {row.is_paid ? <Badge variant="paid">Paid</Badge> : <Badge variant="pending">Unpaid</Badge>}
                  </td>
                  <td className="py-3 pr-4">
                    {!row.is_paid && (
                      <Button size="sm" variant="amber" icon={CheckCircle2} loading={payingId === row.id} onClick={() => handlePay(row)}>
                        Pay
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
