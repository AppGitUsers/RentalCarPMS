import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, IndianRupee, ChevronDown } from 'lucide-react';
import * as staffApi from '../../api/staff';
import { useToast } from '../../components/ui/Toast';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function fmt(val) {
  return Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StaffCalendarModal({ staff, onClose, onPaymentRecorded }) {
  const { showToast } = useToast();
  const today = new Date();

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);

  const [attendance, setAttendance] = useState({});
  const [summary, setSummary] = useState(null);
  const [payHistory, setPayHistory] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [togglingDay, setTogglingDay] = useState(null);

  const [showDeliveryBreakdown, setShowDeliveryBreakdown] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoadingData(true);
    try {
      const [attData, sumData, histData] = await Promise.all([
        staffApi.getAttendanceByStaffMonth(staff.id, viewMonth, viewYear),
        staffApi.getSalarySummary(staff.id, viewMonth, viewYear).catch(() => null),
        staffApi.getPaymentHistory(staff.id),
      ]);
      const map = {};
      (attData || []).forEach((r) => { map[r.date] = r.status; });
      setAttendance(map);
      setSummary(sumData);
      setPayHistory(
        (histData || []).filter((p) => p.year === viewYear && p.month === viewMonth)
      );
    } finally {
      setLoadingData(false);
    }
  }, [staff.id, viewMonth, viewYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const isAtCurrentMonth =
    viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (isAtCurrentMonth) return;
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // Build 7-column Mon-first calendar grid
  const buildGrid = () => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    let offset = firstDay.getDay() - 1;
    if (offset < 0) offset = 6; // Sunday wraps to last column
    const cells = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const pad = (n) => String(n).padStart(2, '0');
  const getDateStr = (day) => `${viewYear}-${pad(viewMonth)}-${pad(day)}`;

  const isBeforeJoin = (day) => {
    if (!staff.date_joined) return false;
    return new Date(viewYear, viewMonth - 1, day) < new Date(staff.date_joined);
  };

  const isFutureDay = (day) => {
    const cell = new Date(viewYear, viewMonth - 1, day);
    const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return cell > now;
  };

  const isTodayCell = (day) =>
    viewYear === today.getFullYear() &&
    viewMonth === today.getMonth() + 1 &&
    day === today.getDate();

  const handleDayClick = async (day) => {
    if (isBeforeJoin(day) || isFutureDay(day)) return;
    const dateStr = getDateStr(day);
    setTogglingDay(dateStr);
    try {
      const result = await staffApi.toggleAttendance(staff.id, dateStr);
      setAttendance((prev) => {
        const next = { ...prev };
        if (result.status === null) delete next[dateStr];
        else next[dateStr] = result.status;
        return next;
      });
      const sumData = await staffApi.getSalarySummary(staff.id, viewMonth, viewYear).catch(() => null);
      setSummary(sumData);
    } catch {
      showToast('Could not update attendance', 'error');
    } finally {
      setTogglingDay(null);
    }
  };

  const handleRecordPayment = async () => {
    if (!payAmount) return;
    setPaying(true);
    try {
      await staffApi.recordPayment(staff.id, {
        month: viewMonth, year: viewYear, amount: payAmount, notes: payNotes,
      });
      showToast('Payment recorded');
      setShowPayModal(false);
      setPayAmount('');
      setPayNotes('');
      const [sumData, histData] = await Promise.all([
        staffApi.getSalarySummary(staff.id, viewMonth, viewYear).catch(() => null),
        staffApi.getPaymentHistory(staff.id),
      ]);
      setSummary(sumData);
      setPayHistory((histData || []).filter((p) => p.year === viewYear && p.month === viewMonth));
      onPaymentRecorded?.();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not record payment', 'error');
    } finally {
      setPaying(false);
    }
  };

  const cells = buildGrid();

  const renderDayCell = (day, i) => {
    if (!day) return <div key={i} />;
    const dateStr = getDateStr(day);
    const status = attendance[dateStr];
    const disabled = isBeforeJoin(day) || isFutureDay(day);
    const toggling = togglingDay === dateStr;
    const todayFlag = isTodayCell(day);

    let cls = 'rounded-lg flex items-center justify-center text-sm font-medium transition-colors select-none';
    if (disabled) {
      cls += ' text-navy-200 cursor-default';
    } else if (status === 'absent') {
      cls += ' bg-red-100 text-red-700 cursor-pointer hover:bg-red-200';
    } else if (status === 'cl') {
      cls += ' bg-amber-100 text-amber-700 cursor-pointer hover:bg-amber-200';
    } else {
      cls += ' bg-green-50 text-navy-700 cursor-pointer hover:bg-green-100';
    }
    if (todayFlag) cls += ' ring-2 ring-navy-600 ring-offset-1';

    return (
      <div
        key={i}
        className={cls}
        onClick={() => !disabled && !toggling && handleDayClick(day)}
      >
        {toggling ? <Loader2 className="w-3 h-3 animate-spin" /> : day}
      </div>
    );
  };

  const isPastMonth =
    viewYear < today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth < today.getMonth() + 1);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full h-full shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100">
          <div>
            <h2 className="font-semibold text-navy-900">{staff.full_name}</h2>
            <p className="text-xs text-navy-500 mt-0.5 capitalize">
              {staff.role.replace('_', ' ')} · Joined {staff.date_joined}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-navy-50 border-b border-navy-100">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-navy-100 text-navy-600">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-navy-800">
            {MONTH_NAMES[viewMonth - 1]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            disabled={isAtCurrentMonth}
            className="p-1.5 rounded-lg hover:bg-navy-100 text-navy-600 disabled:opacity-30 disabled:cursor-default"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Salary summary */}
        {summary && (
          <div className="px-5 py-3 border-b border-navy-100">
            {/* Main stats row */}
            <div className="grid grid-cols-4 gap-2 mb-2.5">
              {[
                { label: 'Salary', val: summary.calculated_amount, cls: 'text-navy-900' },
                { label: 'Delivery', val: summary.delivery_earnings, cls: 'text-amber-600' },
                { label: 'Paid', val: summary.paid_this_month, cls: 'text-green-600' },
                {
                  label: 'Balance',
                  val: summary.balance,
                  cls: Number(summary.balance) > 0 ? 'text-red-600' : 'text-green-600',
                },
              ].map(({ label, val, cls }) => (
                <div key={label} className="text-center">
                  <p className="text-[10px] text-navy-400 uppercase tracking-wide">{label}</p>
                  <p className={`text-sm font-bold tabular-nums ${cls}`}>₹{fmt(val)}</p>
                </div>
              ))}
            </div>

            {/* Delivery breakdown toggle */}
            {Number(summary.delivery_earnings) > 0 && (
              <div className="mb-2">
                <button
                  onClick={() => setShowDeliveryBreakdown((v) => !v)}
                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${showDeliveryBreakdown ? 'rotate-180' : ''}`} />
                  {summary.delivery_breakdown.length} delivery trip{summary.delivery_breakdown.length !== 1 ? 's' : ''} · ₹{fmt(summary.delivery_earnings)}
                </button>
                {showDeliveryBreakdown && (
                  <div className="mt-1.5 space-y-1 bg-amber-50/60 rounded-lg p-2">
                    {summary.delivery_breakdown.map((d) => (
                      <div key={d.rental_id} className="flex items-center justify-between text-xs">
                        <span className="text-navy-500">{d.date} · {d.customer}</span>
                        <span className="text-navy-600 truncate max-w-[80px] mx-2">{d.location}</span>
                        <span className="font-semibold text-amber-700 tabular-nums">₹{fmt(d.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex gap-3 text-xs">
                <span className="text-navy-500">Present: <strong>{summary.present_days}</strong></span>
                <span className="text-red-500">Absent: <strong>{summary.absent_days}</strong></span>
                <span className="text-amber-600">CL: <strong>{summary.cl_days}/2</strong></span>
              </div>
              <button
                onClick={() => {
                  setPayAmount(String(Math.max(0, Number(summary.balance))));
                  setShowPayModal(true);
                }}
                disabled={!isPastMonth}
                title={!isPastMonth ? 'Can only pay for past months' : undefined}
                className="flex items-center gap-1 px-3 py-1.5 bg-navy-700 text-white text-xs rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <IndianRupee className="w-3 h-3" /> Pay
              </button>
            </div>
          </div>
        )}

        {/* Calendar grid — fills remaining height, no scroll */}
        <div className="flex-1 min-h-0 flex flex-col px-6 py-4">
          {loadingData ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-navy-300" />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="grid grid-cols-7 mb-2">
                {DAY_LABELS.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-navy-400 py-1.5">{d}</div>
                ))}
              </div>
              <div
                className="flex-1 min-h-0 grid grid-cols-7 gap-2"
                style={{ gridAutoRows: '1fr' }}
              >
                {cells.map((day, i) => renderDayCell(day, i))}
              </div>
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-navy-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-green-100 border border-green-200 rounded inline-block" />
                  Present
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-amber-100 rounded inline-block" />
                  CL
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-red-100 rounded inline-block" />
                  Absent
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Payment history for current month */}
        {payHistory.length > 0 && (
          <div className="px-5 py-3 border-t border-navy-100 bg-navy-50">
            <p className="text-xs font-semibold text-navy-600 mb-2">
              Payments — {MONTH_NAMES[viewMonth - 1]} {viewYear}
            </p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {payHistory.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="text-navy-500">
                    {new Date(p.paid_at).toLocaleDateString('en-IN')}
                  </span>
                  <span className="font-semibold text-navy-800 tabular-nums">₹{fmt(p.amount)}</span>
                  {p.notes && (
                    <span className="text-navy-400 truncate ml-2 max-w-[100px]">{p.notes}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment recording modal */}
      {showPayModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
          onClick={() => setShowPayModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-navy-900 mb-1">Record Payment</h3>
            <p className="text-xs text-navy-500 mb-1">
              {staff.full_name} · {MONTH_NAMES[viewMonth - 1]} {viewYear}
            </p>
            {summary && (
              <div className="text-xs text-navy-400 mb-4 space-y-0.5">
                <div className="flex justify-between"><span>Salary</span><span className="tabular-nums">₹{fmt(summary.calculated_amount)}</span></div>
                {Number(summary.delivery_earnings) > 0 && (
                  <div className="flex justify-between text-amber-600"><span>Delivery ({summary.delivery_breakdown.length} trip{summary.delivery_breakdown.length !== 1 ? 's' : ''})</span><span className="tabular-nums">₹{fmt(summary.delivery_earnings)}</span></div>
                )}
                <div className="flex justify-between font-medium text-navy-600 border-t border-navy-100 pt-0.5"><span>Total Payable</span><span className="tabular-nums">₹{fmt(summary.total_payable)}</span></div>
                {Number(summary.paid_this_month) > 0 && (
                  <div className="flex justify-between text-green-600"><span>Already Paid</span><span className="tabular-nums">₹{fmt(summary.paid_this_month)}</span></div>
                )}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Amount (₹)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full border border-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
                  min="0"
                  step="0.01"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Notes (optional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Advance, partial payment..."
                  className="w-full border border-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowPayModal(false)}
                className="flex-1 py-2.5 border border-navy-200 rounded-lg text-sm text-navy-700 hover:bg-navy-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={paying || !payAmount}
                className="flex-1 py-2.5 bg-navy-700 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors disabled:opacity-50"
              >
                {paying ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
