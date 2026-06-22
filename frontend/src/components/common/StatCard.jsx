import { cn } from '../../utils/cn';

const TONES = {
  navy: 'bg-navy-50 text-navy-700',
  amber: 'bg-amber-50 text-amber-700',
  success: 'bg-success-50 text-success-700',
  danger: 'bg-danger-50 text-danger-600',
};

export default function StatCard({ icon: Icon, label, value, sublabel, tone = 'navy', trend }) {
  return (
    <div className="bg-white rounded-xl border border-navy-100 shadow-card p-5 flex items-start gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', TONES[tone])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-navy-400">{label}</p>
        <p className="text-2xl font-semibold text-navy-900 mt-0.5 tabular-nums truncate">{value}</p>
        {sublabel && <p className="text-xs text-navy-400 mt-1">{sublabel}</p>}
        {trend && <p className={cn('text-xs font-medium mt-1', trend.positive ? 'text-success-600' : 'text-danger-500')}>{trend.label}</p>}
      </div>
    </div>
  );
}
