import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

export default function Modal({ open, onClose, title, subtitle, children, size = 'md', footer }) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cn(
          'relative bg-white w-full flex flex-col max-h-[95vh] sm:max-h-[90vh]',
          'rounded-t-2xl sm:rounded-2xl shadow-2xl',
          'sm:' + SIZES[size],
        )}
      >
        {title && (
          <div className="flex items-start justify-between px-5 sm:px-6 py-4 border-b border-navy-100 flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-navy-900">{title}</h2>
              {subtitle && <p className="text-sm text-navy-400 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400 hover:text-navy-600 transition-colors flex-shrink-0 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 sm:px-6 py-5 flex-1">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 flex-wrap px-5 sm:px-6 py-4 border-t border-navy-100 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
