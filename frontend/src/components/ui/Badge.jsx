import { cn } from '../../utils/cn';

const VARIANTS = {
  available: 'bg-success-50 text-success-700 ring-1 ring-success-100',
  rented: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  maintenance: 'bg-danger-50 text-danger-600 ring-1 ring-danger-100',
  inactive: 'bg-navy-50 text-navy-400 ring-1 ring-navy-100',
  booked: 'bg-navy-50 text-navy-700 ring-1 ring-navy-100',
  active: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  closed: 'bg-success-50 text-success-700 ring-1 ring-success-100',
  cancelled: 'bg-navy-50 text-navy-400 ring-1 ring-navy-100',
  pending: 'bg-danger-50 text-danger-600 ring-1 ring-danger-100',
  partial: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  paid: 'bg-success-50 text-success-700 ring-1 ring-success-100',
  neutral: 'bg-navy-50 text-navy-600 ring-1 ring-navy-100',
};

const DOT_COLORS = {
  available: 'bg-success-500',
  rented: 'bg-amber-500',
  maintenance: 'bg-danger-500',
  inactive: 'bg-navy-300',
  booked: 'bg-navy-500',
  active: 'bg-amber-500',
  closed: 'bg-success-500',
  cancelled: 'bg-navy-300',
  pending: 'bg-danger-500',
  partial: 'bg-amber-500',
  paid: 'bg-success-500',
  neutral: 'bg-navy-400',
};

export default function Badge({ variant = 'neutral', children, dot = true, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize',
        VARIANTS[variant] || VARIANTS.neutral,
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', DOT_COLORS[variant] || DOT_COLORS.neutral)} />}
      {children}
    </span>
  );
}
