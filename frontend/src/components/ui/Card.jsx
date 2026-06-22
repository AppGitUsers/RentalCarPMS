import { cn } from '../../utils/cn';

export default function Card({ className, children, padding = true, hover = false, ...props }) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-navy-100 shadow-card',
        hover && 'transition-shadow hover:shadow-card-hover cursor-pointer',
        padding && 'p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, icon: Icon }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-navy-50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-navy-700" />
          </div>
        )}
        <div>
          <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
          {subtitle && <p className="text-xs text-navy-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
