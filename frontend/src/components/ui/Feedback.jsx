import { Loader2 } from 'lucide-react';

export function Spinner({ className = 'w-6 h-6' }) {
  return <Loader2 className={`animate-spin text-navy-400 ${className}`} />;
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner className="w-8 h-8" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-navy-50 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-navy-300" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-navy-800">{title}</h3>
      {description && <p className="text-sm text-navy-400 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
