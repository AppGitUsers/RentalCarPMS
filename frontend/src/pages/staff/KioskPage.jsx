import { useState, useEffect, useRef } from 'react';
import { Delete, AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { kioskPunch } from '../../api/staff';


const ROLE_LABELS = {
  manager: 'Manager', driver: 'Driver', cleaner: 'Cleaner / Detailer',
  front_desk: 'Front Desk', mechanic: 'Mechanic', other: 'Other',
};

const AUTO_RESET_SECS = 6;

export default function KioskPage() {
  const [now, setNow] = useState(new Date());
  const [empId, setEmpId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);   // success payload
  const [error, setError] = useState(null);     // { message, extra? }
  const [countdown, setCountdown] = useState(null);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  // Live clock + auto-focus for keyboard input
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    containerRef.current?.focus();
    return () => clearInterval(t);
  }, []);

  // Auto-reset countdown after punch result
  useEffect(() => {
    if (!result && !error) return;
    let secs = AUTO_RESET_SECS;
    setCountdown(secs);
    timerRef.current = setInterval(() => {
      secs -= 1;
      setCountdown(secs);
      if (secs <= 0) reset();
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [result, error]);

  const reset = () => {
    clearInterval(timerRef.current);
    setResult(null);
    setError(null);
    setEmpId('');
    setCountdown(null);
  };

  const punch = async () => {
    if (!empId.trim() || loading) return;
    setLoading(true);
    try {
      const data = await kioskPunch(Number(empId));
      setResult(data);
    } catch (err) {
      const status = err.response?.status;
      const body = err.response?.data || {};
      if (status === 409) {
        setError({
          message: 'Attendance already completed for today.',
          extra: `In: ${body.shift_in}   Out: ${body.shift_out}   (${Number(body.hours_worked || 0).toFixed(1)}h)`,
        });
      } else if (status === 404) {
        setError({ message: 'Employee ID not found. Please check and try again.' });
      } else {
        setError({ message: body.detail || 'Something went wrong. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNumpad = (key) => {
    if (result || error) return;
    if (key === 'del') {
      setEmpId((p) => p.slice(0, -1));
    } else if (key === 'enter') {
      punch();
    } else if (empId.length < 8) {
      setEmpId((p) => p + key);
    }
  };

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#0a0f1e] text-white flex flex-col outline-none"
      onKeyDown={(e) => {
        if (result || error) { if (e.key === 'Escape' || e.key === 'Enter') reset(); return; }
        if (e.key >= '0' && e.key <= '9') handleNumpad(e.key);
        else if (e.key === 'Backspace') handleNumpad('del');
        else if (e.key === 'Enter') handleNumpad('enter');
      }}
      tabIndex={0}
    >

      {/* Header — clock */}
      <div className="flex flex-col items-center pt-10 pb-6 select-none">
        <div className="flex items-center gap-2 text-slate-400 mb-2">
          <Clock className="w-4 h-4" />
          <span className="text-sm tracking-widest uppercase">{dateStr}</span>
        </div>
        <p className="text-7xl font-thin tabular-nums tracking-tight text-white">{timeStr}</p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        {result ? (
          <ResultCard result={result} countdown={countdown} onReset={reset} />
        ) : error ? (
          <ErrorCard error={error} countdown={countdown} onReset={reset} />
        ) : (
          <InputPanel
            empId={empId}
            loading={loading}
            onNumpad={handleNumpad}
          />
        )}
      </div>

      {/* Footer hint */}
      {!result && !error && (
        <p className="text-center text-slate-600 text-xs pb-4 select-none">
          Enter your <span className="text-slate-400 font-semibold">Kiosk ID</span> (shown on your staff card) and press ↵ to punch in / punch out
        </p>
      )}
    </div>
  );
}

function InputPanel({ empId, loading, onNumpad }) {
  const KEYS = [
    ['7','8','9'],
    ['4','5','6'],
    ['1','2','3'],
    ['del','0','enter'],
  ];

  return (
    <div className="w-full max-w-xs space-y-6">
      <p className="text-center text-slate-400 text-sm tracking-wide uppercase">Kiosk ID</p>

      {/* Display */}
      <div className="h-16 bg-[#111827] border border-slate-700 rounded-xl flex items-center justify-center">
        <p className="text-4xl font-mono tracking-[0.3em] text-white">
          {empId ? empId.replace(/./g, '●') : <span className="text-slate-600">_ _ _ _</span>}
        </p>
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3">
        {KEYS.flat().map((key) => {
          const isEnter = key === 'enter';
          const isDel = key === 'del';
          return (
            <button
              key={key}
              onClick={() => onNumpad(key)}
              disabled={loading}
              className={
                isEnter
                  ? 'col-span-1 h-14 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all text-white disabled:opacity-50'
                  : isDel
                  ? 'col-span-1 h-14 rounded-xl bg-slate-700 hover:bg-slate-600 active:scale-95 transition-all flex items-center justify-center'
                  : 'h-14 rounded-xl text-2xl font-light bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all'
              }
            >
              {isDel ? <Delete className="w-5 h-5 text-slate-300" /> : isEnter ? (loading ? '…' : '↵') : key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResultCard({ result, countdown, onReset }) {
  const isIn = result.action === 'checked_in';
  return (
    <div className="w-full max-w-sm text-center space-y-5 animate-fade-in">
      {/* Staff photo */}
      {result.staff_photo ? (
        <img src={result.staff_photo} alt="" className="w-28 h-28 rounded-full object-cover mx-auto ring-4 ring-amber-500/30" />
      ) : (
        <div className="w-28 h-28 rounded-full bg-slate-700 flex items-center justify-center mx-auto text-4xl font-semibold text-slate-300">
          {result.staff_name[0]}
        </div>
      )}

      {/* Name + role */}
      <div>
        <p className="text-2xl font-semibold">{result.staff_name}</p>
        <p className="text-slate-400 text-sm mt-1">{ROLE_LABELS[result.staff_role] || result.staff_role}</p>
        {result.shift_name && <p className="text-slate-500 text-xs mt-0.5">{result.shift_name}</p>}
      </div>

      {/* Action banner */}
      <div className={`rounded-2xl py-5 px-6 ${isIn ? 'bg-emerald-900/50 border border-emerald-700/50' : 'bg-blue-900/50 border border-blue-700/50'}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <CheckCircle2 className={`w-6 h-6 ${isIn ? 'text-emerald-400' : 'text-blue-400'}`} />
          <span className={`text-xl font-bold tracking-wide ${isIn ? 'text-emerald-300' : 'text-blue-300'}`}>
            {isIn ? 'CHECKED IN' : 'CHECKED OUT'}
          </span>
        </div>
        <div className="flex items-center justify-center gap-4 text-sm tabular-nums">
          <span className="text-slate-300">In: <strong>{result.shift_in}</strong></span>
          {result.shift_out && <span className="text-slate-300">Out: <strong>{result.shift_out}</strong></span>}
          {result.hours_worked != null && result.shift_out && (
            <span className="text-slate-300"><strong>{Number(result.hours_worked).toFixed(1)}h</strong> worked</span>
          )}
        </div>
        {result.is_late && (
          <div className="flex items-center justify-center gap-1 mt-2 text-orange-400 text-sm">
            <AlertTriangle className="w-4 h-4" /> Late arrival
          </div>
        )}
      </div>

      <p className="text-slate-500 text-xs">Resetting in {countdown}s · <button onClick={onReset} className="underline hover:text-slate-300">dismiss</button></p>
    </div>
  );
}

function ErrorCard({ error, countdown, onReset }) {
  return (
    <div className="w-full max-w-sm text-center space-y-5">
      <div className="w-20 h-20 rounded-full bg-red-900/40 flex items-center justify-center mx-auto">
        <XCircle className="w-10 h-10 text-red-400" />
      </div>
      <p className="text-xl font-semibold text-red-300">{error.message}</p>
      {error.extra && <p className="text-slate-400 text-sm tabular-nums">{error.extra}</p>}
      <button
        onClick={onReset}
        className="px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-medium transition-colors"
      >
        Try Again
      </button>
      {countdown != null && (
        <p className="text-slate-600 text-xs">Auto-reset in {countdown}s</p>
      )}
    </div>
  );
}
