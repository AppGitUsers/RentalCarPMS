import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

const Select = forwardRef(function Select(
  { label, error, required, hint, options = [], className, containerClassName, ...props },
  ref
) {
  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-navy-700 mb-1.5">
          {label} {required && <span className="text-danger-500">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'w-full appearance-none px-3.5 py-2.5 pr-10 rounded-lg border bg-white text-sm text-navy-900 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400',
            error ? 'border-danger-300' : 'border-navy-200 hover:border-navy-300',
            props.disabled && 'opacity-50 cursor-not-allowed bg-navy-50',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400 pointer-events-none" />
      </div>
      {hint && !error && <p className="mt-1 text-xs text-navy-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger-500">{error}</p>}
    </div>
  );
});

export default Select;
