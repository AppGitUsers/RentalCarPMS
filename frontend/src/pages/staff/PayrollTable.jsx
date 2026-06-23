import { useEffect, useState } from 'react';
import { Wallet, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, X, Lock } from 'lucide-react';
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
  const [confirmRow, setConfirmRow] = useState(null); // row pending confirmation

  const load = () => {
    setLoading(true);
    staffApi.getSalaryForMonth(month, year).then(setRows).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [month, year]);

  // Only past months can be paid — not current or future.
  const isPastMonth = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);

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

  const handleConfirmPay = async () => {
    if (!confirmRow) return;
    const row = confirmRow;
    setConfirmRow(null);
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
    <>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-navy-800">Monthly Payroll</p>
          <div className="flex items-center gap-2">
            <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium text-navy-700 w-36 text-center">{MONTH_NAMES[month - 1]} {year}</span>
            <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Warning banner for current/future month */}
        {!isPastMonth && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            <Lock className="w-3.5 h-3.5 flex-shrink-0" />
            Salary payments are only allowed for completed past months. The month must fully end before you can pay.
          </div>
        )}

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
                  <th className="py-2.5 pr-4 font-medium">Days</th>
                  <th className="py-2.5 pr-4 font-medium">Hours Worked / Expected</th>
                  <th className="py-2.5 pr-4 font-medium">Late</th>
                  <th className="py-2.5 pr-4 font-medium">OT Hours</th>
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
                          <p className="text-xs text-navy-400 capitalize">{row.staff_role?.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-navy-600">{row.days_present}</td>
                    <td className="py-3 pr-4 tabular-nums text-navy-600">
                      <span className="font-medium">{Number(row.total_hours_worked).toFixed(1)}h</span>
                      <span className="text-navy-400"> / {Number(row.expected_hours).toFixed(1)}h</span>
                    </td>
                    <td className="py-3 pr-4">
                      {row.late_count > 0 ? (
                        <span className="flex items-center gap-1 text-orange-600 text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" /> {row.late_count}×
                        </span>
                      ) : (
                        <span className="text-navy-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      {Number(row.overtime_hours_total) > 0 ? (
                        <span className="text-blue-600 font-medium text-xs">{Number(row.overtime_hours_total).toFixed(1)}h</span>
                      ) : (
                        <span className="text-navy-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-navy-600">{formatCurrency(row.computed_amount, symbol)}</td>
                    <td className="py-3 pr-4">
                      {editingAdjustment === row.id ? (
                        <input
                          type="number" autoFocus
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
                        isPastMonth ? (
                          <Button
                            size="sm" variant="amber" icon={CheckCircle2}
                            loading={payingId === row.id}
                            onClick={() => setConfirmRow(row)}
                          >
                            Pay
                          </Button>
                        ) : (
                          <span title="Can only pay for completed past months" className="flex items-center gap-1 text-navy-300 text-xs cursor-not-allowed">
                            <Lock className="w-3.5 h-3.5" /> Locked
                          </span>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Confirm Payment Modal */}
      {confirmRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmRow(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            {/* Close */}
            <button
              onClick={() => setConfirmRow(null)}
              className="absolute top-4 right-4 p-1.5 text-navy-400 hover:text-navy-700 rounded-lg hover:bg-navy-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-base font-semibold text-navy-900">Confirm Salary Payment</h3>
              <p className="text-sm text-navy-500">This action cannot be undone.</p>
            </div>

            <div className="bg-navy-50 border border-navy-100 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-navy-500">Staff</span>
                <span className="font-medium text-navy-900">{confirmRow.staff_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Period</span>
                <span className="font-medium text-navy-900">{MONTH_NAMES[month - 1]} {year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Days Present</span>
                <span className="font-medium text-navy-900">{confirmRow.days_present}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Hours Worked</span>
                <span className="font-medium text-navy-900">
                  {Number(confirmRow.total_hours_worked).toFixed(1)}h / {Number(confirmRow.expected_hours).toFixed(1)}h
                </span>
              </div>
              <div className="flex justify-between border-t border-navy-200 pt-2 mt-2">
                <span className="text-navy-700 font-semibold">Amount to Pay</span>
                <span className="text-lg font-bold text-navy-900 tabular-nums">
                  {formatCurrency(confirmRow.final_amount, symbol)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRow(null)}
                className="flex-1 py-2.5 rounded-xl border border-navy-200 text-sm font-medium text-navy-600 hover:bg-navy-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPay}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-semibold text-white transition-colors"
              >
                Confirm & Pay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
