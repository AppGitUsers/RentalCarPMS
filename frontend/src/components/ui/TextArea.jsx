import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const TextArea = forwardRef(function TextArea(
  { label, error, required, hint, rows = 3, className, containerClassName, ...props },
  ref
) {
  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-navy-700 mb-1.5">
          {label} {required && <span className="text-danger-500">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm text-navy-900 placeholder:text-navy-300 transition-colors resize-none',
          'focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400',
          error ? 'border-danger-300' : 'border-navy-200 hover:border-navy-300',
          props.disabled && 'opacity-50 cursor-not-allowed bg-navy-50',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="mt-1 text-xs text-navy-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger-500">{error}</p>}
    </div>
  );
});

export default TextArea;
