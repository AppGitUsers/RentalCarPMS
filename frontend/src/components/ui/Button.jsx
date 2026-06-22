import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const VARIANTS = {
  primary: 'bg-navy-800 text-white hover:bg-navy-700 active:bg-navy-900 shadow-sm',
  amber: 'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 shadow-sm',
  secondary: 'bg-white text-navy-800 border border-navy-200 hover:bg-navy-50 active:bg-navy-100',
  ghost: 'bg-transparent text-navy-700 hover:bg-navy-50',
  danger: 'bg-danger-500 text-white hover:bg-danger-600 shadow-sm',
  success: 'bg-success-500 text-white hover:bg-success-600 shadow-sm',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-5 py-3 text-base rounded-xl gap-2',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className, children, loading, disabled, icon: Icon, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
});

export default Button;
