import { Menu } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';

export default function Topbar({ title, subtitle, actions }) {
  const { toggle } = useSidebar();

  return (
    <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-5 bg-white border-b border-navy-100 sticky top-0 z-20 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggle}
          className="md:hidden p-1.5 rounded-lg hover:bg-navy-50 text-navy-500 flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-navy-900 truncate">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-navy-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
